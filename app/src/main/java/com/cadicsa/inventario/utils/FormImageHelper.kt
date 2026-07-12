package com.cadicsa.inventario.utils

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.Settings
import android.util.Base64
import android.util.Log
import android.widget.Toast
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import com.cadicsa.inventario.AppConfig
import com.cadicsa.inventario.FormActivity
import java.io.ByteArrayOutputStream
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

import android.app.Activity
import com.cadicsa.inventario.CustomCameraActivity

class FormImageHelper(private val activity: FormActivity) {

    private val TAG = "FormImageHelper"
    
    var currentPhotoPath: String = ""
    var currentPhotoName: String = ""
    var currentPhotoPrefix: String? = null
    var currentOcrField: String? = null

    // Registradores de resultados (deben registrarse durante la inicialización de la Actividad)
    private val cameraLauncher = activity.registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val ocrField = currentOcrField
            if (ocrField != null) {
                val ocrResult = result.data?.getStringExtra("ocr_result") ?: ""
                activity.notifyOcrResult(ocrField, ocrResult)
                
                // Borrar foto temporal de OCR
                val photoName = result.data?.getStringExtra(CustomCameraActivity.RESULT_PHOTO_NAME)
                if (!photoName.isNullOrEmpty()) {
                    val tempFile = File(AppConfig.getStorageDirectory(), photoName)
                    if (tempFile.exists()) {
                        tempFile.delete()
                    }
                }
                currentOcrField = null
            } else {
                val photoName = result.data?.getStringExtra(CustomCameraActivity.RESULT_PHOTO_NAME)
                if (!photoName.isNullOrEmpty()) {
                    currentPhotoName = photoName
                    currentPhotoPath = File(AppConfig.getStorageDirectory(), photoName).absolutePath
                    processCapturedPhoto()
                }
            }
        } else {
            currentOcrField = null
        }
    }

    private val cameraPermissionLauncher = activity.registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            checkStoragePermission()
        } else {
            Toast.makeText(activity, "Permiso de cámara denegado", Toast.LENGTH_SHORT).show()
        }
    }
    
    private val storagePermissionLauncher = activity.registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            launchCamera()
        } else {
            Toast.makeText(activity, "Permiso de almacenamiento denegado", Toast.LENGTH_SHORT).show()
        }
    }

    fun launchCameraForOCR(targetField: String) {
        currentOcrField = targetField
        if (ContextCompat.checkSelfPermission(activity, Manifest.permission.CAMERA) 
            == PackageManager.PERMISSION_GRANTED) {
            checkStoragePermission()
        } else {
            cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    fun requestCameraPermission(prefix: String? = null) {
        currentPhotoPrefix = prefix
        if (ContextCompat.checkSelfPermission(activity, Manifest.permission.CAMERA) 
            == PackageManager.PERMISSION_GRANTED) {
            checkStoragePermission()
        } else {
            cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }
    
    fun checkStoragePermission() {
        // Android 11+ (API 30+): MANAGE_EXTERNAL_STORAGE
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            if (Environment.isExternalStorageManager()) {
                launchCamera()
            } else {
                Log.w(TAG, "⚠️ Solicitando permiso MANAGE_EXTERNAL_STORAGE")
                Toast.makeText(activity, "Se requiere permiso de acceso a archivos.", Toast.LENGTH_LONG).show()
                try {
                    val intent = Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION)
                    intent.data = Uri.parse("package:${activity.packageName}")
                    activity.startActivity(intent)
                } catch (e: Exception) {
                    val intent = Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION)
                    activity.startActivity(intent)
                }
            }
            return
        }
        
        // Android 10 (API 29): Legacy storage en manifest
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            launchCamera()
            return
        }
        
        // Android 6-9 (API 23-28): WRITE_EXTERNAL_STORAGE
        if (ContextCompat.checkSelfPermission(activity, Manifest.permission.WRITE_EXTERNAL_STORAGE)
            == PackageManager.PERMISSION_GRANTED) {
            launchCamera()
        } else {
            storagePermissionLauncher.launch(Manifest.permission.WRITE_EXTERNAL_STORAGE)
        }
    }

    private fun launchCamera() {
        val photoFile = createImageFile()
        photoFile?.let { file ->
            val intent = Intent(activity, CustomCameraActivity::class.java).apply {
                putExtra(CustomCameraActivity.EXTRA_OUTPUT_PATH, file.absolutePath)
                putExtra("gps_latitude", activity.gpsLatitude)
                putExtra("gps_longitude", activity.gpsLongitude)
                if (currentOcrField != null) {
                    putExtra("ocr_mode", true)
                    putExtra("ocr_target", currentOcrField)
                }
            }
            cameraLauncher.launch(intent)
        }
    }

    private fun processCapturedPhoto() {
        val photoPath = currentPhotoPath
        val photoName = currentPhotoName
        kotlin.concurrent.thread {
            try {
                val photoFile = File(photoPath)
                val base64 = convertImageToBase64(photoFile)
                
                // Notificar al Media Scanner
                android.media.MediaScannerConnection.scanFile(
                    activity,
                    arrayOf(photoPath),
                    arrayOf("image/jpeg"),
                    null
                )
                
                // Notificar a Vue vía Webview de la actividad en el hilo principal
                activity.runOnUiThread {
                    activity.notifyPhotoCaptured(photoName, base64)
                }
                Log.d(TAG, "✅ Foto procesada y enviada a Vue en hilo de fondo")
            } catch (e: Exception) {
                Log.e(TAG, "❌ Error procesando foto: ${e.message}")
                activity.runOnUiThread {
                    Toast.makeText(activity, "Error procesando foto", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    fun deletePhotoFile(filename: String): Boolean {
        return try {
            val photoFile = File(AppConfig.getStorageDirectory(), filename)
            if (photoFile.exists()) {
                val deleted = photoFile.delete()
                Log.d(TAG, if (deleted) "✅ Foto eliminada: $filename" else "❌ No se pudo eliminar: $filename")
                deleted
            } else {
                Log.w(TAG, "⚠️ Foto no existe: $filename")
                false
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error eliminando foto: ${e.message}")
            false
        }
    }

    private fun createImageFile(): File? {
        return try {
            val timeStamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
            currentPhotoName = if (!currentPhotoPrefix.isNullOrBlank()) {
                val safePrefix = currentPhotoPrefix!!.replace("[^a-zA-Z0-9._-]".toRegex(), "_")
                val truncatedPrefix = if (safePrefix.length > 50) safePrefix.substring(0, 50) else safePrefix
                "${truncatedPrefix}_${timeStamp}.jpg"
            } else {
                "${timeStamp}.jpg"
            }
            
            val dirApp = AppConfig.getStorageDirectory()
            AppConfig.ensureStorageDirectoryExists()
            
            File(dirApp, currentPhotoName).also {
                currentPhotoPath = it.absolutePath
                Log.d(TAG, "📷 Foto en: ${it.absolutePath}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error creando archivo: ${e.message}")
            null
        }
    }
    
    fun convertImageToBase64(imageFile: File): String {
        return try {
            if (!imageFile.exists()) return ""
            val bytes = imageFile.readBytes()
            Base64.encodeToString(bytes, Base64.NO_WRAP)
        } catch (e: Exception) {
            Log.e(TAG, "Error Base64: ${e.message}")
            ""
        }
    }
}
