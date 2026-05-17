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
    
    private var showRutasLocales = false
    private var showRutasNacionales = false

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

        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        binding.fabGps.setOnClickListener { getCurrentLocation() }
        
        permissionHelper.checkManageExternalStoragePermission {
            permissionsGranted = true
            permissionHelper.requestAllPermissions(multiplePermissionsLauncher) {
                AppConfig.ensureStorageDirectoryExists()
                initializeMap()
            }
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
                }
            }
        }
        
        lastSavedDataId = getSharedPreferences("app_prefs", MODE_PRIVATE).getInt("last_saved_data_id", -1)
        if (mapInitialized) {
            tileOverlay?.clearTileCache()
            mapHelper?.loadCapturedPoints(lastSavedDataId)
        }
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

            } catch (e: Exception) {
                Toast.makeText(this, "Error al cargar BD: ${e.message}", Toast.LENGTH_LONG).show()
            }
        } else {
            Toast.makeText(this, "Base de datos no disponible. Verifique permisos.", Toast.LENGTH_LONG).show()
        }

        enableMyLocation()

        mMap.setOnMapClickListener { latLng ->
            val dbHelper = DatabaseHelper.getInstance(this)
            
            // 1. Prioridad: ¿Hay puntos capturados cerca (radio de 3 metros)?
            val nearbyPoints = dbHelper.getDataByProximity(latLng.latitude, latLng.longitude, 3.0, true)
            
            if (nearbyPoints.isNotEmpty()) {
                // Abrir directamente el registro encontrado (Snapping)
                openFormActivityForEdit(nearbyPoints[0])
            } else {
                // 2. Si no hay puntos cerca, buscar si se interceptó un predio (geometría)
                val geom = dbHelper.getGeometry(latLng.longitude, latLng.latitude)
                if (geom != null) {
                    val mun = dbHelper.getMunicipiosAt(latLng.longitude, latLng.latitude)
                    val sec = dbHelper.getSectorAt(latLng.longitude, latLng.latitude)
                    val area = GeometryUtil.calculateArea32616(geom.wkt)

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
                        putExtra(FormActivity.EXTRA_LATITUDE, latLng.latitude)
                        putExtra(FormActivity.EXTRA_LONGITUDE, latLng.longitude)
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

        mMap.setOnCameraIdleListener {
            if (showRutasLocales || showRutasNacionales) {
                mapHelper?.loadRoutesInViewport(showRutasLocales, showRutasNacionales)
            }
        }

        mapHelper?.loadCapturedPoints(lastSavedDataId)
        checkEncuestador()
        checkAuthentication()
    }

    private fun enableMyLocation() {
        if (permissionHelper.hasLocationPermission()) {
            try { mMap.isMyLocationEnabled = true } catch (e: SecurityException) {}
        }
    }

    private fun getCurrentLocation() {
        if (permissionHelper.hasLocationPermission()) {
            try {
                fusedLocationClient.lastLocation.addOnSuccessListener { location ->
                    if (location != null) {
                        currentLatitude = location.latitude
                        currentLongitude = location.longitude
                        mMap.animateCamera(CameraUpdateFactory.newLatLngZoom(LatLng(currentLatitude, currentLongitude), 19f))
                    }
                }
            } catch (e: SecurityException) {}
        }
    }

    private fun openFormActivity(lat: Double, lng: Double) {
        val dbHelper = DatabaseHelper.getInstance(this)
        val mun = dbHelper.getMunicipiosAt(lng, lat)
        val sec = dbHelper.getSectorAt(lng, lat)
        
        // Intentar obtener geometría para el área calculada si es posible
        val geom = dbHelper.getGeometry(lng, lat)
        val area = if (geom != null) GeometryUtil.calculateArea32616(geom.wkt) else 0.0
        
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
        val area = if (geom != null) GeometryUtil.calculateArea32616(geom.wkt) else 0.0

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
}
