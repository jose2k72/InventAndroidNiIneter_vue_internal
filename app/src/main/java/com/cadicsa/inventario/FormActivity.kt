package com.cadicsa.inventario

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.os.Environment
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import com.cadicsa.inventario.databinding.ActivityFormBinding
import com.cadicsa.inventario.utils.FormImageHelper
import com.cadicsa.inventario.utils.FormWebViewHelper
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class FormActivity : AppCompatActivity() {


    private lateinit var binding: ActivityFormBinding
    internal lateinit var imageHelper: FormImageHelper
    private lateinit var webViewHelper: FormWebViewHelper
    
    internal var latitude: Double = 0.0
    internal var longitude: Double = 0.0
    internal var gpsLatitude: Double = 0.0
    internal var gpsLongitude: Double = 0.0
    internal var localizacion: String = ""
    
    // Variables para edición
    internal var currentEditingId: Int = -1
    internal var currentEditingData: String = ""

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

    internal var idObject: Int = 0
    internal var idLayer: Int = 0
    internal var idPredio: Int = 0
    internal var areaCalculada: Double = 0.0
    internal var municipioCatalog: String = ""
    internal var sectorCatalog: String = ""
    internal var layerName: String = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Inicializar helpers antes de usar binding
        imageHelper = FormImageHelper(this)
        
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

    private fun setupWebView() {
        // Habilitar debugging de WebView (para desarrollo)
        android.webkit.WebView.setWebContentsDebuggingEnabled(true)
        
        // Inicializar bridge e inyectarlo
        binding.webView.addJavascriptInterface(AndroidBridge(this), "Android")
        
        // Configurar WebView a través del helper
        webViewHelper = FormWebViewHelper(this, binding.webView)
        webViewHelper.setup()
    }

    /**
     * Inyectar datos de edición en el WebView. 
     * Llamado desde FormWebViewHelper cuando la página termina de cargar.
     */
    internal fun injectExistingData() {
        if (currentEditingId != -1 && currentEditingData.isNotEmpty()) {
            android.util.Log.d("FormActivity", "📝 Inyectando datos para edición...")
            val escapedData = currentEditingData.replace("\"", "\\\"")
            binding.webView.evaluateJavascript(
                "if(window.loadExistingData) window.loadExistingData($currentEditingId, \"$escapedData\");",
                null
            )
        }
    }


    /**
     * Notificar a Vue que una foto ha sido capturada y convertida.
     * Llamado desde FormImageHelper.
     */
    fun notifyPhotoCaptured(name: String, base64: String) {
        runOnUiThread {
            binding.webView.evaluateJavascript(
                "if(window.addPhoto) window.addPhoto('$name', '$base64');",
                null
            )
        }
    }
}
