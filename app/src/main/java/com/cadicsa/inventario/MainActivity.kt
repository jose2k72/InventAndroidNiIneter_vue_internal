package com.cadicsa.inventario

import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.util.Log
import android.widget.Toast
import android.widget.LinearLayout
import android.widget.CheckBox
import android.widget.ListView
import android.widget.ArrayAdapter
import android.app.ProgressDialog
import android.content.ContentUris
import android.database.sqlite.SQLiteDatabase
import android.net.Uri
import android.provider.DocumentsContract
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.Priority
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.OnMapReadyCallback
import com.google.android.gms.maps.SupportMapFragment
import com.google.android.gms.maps.model.LatLng
import com.cadicsa.inventario.databinding.ActivityMainBinding
import com.cadicsa.inventario.utils.*
import com.cadicsa.inventario.security.SecurityManager

class MainActivity : AppCompatActivity(), OnMapReadyCallback {

    private lateinit var binding: ActivityMainBinding
    private lateinit var mMap: GoogleMap
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private var locationCallback: LocationCallback? = null
    
    // Helpers
    private val permissionHelper = PermissionHelper(this)
    private val dialogHelper = MainDialogHelper(this)
    private var mapHelper: MapHelper? = null
    
    private var currentLatitude: Double = 0.0
    private var currentLongitude: Double = 0.0
    private var permissionsGranted = false
    private var mapInitialized = false
    
    // TileOverlay para tiles offline
    private var tileOverlay: com.google.android.gms.maps.model.TileOverlay? = null
    private var searchPolygonOverlay: com.google.android.gms.maps.model.Polygon? = null
    
    // ID del último dato guardado en esta sesión
    private var lastSavedDataId: Int = -1

    private val defaultLocation = LatLng(9.9458, -84.0628)
    private val defaultZoom = 17f

    private val multiplePermissionsLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val allGranted = permissions.entries.all { it.value }
        if (allGranted) {
            permissionsGranted = true
            AppConfig.ensureStorageDirectoryExists()
            initializeMap()
            preloadLocationSilently()
            startLocationUpdates()
        } else {
            Toast.makeText(this, "Permisos necesarios no concedidos", Toast.LENGTH_LONG).show()
            initializeMap()
        }
    }

    /** Ruta de la BD externa validada — disponible para las fases de importación */
    private var validatedExternalDbPath: String? = null

    /** Manager que orquesta las fases 2 y 3 del proceso de importación */
    private var importManager: ImportManager? = null


    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setSupportActionBar(binding.toolbar)

        if (!checkAppDomain()) return

        updateActionBarTitle()

        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        binding.fabGps.setOnClickListener { getCurrentLocation() }
        
        if (permissionHelper.hasLocationPermission()) {
            preloadLocationSilently()
            startLocationUpdates()
        }
        
        permissionHelper.checkManageExternalStoragePermission {
            permissionsGranted = true
            permissionHelper.requestAllPermissions(multiplePermissionsLauncher) {
                AppConfig.ensureStorageDirectoryExists()
                if (!checkAppDomain()) return@requestAllPermissions
                initializeMap()
                preloadLocationSilently()
                startLocationUpdates()
            }
        }

        if (AppConfig.DEBUG_DB_SERVER_ENABLED) {
            DebugDbServer.start(this)
        }
    }

    override fun onResume() {
        super.onResume()
        if (!checkAppDomain()) return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            val hasStorage = Environment.isExternalStorageManager()
            if (hasStorage && !permissionsGranted) {
                permissionsGranted = true
                permissionHelper.requestAllPermissions(multiplePermissionsLauncher) {
                    AppConfig.ensureStorageDirectoryExists()
                    if (!checkAppDomain()) return@requestAllPermissions
                    initializeMap()
                    preloadLocationSilently()
                    startLocationUpdates()
                }
            }
        }
        if (permissionHelper.hasLocationPermission()) {
            preloadLocationSilently()
            startLocationUpdates()
        }
        
        lastSavedDataId = getSharedPreferences("app_prefs", MODE_PRIVATE).getInt("last_saved_data_id", -1)
        updateActionBarTitle()
        if (mapInitialized) {
            tileOverlay?.clearTileCache()
            mapHelper?.loadCapturedPoints(lastSavedDataId)
        }
    }

    override fun onPause() {
        super.onPause()
        stopLocationUpdates()
    }

    private fun initializeMap() {
        if (mapInitialized) return
        val mapFragment = supportFragmentManager.findFragmentById(R.id.map) as SupportMapFragment
        mapFragment.getMapAsync(this)
    }

    override fun onMapReady(googleMap: GoogleMap) {
        mMap = googleMap
        mapHelper = MapHelper(this, mMap)

        mMap.mapType = GoogleMap.MAP_TYPE_NORMAL

        mMap.uiSettings.apply {
            isZoomControlsEnabled = true
            isCompassEnabled = true
            isMyLocationButtonEnabled = false
        }

        if (DatabaseHelper.isDatabaseAvailable()) {
            try {
                val dbHelper = DatabaseHelper.getInstance(this)

                val minZoom = dbHelper.getMinZoom()
                val maxZoom = dbHelper.getMaxZoom()
                val initLat  = dbHelper.getInitLat().toDouble()
                val initLng  = dbHelper.getInitLng().toDouble()
                val initZoom = dbHelper.getInitZoom().toFloat()

                if (minZoom > 0 && maxZoom > 0) {
                    mMap.setMinZoomPreference(minZoom.toFloat())
                    mMap.setMaxZoomPreference(maxZoom.toFloat())
                }

                val tileProvider = OfflineTileProvider(this, "tiles")
                tileOverlay = mMap.addTileOverlay(
                    com.google.android.gms.maps.model.TileOverlayOptions()
                        .tileProvider(tileProvider)
                        .zIndex(3000f)
                )

                if (initLat == 0.0 || initLng == 0.0) {
                    dialogHelper.showFatalErrorDialog("Errores en los datos de carga de la app (Coordenadas de inicio no encontradas)")
                    return
                }

                mMap.moveCamera(CameraUpdateFactory.newLatLngZoom(LatLng(initLat, initLng), initZoom))
                mapInitialized = true
                updateActionBarTitle()

            } catch (e: Exception) {
                Toast.makeText(this, "Error al cargar BD: ${e.message}", Toast.LENGTH_LONG).show()
            }
        } else {
            Toast.makeText(this, "Base de datos no disponible. Verifique permisos.", Toast.LENGTH_LONG).show()
        }

        enableMyLocation()

        mMap.setOnMapClickListener { latLng ->
            handleMapPosition(latLng, singleGroupPoint = true)
        }

        mMap.setOnMarkerClickListener { marker ->
            val coords = marker.tag as? String
            if (coords != null) {
                try {
                    val parts = coords.split(",")
                    val lat = parts[0].toDouble()
                    val lng = parts[1].toDouble()
                    // Ruta unificada: misma lógica que el click en cartografía
                    handleMapPosition(com.google.android.gms.maps.model.LatLng(lat, lng), singleGroupPoint = true)
                } catch (e: Exception) {
                    android.util.Log.e("MainActivity", "Error al procesar marcador: ${e.message}")
                }
            }
            true
        }

        mapHelper?.loadCapturedPoints(lastSavedDataId)
        checkEncuestador()
        checkAuthentication()
    }

    private fun enableMyLocation() {
        if (permissionHelper.hasLocationPermission()) {
            try { 
                mMap.isMyLocationEnabled = true 
                // Obtener ubicación fresca silenciosamente, con fallback a caché
                fusedLocationClient.getCurrentLocation(
                    com.google.android.gms.location.Priority.PRIORITY_HIGH_ACCURACY,
                    null
                ).addOnSuccessListener { freshLocation ->
                    if (freshLocation != null) {
                        currentLatitude = freshLocation.latitude
                        currentLongitude = freshLocation.longitude
                    } else {
                        fusedLocationClient.lastLocation.addOnSuccessListener { cachedLocation ->
                            if (cachedLocation != null) {
                                currentLatitude = cachedLocation.latitude
                                currentLongitude = cachedLocation.longitude
                            }
                        }
                    }
                }.addOnFailureListener {
                    fusedLocationClient.lastLocation.addOnSuccessListener { cachedLocation ->
                        if (cachedLocation != null) {
                            currentLatitude = cachedLocation.latitude
                            currentLongitude = cachedLocation.longitude
                        }
                    }
                }
            } catch (e: SecurityException) {}
        }
    }

    private fun preloadLocationSilently() {
        if (permissionHelper.hasLocationPermission()) {
            try {
                // 1. Obtener la última ubicación en caché (rápido y sin delay)
                fusedLocationClient.lastLocation.addOnSuccessListener { cachedLocation ->
                    if (cachedLocation != null) {
                        currentLatitude = cachedLocation.latitude
                        currentLongitude = cachedLocation.longitude
                        Log.d("MainActivity", "Precarga GPS (Caché): $currentLatitude, $currentLongitude")
                    }
                }
                
                // 2. Calentar la antena GPS/servicios de ubicación en segundo plano
                fusedLocationClient.getCurrentLocation(
                    com.google.android.gms.location.Priority.PRIORITY_HIGH_ACCURACY,
                    null
                ).addOnSuccessListener { freshLocation ->
                    if (freshLocation != null) {
                        currentLatitude = freshLocation.latitude
                        currentLongitude = freshLocation.longitude
                        Log.d("MainActivity", "Precarga GPS (Fresco): $currentLatitude, $currentLongitude")
                    }
                }
            } catch (e: SecurityException) {
                Log.e("MainActivity", "Error de seguridad en precarga GPS: ${e.message}")
            }
        }
    }

    private fun startLocationUpdates() {
        if (permissionHelper.hasLocationPermission()) {
            try {
                if (locationCallback == null) {
                    locationCallback = object : LocationCallback() {
                        override fun onLocationResult(locationResult: LocationResult) {
                            for (location in locationResult.locations) {
                                if (location != null) {
                                    currentLatitude = location.latitude
                                    currentLongitude = location.longitude
                                    Log.d("MainActivity", "Actualización GPS: $currentLatitude, $currentLongitude, Precisión: ${location.accuracy}m")
                                }
                            }
                        }
                    }
                }
                
                val locationRequest = LocationRequest.Builder(
                    Priority.PRIORITY_HIGH_ACCURACY,
                    15000 // 15 segundos
                ).apply {
                    setMinUpdateIntervalMillis(5000) // Mínimo 5 segundos
                    setWaitForAccurateLocation(false)
                }.build()

                fusedLocationClient.requestLocationUpdates(
                    locationRequest,
                    locationCallback!!,
                    android.os.Looper.getMainLooper()
                )
                Log.d("MainActivity", "Actualizaciones de ubicación activadas (15s)")
            } catch (e: SecurityException) {
                Log.e("MainActivity", "Error al iniciar actualizaciones de ubicación: ${e.message}")
            }
        }
    }

    private fun stopLocationUpdates() {
        locationCallback?.let {
            fusedLocationClient.removeLocationUpdates(it)
            Log.d("MainActivity", "Actualizaciones de ubicación desactivadas")
        }
    }

    private fun getCurrentLocation() {
        if (permissionHelper.hasLocationPermission()) {
            // Si ya tenemos una ubicación válida en memoria (precarga o actualizaciones), centrar instantáneamente
            if (currentLatitude != 0.0 && currentLongitude != 0.0) {
                mMap.animateCamera(CameraUpdateFactory.newLatLngZoom(LatLng(currentLatitude, currentLongitude), 19f))
            }
            try {
                Toast.makeText(this, "Refrescando señal GPS...", Toast.LENGTH_SHORT).show()
                // Intentar obtener ubicación fresca de forma paralela
                fusedLocationClient.getCurrentLocation(
                    com.google.android.gms.location.Priority.PRIORITY_HIGH_ACCURACY,
                    null
                ).addOnSuccessListener { freshLocation ->
                    if (freshLocation != null) {
                        currentLatitude = freshLocation.latitude
                        currentLongitude = freshLocation.longitude
                        mMap.animateCamera(CameraUpdateFactory.newLatLngZoom(LatLng(currentLatitude, currentLongitude), 19f))
                    } else if (currentLatitude == 0.0 || currentLongitude == 0.0) {
                        // Fallback a caché solo si no teníamos coordenadas válidas en memoria
                        fusedLocationClient.lastLocation.addOnSuccessListener { cachedLocation ->
                            if (cachedLocation != null) {
                                currentLatitude = cachedLocation.latitude
                                currentLongitude = cachedLocation.longitude
                                mMap.animateCamera(CameraUpdateFactory.newLatLngZoom(LatLng(currentLatitude, currentLongitude), 19f))
                                Toast.makeText(this, "Usando ubicación en caché (sin cobertura GPS actual)", Toast.LENGTH_SHORT).show()
                            } else {
                                Toast.makeText(this, "No se pudo obtener la ubicación. Verifique que el GPS esté activo.", Toast.LENGTH_LONG).show()
                            }
                        }
                    }
                }.addOnFailureListener { e ->
                    // Fallback a caché si falla el refresco y no teníamos coordenadas válidas en memoria
                    if (currentLatitude == 0.0 || currentLongitude == 0.0) {
                        fusedLocationClient.lastLocation.addOnSuccessListener { cachedLocation ->
                            if (cachedLocation != null) {
                                currentLatitude = cachedLocation.latitude
                                currentLongitude = cachedLocation.longitude
                                mMap.animateCamera(CameraUpdateFactory.newLatLngZoom(LatLng(currentLatitude, currentLongitude), 19f))
                                Toast.makeText(this, "Usando ubicación en caché (Error GPS: ${e.message})", Toast.LENGTH_SHORT).show()
                            } else {
                                Toast.makeText(this, "Error de GPS y sin ubicación en caché: ${e.message}", Toast.LENGTH_LONG).show()
                            }
                        }
                    }
                }
            } catch (e: SecurityException) {
                Toast.makeText(this, "Error de permisos: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        } else {
            Toast.makeText(this, "Permiso de ubicación no concedido", Toast.LENGTH_SHORT).show()
        }
    }

    private fun openFormActivity(lat: Double, lng: Double) {
        val dbHelper = DatabaseHelper.getInstance(this)
        val mun = dbHelper.getMunicipiosAt(lng, lat)
        val sec = dbHelper.getSectorAt(lng, lat)
        
        // Intentar obtener geometría para el área calculada si es posible
        val geom = dbHelper.getGeometry(lng, lat)
        val area = if (geom != null) GeometryUtil.calculateArea32616(geom.jtsGeom!!) else 0.0
        
        // Validación mínima también aquí para mayor seguridad
        if (mun.isNullOrEmpty() || sec.isNullOrEmpty() || (geom != null && geom.localizacion.isNullOrEmpty())) {
            Toast.makeText(this, "⚠️ Información geográfica incompleta para este punto", Toast.LENGTH_LONG).show()
            return
        }

        val intent = Intent(this, FormActivity::class.java).apply {
            putExtra(FormActivity.EXTRA_LATITUDE, lat)
            putExtra(FormActivity.EXTRA_LONGITUDE, lng)
            putExtra(FormActivity.EXTRA_GPS_LATITUDE, currentLatitude)
            putExtra(FormActivity.EXTRA_GPS_LONGITUDE, currentLongitude)
            putExtra(FormActivity.EXTRA_MUNICIPIO_CATALOG, mun)
            putExtra(FormActivity.EXTRA_SECTOR_CATALOG, sec)
            putExtra(FormActivity.EXTRA_AREA_CALCULADA, area)
            if (geom != null) {
                putExtra(FormActivity.EXTRA_ID_OBJECT, geom.id)
                putExtra(FormActivity.EXTRA_ID_LAYER, geom.idLayer)
                putExtra(FormActivity.EXTRA_ID_PREDIO, geom.idPredio)
                putExtra(FormActivity.EXTRA_LOCALIZACION, geom.localizacion)
                putExtra(FormActivity.EXTRA_LAYER_NAME, geom.layer)
            }
        }
        startActivity(intent)
    }

    /**
     * Punto de entrada unificado: cualquier posición (click en carto o click en marcador)
     * pasa por aquí. Resuelve toda la información espacial del predio y lanza FormActivity.
     */
    private fun handleMapPosition(latLng: com.google.android.gms.maps.model.LatLng, singleGroupPoint: Boolean = true) {
        searchPolygonOverlay?.remove()
        searchPolygonOverlay = null
        
        val dbHelper = DatabaseHelper.getInstance(this)
        
        kotlin.concurrent.thread {
            // 1. Interceptar la geometría del predio en base a las coordenadas de click/marcador (Operación pesada / BD)
            val geom = dbHelper.getGeometry(latLng.longitude, latLng.latitude)
            if (geom == null) {
                runOnUiThread {
                    Toast.makeText(this@MainActivity, "Ningún objeto interceptado", Toast.LENGTH_SHORT).show()
                }
                return@thread
            }

            // 2. Determinar los puntos capturados existentes para la coordenada destino (Operación pesada / BD)
            val existingPoints = if (singleGroupPoint) {
                dbHelper.getDataByObjectId(geom.id)
            } else {
                dbHelper.getDataByObjectId(geom.id, latLng.latitude, latLng.longitude, 3.0)
            }

            val targetLat: Double
            val targetLng: Double
            if (existingPoints.isNotEmpty()) {
                // 3a. Snapping: Si ya existe un punto en el conjunto evaluado, se reutiliza su coordenada
                targetLat = existingPoints[0].latitud
                targetLng = existingPoints[0].longitud
            } else {
                // 3b. Creación de punto nuevo:
                if (singleGroupPoint) {
                    // En agrupación única, el primer punto del predio se sitúa en su polo de inaccesibilidad (Operación pesada JTS)
                    val pole = GeometryUtil.getPoleOfInaccessibility(geom.jtsGeom!!)
                    targetLat = pole.latitude
                    targetLng = pole.longitude
                } else {
                    // En agrupación por cercanía, los puntos nuevos se posicionan exactamente donde el usuario hizo click
                    targetLat = latLng.latitude
                    targetLng = latLng.longitude
                }
            }

            // Recolección de datos espaciales (Operación pesada JTS / BD)
            val mun  = dbHelper.getMunicipiosAt(latLng.longitude, latLng.latitude)
            val mza  = dbHelper.getManzanaForPredio(geom.jtsGeom!!)
            val sec  = mza // Sector = Manzana (misma entidad catastral)
            val lote = dbHelper.getLoteForPredio(geom.jtsGeom!!)
            val area = GeometryUtil.calculateArea32616(geom.jtsGeom!!)

            // Validación de datos esenciales y lanzamiento (en Hilo Principal)
            runOnUiThread {
                if (mun.isNullOrEmpty()) {
                    Toast.makeText(this@MainActivity, "⚠️ Error: No se pudo identificar el municipio en esta zona", Toast.LENGTH_LONG).show()
                    return@runOnUiThread
                }
                if (mza.isNullOrEmpty()) {
                    Toast.makeText(this@MainActivity, "⚠️ Error: No se pudo identificar la manzana para este predio", Toast.LENGTH_LONG).show()
                    return@runOnUiThread
                }
                if (lote.isNullOrEmpty()) {
                    android.app.AlertDialog.Builder(this@MainActivity)
                        .setTitle("Lote No Identificado")
                        .setMessage("No se pudo identificar el lote para este predio.\n\nClick en:\nLat: $targetLat\nLng: $targetLng")
                        .setPositiveButton("OK", null)
                        .show()
                    return@runOnUiThread
                }
                if (geom.localizacion.isNullOrEmpty()) {
                    Toast.makeText(this@MainActivity, "⚠️ Error: El predio seleccionado no tiene código de localización", Toast.LENGTH_LONG).show()
                    return@runOnUiThread
                }

                val intent = Intent(this@MainActivity, FormActivity::class.java).apply {
                    putExtra(FormActivity.EXTRA_LATITUDE, targetLat)
                    putExtra(FormActivity.EXTRA_LONGITUDE, targetLng)
                    putExtra(FormActivity.EXTRA_GPS_LATITUDE, currentLatitude)
                    putExtra(FormActivity.EXTRA_GPS_LONGITUDE, currentLongitude)
                    putExtra(FormActivity.EXTRA_ID_OBJECT, geom.id)
                    putExtra(FormActivity.EXTRA_ID_LAYER, geom.idLayer)
                    putExtra(FormActivity.EXTRA_ID_PREDIO, geom.idPredio)
                    putExtra(FormActivity.EXTRA_LOCALIZACION, geom.localizacion)
                    putExtra(FormActivity.EXTRA_LAYER_NAME, geom.layer)
                    putExtra(FormActivity.EXTRA_MUNICIPIO_CATALOG, mun)
                    putExtra(FormActivity.EXTRA_SECTOR_CATALOG, sec)
                    putExtra(FormActivity.EXTRA_MANZANA_CATALOG, mza)
                    putExtra(FormActivity.EXTRA_LOTE_CATALOG, lote)
                    putExtra(FormActivity.EXTRA_AREA_CALCULADA, area)
                }
                startActivity(intent)
            }
        }
    }

    private fun checkEncuestador() {
        val dbHelper = DatabaseHelper.getInstance(this)
        if (dbHelper.getEncuestador().isNullOrEmpty()) {
            dialogHelper.showEncuestadorDialog { name ->
                Toast.makeText(this, "Encuestador configurado: $name", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun checkAuthentication() {
        if (SecurityManager.currentUser == null) {
            dialogHelper.showAuthDialog(
                onAuthenticated = { Toast.makeText(this, "Bienvenido, ${SecurityManager.currentUser?.fullName}", Toast.LENGTH_SHORT).show() },
                onExit = { exitApp() }
            )
        }
    }

    override fun onCreateOptionsMenu(menu: android.view.Menu?): Boolean {
        menuInflater.inflate(R.menu.main_menu, menu)
        return true
    }

    override fun onPrepareOptionsMenu(menu: android.view.Menu?): Boolean {
        super.onPrepareOptionsMenu(menu)
        val infoItem = menu?.findItem(R.id.menu_user_info)
        val changePassItem = menu?.findItem(R.id.menu_change_password)
        val adminPassItem = menu?.findItem(R.id.menu_admin_passwords)
        val importItem = menu?.findItem(R.id.menu_import_users)
        val clearDataItem = menu?.findItem(R.id.menu_clear_data)
        val importDbItem = menu?.findItem(R.id.menu_import_db)
        val exportDbItem = menu?.findItem(R.id.menu_export_db)
        val searchPredioItem = menu?.findItem(R.id.menu_search_predio)

        val user = SecurityManager.currentUser
        infoItem?.title = "👤 " + (user?.fullName ?: "Desconocido")
        val isAdmin = user?.isAdmin == true || user?.userName == "ADMIN" || user?.userName == "MASTER"
        importItem?.isVisible = isAdmin
        searchPredioItem?.isVisible = isAdmin
        adminPassItem?.isVisible = isAdmin
        clearDataItem?.isVisible = isAdmin
        importDbItem?.isVisible = isAdmin
        exportDbItem?.isVisible = isAdmin
        changePassItem?.isVisible = user?.userName != "MASTER"
        return true
    }

    override fun onOptionsItemSelected(item: android.view.MenuItem): Boolean {
        return when (item.itemId) {
            R.id.menu_change_password -> { dialogHelper.showChangePasswordDialog(); true }
            R.id.menu_admin_passwords -> { startActivity(Intent(this, ManageUsersActivity::class.java)); true }
            R.id.menu_import_users -> { importDeviceUsersFile(); true }
            R.id.menu_clear_data -> { clearAllData(); true }
            R.id.menu_import_db -> { importExternalDb(); true }
            R.id.menu_export_db -> { exportExternalDb(); true }
            R.id.menu_statistics -> { dialogHelper.showStatisticsDialog(); true }
            R.id.menu_search_predio -> { showSearchPredioDialog(); true }
            R.id.menu_locate_and_open -> { showLocateAndOpenDialog(); true }
            R.id.menu_about -> { dialogHelper.showAboutDialog(30); true }
            R.id.menu_exit -> { exitApp(); true }
            else -> super.onOptionsItemSelected(item)
        }
    }

    private fun importDeviceUsersFile() {
        val storageDir = AppConfig.getStorageDirectory()
        val sourceFile = java.io.File(storageDir, "DeviceUsers.json")
        val targetFile = java.io.File(filesDir, "DeviceUsers.json")

        if (!sourceFile.exists()) {
            Toast.makeText(this, "⚠️ No se encontró el archivo DeviceUsers.json", Toast.LENGTH_LONG).show()
            return
        }
        try {
            sourceFile.copyTo(targetFile, overwrite = true)
            sourceFile.delete()
            SecurityManager.currentUser = null
            checkAuthentication()
        } catch (e: Exception) {
            Toast.makeText(this, "❌ Error importando: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }

    /**
     * Elimina TODOS los registros de encuesta (tabla DATOS).
     * Requiere doble confirmación explícita del administrador.
     */
    private fun clearAllData() {
        val dbHelper = DatabaseHelper.getInstance(this)
        val totalRegistros = dbHelper.countAllData()

        // Primera advertencia
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("⚠️ Limpiar Todos los Datos")
            .setMessage(
                "Esta acción eliminará PERMANENTEMENTE todos los registros de encuesta.\n\n" +
                "📊 Registros actuales: $totalRegistros\n\n" +
                "⛔ Esta operación NO SE PUEDE DESHACER.\n\n" +
                "¿Desea continuar?"
            )
            .setPositiveButton("Continuar ▶") { _, _ ->
                // Segunda confirmación final
                androidx.appcompat.app.AlertDialog.Builder(this)
                    .setTitle("🛑 CONFIRMACIÓN FINAL")
                    .setMessage(
                        "Va a eliminar $totalRegistros registros de forma IRREVERSIBLE.\n\n" +
                        "Presione \"ELIMINAR TODO\" para confirmar."
                    )
                    .setPositiveButton("ELIMINAR TODO") { _, _ ->
                        val result = DataCleaner(dbHelper).deleteAll()
                        if (result.deletedRecords >= 0) {
                            mapHelper?.loadCapturedPoints(-1)
                            updateActionBarTitle()

                            if (result.failedPhotos > 0) {
                                // Advertencia: algunas fotos no pudieron eliminarse
                                androidx.appcompat.app.AlertDialog.Builder(this)
                                    .setTitle("⚠️ Limpieza completada con advertencias")
                                    .setMessage(
                                        "✅ ${result.deletedRecords} registros eliminados (ID reseteado a 1).\n" +
                                        "📷 ${result.deletedPhotos} fotos eliminadas.\n\n" +
                                        "⚠️ ${result.failedPhotos} foto(s) NO pudieron eliminarse del disco.\n" +
                                        "Puede que estén siendo usadas por otro proceso o que no tengan permisos de escritura."
                                    )
                                    .setPositiveButton("Aceptar", null)
                                    .show()
                            } else {
                                Toast.makeText(
                                    this,
                                    "✅ ${result.deletedRecords} registros y ${result.deletedPhotos} fotos eliminados. ID reseteado.",
                                    Toast.LENGTH_LONG
                                ).show()
                            }
                        } else {
                            Toast.makeText(this, "❌ Error al eliminar los datos. Intente nuevamente.", Toast.LENGTH_LONG).show()
                        }
                    }
                    .setNegativeButton("Cancelar", null)
                    .show()
            }
            .setNegativeButton("Cancelar", null)
            .show()
    }

    /**
     * Fase 1: Abre el navegador de archivos propio para seleccionar una BD SQLite externa.
     * El flujo continúa en importExternalDb_onFilePathResolved().
     */
    private fun importExternalDb() {
        FileBrowserDialog(
            activity        = this,
            validExtensions = setOf("db", "sqlite", "sqlite3", "db3")
        ) { filePath ->
            importExternalDb_onFilePathResolved(filePath)
        }.show()
    }

    /**
     * Fase 1b: Recibe el path resuelto del archivo seleccionado, valida la BD y prepara la fase 2.
     */
    private fun importExternalDb_onFilePathResolved(filePath: String) {
        // 1. Validar extensión SQLite
        val ext = filePath.substringAfterLast('.', "").lowercase()
        if (ext !in setOf("db", "sqlite", "sqlite3", "db3")) {
            showImportError(
                "El archivo seleccionado no tiene una extensión SQLite válida.\n\n" +
                "Extensiones permitidas: .db · .sqlite · .sqlite3 · .db3\n" +
                "Extensión recibida: .$ext"
            )
            return
        }

        // 3. Abrir BD externa en modo solo lectura (sin copiar el archivo)
        val externalDb = try {
            SQLiteDatabase.openDatabase(filePath, null, SQLiteDatabase.OPEN_READONLY)
        } catch (e: Exception) {
            showImportError("No se pudo abrir la base de datos:\n\n${e.message}")
            return
        }

        try {
            // 4. Chequeo 1: ¿existe la tabla DATOS?
            val tableCursor = externalDb.rawQuery(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='DATOS'", null
            )
            val hasTable = tableCursor.moveToFirst()
            tableCursor.close()
            if (!hasTable) {
                showImportError("La base de datos seleccionada no contiene la tabla DATOS.")
                return
            }

            // 5. Chequeo 2: columnas mínimas requeridas
            val required = setOf("IDOBJECT", "DATOS", "FECHA", "LATITUD", "LONGITUD", "LATITUDGPS", "LONGITUDGPS")
            val colCursor = externalDb.rawQuery("PRAGMA table_info(DATOS)", null)
            val actual = mutableSetOf<String>()
            while (colCursor.moveToNext()) {
                val idx = colCursor.getColumnIndex("name")
                if (idx >= 0) actual.add(colCursor.getString(idx).uppercase())
            }
            colCursor.close()
            val missing = required - actual
            if (missing.isNotEmpty()) {
                showImportError(
                    "La tabla DATOS no tiene el formato esperado.\n\n" +
                    "Columnas faltantes: ${missing.joinToString(", ")}"
                )
                return
            }

            // 6. Chequeo 3: ¿no está vacía?
            val countCursor = externalDb.rawQuery("SELECT COUNT(*) FROM DATOS", null)
            val count = if (countCursor.moveToFirst()) countCursor.getInt(0) else 0
            countCursor.close()
            if (count == 0) {
                showImportError(
                    "La tabla DATOS del archivo seleccionado está vacía.\n" +
                    "No hay registros para importar."
                )
                return
            }

            // 7. Todo validado — guardar ruta y confirmar con el usuario
            val fileName = java.io.File(filePath).name
            validatedExternalDbPath = filePath
            androidx.appcompat.app.AlertDialog.Builder(this)
                .setTitle("✅ Base de Datos Válida")
                .setMessage(
                    "Archivo: $fileName\n" +
                    "Registros disponibles: $count\n\n" +
                    "La base de datos está lista para importar."
                )
                .setPositiveButton("Continuar") { _, _ ->
                    importExternalDb_phase2_validateDomain()
                }
                .setNegativeButton("Cancelar") { _, _ ->
                    validatedExternalDbPath = null
                }
                .show()

        } finally {
            externalDb.close()
        }
    }

    /**
     * Fase 2: Valida que TODOS los registros de la BD externa pertenezcan al dominio
     * geográfico local (polígonos Predios via wkb). Corre en background con progress.
     * Para en el primer registro inconsistente y reporta con detalle.
     */
    private fun importExternalDb_phase2_validateDomain() {
        val dbPath = validatedExternalDbPath ?: return
        val localDbHelper = DatabaseHelper.getInstance(this)
        importManager = try {
            ImportManager(localDbHelper, dbPath)
        } catch (e: IllegalArgumentException) {
            showImportError(e.message ?: "Error de configuración de importación.")
            validatedExternalDbPath = null
            return
        }

        val progressDialog = ProgressDialog(this).apply {
            setTitle("Validando dominio geográfico")
            setMessage("Preparando...")
            setProgressStyle(ProgressDialog.STYLE_HORIZONTAL)
            setCancelable(false)
            max = 100
            show()
        }

        Thread {
            val externalDb = try {
                SQLiteDatabase.openDatabase(dbPath, null, SQLiteDatabase.OPEN_READONLY)
            } catch (e: Exception) {
                runOnUiThread {
                    progressDialog.dismiss()
                    showImportError("No se pudo reabrir la base de datos:\n\n${e.message}")
                    importManager?.clear(); importManager = null
                    validatedExternalDbPath = null
                }
                return@Thread
            }

            try {
                val cursor = externalDb.rawQuery(
                    "SELECT ID, LATITUD, LONGITUD FROM DATOS ORDER BY ID", null
                )
                val total = cursor.count
                var processed = 0
                var failedId: Int? = null
                var failedLat = 0.0
                var failedLng = 0.0

                cursor.use {
                    while (it.moveToNext()) {
                        val id  = it.getInt(0)
                        val lat = it.getDouble(1)
                        val lng = it.getDouble(2)
                        processed++

                        runOnUiThread {
                            progressDialog.progress = if (total > 0) (processed * 100 / total) else 0
                            progressDialog.setMessage("Verificando $processed de $total...")
                        }

                        val geom = localDbHelper.getGeometry(lng, lat, "Predios")
                        if (geom == null) {
                            failedId  = id
                            failedLat = lat
                            failedLng = lng
                            break
                        }
                        // Registrar en diccionario + localRowIds (solo primera vez por predio)
                        importManager?.addRecord(id, geom)
                    }
                }

                runOnUiThread {
                    progressDialog.dismiss()
                    if (failedId != null) {
                        importManager?.clear(); importManager = null
                        validatedExternalDbPath = null
                        showImportError(
                            "Registro fuera del dominio geográfico:\n\n" +
                            "ID: $failedId\n" +
                            "Lat: $failedLat\nLng: $failedLng\n\n" +
                            "Este archivo no pertenece al dominio de esta base de datos.\n" +
                            "Importación cancelada."
                        )
                    } else {
                        importExternalDb_phase3_showDecision()
                    }
                }

            } catch (e: Exception) {
                runOnUiThread {
                    progressDialog.dismiss()
                    showImportError("Error durante la validación geográfica:\n\n${e.message}")
                    importManager?.clear(); importManager = null
                    validatedExternalDbPath = null
                }
            } finally {
                externalDb.close()
            }
        }.start()
    }

    /**
     * Fase 3: Analiza el diccionario y presenta la UI de decisión adecuada.
     * Sin conflictos → confirmación simple. Con conflictos → checklist multiselección por predio.
     */
    private fun importExternalDb_phase3_showDecision() {
        val manager = importManager ?: return
        val conflictEntries = manager.conflictEntries()
        val totalRecords    = manager.totalExternalRecords()
        val totalPredios    = manager.dictionary.size

        if (conflictEntries.isEmpty()) {
            // Sin conflictos: confirmación directa
            androidx.appcompat.app.AlertDialog.Builder(this)
                .setTitle("✅ Sin Datos Duplicados")
                .setMessage(
                    "Listo para importar:\n\n" +
                    "· Predios: $totalPredios\n" +
                    "· Registros: $totalRecords\n\n" +
                    "No se encontraron datos duplicados.\n¿Desea proceder?"
                )
                .setPositiveButton("Importar") { _, _ -> importExternalDb_phase3c_execute() }
                .setNegativeButton("Cancelar") { _, _ ->
                    importManager?.clear(); importManager = null; validatedExternalDbPath = null
                }
                .show()
        } else {
            // Con conflictos: checklist multiselección por predio
            val newCount = manager.newEntries().size
            val items = conflictEntries.map { entry ->
                "${entry.localGeom.localizacion}  ·  " +
                "${entry.externalRowIds.size} entrantes / " +
                "${entry.localRowIds.size} existentes"
            }.toTypedArray()
            val checked = BooleanArray(conflictEntries.size) { true }

            val titleSuffix = if (newCount > 0) "  (+ $newCount nuevos)" else ""
            val dialog = androidx.appcompat.app.AlertDialog.Builder(this)
                .setTitle(
                    "⚠️ Conflictos — ${conflictEntries.size} predios con datos existentes$titleSuffix\n" +
                    "Seleccione cuáles desea reemplazar:"
                )
                .setMultiChoiceItems(items, checked) { _, which, isChecked ->
                    checked[which] = isChecked
                    conflictEntries[which].selectedForImport = isChecked
                }
                .setNeutralButton("Desmarcar todos") { _, _ -> } // listener sobreescrito abajo
                .setPositiveButton("Importar seleccionados") { _, _ ->
                    importExternalDb_phase3c_execute()
                }
                .setNegativeButton("Cancelar") { _, _ ->
                    importManager?.clear(); importManager = null; validatedExternalDbPath = null
                }
                .show()

            // Sobreescribir neutral button para evitar que cierre el diálogo al pulsarlo
            dialog.getButton(androidx.appcompat.app.AlertDialog.BUTTON_NEUTRAL).setOnClickListener {
                val allChecked = checked.all { it }
                val newState   = !allChecked
                for (i in checked.indices) {
                    checked[i] = newState
                    conflictEntries[i].selectedForImport = newState
                    dialog.listView.setItemChecked(i, newState)
                }
                dialog.getButton(androidx.appcompat.app.AlertDialog.BUTTON_NEUTRAL).text =
                    if (newState) "Desmarcar todos" else "Marcar todos"
            }
        }
    }

    /**
     * Fase 3c: Ejecuta la importación en background thread con transacciones por predio.
     */
    private fun importExternalDb_phase3c_execute() {
        val manager = importManager ?: return

        val progressDialog = ProgressDialog(this).apply {
            setTitle("Importando datos...")
            setMessage("Preparando...")
            setProgressStyle(ProgressDialog.STYLE_HORIZONTAL)
            setCancelable(false)
            max = manager.dictionary.size
            show()
        }

        Thread {
            try {
                val result = manager.executeImport { current, total, message ->
                    runOnUiThread {
                        progressDialog.progress = current
                        progressDialog.setMessage(message)
                    }
                }

                runOnUiThread {
                    progressDialog.dismiss()
                    mapHelper?.loadCapturedPoints(-1)
                    updateActionBarTitle()

                    val sb = StringBuilder("Importación completada:\n\n")
                    if (result.newPredios > 0)
                        sb.append("· ${result.importedNew} registros importados (${result.newPredios} predios nuevos)\n")
                    if (result.replacedPredios > 0)
                        sb.append("· ${result.replacedRecords} registros reemplazados (${result.replacedPredios} predios)\n")
                    if (result.skippedPredios > 0)
                        sb.append("· ${result.skippedPredios} predios omitidos por el usuario\n")

                    androidx.appcompat.app.AlertDialog.Builder(this@MainActivity)
                        .setTitle("✅ Importación Completada")
                        .setMessage(sb.toString().trim())
                        .setPositiveButton("OK") { _, _ ->
                            importManager = null
                            validatedExternalDbPath = null
                        }
                        .show()
                }
            } catch (e: ImportManager.ImportTransactionException) {
                runOnUiThread {
                    progressDialog.dismiss()
                    // Recargar mapa para reflejar lo importado hasta el punto de fallo
                    mapHelper?.loadCapturedPoints(-1)
                    updateActionBarTitle()
                    androidx.appcompat.app.AlertDialog.Builder(this@MainActivity)
                        .setTitle("❌ ERROR CRÍTICO — Importación Abortada")
                        .setMessage(
                            "Predio afectado: ${e.localizacion}\n\n" +
                            "${e.message}\n\n" +
                            "⚠️ Los predios importados ANTES del fallo se conservan.\n" +
                            "Los predios restantes NO fueron importados."
                        )
                        .setPositiveButton("Aceptar") { _, _ ->
                            importManager = null
                            validatedExternalDbPath = null
                        }
                        .show()
                }
            } catch (e: Exception) {
                runOnUiThread {
                    progressDialog.dismiss()
                    showImportError("Error durante la importación:\n\n${e.message}")
                    importManager = null
                    validatedExternalDbPath = null
                }
            }
        }.start()
    }

    /**
     * Muestra un diálogo de error estandarizado para el flujo de importación.
     */
    private fun showImportError(msg: String) {
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("⚠️ Error de Importación")
            .setMessage(msg)
            .setPositiveButton("OK", null)
            .show()
    }

    /**
     * Resuelve la ruta real del sistema de archivos a partir de un content URI.
     * Requiere permiso MANAGE_EXTERNAL_STORAGE para acceso completo.
     */
    private fun getRealFilePathFromUri(uri: Uri): String? {
        // URI tipo file:// → ruta directa
        if ("file".equals(uri.scheme, ignoreCase = true)) return uri.path

        // DocumentsProvider (Android 4.4+)
        if (DocumentsContract.isDocumentUri(this, uri)) {
            val docId = DocumentsContract.getDocumentId(uri)
            when (uri.authority) {
                "com.android.externalstorage.documents" -> {
                    val parts = docId.split(":")
                    return if ("primary".equals(parts[0], ignoreCase = true))
                        "${Environment.getExternalStorageDirectory()}/${parts[1]}"
                    else
                        "/storage/${parts[0]}/${parts[1]}"
                }
                "com.android.providers.downloads.documents" -> {
                    return try {
                        val contentUri = ContentUris.withAppendedId(
                            Uri.parse("content://downloads/public_downloads"),
                            docId.toLong()
                        )
                        getDataColumn(contentUri)
                    } catch (e: Exception) { null }
                }
            }
        }

        // Fallback: content:// genérico → columna _data
        if ("content".equals(uri.scheme, ignoreCase = true)) return getDataColumn(uri)

        return null
    }

    /** Obtiene el valor de la columna _data de un content URI. */
    private fun getDataColumn(uri: Uri): String? {
        contentResolver.query(uri, arrayOf("_data"), null, null, null)?.use { cursor ->
            if (cursor.moveToFirst()) {
                return try {
                    cursor.getString(cursor.getColumnIndexOrThrow("_data"))
                } catch (e: Exception) { null }
            }
        }
        return null
    }

    private fun exitApp() {
        dialogHelper.showExitDialog(
            onConfirm = {
                if (::mMap.isInitialized) mMap.clear()
                SecurityManager.currentUser = null
                finishAffinity()
            },
            onCancel = { checkAuthentication() }
        )
    }

    private fun updateActionBarTitle() {
        try {
            val appTitle = getString(R.string.app_name)
            binding.toolbarTitle.text = appTitle
            
            val subtitleText = if (DatabaseHelper.isDatabaseAvailable()) {
                val dbHelper = DatabaseHelper.getInstance(this)
                val todayCount = dbHelper.getTodayStatisticsCount()
                "Hoy: $todayCount"
            } else {
                "Hoy: --"
            }
            binding.toolbarSubtitle.text = subtitleText
        } catch (e: Exception) {
            e.printStackTrace()
            try {
                binding.toolbarTitle.text = getString(R.string.app_name)
                binding.toolbarSubtitle.text = ""
            } catch (ex: Exception) {
                ex.printStackTrace()
            }
        }
    }

    private fun checkAppDomain(): Boolean {
        if (DatabaseHelper.isDatabaseAvailable()) {
            try {
                // Instanciar para forzar la lectura del config si no se ha hecho
                DatabaseHelper.getInstance(this)
                if (AppConfig.AppDomainId != BuildConfig.APPLICATION_ID) {
                    dialogHelper.showFatalErrorDialog(
                        "Error de Dominio:\n\nLa base de datos cargada no coincide con el dominio asignado a esta aplicación.\n\nLa aplicación se cerrará."
                    )
                    return false
                }
            } catch (e: Exception) {
                Log.e("MainActivity", "Error comprobando dominio: ${e.message}")
            }
        }
        return true
    }

    private fun exportExternalDb() {
        FolderBrowserDialog(this) { dirPath ->
            try {
                val dbHelper = DatabaseHelper.getInstance(this)
                val manager = ExportManager(dbHelper, dirPath)
                val localizacionesMap = manager.getExportableLocalizaciones()

                if (localizacionesMap.isEmpty()) {
                    androidx.appcompat.app.AlertDialog.Builder(this)
                        .setTitle("⚠️ Sin datos exportables")
                        .setMessage("No existen encuestas de catastros registradas en la base de datos local para exportar.")
                        .setPositiveButton("OK", null)
                        .show()
                } else {
                    val targetDbFile = java.io.File(dirPath, AppConfig.DATABASE_NAME)
                    if (targetDbFile.exists()) {
                        androidx.appcompat.app.AlertDialog.Builder(this)
                            .setTitle("⚠️ Base de Datos Existente")
                            .setMessage("Se detectó un archivo '${AppConfig.DATABASE_NAME}' en el directorio seleccionado. Si continúa, este archivo se sobrescribirá por completo.\n\n¿Desea continuar?")
                            .setPositiveButton("Continuar") { _, _ ->
                                exportExternalDb_phase2_selectPredios(manager, localizacionesMap)
                            }
                            .setNegativeButton("Cancelar") { _, _ ->
                                exportExternalDb() // Reabre el selector de directorios
                            }
                            .show()
                    } else {
                        exportExternalDb_phase2_selectPredios(manager, localizacionesMap)
                    }
                }
            } catch (e: IllegalArgumentException) {
                androidx.appcompat.app.AlertDialog.Builder(this)
                    .setTitle("⚠️ Directorio Inválido")
                    .setMessage(e.message)
                    .setPositiveButton("OK", null)
                    .show()
            } catch (e: Exception) {
                androidx.appcompat.app.AlertDialog.Builder(this)
                    .setTitle("⚠️ Error de Exportación")
                    .setMessage("Ocurrió un error al iniciar la exportación:\n\n${e.message}")
                    .setPositiveButton("OK", null)
                    .show()
            }
        }.show()
    }

    private fun exportExternalDb_phase2_selectPredios(manager: ExportManager, localizacionesMap: Map<String, Int>) {
        val context = this
        val predioList = localizacionesMap.keys.toList()
        val manzanaList = try { manager.getExportableManzanas() } catch(e: Exception) { emptyList() }

        // Estados de selección
        val checkedPredios = BooleanArray(predioList.size) { true }
        val checkedManzanas = BooleanArray(manzanaList.size) { true }

        // Crear contenedor principal
        val container = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(36, 24, 36, 16)
        }

        // CheckBox superior
        val checkBox = CheckBox(context).apply {
            text = "Exportación por manzanas"
            isChecked = false
            textSize = 16f
            setPadding(0, 0, 0, 24)
        }
        container.addView(checkBox)

        // ListView multiselección
        val listView = ListView(context).apply {
            choiceMode = ListView.CHOICE_MODE_MULTIPLE
            divider = null
        }
        container.addView(listView)

        // Textos para los adapters
        val predioTexts = predioList.map { loc -> "$loc  ·  (${localizacionesMap[loc]} puntos)" }
        val manzanaTexts = manzanaList.map { m -> "${m.codManzana}  ·  (${m.predios.size} predios, ${m.totalRecords} puntos)" }

        // Función para poblar/refrescar la lista según el modo actual
        fun refreshList(showManzanas: Boolean) {
            val items = if (showManzanas) manzanaTexts else predioTexts
            val adapter = ArrayAdapter(context, android.R.layout.simple_list_item_multiple_choice, items)
            listView.adapter = adapter

            // Aplicar selecciones guardadas
            val activeChecked = if (showManzanas) checkedManzanas else checkedPredios
            for (i in activeChecked.indices) {
                listView.setItemChecked(i, activeChecked[i])
            }
        }

        // Inicializar por defecto (por predio)
        refreshList(false)

        // Listener del checkbox para alternar modos
        checkBox.setOnCheckedChangeListener { _, isChecked ->
            // 1. Guardar estado del modo anterior
            val wasManzana = !isChecked
            val oldChecked = if (wasManzana) checkedManzanas else checkedPredios
            for (i in oldChecked.indices) {
                oldChecked[i] = listView.isItemChecked(i)
            }

            // 2. Cargar y aplicar estado del nuevo modo
            refreshList(isChecked)
        }

        val dialog = androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("Seleccione los elementos a exportar:")
            .setView(container)
            .setNeutralButton("Desmarcar todos") { _, _ -> } // Se sobrescribe abajo
            .setPositiveButton("Exportar") { _, _ ->
                // Guardar la selección final activa en la lista
                val isManzanaMode = checkBox.isChecked
                val activeChecked = if (isManzanaMode) checkedManzanas else checkedPredios
                for (i in activeChecked.indices) {
                    activeChecked[i] = listView.isItemChecked(i)
                }

                // Resolver lista de predios a exportar
                val selectedPredios = mutableListOf<String>()
                if (isManzanaMode) {
                    for (i in checkedManzanas.indices) {
                        if (checkedManzanas[i]) {
                            selectedPredios.addAll(manzanaList[i].predios)
                        }
                    }
                } else {
                    for (i in checkedPredios.indices) {
                        if (checkedPredios[i]) {
                            selectedPredios.add(predioList[i])
                        }
                    }
                }

                // Limpiar duplicados y ejecutar
                val finalSelection = selectedPredios.distinct()
                if (finalSelection.isEmpty()) {
                    Toast.makeText(context, "Debe seleccionar al menos un elemento para exportar", Toast.LENGTH_SHORT).show()
                } else {
                    exportExternalDb_phase3_execute(manager, finalSelection)
                }
            }
            .setNegativeButton("Cancelar", null)
            .show()

        // Sobrescribir neutral button para alternar marcar/desmarcar todos sin cerrar diálogo
        dialog.getButton(androidx.appcompat.app.AlertDialog.BUTTON_NEUTRAL).setOnClickListener {
            val isManzanaMode = checkBox.isChecked
            val activeChecked = if (isManzanaMode) checkedManzanas else checkedPredios
            
            // Determinar si todos están marcados
            var allChecked = true
            for (i in activeChecked.indices) {
                if (!listView.isItemChecked(i)) {
                    allChecked = false
                    break
                }
            }
            val newState = !allChecked

            // Aplicar nuevo estado visual y guardarlo
            for (i in activeChecked.indices) {
                activeChecked[i] = newState
                listView.setItemChecked(i, newState)
            }
            dialog.getButton(androidx.appcompat.app.AlertDialog.BUTTON_NEUTRAL).text =
                if (newState) "Desmarcar todos" else "Marcar todos"
        }
    }

    private fun exportExternalDb_phase3_execute(manager: ExportManager, selected: List<String>) {
        val progressDialog = ProgressDialog(this).apply {
            setTitle("Exportando datos...")
            setMessage("Iniciando copia de base de datos...")
            setProgressStyle(ProgressDialog.STYLE_HORIZONTAL)
            setCancelable(false)
            max = selected.size
            show()
        }

        Thread {
            try {
                val result = manager.executeExport(selected) { current, total, message ->
                    runOnUiThread {
                        progressDialog.progress = current
                        progressDialog.setMessage(message)
                    }
                }

                runOnUiThread {
                    progressDialog.dismiss()
                    androidx.appcompat.app.AlertDialog.Builder(this@MainActivity)
                        .setTitle("✅ Exportación Completada")
                        .setMessage(
                            "Los datos han sido exportados exitosamente al destino.\n\n" +
                            "· Predios exportados: ${selected.size}\n" +
                            "· Registros exportados: ${result.exportedRecords}\n" +
                            "· Fotos copiadas: ${result.exportedPhotos}"
                        )
                        .setPositiveButton("OK", null)
                        .show()
                }
            } catch (e: Exception) {
                runOnUiThread {
                    progressDialog.dismiss()
                    androidx.appcompat.app.AlertDialog.Builder(this@MainActivity)
                        .setTitle("❌ ERROR — Exportación Fallida")
                        .setMessage(
                            "Ocurrió un fallo durante la exportación y se revirtieron los cambios parciales.\n\n" +
                            "Detalle:\n${e.message}"
                        )
                        .setPositiveButton("Aceptar", null)
                        .show()
                }
            }
        }.start()
    }

    private fun showSearchPredioDialog() {
        val input = android.widget.EditText(this)
        input.hint = "Ej: 01-01-01-01-001"
        
        val lp = android.widget.LinearLayout.LayoutParams(
            android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
            android.widget.LinearLayout.LayoutParams.MATCH_PARENT
        )
        input.layoutParams = lp
        val container = android.widget.LinearLayout(this)
        container.setPadding(50, 20, 50, 0)
        container.addView(input)

        android.app.AlertDialog.Builder(this)
            .setTitle("Buscar Predio")
            .setMessage("Ingrese la localización del predio:")
            .setView(container)
            .setPositiveButton("Buscar") { _, _ ->
                val localizacion = input.text.toString().trim()
                if (localizacion.isNotEmpty()) {
                    searchAndDrawPredio(localizacion)
                }
            }
            .setNegativeButton("Cancelar", null)
            .show()
    }

    private fun searchAndDrawPredio(localizacion: String) {
        searchPolygonOverlay?.remove()
        searchPolygonOverlay = null

        val dbHelper = DatabaseHelper.getInstance(this)
        val wkbBytes = dbHelper.getPredioWkbByLocalizacion(localizacion)

        if (wkbBytes == null) {
            Toast.makeText(this, "No se encontró el predio con localización: $localizacion", Toast.LENGTH_LONG).show()
            return
        }

        val geom = GeometryUtil.wkbToGeometry(wkbBytes)
        if (geom == null) {
            Toast.makeText(this, "No se pudo interpretar la geometría del predio", Toast.LENGTH_LONG).show()
            return
        }

        val polygonCoordinates = GeometryUtil.getPolygonCoordinates(geom)
        if (polygonCoordinates.isEmpty()) {
            Toast.makeText(this, "La geometría no es un polígono válido", Toast.LENGTH_LONG).show()
            return
        }

        val polygonOptions = com.google.android.gms.maps.model.PolygonOptions()
            .strokeColor(android.graphics.Color.RED)
            .strokeWidth(3f)
            .fillColor(android.graphics.Color.argb(100, 255, 0, 0))
            .zIndex(4000f)

        val boundsBuilder = com.google.android.gms.maps.model.LatLngBounds.Builder()

        for (ring in polygonCoordinates) {
            polygonOptions.addAll(ring)
            for (point in ring) {
                boundsBuilder.include(point)
            }
        }

        searchPolygonOverlay = mMap.addPolygon(polygonOptions)

        try {
            val bounds = boundsBuilder.build()
            val dbMaxZoom = dbHelper.getMaxZoom()
            val finalMaxZoom = if (dbMaxZoom > 0) kotlin.math.min(21, dbMaxZoom).toFloat() else 21f
            
            mMap.animateCamera(com.google.android.gms.maps.CameraUpdateFactory.newLatLngBounds(bounds, 100), object : GoogleMap.CancelableCallback {
                override fun onFinish() {
                    if (mMap.cameraPosition.zoom > finalMaxZoom) {
                        mMap.animateCamera(com.google.android.gms.maps.CameraUpdateFactory.zoomTo(finalMaxZoom))
                    }
                }
                override fun onCancel() {}
            })
        } catch (e: Exception) {
            val pole = GeometryUtil.getPoleOfInaccessibility(geom)
            mMap.animateCamera(com.google.android.gms.maps.CameraUpdateFactory.newLatLngZoom(pole, 20f))
        }
    }

    private fun showLocateAndOpenDialog() {
        val input = android.widget.EditText(this)
        input.hint = "Ej: 01-01-01-01-001"
        
        val lp = android.widget.LinearLayout.LayoutParams(
            android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
            android.widget.LinearLayout.LayoutParams.MATCH_PARENT
        )
        input.layoutParams = lp
        val container = android.widget.LinearLayout(this)
        container.setPadding(50, 20, 50, 0)
        container.addView(input)

        android.app.AlertDialog.Builder(this)
            .setTitle("Localizar Predio y Abrir Ficha")
            .setMessage("Ingrese la localización del predio:")
            .setView(container)
            .setPositiveButton("Localizar") { _, _ ->
                val localizacion = input.text.toString().trim()
                if (localizacion.isNotEmpty()) {
                    locateAndOpenFicha(localizacion)
                }
            }
            .setNegativeButton("Cancelar", null)
            .show()
    }

    private fun locateAndOpenFicha(localizacion: String) {
        val dbHelper = DatabaseHelper.getInstance(this)
        
        kotlin.concurrent.thread {
            // 1. Obtener geometría en segundo plano (BD / WKB)
            val geom = com.cadicsa.inventario.utils.SpatialHelper.getGeometryByLocalizacion(dbHelper.readableDatabase, localizacion)
            if (geom == null) {
                runOnUiThread {
                    Toast.makeText(this@MainActivity, "No se encontró el predio con localización: $localizacion", Toast.LENGTH_LONG).show()
                }
                return@thread
            }

            val jtsGeom = geom.jtsGeom
            if (jtsGeom == null) {
                runOnUiThread {
                    Toast.makeText(this@MainActivity, "El predio encontrado no tiene geometría válida", Toast.LENGTH_LONG).show()
                }
                return@thread
            }
            
            // 2. Calcular polo de inaccesibilidad (Operación pesada JTS)
            val pole = GeometryUtil.getPoleOfInaccessibility(jtsGeom)
            
            // 3. Obtener metadatos espaciales en segundo plano (BD / JTS)
            val mun = dbHelper.getMunicipiosAt(pole.longitude, pole.latitude)
            val mza = dbHelper.getManzanaForPredio(jtsGeom)
            val sec = mza
            val lote = com.cadicsa.inventario.utils.SpatialHelper.getLoteClosestToPoint(dbHelper.readableDatabase, pole.longitude, pole.latitude)
            val area = GeometryUtil.calculateArea32616(jtsGeom)
            
            // 4. Operación visual e inicio de actividad en el Hilo Principal
            runOnUiThread {
                mMap.animateCamera(com.google.android.gms.maps.CameraUpdateFactory.newLatLngZoom(pole, 21f))
                
                if (mun.isNullOrEmpty()) {
                    Toast.makeText(this@MainActivity, "⚠️ Error: No se pudo identificar el municipio en el polo matemático", Toast.LENGTH_LONG).show()
                    return@runOnUiThread
                }
                if (mza.isNullOrEmpty()) {
                    Toast.makeText(this@MainActivity, "⚠️ Error: No se pudo identificar la manzana intersectando el predio", Toast.LENGTH_LONG).show()
                    return@runOnUiThread
                }
                if (lote.isNullOrEmpty()) {
                    Toast.makeText(this@MainActivity, "⚠️ Error: No se encontró ningún texto de Lote cercano al polo matemático", Toast.LENGTH_LONG).show()
                    return@runOnUiThread
                }
                
                val intent = Intent(this@MainActivity, FormActivity::class.java).apply {
                    putExtra(FormActivity.EXTRA_LATITUDE, pole.latitude)
                    putExtra(FormActivity.EXTRA_LONGITUDE, pole.longitude)
                    putExtra(FormActivity.EXTRA_GPS_LATITUDE, currentLatitude)
                    putExtra(FormActivity.EXTRA_GPS_LONGITUDE, currentLongitude)
                    putExtra(FormActivity.EXTRA_ID_OBJECT, geom.id)
                    putExtra(FormActivity.EXTRA_ID_LAYER, geom.idLayer)
                    putExtra(FormActivity.EXTRA_ID_PREDIO, geom.idPredio)
                    putExtra(FormActivity.EXTRA_LOCALIZACION, geom.localizacion)
                    putExtra(FormActivity.EXTRA_LAYER_NAME, geom.layer)
                    putExtra(FormActivity.EXTRA_MUNICIPIO_CATALOG, mun)
                    putExtra(FormActivity.EXTRA_SECTOR_CATALOG, sec)
                    putExtra(FormActivity.EXTRA_MANZANA_CATALOG, mza)
                    putExtra(FormActivity.EXTRA_LOTE_CATALOG, lote)
                    putExtra(FormActivity.EXTRA_AREA_CALCULADA, area)
                }
                startActivity(intent)
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        if (AppConfig.DEBUG_DB_SERVER_ENABLED) {
            DebugDbServer.stop()
        }
    }
}
