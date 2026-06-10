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
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import android.net.Uri
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.ExifInterface
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

        // Configurar modo OCR si se solicita
        val ocrMode = intent.getBooleanExtra("ocr_mode", false)
        if (ocrMode) {
            findViewById<View>(R.id.gridOverlay)?.visibility = View.GONE
            findViewById<View>(R.id.ocrOverlay)?.visibility = View.VISIBLE
        }
    }

    private fun startCamera() {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(this)

        cameraProviderFuture.addListener({
            cameraProvider = cameraProviderFuture.get()

            // Seleccionar cámara trasera por defecto
            val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA

            // 1. Configurar Preview con Aspect Ratio 4:3 homologado
            val preview = Preview.Builder()
                .setTargetAspectRatio(AspectRatio.RATIO_4_3)
                .build()
                .also {
                    it.setSurfaceProvider(viewFinder.surfaceProvider)
                }

            // 2. Configurar ImageCapture con presets de calidad, relación balanceada y estabilización
            val imageCaptureBuilder = ImageCapture.Builder()
                .setCaptureMode(ImageCapture.CAPTURE_MODE_MAXIMIZE_QUALITY)
                .setFlashMode(flashMode)
                .setTargetAspectRatio(AspectRatio.RATIO_4_3)

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

    private fun imageProxyToBitmap(image: ImageProxy): Bitmap? {
        return try {
            val plane = image.planes[0]
            val buffer = plane.buffer
            val bytes = ByteArray(buffer.remaining())
            buffer.get(bytes)
            BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
        } catch (e: Exception) {
            Log.e(TAG, "Error convirtiendo ImageProxy a Bitmap", e)
            null
        }
    }

    private fun rotateBitmap(bitmap: Bitmap, degrees: Int): Bitmap {
        if (degrees == 0) return bitmap
        return try {
            val matrix = Matrix()
            matrix.postRotate(degrees.toFloat())
            val rotated = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
            if (rotated != bitmap) {
                bitmap.recycle()
            }
            rotated
        } catch (e: Exception) {
            Log.e(TAG, "Error rotando bitmap", e)
            bitmap
        }
    }

    private fun scaleBitmapIfNeeded(bitmap: Bitmap, maxDimension: Int): Bitmap {
        val width = bitmap.width
        val height = bitmap.height
        if (width <= maxDimension && height <= maxDimension) return bitmap

        val ratio = width.toFloat() / height.toFloat()
        val newWidth: Int
        val newHeight: Int
        if (width > height) {
            newWidth = maxDimension
            newHeight = (maxDimension / ratio).toInt()
        } else {
            newHeight = maxDimension
            newWidth = (maxDimension * ratio).toInt()
        }

        return try {
            val scaled = Bitmap.createScaledBitmap(bitmap, newWidth, newHeight, true)
            if (scaled != bitmap) {
                bitmap.recycle()
            }
            scaled
        } catch (e: Exception) {
            Log.e(TAG, "Error escalando bitmap", e)
            bitmap
        }
    }

    private fun cropOcrImage(rotatedBitmap: Bitmap): Bitmap {
        try {
            // Obtener las coordenadas en pantalla de ocrTargetArea y viewFinder
            val targetView = findViewById<View>(R.id.ocrTargetArea) ?: return rotatedBitmap
            val finder = findViewById<View>(R.id.viewFinder) ?: return rotatedBitmap
            
            val targetLocation = IntArray(2)
            targetView.getLocationInWindow(targetLocation)
            val targetX = targetLocation[0]
            val targetY = targetLocation[1]
            val targetWidth = targetView.width
            val targetHeight = targetView.height
            
            val finderWidth = finder.width
            val finderHeight = finder.height
            
            if (finderWidth <= 0 || finderHeight <= 0) return rotatedBitmap
            
            // Mapear las coordenadas al Bitmap rotado
            val scaleX = rotatedBitmap.width.toFloat() / finderWidth.toFloat()
            val scaleY = rotatedBitmap.height.toFloat() / finderHeight.toFloat()
            
            val cropX = (targetX * scaleX).toInt().coerceIn(0, rotatedBitmap.width - 1)
            val cropY = (targetY * scaleY).toInt().coerceIn(0, rotatedBitmap.height - 1)
            val cropWidth = (targetWidth * scaleX).toInt().coerceAtMost(rotatedBitmap.width - cropX)
            val cropHeight = (targetHeight * scaleY).toInt().coerceAtMost(rotatedBitmap.height - cropY)
            
            Log.d(TAG, "Crop Debug: rotatedBitmap size = ${rotatedBitmap.width}x${rotatedBitmap.height}")
            Log.d(TAG, "Crop Debug: finder size = ${finderWidth}x${finderHeight}")
            Log.d(TAG, "Crop Debug: targetView screen coordinates = ($targetX, $targetY), size = ${targetWidth}x${targetHeight}")
            Log.d(TAG, "Crop Debug: computed crop area = ($cropX, $cropY), size = ${cropWidth}x${cropHeight}")
            
            if (cropWidth <= 0 || cropHeight <= 0) return rotatedBitmap
            
            val croppedBitmap = Bitmap.createBitmap(rotatedBitmap, cropX, cropY, cropWidth, cropHeight)
            if (croppedBitmap != rotatedBitmap) {
                rotatedBitmap.recycle()
            }
            return croppedBitmap
        } catch (e: Exception) {
            Log.e(TAG, "Error recortando imagen para OCR", e)
            return rotatedBitmap
        }
    }

    private fun takePhoto() {
        val imageCapture = imageCapture ?: return

        // Deshabilitar botón para evitar múltiples clics
        btnCapture.isEnabled = false

        imageCapture.takePicture(
            ContextCompat.getMainExecutor(this),
            object : ImageCapture.OnImageCapturedCallback() {
                override fun onError(exc: ImageCaptureException) {
                    btnCapture.isEnabled = true
                    Log.e(TAG, "Error capturando foto: ${exc.message}", exc)
                    Toast.makeText(this@CustomCameraActivity, "Error al capturar la foto", Toast.LENGTH_SHORT).show()
                }

                override fun onCaptureSuccess(image: ImageProxy) {
                    cameraExecutor.execute {
                        var processedBitmap: Bitmap? = null
                        try {
                            val rawBitmap = imageProxyToBitmap(image)
                            if (rawBitmap == null) {
                                runOnUiThread {
                                    btnCapture.isEnabled = true
                                    Toast.makeText(this@CustomCameraActivity, "Error al decodificar la foto en memoria", Toast.LENGTH_SHORT).show()
                                }
                                return@execute
                            }

                            // 1. Rotar físicamente la imagen
                            val rotationDegrees = image.imageInfo.rotationDegrees
                            val rotatedBitmap = rotateBitmap(rawBitmap, rotationDegrees)

                            val ocrMode = intent.getBooleanExtra("ocr_mode", false)
                            if (ocrMode) {
                                // 2a. Si es OCR, recortamos a la rendija
                                val croppedBitmap = cropOcrImage(rotatedBitmap)
                                processedBitmap = croppedBitmap
                                
                                // Guardar temporal para ML Kit
                                val outputFile = File(outputFilePath)
                                java.io.FileOutputStream(outputFile).use { out ->
                                    croppedBitmap.compress(Bitmap.CompressFormat.JPEG, 90, out)
                                }
                                
                                runOnUiThread {
                                    // Breve vibración física de confirmación al guardar
                                    try {
                                        val vibrator = getSystemService(VIBRATOR_SERVICE) as Vibrator
                                        vibrator.vibrate(80)
                                    } catch (e: Exception) {}

                                    runOCR(outputFile, croppedBitmap)
                                }
                            } else {
                                // 2b. Si es foto estándar, redimensionar a 3264px máx
                                val scaledBitmap = scaleBitmapIfNeeded(rotatedBitmap, 3264)
                                processedBitmap = scaledBitmap

                                // Guardar en disco con compresión al 90%
                                val outputFile = File(outputFilePath)
                                java.io.FileOutputStream(outputFile).use { out ->
                                    scaledBitmap.compress(Bitmap.CompressFormat.JPEG, 90, out)
                                }

                                runOnUiThread {
                                    // Breve vibración física de confirmación al guardar
                                    try {
                                        val vibrator = getSystemService(VIBRATOR_SERVICE) as Vibrator
                                        vibrator.vibrate(80)
                                    } catch (e: Exception) {}

                                    val resultIntent = Intent().apply {
                                        putExtra(RESULT_PHOTO_NAME, outputFile.name)
                                    }
                                    setResult(Activity.RESULT_OK, resultIntent)
                                    finish()
                                }
                            }
                        } catch (e: Exception) {
                            Log.e(TAG, "Error procesando imagen en memoria", e)
                            runOnUiThread {
                                btnCapture.isEnabled = true
                                Toast.makeText(this@CustomCameraActivity, "Error al procesar y guardar la foto", Toast.LENGTH_SHORT).show()
                            }
                        } finally {
                            processedBitmap?.recycle()
                            image.close()
                        }
                    }
                }
            }
        )
    }

    private fun runOCR(outputFile: File, bitmap: Bitmap) {
        try {
            val image = InputImage.fromBitmap(bitmap, 0)
            val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
            recognizer.process(image)
                .addOnSuccessListener { visionText ->
                    val targetField = intent.getStringExtra("ocr_target") ?: ""
                    val cleanedText = parseOcrTextWithSizes(visionText, targetField)
                    
                    val resultIntent = Intent().apply {
                        putExtra(RESULT_PHOTO_NAME, outputFile.name)
                        putExtra("ocr_result", cleanedText)
                    }
                    setResult(Activity.RESULT_OK, resultIntent)
                    finish()
                }
                .addOnFailureListener { e ->
                    Log.e(TAG, "OCR failed: ${e.message}", e)
                    Toast.makeText(this, "Fallo al reconocer texto. Ingrese datos manualmente.", Toast.LENGTH_SHORT).show()
                    val resultIntent = Intent().apply {
                        putExtra(RESULT_PHOTO_NAME, outputFile.name)
                        putExtra("ocr_result", "")
                    }
                    setResult(Activity.RESULT_OK, resultIntent)
                    finish()
                }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to run OCR on bitmap", e)
            val resultIntent = Intent().apply {
                putExtra(RESULT_PHOTO_NAME, outputFile.name)
                putExtra("ocr_result", "")
            }
            setResult(Activity.RESULT_OK, resultIntent)
            finish()
        }
    }

    private fun parseOcrDate(text: String): String? {
        val cleanText = text.trim().uppercase()
        
        // Regex para detectar fechas con mes numérico o en texto, con delimitadores opcionales y posibles partes intermedias
        val regex = Regex(
            "\\b(\\d{1,2})[\\/\\-\\.\\s]+([A-Z0-9]+)(?:[\\/\\-\\.\\s]+[A-Z0-9]+)*[\\/\\-\\.\\s]+(\\d{4})\\b",
            RegexOption.IGNORE_CASE
        )
        
        val match = regex.find(cleanText) ?: return null
        
        val dayStr = match.groupValues[1].padStart(2, '0')
        val monthRaw = match.groupValues[2]
        val yearStr = match.groupValues[3]
        
        val monthsMap = mapOf(
            "ENE" to "01", "ENERO" to "01",
            "FEB" to "02", "FEBRERO" to "02",
            "MAR" to "03", "MARZO" to "03",
            "ABR" to "04", "ABRIL" to "04",
            "MAY" to "05", "MAYO" to "05",
            "JUN" to "06", "JUNIO" to "06",
            "JUL" to "07", "JULIO" to "07",
            "AGO" to "08", "AGOSTO" to "08",
            "SEP" to "09", "SEPTIEMBRE" to "09", "SETIEMBRE" to "09",
            "OCT" to "10", "OCTUBRE" to "10",
            "NOV" to "11", "NOVIEMBRE" to "11",
            "DIC" to "12", "DICIEMBRE" to "12"
        )
        
        val monthStr = if (monthRaw.all { it.isDigit() }) {
            monthRaw.padStart(2, '0')
        } else {
            monthsMap[monthRaw] ?: return null
        }
        
        val dayInt = dayStr.toIntOrNull() ?: return null
        val monthInt = monthStr.toIntOrNull() ?: return null
        if (dayInt !in 1..31 || monthInt !in 1..12) return null
        
        return "$dayStr/$monthStr/$yearStr"
    }

    private fun parseOcrTextWithSizes(visionText: com.google.mlkit.vision.text.Text, targetField: String): String {
        val ignorePatterns = listOf(
            "REPUBLICA", "NICARAGUA", "CONSEJO", "SUPREMO", "CEDULA", 
            "IDENTIDAD", "NOMBRES", "APELLIDOS", "SEXO", "FECHA", "NACIMIENTO", "FIRMA"
        )
        val linesWithHeights = mutableListOf<Pair<String, Int>>()
        
        for (block in visionText.textBlocks) {
            for (line in block.lines) {
                val text = line.text.trim()
                val height = line.boundingBox?.height() ?: 0
                val upper = text.uppercase()
                val hasIgnore = ignorePatterns.any { upper.contains(it) }
                if (text.isNotEmpty() && !hasIgnore) {
                    linesWithHeights.add(Pair(text, height))
                }
            }
        }
        
        Log.e(TAG, "OCR Debug: Candidates for field [$targetField]: ${linesWithHeights.map { "${it.first} (${it.second}px)" }}")

        if (linesWithHeights.isEmpty()) return ""

        // Priorizar el texto más grande de forma general para todos los campos
        val sortedLines = linesWithHeights.sortedByDescending { it.second }

        return when (targetField) {
            "Tomo", "Folio", "Asiento", "NoFinca_NAP" -> {
                for (item in sortedLines) {
                    val regex = Regex("\\d+")
                    val match = regex.find(item.first)
                    if (match != null) return match.value
                }
                ""
            }
            "Identificacion" -> {
                val cedulaRegex = Regex("\\b\\d{3}-?\\d{6}-?\\d{4}[A-Z]\\b", RegexOption.IGNORE_CASE)
                for (item in sortedLines) {
                    val match = cedulaRegex.find(item.first)
                    if (match != null) return match.value.uppercase()
                }
                val rucRegex = Regex("\\b[A-Z]-?\\d{12,13}\\b", RegexOption.IGNORE_CASE)
                for (item in sortedLines) {
                    val match = rucRegex.find(item.first)
                    if (match != null) return match.value.uppercase()
                }
                sortedLines.firstOrNull()?.first ?: ""
            }
            "FechaRegistro", "FechaAdquisicion" -> {
                for (item in sortedLines) {
                    val parsedDate = parseOcrDate(item.first)
                    if (parsedDate != null) return parsedDate
                }
                sortedLines.firstOrNull()?.first ?: ""
            }
            else -> {
                sortedLines.firstOrNull()?.first ?: ""
            }
        }
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

    private fun getSensorOrientation(): Int {
        try {
            val cameraManager = getSystemService(android.content.Context.CAMERA_SERVICE) as android.hardware.camera2.CameraManager
            for (id in cameraManager.cameraIdList) {
                val characteristics = cameraManager.getCameraCharacteristics(id)
                val facing = characteristics.get(android.hardware.camera2.CameraCharacteristics.LENS_FACING)
                if (facing == android.hardware.camera2.CameraCharacteristics.LENS_FACING_BACK) {
                    val orient = characteristics.get(android.hardware.camera2.CameraCharacteristics.SENSOR_ORIENTATION)
                    return orient ?: 90
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error obteniendo la orientación del hardware", e)
        }
        return 90
    }

    override fun onDestroy() {
        super.onDestroy()
        cameraExecutor.shutdown()
    }
}
