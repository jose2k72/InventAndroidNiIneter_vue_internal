package com.cadicsa.inventario

import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.util.Log
import android.widget.Toast
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

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setSupportActionBar(binding.toolbar)
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
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            val hasStorage = Environment.isExternalStorageManager()
            if (hasStorage && !permissionsGranted) {
                permissionsGranted = true
                permissionHelper.requestAllPermissions(multiplePermissionsLauncher) {
                    AppConfig.ensureStorageDirectoryExists()
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
            val dbHelper = DatabaseHelper.getInstance(this)
            
            // 1. Buscar si se interceptó un predio (geometría) en el toque del dedo
            val geom = dbHelper.getGeometry(latLng.longitude, latLng.latitude)
            if (geom != null) {
                // Buscamos si ya existen puntos de datos guardados para este polígono (IDOBJECT)
                val existingPoints = dbHelper.getDataByObjectId(geom.id)
                
                val targetLat: Double
                val targetLng: Double
                
                if (existingPoints.isNotEmpty()) {
                    // Si ya existen puntos en el predio, tomamos la posición del primero de ellos (consolidada)
                    targetLat = existingPoints[0].latitud
                    targetLng = existingPoints[0].longitud
                } else {
                    // Si no existen puntos, calculamos el Polo de Inaccesibilidad
                    val pole = GeometryUtil.getPoleOfInaccessibility(geom.jtsGeom!!)
                    targetLat = pole.latitude
                    targetLng = pole.longitude
                }

                val mun = dbHelper.getMunicipiosAt(latLng.longitude, latLng.latitude)
                val sec = dbHelper.getSectorAt(latLng.longitude, latLng.latitude)
                val area = GeometryUtil.calculateArea32616(geom.jtsGeom!!)

                // VALIDACIÓN ESTRICTA: No permitir entrar si faltan datos base
                if (mun.isNullOrEmpty()) {
                    Toast.makeText(this, "⚠️ Error: No se pudo identificar el municipio en esta zona", Toast.LENGTH_LONG).show()
                    return@setOnMapClickListener
                }
                if (sec.isNullOrEmpty()) {
                    Toast.makeText(this, "⚠️ Error: No se pudo identificar el sector catastral", Toast.LENGTH_LONG).show()
                    return@setOnMapClickListener
                }
                if (geom.localizacion.isNullOrEmpty()) {
                    Toast.makeText(this, "⚠️ Error: El predio seleccionado no tiene código de localización", Toast.LENGTH_LONG).show()
                    return@setOnMapClickListener
                }

                val intent = Intent(this, FormActivity::class.java).apply {
                    putExtra(FormActivity.EXTRA_LATITUDE, targetLat)   // Coordenada consolidada o Polo
                    putExtra(FormActivity.EXTRA_LONGITUDE, targetLng) // Coordenada consolidada o Polo
                    putExtra(FormActivity.EXTRA_GPS_LATITUDE, currentLatitude)
                    putExtra(FormActivity.EXTRA_GPS_LONGITUDE, currentLongitude)
                    putExtra(FormActivity.EXTRA_ID_OBJECT, geom.id)
                    putExtra(FormActivity.EXTRA_ID_LAYER, geom.idLayer)
                    putExtra(FormActivity.EXTRA_ID_PREDIO, geom.idPredio)
                    putExtra(FormActivity.EXTRA_LOCALIZACION, geom.localizacion)
                    putExtra(FormActivity.EXTRA_LAYER_NAME, geom.layer)
                    putExtra(FormActivity.EXTRA_MUNICIPIO_CATALOG, mun)
                    putExtra(FormActivity.EXTRA_SECTOR_CATALOG, sec)
                    putExtra(FormActivity.EXTRA_AREA_CALCULADA, area)
                }
                startActivity(intent)
            } else {
                Toast.makeText(this, "Ningún objeto interceptado", Toast.LENGTH_SHORT).show()
            }
        }

        mMap.setOnMarkerClickListener { marker ->
            val coords = marker.tag as? String
            if (coords != null) {
                try {
                    val parts = coords.split(",")
                    val lat = parts[0].toDouble()
                    val lng = parts[1].toDouble()
                    
                    val dbHelper = DatabaseHelper.getInstance(this)
                    // Buscar el dato exacto de este marcador para abrirlo directamente
                    val nearby = dbHelper.getDataByProximity(lat, lng, 1.0, true)
                    if (nearby.isNotEmpty()) {
                        openFormActivityForEdit(nearby[0])
                    }
                } catch (e: Exception) {
                    android.util.Log.e("MainActivity", "Error al abrir marcador: ${e.message}")
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

    private fun openFormActivityForEdit(item: DataItem) {
        val dbHelper = DatabaseHelper.getInstance(this)
        val mun = dbHelper.getMunicipiosAt(item.longitud, item.latitud)
        val sec = dbHelper.getSectorAt(item.longitud, item.latitud)
        
        val geom = dbHelper.getGeometry(item.longitud, item.latitud)
        val area = if (geom != null) GeometryUtil.calculateArea32616(geom.jtsGeom!!) else 0.0

        val intent = Intent(this, FormActivity::class.java).apply {
            putExtra(FormActivity.EXTRA_LATITUDE, item.latitud)
            putExtra(FormActivity.EXTRA_LONGITUDE, item.longitud)
            putExtra(FormActivity.EXTRA_GPS_LATITUDE, item.latitudGps)
            putExtra(FormActivity.EXTRA_GPS_LONGITUDE, item.longitudGps)
            putExtra(FormActivity.EXTRA_EXISTING_ID, item.id)
            putExtra(FormActivity.EXTRA_EXISTING_DATA, item.data)
            putExtra(FormActivity.EXTRA_ID_OBJECT, item.idObject)
            putExtra(FormActivity.EXTRA_ID_LAYER, item.idLayer)
            putExtra(FormActivity.EXTRA_ID_PREDIO, item.idPredio)
            putExtra(FormActivity.EXTRA_LAYER_NAME, item.layer)
            putExtra(FormActivity.EXTRA_MUNICIPIO_CATALOG, mun)
            putExtra(FormActivity.EXTRA_SECTOR_CATALOG, sec)
            putExtra(FormActivity.EXTRA_AREA_CALCULADA, area)
            // Aseguramos que la localización viaje también en edición para que app.js la tenga disponible
            if (geom != null) {
                putExtra(FormActivity.EXTRA_LOCALIZACION, geom.localizacion)
            }
        }
        startActivity(intent)
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
        
        val user = SecurityManager.currentUser
        infoItem?.title = "👤 " + (user?.fullName ?: "Desconocido")
        val isAdmin = user?.isAdmin == true || user?.userName == "ADMIN" || user?.userName == "MASTER"
        importItem?.isVisible = isAdmin
        adminPassItem?.isVisible = isAdmin
        changePassItem?.isVisible = user?.userName != "MASTER"
        return true
    }

    override fun onOptionsItemSelected(item: android.view.MenuItem): Boolean {
        return when (item.itemId) {
            R.id.menu_change_password -> { dialogHelper.showChangePasswordDialog(); true }
            R.id.menu_admin_passwords -> { startActivity(Intent(this, ManageUsersActivity::class.java)); true }
            R.id.menu_import_users -> { importDeviceUsersFile(); true }
            R.id.menu_statistics -> { dialogHelper.showStatisticsDialog(); true }
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

    override fun onDestroy() {
        super.onDestroy()
        if (AppConfig.DEBUG_DB_SERVER_ENABLED) {
            DebugDbServer.stop()
        }
    }
}
