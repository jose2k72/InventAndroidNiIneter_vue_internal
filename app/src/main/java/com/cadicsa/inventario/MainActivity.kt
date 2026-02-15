package com.cadicsa.inventario

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.OnMapReadyCallback
import com.google.android.gms.maps.SupportMapFragment
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.MarkerOptions
import com.google.android.gms.maps.model.Polyline
import com.google.android.gms.maps.model.PolylineOptions
import com.google.android.gms.maps.model.RoundCap
import com.google.android.gms.maps.model.SquareCap
import com.cadicsa.inventario.databinding.ActivityMainBinding
import java.io.File

class MainActivity : AppCompatActivity(), OnMapReadyCallback {

    private lateinit var binding: ActivityMainBinding
    private lateinit var mMap: GoogleMap
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    
    private var currentLatitude: Double = 0.0
    private var currentLongitude: Double = 0.0
    private var permissionsGranted = false
    private var mapInitialized = false
    
    // TileOverlay para tiles offline
    private var tileOverlay: com.google.android.gms.maps.model.TileOverlay? = null
    
    // ID del último dato guardado en esta sesión (para marcador rojo)
    private var lastSavedDataId: Int = -1
    
    // Lista de marcadores para poder limpiarlos sin afectar el TileOverlay
    private val markers = mutableListOf<com.google.android.gms.maps.model.Marker>()
    
    // Capas de rutas
    private var showRutasLocales = false
    private var showRutasNacionales = false
    private val rutasPolylines = mutableListOf<Polyline>()
    private val rutasMarkers = mutableListOf<com.google.android.gms.maps.model.Marker>()

    // Punto inicial por defecto (Goicoechea, Costa Rica)
    private val defaultLocation = LatLng(9.9458, -84.0628)
    private val defaultZoom = 17f

    // Launcher para solicitar múltiples permisos
    private val multiplePermissionsLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val allGranted = permissions.entries.all { it.value }
        
        if (allGranted) {
            permissionsGranted = true
            Toast.makeText(this, "Permisos concedidos", Toast.LENGTH_SHORT).show()
            // Crear directorio de la app si no existe
            createAppFolder()
            // Inicializar mapa después de permisos
            initializeMap()
        } else {
            Toast.makeText(this, "Algunos permisos fueron denegados", Toast.LENGTH_LONG).show()
            // Intentar inicializar de todos modos
            initializeMap()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setSupportActionBar(binding.toolbar)

        try {
            val pInfo = packageManager.getPackageInfo(packageName, 0)
            val version = pInfo.versionName
            supportActionBar?.title = "${getString(R.string.app_name)} v$version"
        } catch (e: Exception) {
            e.printStackTrace()
        }

        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)

        // FAB para centrar en ubicación GPS
        binding.fabGps.setOnClickListener {
            getCurrentLocation()
        }

        // Mostrar About al iniciar la app por 4 segundos
        showAboutDialog(4)

        // Solicitar todos los permisos al iniciar
        // Verificar permiso especial para Android 11+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            checkManageExternalStoragePermission()
        } else {
            requestAllPermissions()
        }
    }

    private fun checkManageExternalStoragePermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            if (Environment.isExternalStorageManager()) {
                // Tenemos acceso completo
                permissionsGranted = true
                requestAllPermissions()
            } else {
                // Solicitar permiso especial
                Toast.makeText(
                    this,
                    "Esta app necesita acceso a archivos para funcionar. Active el permiso en la siguiente pantalla.",
                    Toast.LENGTH_LONG
                ).show()
                
                try {
                    val intent = Intent(android.provider.Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION)
                    intent.data = android.net.Uri.parse("package:$packageName")
                    startActivity(intent)
                } catch (e: Exception) {
                    val intent = Intent(android.provider.Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION)
                    startActivity(intent)
                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        // Verificar si el usuario regresó después de activar el permiso
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            if (Environment.isExternalStorageManager() && !permissionsGranted) {
                permissionsGranted = true
                requestAllPermissions()
            }
        }
        
        // Leer el ID del último dato guardado desde SharedPreferences
        lastSavedDataId = getSharedPreferences("app_prefs", MODE_PRIVATE)
            .getInt("last_saved_data_id", -1)
        
        android.util.Log.d("MainActivity", "📌 onResume: lastSavedDataId = $lastSavedDataId")
        
        // Refrescar tiles y marcadores al volver (por si viene del formulario)
        if (mapInitialized) {
            tileOverlay?.clearTileCache()
            loadCapturedPoints() // Recargar marcadores
        }
    }

    private fun requestAllPermissions() {
        val permissionsToRequest = mutableListOf<String>()

        // Permisos de ubicación
        permissionsToRequest.add(Manifest.permission.ACCESS_FINE_LOCATION)
        permissionsToRequest.add(Manifest.permission.ACCESS_COARSE_LOCATION)

        // Permisos de cámara
        permissionsToRequest.add(Manifest.permission.CAMERA)

        // Permisos de almacenamiento según versión de Android
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            // Android 13+
            permissionsToRequest.add(Manifest.permission.READ_MEDIA_IMAGES)
        } else if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
            // Android 10 y anteriores
            permissionsToRequest.add(Manifest.permission.READ_EXTERNAL_STORAGE)
            permissionsToRequest.add(Manifest.permission.WRITE_EXTERNAL_STORAGE)
        }

        // Verificar cuáles permisos faltan
        val permissionsNeeded = permissionsToRequest.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        if (permissionsNeeded.isNotEmpty()) {
            multiplePermissionsLauncher.launch(permissionsNeeded.toTypedArray())
        } else {
            createAppFolder()
            initializeMap()
        }
    }

    private fun createAppFolder() {
        try {
            AppConfig.ensureStorageDirectoryExists()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun initializeMap() {
        val mapFragment = supportFragmentManager
            .findFragmentById(R.id.map) as SupportMapFragment
        mapFragment.getMapAsync(this)
    }

    override fun onMapReady(googleMap: GoogleMap) {
        mMap = googleMap
        
        // Configurar tipo de mapa base como NONE para que solo se vean nuestros tiles
        // Puedes cambiar a MAP_TYPE_NORMAL si quieres ver Google Maps como referencia debajo
        mMap.mapType = GoogleMap.MAP_TYPE_NORMAL
        
        var initialPosition = defaultLocation
        
        // Verificar si la BD está disponible antes de intentar usarla
        if (DatabaseHelper.isDatabaseAvailable()) {
            try {
                val dbHelper = DatabaseHelper.getInstance(this)
                val minZoom = dbHelper.getMinZoom()
                val maxZoom = dbHelper.getMaxZoom()
                val initLat = dbHelper.getInitLat()
                val initLng = dbHelper.getInitLng()
                
                // Usar posición de la BD si está disponible
                if (initLat != 0f && initLng != 0f) {
                    initialPosition = LatLng(initLat.toDouble(), initLng.toDouble())
                }
                
                // Configurar límites de zoom si hay tiles
                if (minZoom > 0 && maxZoom > 0) {
                    mMap.setMinZoomPreference(minZoom.toFloat())
                    mMap.setMaxZoomPreference(maxZoom.toFloat())
                }
                
                // Agregar TileOverlay con tiles offline
                // zIndex: Google Maps=0, Tiles=3000, Marcadores=4000
                val tileProvider = OfflineTileProvider(this, "tiles")
                tileOverlay = mMap.addTileOverlay(
                    com.google.android.gms.maps.model.TileOverlayOptions()
                        .tileProvider(tileProvider)
                        .zIndex(3000f) // Por encima de Google Maps (0), pero debajo de marcadores (4000)
                )
                
                mapInitialized = true
            } catch (e: Exception) {
                e.printStackTrace()
                Toast.makeText(this, "Error al cargar BD: ${e.message}", Toast.LENGTH_LONG).show()
                // Si falla cargar tiles, mostrar mapa de Google como fallback
                mMap.mapType = GoogleMap.MAP_TYPE_NORMAL
            }
        } else {
            Toast.makeText(this, "Base de datos no disponible. Verifique permisos.", Toast.LENGTH_LONG).show()
            // Sin BD, mostrar mapa de Google
            mMap.mapType = GoogleMap.MAP_TYPE_NORMAL
        }
        
        // Configurar mapa
        mMap.uiSettings.apply {
            isZoomControlsEnabled = true
            isCompassEnabled = true
            isMyLocationButtonEnabled = false // Usamos nuestro FAB
        }

        // Mover a posición inicial
        mMap.moveCamera(CameraUpdateFactory.newLatLngZoom(initialPosition, defaultZoom))

        // Click en mapa para abrir formulario NUEVO
        mMap.setOnMapClickListener { latLng ->
            openFormActivity(latLng.latitude, latLng.longitude)
        }

        // Click en marcador - Removido: ahora se maneja mejor desde el index
        // Los marcadores son solo visuales para indicar dónde hay datos

        // Habilitar ubicación si ya tenemos permisos
        enableMyLocation()
        
        // Cargar marcadores de puntos capturados
        loadCapturedPoints()
        
        // Verificar si se ha configurado el encuestador
        checkEncuestador()
        
        // Listener para recargar rutas cuando se mueve el mapa
        mMap.setOnCameraIdleListener {
            if (showRutasLocales || showRutasNacionales) {
                refreshRouteLayer()
            }
        }
    }

    private fun enableMyLocation() {
        if (ActivityCompat.checkSelfPermission(
                this,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED
        ) {
            mMap.isMyLocationEnabled = true
            // Solo guardar las coordenadas GPS, no mover la cámara
            saveCurrentGpsLocation()
        }
    }

    /**
     * Guarda las coordenadas GPS actuales sin mover la cámara
     */
    private fun saveCurrentGpsLocation() {
        if (ActivityCompat.checkSelfPermission(
                this,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            return
        }

        fusedLocationClient.lastLocation.addOnSuccessListener { location ->
            location?.let {
                currentLatitude = it.latitude
                currentLongitude = it.longitude
            }
        }
    }

    /**
     * Centra el mapa en la ubicación GPS actual (llamado por FAB)
     */
    private fun getCurrentLocation() {
        if (ActivityCompat.checkSelfPermission(
                this,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            requestAllPermissions()
            return
        }

        fusedLocationClient.lastLocation.addOnSuccessListener { location ->
            location?.let {
                currentLatitude = it.latitude
                currentLongitude = it.longitude
                
                val currentLatLng = LatLng(it.latitude, it.longitude)
                
                // Mover cámara a ubicación GPS
                mMap.animateCamera(CameraUpdateFactory.newLatLngZoom(currentLatLng, defaultZoom))
                
                Toast.makeText(
                    this,
                    "Lat: ${String.format(java.util.Locale.US, "%.6f", it.latitude)}, Lng: ${String.format(java.util.Locale.US, "%.6f", it.longitude)}",
                    Toast.LENGTH_SHORT
                ).show()
            } ?: run {
                Toast.makeText(this, "No se pudo obtener la ubicación", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun openFormActivity(latitude: Double, longitude: Double) {
        // Verificar si hay BD disponible
        if (!DatabaseHelper.isDatabaseAvailable()) {
            Toast.makeText(this, "Base de datos no disponible", Toast.LENGTH_SHORT).show()
            return
        }

        try {
            val dbHelper = DatabaseHelper.getInstance(this)
            
            // Buscar el polígono (predio) que contiene este punto
            val geometry = dbHelper.getGeometry(longitude, latitude, "Predios")
            
            if (geometry == null) {
                // No se encontró ningún predio en este punto
                Toast.makeText(this, "No se encontró elemento de consulta válido en la ubicación seleccionada", Toast.LENGTH_SHORT).show()
                return
            }
            
            // Buscar rutas adyacentes al predio
            val rutasAdyacentes = if (geometry.wkt.isNotEmpty()) {
                dbHelper.getAdjacentRoutes(geometry.wkt)
            } else {
                emptyList()
            }
            
            // Log de rutas encontradas (por ahora solo información)
            if (rutasAdyacentes.isNotEmpty()) {
                val localizaciones = rutasAdyacentes.map { it.localizacion }
                android.util.Log.d("MainActivity", "🛣️ Rutas adyacentes al predio ${geometry.localizacion}: $localizaciones")
            } else {
                android.util.Log.d("MainActivity", "🛣️ No se encontraron rutas adyacentes al predio ${geometry.localizacion}")
            }
            
            // Convertir rutas a JSON para pasar al FormActivity
            val rutasJson = org.json.JSONArray().apply {
                rutasAdyacentes.forEach { ruta ->
                    put(org.json.JSONObject().apply {
                        put("localizacion", ruta.localizacion)
                        put("tipo", if (ruta.layer == "rutas_locales") "cantonal" else "nacional")
                        put("distancia", String.format("%.1f", ruta.distancia))
                        put("direccion", ruta.direccion)
                    })
                }
            }.toString()

            // NO crear marcador aquí - solo se crea cuando se guarda el dato
            // El marcador se agregará en loadCapturedPoints() al volver con onResume()

            // Abrir FormActivity con los datos del predio
            val intent = Intent(this, FormActivity::class.java).apply {
                putExtra(FormActivity.EXTRA_LATITUDE, latitude)
                putExtra(FormActivity.EXTRA_LONGITUDE, longitude)
                putExtra(FormActivity.EXTRA_GPS_LATITUDE, currentLatitude)
                putExtra(FormActivity.EXTRA_GPS_LONGITUDE, currentLongitude)
                putExtra(FormActivity.EXTRA_LOCALIZACION, geometry.localizacion)
                putExtra(FormActivity.EXTRA_ID_OBJECT, geometry.id)
                putExtra(FormActivity.EXTRA_ID_LAYER, geometry.idLayer)
                putExtra(FormActivity.EXTRA_ID_PREDIO, geometry.idPredio)
                putExtra(FormActivity.EXTRA_RUTAS_ADYACENTES, rutasJson)
            }
            startActivity(intent)
            
        } catch (e: Exception) {
            Toast.makeText(this, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }
    
    /**
     * Carga todos los puntos capturados desde la BD y los muestra como marcadores
     * LÓGICA DE COLORES:
     * - VERDE: Todos los marcadores por defecto
     * - ROJO: Solo el último dato guardado en esta sesión
     */
    private fun loadCapturedPoints() {
        android.util.Log.d("MainActivity", "🔵 loadCapturedPoints() - INICIANDO...")
        
        try {
            val dbHelper = DatabaseHelper.getInstance(this)
            val allData = dbHelper.getAllData()
            
            android.util.Log.d("MainActivity", "📊 Datos obtenidos de BD: ${allData.size} registros")
            
            // Log de cada dato para debug
            allData.forEachIndexed { index, item ->
                android.util.Log.d("MainActivity", "  [$index] ID=${item.id}, Lat=${item.latitud}, Lng=${item.longitud}")
            }
            
            // Limpiar solo los marcadores existentes (NO usar mMap.clear() porque elimina los tiles)
            android.util.Log.d("MainActivity", "🗑️ Limpiando ${markers.size} marcadores existentes...")
            markers.forEach { it.remove() }
            markers.clear()
            
            // Agrupar por coordenadas (redondeadas a 6 decimales para tolerancia)
            val pointsMap = mutableMapOf<String, MutableList<DatabaseHelper.DataItem>>()
            
            for (item in allData) {
                // IMPORTANTE: Usar Locale.US para forzar punto (.) como separador decimal
                // En lugar de coma (,) que usa el locale español
                val latRounded = String.format(java.util.Locale.US, "%.6f", item.latitud)
                val lngRounded = String.format(java.util.Locale.US, "%.6f", item.longitud)
                val key = "$latRounded,$lngRounded"
                
                if (!pointsMap.containsKey(key)) {
                    pointsMap[key] = mutableListOf()
                }
                pointsMap[key]!!.add(item)
            }
            
            android.util.Log.d("MainActivity", "📍 Puntos agrupados: ${pointsMap.size}")
            
            // Crear marcadores
            for ((coords, items) in pointsMap) {
                val parts = coords.split(",")
                val lat = parts[0].toDouble()
                val lng = parts[1].toDouble()
                
                val position = LatLng(lat, lng)
                val count = items.size
                
                android.util.Log.d("MainActivity", "🎯 Creando marcador en: Lat=$lat, Lng=$lng (${count} registro(s))")
                
                // Verificar si alguno de los items en este punto es el último guardado
                val isLastSaved = items.any { it.id == lastSavedDataId }
                
                // Color: ROJO si es el último guardado, VERDE para todos los demás
                val markerColor = if (isLastSaved) {
                    BitmapDescriptorFactory.HUE_RED
                } else {
                    BitmapDescriptorFactory.HUE_GREEN
                }
                
                android.util.Log.d("MainActivity", "  Color: ${if (isLastSaved) "ROJO" else "VERDE"}, isLastSaved=$isLastSaved, lastSavedDataId=$lastSavedDataId")
                
                val marker = mMap.addMarker(
                    MarkerOptions()
                        .position(position)
                        .title("$count registro(s)")
                        .snippet("Click para ver/editar")
                        .icon(BitmapDescriptorFactory.defaultMarker(markerColor))
                        .zIndex(4000f) // Por encima de tiles (3000) y Google Maps (0)
                )
                
                // Agregar a la lista de marcadores y guardar coordenadas en el tag
                marker?.let {
                    it.tag = coords
                    markers.add(it)
                    android.util.Log.d("MainActivity", "  ✅ Marcador creado y agregado a lista")
                } ?: android.util.Log.e("MainActivity", "  ❌ ERROR: Marcador es NULL")
            }
            
            android.util.Log.d("MainActivity", "✅ COMPLETADO: Cargados ${pointsMap.size} puntos con ${allData.size} registros (último ID: $lastSavedDataId)")
            android.util.Log.d("MainActivity", "   Total marcadores en lista: ${markers.size}")
            
        } catch (e: Exception) {
            android.util.Log.e("MainActivity", "❌ Error cargando puntos: ${e.message}")
            e.printStackTrace()
        }
    }

    /**
     * Verifica si se ha configurado el nombre del encuestador
     * Si no existe o está vacío, muestra un diálogo para solicitarlo
     * Este valor se guarda en la tabla CONFIG y se usa en todos los formularios
     */
    private fun checkEncuestador() {
        val dbHelper = DatabaseHelper.getInstance(this)
        val encuestador = dbHelper.getEncuestador()
        
        android.util.Log.d("MainActivity", "🔍 Verificando encuestador: '$encuestador'")
        
        // Si está vacío o null, solicitar nombre
        if (encuestador.isNullOrEmpty()) {
            android.util.Log.d("MainActivity", "⚠️ Encuestador no configurado - Solicitando nombre")
            showEncuestadorDialog()
        } else {
            android.util.Log.d("MainActivity", "✅ Encuestador configurado: $encuestador")
        }
    }

    /**
     * Muestra un diálogo para solicitar el nombre del encuestador
     * El usuario NO puede cancelar este diálogo (no dismissable)
     */
    private fun showEncuestadorDialog() {
        val builder = android.app.AlertDialog.Builder(this)
        builder.setTitle("Configuración Inicial")
        builder.setMessage("Por favor ingrese su nombre de encuestador:")
        builder.setCancelable(false) // No se puede cancelar
        
        // Crear input de texto
        val input = android.widget.EditText(this)
        input.inputType = android.text.InputType.TYPE_CLASS_TEXT or android.text.InputType.TYPE_TEXT_FLAG_CAP_WORDS
        input.hint = "Nombre del encuestador"
        
        // Agregar padding al EditText
        val padding = (16 * resources.displayMetrics.density).toInt()
        input.setPadding(padding, padding, padding, padding)
        
        builder.setView(input)
        
        builder.setPositiveButton("Guardar") { dialog, _ ->
            val nombre = input.text.toString().trim()
            
            if (nombre.isEmpty()) {
                Toast.makeText(this, "Debe ingresar un nombre", Toast.LENGTH_SHORT).show()
                // Volver a mostrar el diálogo si no ingresó nada
                showEncuestadorDialog()
            } else {
                // Guardar en la BD
                val dbHelper = DatabaseHelper.getInstance(this)
                val success = dbHelper.updateNombreEncuestador(nombre)
                
                if (success) {
                    android.util.Log.d("MainActivity", "✅ Encuestador guardado: $nombre")
                    Toast.makeText(this, "Encuestador configurado: $nombre", Toast.LENGTH_LONG).show()
                } else {
                    android.util.Log.e("MainActivity", "❌ Error guardando encuestador")
                    Toast.makeText(this, "Error guardando configuración", Toast.LENGTH_SHORT).show()
                    // Reintentar
                    showEncuestadorDialog()
                }
            }
            dialog.dismiss()
        }
        
        val dialog = builder.create()
        dialog.show()
    }
    
    /**
     * Muestra diálogo con lista de registros en un punto
     */
    private fun showPointDataDialog(coords: String) {
        try {
            val dbHelper = DatabaseHelper.getInstance(this)
            val allData = dbHelper.getAllData()
            
            // Filtrar registros en estas coordenadas
            val parts = coords.split(",")
            val targetLat = parts[0].toDouble()
            val targetLng = parts[1].toDouble()
            
            val pointData = allData.filter { item ->
                val latRounded = String.format(java.util.Locale.US, "%.6f", item.latitud)
                val lngRounded = String.format(java.util.Locale.US, "%.6f", item.longitud)
                latRounded == parts[0] && lngRounded == parts[1]
            }
            
            if (pointData.isEmpty()) {
                Toast.makeText(this, "No hay registros en este punto", Toast.LENGTH_SHORT).show()
                return
            }
            
            // Crear lista de opciones
            val options = mutableListOf<String>()
            // options.add("➕ Agregar nuevo registro")
            
            for (item in pointData) {
                val type = try {
                    org.json.JSONObject(item.data).optString("Type", "Desconocido")
                } catch (e: Exception) {
                    "Desconocido"
                }
                val fecha = try {
                    org.json.JSONObject(item.data).optString("Fecha", "")
                } catch (e: Exception) {
                    ""
                }
                options.add("✏️ $type - ${fecha.take(10)} (ID:${item.id})")
            }
            
            // Mostrar diálogo
            android.app.AlertDialog.Builder(this)
                .setTitle("Registros en este punto (${pointData.size})")
                .setItems(options.toTypedArray()) { _, which ->
                    if (which == 0) {
                        // Agregar nuevo
                        openFormActivity(targetLat, targetLng)
                    } else {
                        // Editar existente
                        val item = pointData[which - 1]
                        openFormActivityForEdit(item)
                    }
                }
                .setNegativeButton("Cancelar", null)
                .show()
                
        } catch (e: Exception) {
            Toast.makeText(this, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }
    
    /**
     * Abre FormActivity para editar un registro existente
     */
    private fun openFormActivityForEdit(item: DatabaseHelper.DataItem) {
        val intent = Intent(this, FormActivity::class.java).apply {
            putExtra(FormActivity.EXTRA_LATITUDE, item.latitud)
            putExtra(FormActivity.EXTRA_LONGITUDE, item.longitud)
            putExtra(FormActivity.EXTRA_GPS_LATITUDE, item.latitudGps)
            putExtra(FormActivity.EXTRA_GPS_LONGITUDE, item.longitudGps)
            putExtra(FormActivity.EXTRA_EXISTING_ID, item.id)
            putExtra(FormActivity.EXTRA_EXISTING_DATA, item.data)
            
            // Pasar datos del geometry si existen
            val localizacion = try {
                val jsonData: String = item.data
                org.json.JSONObject(jsonData).optString("Localizacion", "")
            } catch (e: Exception) {
                ""
            }
            putExtra(FormActivity.EXTRA_LOCALIZACION, localizacion)
            
            putExtra(FormActivity.EXTRA_ID_OBJECT, item.idObject)
            putExtra(FormActivity.EXTRA_ID_LAYER, item.idLayer)
            putExtra(FormActivity.EXTRA_ID_PREDIO, item.idPredio)
        }
        startActivity(intent)
    }

    // ========== MENÚ DE OPCIONES ==========

    override fun onCreateOptionsMenu(menu: android.view.Menu?): Boolean {
        menuInflater.inflate(R.menu.main_menu, menu)
        return true
    }

    override fun onOptionsItemSelected(item: android.view.MenuItem): Boolean {
        return when (item.itemId) {
            // Funcionalidad de rutas deshabilitada para esta variante
            // Esta funcionalidad estaba activa en la aplicación origen: com.cadicsa.inventario.goico.aceras
            // Descomentar si se necesita en futuras variantes
            /*
            R.id.menu_toggle_rutas_locales -> {
                showRutasLocales = !showRutasLocales
                item.isChecked = showRutasLocales
                refreshRouteLayer()
                true
            }
            R.id.menu_toggle_rutas_nacionales -> {
                showRutasNacionales = !showRutasNacionales
                item.isChecked = showRutasNacionales
                refreshRouteLayer()
                true
            }
            */
            R.id.menu_about -> {
                showAboutDialog(30)  // 30 segundos cuando se llama desde el menú
                true
            }
            R.id.menu_exit -> {
                exitApp()
                true
            }
            else -> super.onOptionsItemSelected(item)
        }
    }

    private fun showAboutDialog(autoCloseDurationSeconds: Int = 10) {
        val dialogView = layoutInflater.inflate(R.layout.dialog_about, null)
        
        // Obtener versión de la app
        val versionName = try {
            packageManager.getPackageInfo(packageName, 0).versionName
        } catch (e: Exception) {
            "1.0.0"
        }
        
        // Obtener año de compilación (año actual)
        val compileYear = java.util.Calendar.getInstance().get(java.util.Calendar.YEAR)
        
        // Configurar textos
        val appInfo = dialogView.findViewById<android.widget.TextView>(R.id.aboutAppInfo)
        val copyright = dialogView.findViewById<android.widget.TextView>(R.id.aboutCopyright)
        
        appInfo.text = "Aplicación de captura de datos de campo\n${getString(R.string.app_name)} v$versionName"
        copyright.text = "Copyright © $compileYear CADIC Consultores, S.A."
        
        // Crear y mostrar diálogo sin botones
        val dialog = androidx.appcompat.app.AlertDialog.Builder(this)
            .setView(dialogView)
            .setCancelable(true)
            .create()
        
        // Hacer que el diálogo se cierre al hacer click en cualquier parte
        dialogView.setOnClickListener {
            dialog.dismiss()
        }
        
        // Auto-cerrar después del tiempo configurado
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            if (dialog.isShowing) {
                dialog.dismiss()
            }
        }, (autoCloseDurationSeconds * 1000).toLong())
        
        dialog.show()
    }

    private fun exitApp() {
        // Mostrar confirmación
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("Salir")
            .setMessage("¿Está seguro que desea salir de la aplicación?")
            .setPositiveButton("Sí") { _, _ ->
                // Cerrar recursos si los hay
                try {
                    // Limpiar mapa si está inicializado
                    if (::mMap.isInitialized) {
                        mMap.clear()
                    }
                } catch (e: Exception) {
                    android.util.Log.e("MainActivity", "Error al limpiar recursos: ${e.message}")
                }
                
                // Finalizar actividad
                finish()
            }
            .setNegativeButton("No", null)
            .show()
    }
    
    /**
     * Refresca la capa de rutas según el estado actual de los toggles
     */
    private fun refreshRouteLayer() {
        // Limpiar rutas existentes
        rutasPolylines.forEach { it.remove() }
        rutasPolylines.clear()
        rutasMarkers.forEach { it.remove() }
        rutasMarkers.clear()
        
        // Si alguna capa está activa, cargar rutas del viewport
        if (showRutasLocales || showRutasNacionales) {
            loadRoutesInViewport()
        }
    }
    
    /**
     * Carga las rutas que están dentro del viewport actual del mapa
     */
    private fun loadRoutesInViewport() {
        if (!::mMap.isInitialized) return
        
        try {
            // Obtener bounds del mapa visible
            val bounds = mMap.projection.visibleRegion.latLngBounds
            val minLat = bounds.southwest.latitude
            val minLng = bounds.southwest.longitude
            val maxLat = bounds.northeast.latitude
            val maxLng = bounds.northeast.longitude
            
            val dbHelper = DatabaseHelper.getInstance(this)
            val db = dbHelper.readableDatabase
            
            // Cargar rutas locales si está activado
            if (showRutasLocales) {
                val queryLocales = """
                    SELECT id, LOCALIZACION, wkt 
                    FROM objects 
                    WHERE layer = 'rutas_locales' COLLATE NOCASE
                    AND maxX >= $minLng AND minX <= $maxLng
                    AND maxY >= $minLat AND minY <= $maxLat
                """.trimIndent()
                
                val cursorLocales = db.rawQuery(queryLocales, null)
                if (cursorLocales.moveToFirst()) {
                    do {
                        val localizacion = cursorLocales.getString(1) ?: continue
                        val wkt = cursorLocales.getString(2) ?: continue
                        drawRoute(wkt, localizacion, android.graphics.Color.parseColor("#2196F3")) // Azul
                    } while (cursorLocales.moveToNext())
                }
                cursorLocales.close()
            }
            
            // Cargar rutas nacionales si está activado
            if (showRutasNacionales) {
                val queryNacionales = """
                    SELECT id, LOCALIZACION, wkt 
                    FROM objects 
                    WHERE layer = 'rutas_nacionales' COLLATE NOCASE
                    AND maxX >= $minLng AND minX <= $maxLng
                    AND maxY >= $minLat AND minY <= $maxLat
                """.trimIndent()
                
                val cursorNacionales = db.rawQuery(queryNacionales, null)
                if (cursorNacionales.moveToFirst()) {
                    do {
                        val localizacion = cursorNacionales.getString(1) ?: continue
                        val wkt = cursorNacionales.getString(2) ?: continue
                        drawRoute(wkt, localizacion, android.graphics.Color.parseColor("#F44336")) // Rojo
                    } while (cursorNacionales.moveToNext())
                }
                cursorNacionales.close()
            }
            
            db.close()
            
        } catch (e: Exception) {
            android.util.Log.e("MainActivity", "Error cargando rutas en viewport: ${e.message}")
        }
    }
    
    /**
     * Dibuja una ruta en el mapa con su etiqueta
     */
    private fun drawRoute(wkt: String, localizacion: String, color: Int) {
        try {
            // Obtenemos una lista de listas de coordenadas (múltiples segmentos si es MULTILINESTRING)
            val segments = GeometryUtil.getPolylineCoordinates(wkt)
            
            if (segments.isEmpty()) return
            
            var longestSegment: List<LatLng>? = null
            var maxSegmentLength = -1.0
            
            // Iterar sobre cada segmento geométrico
            for (coords in segments) {
                if (coords.isEmpty()) continue
                
                // Dibujar este segmento como una Polyline independiente
                val polyline = mMap.addPolyline(
                    PolylineOptions()
                        .addAll(coords)
                        .color(color)
                        .width(5f)
                        .zIndex(10000f)
                        .startCap(RoundCap()) // Usamos RoundCap visualmente en la línea
                        .endCap(RoundCap())
                )
                rutasPolylines.add(polyline)
                
                // Agregar marcadores circulares en los extremos de ESTE segmento
                if (coords.isNotEmpty()) {
                    val startMarker = mMap.addMarker(
                        MarkerOptions()
                            .position(coords.first())
                            .anchor(0.5f, 0.5f)
                            .flat(true)
                            .zIndex(10001f)
                            .icon(createCircleIcon(color))
                    )
                    startMarker?.let { rutasMarkers.add(it) }
                    
                    val endMarker = mMap.addMarker(
                        MarkerOptions()
                            .position(coords.last())
                            .anchor(0.5f, 0.5f)
                            .flat(true)
                            .zIndex(10001f)
                            .icon(createCircleIcon(color))
                    )
                    endMarker?.let { rutasMarkers.add(it) }
                }
                
                // Calcular longitud total de este segmento para ver si es el candidato para la etiqueta
                var segmentLength = 0.0
                for (i in 0 until coords.size - 1) {
                    val p1 = coords[i]
                    val p2 = coords[i+1]
                    segmentLength += calculateDistance(p1, p2)
                }
                
                if (segmentLength > maxSegmentLength) {
                    maxSegmentLength = segmentLength
                    longestSegment = coords
                }
            }
            
            // Etiquetado: Una o varias etiquetas según la longitud
            longestSegment?.let { coords ->
                if (coords.size >= 2) {
                    // Decidir cuántas etiquetas poner
                    val numLabels = if (maxSegmentLength > 150) {
                        Math.max(2, Math.round(maxSegmentLength / 100.0).toInt())
                    } else {
                        1
                    }
                    
                    // Calcular distancias objetivo donde irán las etiquetas
                    val targetDistances = mutableListOf<Double>()
                    
                    if (numLabels == 1) {
                        targetDistances.add(maxSegmentLength / 2.0)
                    } else {
                        val spacing = 100.0
                        val totalSpan = (numLabels - 1) * spacing
                        val startOffset = (maxSegmentLength - totalSpan) / 2.0
                        
                        for (i in 0 until numLabels) {
                            targetDistances.add(startOffset + (i * spacing))
                        }
                    }
                    
                    // Colocar las etiquetas
                    for (dist in targetDistances) {
                        val pointInfo = getPointAtDistance(coords, dist)
                        
                        if (pointInfo != null) {
                            val (position, bearing) = pointInfo
                            
                            // Ajustar rotación para legibilidad
                            var labelRotation = ((bearing - 90 + 360) % 360).toFloat()
                            if (labelRotation > 90 && labelRotation < 270) {
                                labelRotation = (labelRotation + 180) % 360
                            }
                            
                            // Crear marcador de texto
                            val marker = mMap.addMarker(
                                MarkerOptions()
                                    .position(position)
                                    .title(localizacion)
                                    .anchor(0.5f, 0.5f)
                                    .rotation(labelRotation)
                                    .flat(true)
                                    .zIndex(10002f)
                                    .icon(createTextIcon(localizacion, color))
                            )
                            marker?.let { rutasMarkers.add(it) }
                        }
                    }
                }
            }
            
        } catch (e: Exception) {
            android.util.Log.e("MainActivity", "Error dibujando ruta: ${e.message}")
            e.printStackTrace()
        }
    }

    /**
     * Obtiene la coordenada y el bearing en una distancia específica desde el inicio de la polilínea
     */
    private fun getPointAtDistance(coords: List<LatLng>, targetDistance: Double): Pair<LatLng, Double>? {
        var currentDistance = 0.0
        
        for (i in 0 until coords.size - 1) {
            val p1 = coords[i]
            val p2 = coords[i+1]
            val dist = calculateDistance(p1, p2)
            
            if (currentDistance + dist >= targetDistance) {
                // El punto objetivo está en este segmento
                val remaining = targetDistance - currentDistance
                val fraction = remaining / dist
                
                // Interpolar lat/lng
                val midLat = p1.latitude + (p2.latitude - p1.latitude) * fraction
                val midLng = p1.longitude + (p2.longitude - p1.longitude) * fraction
                val position = LatLng(midLat, midLng)
                
                // Calcular rotación en este segmento
                val bearing = calculateBearing(p1, p2)
                
                return Pair(position, bearing)
            }
            currentDistance += dist
        }
        return null
    }
    
    // Función auxiliar para distancia aproximada (euclidiana sufiente para comparar, pero usaremos grados)
    // Para mayor precisión en metros, se debería usar Location.distanceBetween, pero aquí
    // necesitamos consistencia relativa.
    private fun calculateDistance(p1: LatLng, p2: LatLng): Double {
        // Multiplicador aproximado para convertir grados a metros (cerca del ecuador/Costa Rica)
        // 1 grado lat ~= 110.574 km = 110574 m
        // 1 grado lon ~= 111.320 * cos(lat) km. En CR (lat 10) cos(10)=0.98. ~ 109000 m
        // Usamos 110,000 como promedio rápido para la lógica de "150 metros"
        // O mejor usamos Location.distanceBetween si queremos precisión de "100 metros" real
        
        val results = FloatArray(1)
        android.location.Location.distanceBetween(
            p1.latitude, p1.longitude,
            p2.latitude, p2.longitude,
            results
        )
        return results[0].toDouble()
    }
    
    // Función auxiliar para bearing
    private fun calculateBearing(p1: LatLng, p2: LatLng): Double {
        val dLon = Math.toRadians(p2.longitude - p1.longitude)
        val lat1 = Math.toRadians(p1.latitude)
        val lat2 = Math.toRadians(p2.latitude)
        
        val y = Math.sin(dLon) * Math.cos(lat2)
        val x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
        
        return Math.toDegrees(Math.atan2(y, x))
    }
    
    /**
     * Crea un icono circular sólido para los extremos de las rutas
     */
    private fun createCircleIcon(color: Int): com.google.android.gms.maps.model.BitmapDescriptor {
        // Usar densidad de pantalla para tamaño consistente (10dp de radio = 20dp diámetro)
        val density = resources.displayMetrics.density
        val size = (16 * density).toInt() 
        
        val bitmap = android.graphics.Bitmap.createBitmap(size, size, android.graphics.Bitmap.Config.ARGB_8888)
        val canvas = android.graphics.Canvas(bitmap)
        
        val paint = android.graphics.Paint().apply {
            this.color = color
            isAntiAlias = true
            style = android.graphics.Paint.Style.FILL
        }
        
        // Círculo relleno
        val radius = size / 2f
        canvas.drawCircle(radius, radius, radius, paint)
        
        // Borde blanco para resaltar
        paint.style = android.graphics.Paint.Style.STROKE
        paint.color = android.graphics.Color.WHITE
        paint.strokeWidth = 2 * density // Borde proporcional
        canvas.drawCircle(radius, radius, radius - (1 * density), paint)
        
        return BitmapDescriptorFactory.fromBitmap(bitmap)
    }
    
    /**
     * Crea un icono de texto para el marcador
     */
    private fun createTextIcon(text: String, color: Int): com.google.android.gms.maps.model.BitmapDescriptor {
        val paint = android.graphics.Paint().apply {
            textSize = 20f
            this.color = android.graphics.Color.WHITE
            textAlign = android.graphics.Paint.Align.CENTER
            isAntiAlias = true
            typeface = android.graphics.Typeface.create(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD)
        }
        
        val bounds = android.graphics.Rect()
        paint.getTextBounds(text, 0, text.length, bounds)
        
        val padding = 8
        val width = bounds.width() + padding * 2
        val height = bounds.height() + padding * 2
        
        val bitmap = android.graphics.Bitmap.createBitmap(width, height, android.graphics.Bitmap.Config.ARGB_8888)
        val canvas = android.graphics.Canvas(bitmap)
        
        // Fondo semi-transparente
        val bgPaint = android.graphics.Paint().apply {
            this.color = color
            alpha = 200
            style = android.graphics.Paint.Style.FILL
        }
        canvas.drawRoundRect(
            0f, 0f, width.toFloat(), height.toFloat(),
            4f, 4f, bgPaint
        )
        
        // Texto
        canvas.drawText(text, width / 2f, height / 2f - bounds.exactCenterY(), paint)
        
        return BitmapDescriptorFactory.fromBitmap(bitmap)
    }
}

