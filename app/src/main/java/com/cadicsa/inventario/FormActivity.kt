package com.cadicsa.inventario

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.os.Environment
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import com.cadicsa.inventario.databinding.ActivityFormBinding
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class FormActivity : AppCompatActivity() {


    private lateinit var binding: ActivityFormBinding
    
    private var latitude: Double = 0.0
    private var longitude: Double = 0.0
    private var gpsLatitude: Double = 0.0
    private var gpsLongitude: Double = 0.0
    private var localizacion: String = ""
    
    // Variables para edición
    private var currentEditingId: Int = -1
    private var currentEditingData: String = ""
    
    private var currentPhotoPath: String = ""
    private var currentPhotoName: String = ""
    private var currentPhotoPrefix: String? = null

    private val cameraLauncher = registerForActivityResult(
        ActivityResultContracts.TakePicture()
    ) { success ->
        if (success) {
            try {
                // Convertir foto a Base64
                val photoFile = File(currentPhotoPath)
                val base64 = convertImageToBase64(photoFile)
                
                // Notificar al Media Scanner para que la foto aparezca en exploradores (MTP)
                android.media.MediaScannerConnection.scanFile(
                    this,
                    arrayOf(currentPhotoPath),
                    arrayOf("image/jpeg"),
                    null
                )
                
                // Notificar a Vue con el nombre y Base64
                binding.webView.evaluateJavascript(
                    "if(window.addPhoto) window.addPhoto('$currentPhotoName', '$base64');",
                    null
                )
                android.util.Log.d("FormActivity", "✅ Foto convertida a Base64 (${base64.length} chars)")
            } catch (e: Exception) {
                android.util.Log.e("FormActivity", "❌ Error convirtiendo foto: ${e.message}")
                Toast.makeText(this, "Error procesando foto", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private val cameraPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            checkStoragePermission()
        } else {
            Toast.makeText(this, "Permiso de cámara denegado", Toast.LENGTH_SHORT).show()
        }
    }
    
    private val storagePermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            launchCamera()
        } else {
            Toast.makeText(this, "Permiso de almacenamiento denegado", Toast.LENGTH_SHORT).show()
        }
    }

    companion object {
        const val EXTRA_LATITUDE = "latitude"
        const val EXTRA_LONGITUDE = "longitude"
        const val EXTRA_GPS_LATITUDE = "gps_latitude"
        const val EXTRA_GPS_LONGITUDE = "gps_longitude"
        const val EXTRA_LOCALIZACION = "localizacion"
        const val EXTRA_ID_OBJECT = "id_object"
        const val EXTRA_ID_LAYER = "id_layer"
        const val EXTRA_ID_PREDIO = "id_predio"
        const val EXTRA_EXISTING_ID = "existing_id"
        const val EXTRA_EXISTING_DATA = "existing_data"
        const val EXTRA_AREA_CALCULADA = "area_calculada"
        const val EXTRA_MUNICIPIO_CATALOG = "municipio_catalog"
        const val EXTRA_SECTOR_CATALOG = "sector_catalog"
        const val EXTRA_LAYER_NAME = "layer_name"
    }

    private var idObject: Int = 0
    private var idLayer: Int = 0
    private var idPredio: Int = 0
    private var areaCalculada: Double = 0.0
    private var municipioCatalog: String = ""
    private var sectorCatalog: String = ""
    private var layerName: String = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityFormBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setSupportActionBar(binding.toolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        binding.toolbar.setNavigationOnClickListener { onBackPressedDispatcher.onBackPressed() }

        // Habilitar debugging de WebView (para desarrollo)
        android.webkit.WebView.setWebContentsDebuggingEnabled(true)
        android.util.Log.d("FormActivity", "🐛 WebView debugging habilitado")

        // Obtener datos del intent
        latitude = intent.getDoubleExtra(EXTRA_LATITUDE, 0.0)
        longitude = intent.getDoubleExtra(EXTRA_LONGITUDE, 0.0)
        gpsLatitude = intent.getDoubleExtra(EXTRA_GPS_LATITUDE, 0.0)
        gpsLongitude = intent.getDoubleExtra(EXTRA_GPS_LONGITUDE, 0.0)
        localizacion = intent.getStringExtra(EXTRA_LOCALIZACION) ?: ""
        idObject = intent.getIntExtra(EXTRA_ID_OBJECT, 0)
        idLayer = intent.getIntExtra(EXTRA_ID_LAYER, 0)
        idPredio = intent.getIntExtra(EXTRA_ID_PREDIO, 0)
        areaCalculada = intent.getDoubleExtra(EXTRA_AREA_CALCULADA, 0.0)
        municipioCatalog = intent.getStringExtra(EXTRA_MUNICIPIO_CATALOG) ?: ""
        sectorCatalog = intent.getStringExtra(EXTRA_SECTOR_CATALOG) ?: ""
        layerName = intent.getStringExtra(EXTRA_LAYER_NAME) ?: "Aceras"
        
        // Detectar si es edición de registro existente
        val existingId = intent.getIntExtra(EXTRA_EXISTING_ID, -1)
        val existingData = intent.getStringExtra(EXTRA_EXISTING_DATA)
        
        if (existingId != -1 && !existingData.isNullOrEmpty()) {
            android.util.Log.d("FormActivity", "✏️ Modo EDICIÓN - ID: $existingId")
            currentEditingId = existingId
            currentEditingData = existingData
        }

        setupWebView()
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        android.util.Log.d("FormActivity", "🏗️ Setup WebView - MODO LEGACY con findViewById")
        
        // Usar findViewById EXACTAMENTE como legacy
        val webView = findViewById<android.webkit.WebView>(R.id.webView)
        android.util.Log.d("FormActivity", "✅ WebView obtenido: ${webView != null}")
        
        if (webView == null) {
            android.util.Log.e("FormActivity", "❌ WEBVIEW ES NULL!")
            return
        }
        
        // Config EXACTA de la app legacy
        webView.settings.javaScriptEnabled = true
        android.util.Log.d("FormActivity", "✅ JavaScript habilitado")
        
        // ========== CONFIGURACIONES ANTI-CACHÉ PARA DESARROLLO ==========
        // Esto evita que tengas que desinstalar la app en cada cambio
        // NOTA: NO afecta el caché de tiles offline ni Google Maps
        
        // 1. Deshabilitar caché del WebView completamente
        webView.settings.cacheMode = android.webkit.WebSettings.LOAD_NO_CACHE
        
        // 2. Limpiar todo el caché existente del WebView
        webView.clearCache(true)
        webView.clearFormData()
        webView.clearHistory()
        
        android.util.Log.d("FormActivity", "🗑️ Caché del WebView limpiado y deshabilitado")
        // ===============================================================
        
        // Agregar interfaz
        webView.addJavascriptInterface(AndroidBridge(), "Android")
        android.util.Log.d("FormActivity", "✅ AndroidBridge agregado")
        
        // WebViewClient simple
        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: android.webkit.WebView?,
                request: android.webkit.WebResourceRequest?
            ): android.webkit.WebResourceResponse? {
                val url = request?.url.toString()
                android.util.Log.d("FormActivity", "📥 Intentando cargar: $url")
                return super.shouldInterceptRequest(view, request)
            }
            
            override fun onPageFinished(view: android.webkit.WebView?, url: String?) {
                super.onPageFinished(view, url)
                android.util.Log.d("FormActivity", "✅✅✅ Página cargada: $url")
                
                // Si hay datos para editar, cargarlos en Vue
                if (currentEditingId != -1 && currentEditingData.isNotEmpty()) {
                    android.util.Log.d("FormActivity", "📝 Cargando datos para edición...")
                    
                    // Escapar las comillas en el JSON
                    val escapedData = currentEditingData.replace("\"", "\\\"")
                    
                    // Llamar a función JavaScript para cargar datos
                    binding.webView.evaluateJavascript(
                        """
                        if(window.loadExistingData) {
                            window.loadExistingData($currentEditingId, "$escapedData");
                        }
                        """.trimIndent(),
                        null
                    )
                }
                
                // Toast removido - innecesario
            }
            
            override fun onReceivedError(
                view: android.webkit.WebView?,
                request: android.webkit.WebResourceRequest?,
                error: android.webkit.WebResourceError?
            ) {
                super.onReceivedError(view, request, error)
                android.util.Log.e("FormActivity", "❌ Error: ${error?.description} en URL: ${request?.url}")
            }
        }
        android.util.Log.d("FormActivity", "✅ WebViewClient configurado")
        
        // WebChromeClient para capturar logs y errores de JavaScript
        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: android.webkit.ConsoleMessage?): Boolean {
                val level = when (consoleMessage?.messageLevel()) {
                    android.webkit.ConsoleMessage.MessageLevel.ERROR -> "❌ JS-ERROR"
                    android.webkit.ConsoleMessage.MessageLevel.WARNING -> "⚠️ JS-WARN"
                    else -> "📝 JS-LOG"
                }
                val message = "${consoleMessage?.message()} (${consoleMessage?.sourceId()}:${consoleMessage?.lineNumber()})"
                
                if (consoleMessage?.messageLevel() == android.webkit.ConsoleMessage.MessageLevel.ERROR) {
                    android.util.Log.e("FormActivity-JS", "$level $message")
                } else {
                    android.util.Log.d("FormActivity-JS", "$level $message")
                }
                return true
            }
            
            override fun onProgressChanged(view: android.webkit.WebView?, newProgress: Int) {
                super.onProgressChanged(view, newProgress)
                android.util.Log.d("FormActivity", "📊 Progreso: $newProgress%")
            }
        }
        android.util.Log.d("FormActivity", "✅ WebChromeClient configurado")
        
        // Cargar la aplicación Vue con timestamp para evitar caché
        // El timestamp cambia en cada ejecución, forzando recarga de assets
        val timestamp = System.currentTimeMillis()
        val url = "file:///android_asset/web/index.html?v=$timestamp"
        
        android.util.Log.d("FormActivity", "📄 Cargando Vue: $url")
        webView.loadUrl(url)
        android.util.Log.d("FormActivity", "✅ loadUrl ejecutado")
    }

    /**
     * Interfaz JavaScript para comunicación con Vue.js
     */
    inner class AndroidBridge {
        
        @JavascriptInterface
        fun showAlert(message: String) {
            runOnUiThread {
                Toast.makeText(this@FormActivity, message, Toast.LENGTH_LONG).show()
            }
        }

        @JavascriptInterface
        fun getLat(): Double = latitude

        @JavascriptInterface
        fun getLng(): Double = longitude

        @JavascriptInterface
        fun getGpsLat(): Double = gpsLatitude

        @JavascriptInterface
        fun getGpsLng(): Double = gpsLongitude

        @JavascriptInterface
        fun getLocalizacion(): String = localizacion

        @JavascriptInterface
        fun getFecha(): String {
            val sdf = SimpleDateFormat("dd/MM/yyyy HH:mm:ss", Locale.US)
            return sdf.format(Date())
        }

        @JavascriptInterface
        fun getEncuestador(): String {
            return try {
                DatabaseHelper.getInstance(this@FormActivity).getEncuestador()
            } catch (e: Exception) {
                "Encuestador"
            }
        }

        @JavascriptInterface
        fun getAreaCalculada(): Double = areaCalculada

        @JavascriptInterface
        fun getMunicipioInterceptado(): String = municipioCatalog

        @JavascriptInterface
        fun getSectorInterceptado(): String = sectorCatalog

        @JavascriptInterface
        fun getIdObject(): Int {
            // Usar el ID del objeto de la BD, o generar uno basado en timestamp si no existe
            return if (idObject > 0) idObject else (System.currentTimeMillis() / 1000).toInt()
        }

        @JavascriptInterface
        fun getData(): String {
            return try {
                val dbHelper = DatabaseHelper.getInstance(this@FormActivity)
                val items = dbHelper.getDataByProximity(latitude, longitude, 3.0, false)
                
                val result = StringBuilder("[")
                items.forEachIndexed { index, item ->
                    result.append("{\"Id\":${item.id},")
                    result.append("\"Data\": ${item.data},")
                    result.append("\"IdObject\":${item.idObject},")
                    result.append("\"Fecha\": \"${item.fecha}\"}")
                    if (index < items.size - 1) result.append(",")
                }
                result.append("]")
                result.toString()
            } catch (e: Exception) {
                android.util.Log.e("FormActivity", "Error en getData: ${e.message}")
                "[]"
            }
        }
        
        /*
        @JavascriptInterface
        fun getDataAdyacentes(): String {
            return try {
                DatabaseHelper.getInstance(this@FormActivity).getDataInAdjacentPolygons(idObject)
            } catch (e: Exception) {
                "[]"
            }
        }
        */
        
        /*
        @JavascriptInterface
        fun getRutasAdyacentes(): String {
            return rutasAdyacentes
        }
        */

        @JavascriptInterface
        fun sendData(id: Int, jsonData: String): Int {
            return try {
                val dbHelper = DatabaseHelper.getInstance(this@FormActivity)
                val resultId = dbHelper.insertData(
                    id = id,
                    data = jsonData,
                    imei = "",
                    androidId = android.provider.Settings.Secure.getString(contentResolver, android.provider.Settings.Secure.ANDROID_ID),
                    idObject = idObject,
                    latitud = latitude,
                    longitud = longitude,
                    latitudGPS = gpsLatitude,
                    longitudGPS = gpsLongitude,
                    layer = layerName,
                    idLayer = idLayer,
                    idPredio = idPredio
                )
                
                // Guardar el ID del último dato guardado en SharedPreferences
                getSharedPreferences("app_prefs", MODE_PRIVATE)
                    .edit()
                    .putInt("last_saved_data_id", resultId)
                    .apply()
                
                android.util.Log.d("FormActivity", "✅ Dato guardado (ID: $resultId) - Guardado en SharedPreferences")
                
                runOnUiThread {
                    Toast.makeText(this@FormActivity, "Datos guardados (ID: $resultId)", Toast.LENGTH_SHORT).show()
                }
                resultId
            } catch (e: Exception) {
                runOnUiThread {
                    Toast.makeText(this@FormActivity, "Error al guardar: ${e.message}", Toast.LENGTH_SHORT).show()
                }
                id
            }
        }

        @JavascriptInterface
        fun deleteData(id: Int) {
            val dbHelper = DatabaseHelper.getInstance(this@FormActivity)
            try {
                // 1. Obtener datos para borrar fotos asociadas
                val jsonData = dbHelper.getDataById(id)
                if (!jsonData.isNullOrEmpty()) {
                    try {
                        val jsonObject = org.json.JSONObject(jsonData)
                        if (jsonObject.has("Imagenes")) {
                            val imagenesStr = jsonObject.getString("Imagenes")
                            if (imagenesStr.isNotEmpty()) {
                                val fotos = imagenesStr.split(",").map { it.trim() }.filter { it.isNotEmpty() }
                                var borradas = 0
                                for (foto in fotos) {
                                    if (deletePhotoFileInternal(foto)) {
                                        borradas++
                                    }
                                }
                                android.util.Log.d("FormActivity", "🗑️ Eliminadas $borradas fotos asociadas al registro $id")
                            }
                        }
                    } catch (e: Exception) {
                        android.util.Log.e("FormActivity", "Error parseando JSON para borrar fotos: ${e.message}")
                    }
                }

                // 2. Eliminar registro de la BD
                if (dbHelper.deleteRow(id)) {
                    runOnUiThread {
                        Toast.makeText(this@FormActivity, "Registro y fotos eliminados", Toast.LENGTH_SHORT).show()
                    }
                } else {
                    runOnUiThread {
                        Toast.makeText(this@FormActivity, "Error al eliminar registro de BD", Toast.LENGTH_SHORT).show()
                    }
                }
            } catch (e: Exception) {
                runOnUiThread {
                    Toast.makeText(this@FormActivity, "Error al eliminar: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }

        @JavascriptInterface
        fun Camera() {
            Camera(null) // Llama a la sobrecarga con null
        }

        @JavascriptInterface
        fun Camera(prefix: String?) {
            runOnUiThread {
                currentPhotoPrefix = prefix // Guardar prefijo temporalmente
                requestCameraPermission()
            }
        }

        @JavascriptInterface
        fun getImageBasePath(): String {
            return getExternalFilesDir(Environment.DIRECTORY_PICTURES)?.absolutePath ?: ""
        }
        
        @JavascriptInterface
        fun deletePhotoFile(filename: String): Boolean {
            return deletePhotoFileInternal(filename)
        }
        
        @JavascriptInterface
        fun loadPhotoAsBase64(filename: String): String {
            return try {
                val photoFile = File(AppConfig.getStorageDirectory(), filename)
                
                if (photoFile.exists()) {
                    val base64 = convertImageToBase64(photoFile)
                    android.util.Log.d("FormActivity", "✅ Foto cargada: $filename (${base64.length} chars)")
                    base64
                } else {
                    android.util.Log.w("FormActivity", "⚠️ Foto no existe: $filename")
                    ""
                }
            } catch (e: Exception) {
                android.util.Log.e("FormActivity", "❌ Error cargando foto: ${e.message}")
                ""
            }
        }

        @JavascriptInterface
        fun loadCatalogJson(filename: String): String {
            return try {
                val assetPath = "web/data/$filename"
                android.util.Log.d("FormActivity", "📂 Leyendo catálogo: $assetPath")
                
                // Leer archivo desde assets
                assets.open(assetPath).bufferedReader().use { it.readText() }
            } catch (e: Exception) {
                android.util.Log.e("FormActivity", "❌ Error leyendo catálogo $filename: ${e.message}")
                ""
            }
        }
    }

    private fun requestCameraPermission() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) 
            == PackageManager.PERMISSION_GRANTED) {
            checkStoragePermission()
        } else {
            cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }
    
    private fun checkStoragePermission() {
        // Android 11+ (API 30+): Necesita MANAGE_EXTERNAL_STORAGE para escribir en el directorio de almacenamiento
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
            if (Environment.isExternalStorageManager()) {
                // Tenemos permiso, continuar
                launchCamera()
            } else {
                // Solicitar permiso MANAGE_EXTERNAL_STORAGE
                android.util.Log.w("FormActivity", "⚠️ Solicitando permiso MANAGE_EXTERNAL_STORAGE")
                Toast.makeText(this, "Se requiere permiso de acceso a archivos. Por favor, actívelo en la siguiente pantalla.", Toast.LENGTH_LONG).show()
                try {
                    val intent = Intent(android.provider.Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION)
                    intent.data = Uri.parse("package:$packageName")
                    startActivity(intent)
                } catch (e: Exception) {
                    // Fallback: abrir configuración general de permisos
                    val intent = Intent(android.provider.Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION)
                    startActivity(intent)
                }
            }
            return
        }
        
        // Android 10 (API 29): requestLegacyExternalStorage está en manifest
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
            launchCamera()
            return
        }
        
        // Android 6-9 (API 23-28): Necesitamos WRITE_EXTERNAL_STORAGE
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.WRITE_EXTERNAL_STORAGE)
            == PackageManager.PERMISSION_GRANTED) {
            launchCamera()
        } else {
            storagePermissionLauncher.launch(Manifest.permission.WRITE_EXTERNAL_STORAGE)
        }
    }

    private fun launchCamera() {
        val photoFile = createImageFile()
        photoFile?.let { file ->
            val photoUri: Uri = FileProvider.getUriForFile(
                this,
                "${packageName}.fileprovider",
                file
            )
            cameraLauncher.launch(photoUri)
        }
    }

    private fun deletePhotoFileInternal(filename: String): Boolean {
        return try {
            val photoFile = File(AppConfig.getStorageDirectory(), filename)
            
            if (photoFile.exists()) {
                val deleted = photoFile.delete()
                android.util.Log.d("FormActivity", if (deleted) "✅ Foto eliminada: $filename" else "❌ No se pudo eliminar: $filename")
                deleted
            } else {
                android.util.Log.w("FormActivity", "⚠️ Foto no existe: $filename")
                false
            }
        } catch (e: Exception) {
            android.util.Log.e("FormActivity", "❌ Error eliminando foto: ${e.message}")
            false
        }
    }

    private fun createImageFile(): File? {
        return try {
            // Formato ISO: yyyyMMdd_HHmmss
            val timeStamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
            
            // Determinar nombre del archivo
            currentPhotoName = if (!currentPhotoPrefix.isNullOrBlank()) {
                // Limpiar prefijo de caracteres inválidos para nombre de archivo
                val safePrefix = currentPhotoPrefix!!.replace("[^a-zA-Z0-9._-]".toRegex(), "_")
                // Truncar si es muy largo (opcional, por seguridad)
                val truncatedPrefix = if (safePrefix.length > 50) safePrefix.substring(0, 50) else safePrefix
                "${truncatedPrefix}_${timeStamp}.jpg"
            } else {
                "${timeStamp}.jpg"
            }
            
            // Directorio de almacenamiento (donde está map.db)
            val dirApp = AppConfig.getStorageDirectory()
            
            // Crear directorio si no existe
            AppConfig.ensureStorageDirectoryExists()
            
            File(dirApp, currentPhotoName).also {
                currentPhotoPath = it.absolutePath
                android.util.Log.d("FormActivity", "📷 Foto se guardará en: ${it.absolutePath}")
            }
        } catch (e: Exception) {
            android.util.Log.e("FormActivity", "Error creando archivo de foto: ${e.message}")
            null
        }
    }
    
    private fun convertImageToBase64(imageFile: File): String {
        return try {
            // Leer la imagen y comprimirla
            val bitmap = android.graphics.BitmapFactory.decodeFile(imageFile.absolutePath)
            
            // Comprimir la imagen para reducir tamaño (calidad 80%)
            val outputStream = java.io.ByteArrayOutputStream()
            bitmap.compress(android.graphics.Bitmap.CompressFormat.JPEG, 80, outputStream)
            val byteArray = outputStream.toByteArray()
            
            // Convertir a Base64
            android.util.Base64.encodeToString(byteArray, android.util.Base64.NO_WRAP)
        } catch (e: Exception) {
            android.util.Log.e("FormActivity", "Error convirtiendo imagen a Base64: ${e.message}")
            ""
        }
    }
}
