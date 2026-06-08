package com.cadicsa.inventario

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.hardware.camera2.CaptureRequest
import android.os.Bundle
import android.os.Vibrator
import android.util.Log
import android.util.Size
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.ImageButton
import android.widget.ImageView
import android.widget.TextView
import android.widget.Toast
import androidx.annotation.OptIn
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.camera2.interop.Camera2Interop
import androidx.camera.camera2.interop.ExperimentalCamera2Interop
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import java.io.File
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class CustomCameraActivity : AppCompatActivity() {

    private val TAG = "CustomCameraActivity"

    private lateinit var viewFinder: PreviewView
    private lateinit var focusRing: ImageView
    private lateinit var btnCapture: ImageButton
    private lateinit var btnFlash: ImageButton
    private lateinit var txtFlashStatus: TextView
    private lateinit var btnCancel: ImageButton

    private var imageCapture: ImageCapture? = null
    private var camera: Camera? = null
    private var cameraProvider: ProcessCameraProvider? = null

    private var flashMode: Int = ImageCapture.FLASH_MODE_AUTO
    private lateinit var cameraExecutor: ExecutorService
    private var outputFilePath: String = ""

    companion object {
        const val EXTRA_OUTPUT_PATH = "output_path"
        const val RESULT_PHOTO_NAME = "photo_name"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Mantener pantalla encendida y pantalla completa para la cámara
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        window.setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        )
        
        setContentView(R.layout.activity_custom_camera)

        viewFinder = findViewById(R.id.viewFinder)
        focusRing = findViewById(R.id.focusRing)
        btnCapture = findViewById(R.id.btnCapture)
        btnFlash = findViewById(R.id.btnFlash)
        txtFlashStatus = findViewById(R.id.txtFlashStatus)
        btnCancel = findViewById(R.id.btnCancel)

        outputFilePath = intent.getStringExtra(EXTRA_OUTPUT_PATH) ?: ""
        if (outputFilePath.isEmpty()) {
            Toast.makeText(this, "Ruta de archivo de salida no especificada", Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        cameraExecutor = Executors.newSingleThreadExecutor()

        btnCancel.setOnClickListener {
            setResult(Activity.RESULT_CANCELED)
            finish()
        }

        btnCapture.setOnClickListener {
            takePhoto()
        }

        btnFlash.setOnClickListener {
            toggleFlash()
        }

        setupCameraTouchFocus()
        startCamera()
    }

    private fun startCamera() {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(this)

        cameraProviderFuture.addListener({
            cameraProvider = cameraProviderFuture.get()

            // Seleccionar cámara trasera por defecto
            val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA

            // 1. Configurar Preview
            val preview = Preview.Builder()
                .build()
                .also {
                    it.setSurfaceProvider(viewFinder.surfaceProvider)
                }

            // 2. Configurar ImageCapture con presets de calidad, resolución balanceada y estabilización
            val imageCaptureBuilder = ImageCapture.Builder()
                .setCaptureMode(ImageCapture.CAPTURE_MODE_MAXIMIZE_QUALITY)
                .setFlashMode(flashMode)
                // Usar resolución balanceada para no saturar memoria (~3MP)
                .setTargetResolution(Size(2048, 1536))

            // Aplicar presets de estabilización (OIS/EIS) en la sesión de captura
            enableStabilization(imageCaptureBuilder)

            imageCapture = imageCaptureBuilder.build()

            try {
                // Desvincular todos los casos de uso antes de volver a vincular
                cameraProvider?.unbindAll()

                // Vincular los casos de uso a la cámara
                camera = cameraProvider?.bindToLifecycle(
                    this, cameraSelector, preview, imageCapture
                )

                // Habilitar flash por defecto en AUTO en la UI
                updateFlashUI()
                
            } catch (exc: Exception) {
                Log.e(TAG, "Error vinculando casos de uso de la cámara", exc)
                Toast.makeText(this, "Fallo al inicializar la cámara in-app", Toast.LENGTH_SHORT).show()
            }

        }, ContextCompat.getMainExecutor(this))
    }

    @OptIn(ExperimentalCamera2Interop::class)
    private fun enableStabilization(builder: ImageCapture.Builder) {
        val ext = Camera2Interop.Extender(builder)
        try {
            // Intentar activar estabilización óptica (OIS)
            ext.setCaptureRequestOption(
                CaptureRequest.LENS_OPTICAL_STABILIZATION_MODE,
                CaptureRequest.LENS_OPTICAL_STABILIZATION_MODE_ON
            )
            // Intentar activar estabilización digital (EIS)
            ext.setCaptureRequestOption(
                CaptureRequest.CONTROL_VIDEO_STABILIZATION_MODE,
                CaptureRequest.CONTROL_VIDEO_STABILIZATION_MODE_ON
            )
            Log.d(TAG, "Presets de estabilización (OIS/EIS) aplicados a CameraX.")
        } catch (e: Exception) {
            Log.w(TAG, "No se pudo inyectar estabilización por Camera2Interop: ${e.message}")
        }
    }

    private fun takePhoto() {
        val imageCapture = imageCapture ?: return

        // Deshabilitar botón para evitar múltiples clics
        btnCapture.isEnabled = false

        val outputFile = File(outputFilePath)
        val outputOptions = ImageCapture.OutputFileOptions.Builder(outputFile).build()

        imageCapture.takePicture(
            outputOptions,
            ContextCompat.getMainExecutor(this),
            object : ImageCapture.OnImageSavedCallback {
                override fun onError(exc: ImageCaptureException) {
                    btnCapture.isEnabled = true
                    Log.e(TAG, "Error guardando foto: ${exc.message}", exc)
                    Toast.makeText(this@CustomCameraActivity, "Error al capturar la foto", Toast.LENGTH_SHORT).show()
                }

                override fun onImageSaved(output: ImageCapture.OutputFileResults) {
                    Log.d(TAG, "📷 Foto guardada en: $outputFilePath")
                    
                    // Breve vibración física de confirmación al guardar
                    try {
                        val vibrator = getSystemService(VIBRATOR_SERVICE) as Vibrator
                        vibrator.vibrate(80)
                    } catch (e: Exception) {
                        // Ignorar si no hay vibrador
                    }

                    val resultIntent = Intent().apply {
                        putExtra(RESULT_PHOTO_NAME, outputFile.name)
                    }
                    setResult(Activity.RESULT_OK, resultIntent)
                    finish()
                }
            }
        )
    }

    private fun toggleFlash() {
        flashMode = when (flashMode) {
            ImageCapture.FLASH_MODE_AUTO -> ImageCapture.FLASH_MODE_ON
            ImageCapture.FLASH_MODE_ON -> ImageCapture.FLASH_MODE_OFF
            else -> ImageCapture.FLASH_MODE_AUTO
        }
        imageCapture?.flashMode = flashMode
        updateFlashUI()
    }

    private fun updateFlashUI() {
        when (flashMode) {
            ImageCapture.FLASH_MODE_AUTO -> {
                btnFlash.setImageResource(R.drawable.ic_flash_auto_white)
                txtFlashStatus.text = "AUTO"
            }
            ImageCapture.FLASH_MODE_ON -> {
                btnFlash.setImageResource(R.drawable.ic_flash_on_white)
                txtFlashStatus.text = "ON"
            }
            ImageCapture.FLASH_MODE_OFF -> {
                btnFlash.setImageResource(R.drawable.ic_flash_off_white)
                txtFlashStatus.text = "OFF"
            }
        }
    }

    @SuppressLint("ClickableViewAccessibility")
    private fun setupCameraTouchFocus() {
        viewFinder.setOnTouchListener { _, event ->
            if (event.action == MotionEvent.ACTION_DOWN) {
                val factory = viewFinder.meteringPointFactory
                val point = factory.createPoint(event.x, event.y)
                
                // Muestra un anillo visual en el punto tocado
                showFocusRing(event.x, event.y)

                val cameraControl = camera?.cameraControl
                if (cameraControl != null) {
                    // Acción de enfoque y medición de luz automáticos
                    val action = FocusMeteringAction.Builder(point, FocusMeteringAction.FLAG_AF or FocusMeteringAction.FLAG_AE)
                        .setAutoCancelDuration(3, java.util.concurrent.TimeUnit.SECONDS)
                        .build()
                    cameraControl.startFocusAndMetering(action)
                }
                true
            } else {
                false
            }
        }
    }

    private fun showFocusRing(x: Float, y: Float) {
        focusRing.x = x - focusRing.width / 2
        focusRing.y = y - focusRing.height / 2
        focusRing.visibility = View.VISIBLE
        focusRing.animate()
            .setDuration(300)
            .scaleX(1.2f)
            .scaleY(1.2f)
            .withEndAction {
                focusRing.animate()
                    .setDuration(200)
                    .scaleX(1.0f)
                    .scaleY(1.0f)
                    .withEndAction {
                        focusRing.postDelayed({
                            focusRing.visibility = View.INVISIBLE
                        }, 1000)
                    }
            }
    }

    override fun onDestroy() {
        super.onDestroy()
        cameraExecutor.shutdown()
    }
}
