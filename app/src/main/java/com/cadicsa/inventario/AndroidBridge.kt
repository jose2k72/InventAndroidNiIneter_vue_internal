package com.cadicsa.inventario

import android.webkit.JavascriptInterface
import android.widget.Toast
import com.cadicsa.inventario.utils.FormImageHelper
import org.json.JSONObject
import java.lang.ref.WeakReference
import java.text.SimpleDateFormat
import java.util.*

/**
 * Interfaz JavaScript para comunicación con Vue.js
 * Extraída de FormActivity para reducir el conteo de tokens.
 */
class AndroidBridge(activity: FormActivity) {
    
    private val activityRef = WeakReference(activity)
    
    private val activity: FormActivity?
        get() = activityRef.get()

    @JavascriptInterface
    fun showAlert(message: String) {
        activity?.runOnUiThread {
            Toast.makeText(activity, message, Toast.LENGTH_LONG).show()
        }
    }

    @JavascriptInterface
    fun getLat(): Double = activity?.latitude ?: 0.0

    @JavascriptInterface
    fun getLng(): Double = activity?.longitude ?: 0.0

    @JavascriptInterface
    fun getGpsLat(): Double = activity?.gpsLatitude ?: 0.0

    @JavascriptInterface
    fun getGpsLng(): Double = activity?.gpsLongitude ?: 0.0

    @JavascriptInterface
    fun getLocalizacion(): String = activity?.localizacion ?: ""

    @JavascriptInterface
    fun getFecha(): String {
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        return sdf.format(Date())
    }


    @JavascriptInterface
    fun getEncuestador(): String {
        return activity?.let {
            try {
                DatabaseHelper.getInstance(it).getEncuestador()
            } catch (e: Exception) {
                "Encuestador"
            }
        } ?: "Encuestador"
    }

    @JavascriptInterface
    fun getAreaCalculada(): Double = activity?.areaCalculada ?: 0.0

    @JavascriptInterface
    fun getMunicipioInterceptado(): String = activity?.municipioCatalog ?: ""

    @JavascriptInterface
    fun getSectorInterceptado(): String = activity?.sectorCatalog ?: ""

    @JavascriptInterface
    fun getManzanaInterceptada(): String = activity?.manzanaCatalog ?: ""

    @JavascriptInterface
    fun getLoteInterceptado(): String = activity?.loteCatalog ?: ""

    @JavascriptInterface
    fun getIdObject(): Int {
        val id = activity?.idObject ?: 0
        return if (id > 0) id else (System.currentTimeMillis() / 1000).toInt()
    }

    @JavascriptInterface
    fun getData(): String {
        val act = activity ?: return "[]"
        return try {
            val dbHelper = DatabaseHelper.getInstance(act)
            dbHelper.getList(act.idObject)
        } catch (e: Exception) {
            android.util.Log.e("AndroidBridge", "Error en getData: ${e.message}")
            "[]"
        }
    }

    @JavascriptInterface
    fun sendData(id: Int, jsonData: String): Int {
        val act = activity ?: return id
        return try {
            val dbHelper = DatabaseHelper.getInstance(act)
            val resultId = dbHelper.insertData(
                id = id,
                data = jsonData,
                imei = "",
                androidId = android.provider.Settings.Secure.getString(act.contentResolver, android.provider.Settings.Secure.ANDROID_ID),
                idObject = act.idObject,
                latitud = act.latitude,
                longitud = act.longitude,
                latitudGPS = act.gpsLatitude,
                longitudGPS = act.gpsLongitude,
                layer = act.layerName,
                idLayer = act.idLayer,
                idPredio = act.idPredio
            )
            
            act.getSharedPreferences("app_prefs", android.content.Context.MODE_PRIVATE)
                .edit()
                .putInt("last_saved_data_id", resultId)
                .apply()
            
            android.util.Log.d("AndroidBridge", "✅ Dato guardado (ID: $resultId)")
            
            act.runOnUiThread {
                Toast.makeText(act, "Datos guardados (ID: $resultId)", Toast.LENGTH_SHORT).show()
            }
            resultId
        } catch (e: Exception) {
            act.runOnUiThread {
                Toast.makeText(act, "Error al guardar: ${e.message}", Toast.LENGTH_SHORT).show()
            }
            id
        }
    }

    @JavascriptInterface
    fun deleteData(id: Int) {
        val act = activity ?: return
        val dbHelper = DatabaseHelper.getInstance(act)
        try {
            val jsonData = dbHelper.getDataById(id)
            if (!jsonData.isNullOrEmpty()) {
                try {
                    val jsonObject = JSONObject(jsonData)
                    if (jsonObject.has("Imagenes")) {
                        val imagenesStr = jsonObject.getString("Imagenes")
                        if (imagenesStr.isNotEmpty()) {
                            val fotos = imagenesStr.split(",").map { it.trim() }.filter { it.isNotEmpty() }
                            var borradas = 0
                            for (foto in fotos) {
                                if (act.imageHelper.deletePhotoFile(foto)) {
                                    borradas++
                                }
                            }
                            android.util.Log.d("AndroidBridge", "🗑️ Eliminadas $borradas fotos")
                        }
                    }
                } catch (e: Exception) {
                    android.util.Log.e("AndroidBridge", "Error parseando JSON: ${e.message}")
                }
            }

            if (dbHelper.deleteRow(id)) {
                act.runOnUiThread {
                    Toast.makeText(act, "Registro y fotos eliminados", Toast.LENGTH_SHORT).show()
                }
            }
        } catch (e: Exception) {
            act.runOnUiThread {
                Toast.makeText(act, "Error al eliminar: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    @JavascriptInterface
    fun Camera() {
        Camera(null)
    }

    @JavascriptInterface
    fun Camera(prefix: String?) {
        activity?.runOnUiThread {
            activity?.imageHelper?.requestCameraPermission(prefix)
        }
    }

    @JavascriptInterface
    fun exportPhoto(filename: String, destinationDirectoryPath: String): String {
        return try {
            val sourceFile = java.io.File(AppConfig.getStorageDirectory(), filename)
            if (!sourceFile.exists()) {
                return "Error: El archivo de origen no existe."
            }
            val destDir = java.io.File(destinationDirectoryPath)
            if (!destDir.exists() || !destDir.isDirectory) {
                return "Error: El directorio de destino no es válido o no existe."
            }
            val destFile = java.io.File(destDir, filename)
            sourceFile.copyTo(destFile, overwrite = true)
            
            // Notificar al Media Scanner para que sea visible en la galería
            activity?.let { act ->
                android.media.MediaScannerConnection.scanFile(
                    act,
                    arrayOf(destFile.absolutePath),
                    arrayOf("image/jpeg"),
                    null
                )
            }
            
            "Success: Archivo exportado exitosamente a " + destFile.absolutePath
        } catch (e: Exception) {
            android.util.Log.e("AndroidBridge", "Error al exportar foto: ${e.message}", e)
            "Error al exportar foto: ${e.message}"
        }
    }

    @JavascriptInterface
    fun listDirectory(path: String?): String {
        val jsonArray = org.json.JSONArray()
        val rootDir = android.os.Environment.getExternalStorageDirectory()
        val target = if (path.isNullOrEmpty()) rootDir else java.io.File(path)

        if (target.exists() && target.isDirectory) {
            // Añadir directorio padre si no estamos en la raíz
            if (target.absolutePath != rootDir.absolutePath && target.parentFile != null) {
                val parentObj = org.json.JSONObject()
                parentObj.put("name", "..")
                parentObj.put("path", target.parentFile!!.absolutePath)
                parentObj.put("isDirectory", true)
                jsonArray.put(parentObj)
            }
            
            target.listFiles()?.sortedWith(compareBy({ !it.isDirectory }, { it.name.lowercase() }))?.forEach { file ->
                val isImage = file.name.lowercase().endsWith(".jpg") || file.name.lowercase().endsWith(".png") || file.name.lowercase().endsWith(".jpeg")
                if (file.isDirectory || isImage) {
                    val obj = org.json.JSONObject()
                    obj.put("name", file.name)
                    obj.put("path", file.absolutePath)
                    obj.put("isDirectory", file.isDirectory)
                    obj.put("size", file.length())
                    obj.put("lastModified", file.lastModified())
                    jsonArray.put(obj)
                }
            }
        }
        return jsonArray.toString()
    }

    @JavascriptInterface
    fun processSelectedFiles(pathsJson: String, prefix: String?) {
        val act = activity ?: return
        Thread {
            try {
                val paths = org.json.JSONArray(pathsJson)
                val dirApp = AppConfig.getStorageDirectory()
                AppConfig.ensureStorageDirectoryExists()
                
                for (i in 0 until paths.length()) {
                    val calendar = java.util.Calendar.getInstance()
                    val format = java.text.SimpleDateFormat("yyyyMMdd_HHmmss_SSS", java.util.Locale.US)
                    val safePrefix = prefix?.replace("[^a-zA-Z0-9._-]".toRegex(), "_") ?: ""
                    val truncatedPrefix = if (safePrefix.length > 50) safePrefix.substring(0, 50) else safePrefix
                    
                    val filePath = paths.getString(i)
                    val sourceFile = java.io.File(filePath)
                    
                    if (sourceFile.exists()) {
                        val timeStamp = format.format(calendar.time)
                        val photoName = if (truncatedPrefix.isNotEmpty()) {
                            "${truncatedPrefix}_${timeStamp}.jpg"
                        } else {
                            "${timeStamp}.jpg"
                        }
                        
                        val destFile = java.io.File(dirApp, photoName)
                        sourceFile.copyTo(destFile, overwrite = true)
                        
                        val base64 = act.imageHelper.convertImageToBase64(destFile)
                        
                        android.media.MediaScannerConnection.scanFile(
                            act,
                            arrayOf(destFile.absolutePath),
                            arrayOf("image/jpeg"),
                            null
                        )
                        
                        act.notifyPhotoCaptured(photoName, base64)
                        
                        // Incrementar el calendario en 1 segundo para garantizar nombre único
                        calendar.add(java.util.Calendar.SECOND, 1)
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }.start()
    }

    @JavascriptInterface
    fun scanFieldOCR(targetField: String) {
        activity?.runOnUiThread {
            activity?.imageHelper?.launchCameraForOCR(targetField)
        }
    }

    @JavascriptInterface
    fun getImageBasePath(): String {
        return activity?.getExternalFilesDir(android.os.Environment.DIRECTORY_PICTURES)?.absolutePath ?: ""
    }
    
    @JavascriptInterface
    fun deletePhotoFile(filename: String): Boolean {
        return activity?.imageHelper?.deletePhotoFile(filename) ?: false
    }
    
    @JavascriptInterface
    fun loadPhotoAsBase64(filename: String): String {
        val act = activity ?: return ""
        return try {
            val photoFile = java.io.File(AppConfig.getStorageDirectory(), filename)
            if (photoFile.exists()) {
                act.imageHelper.convertImageToBase64(photoFile)
            } else {
                ""
            }
        } catch (e: Exception) {
            ""
        }
    }

    @JavascriptInterface
    fun loadCatalogJson(filename: String): String {
        val act = activity ?: return ""
        return try {
            val assetPath = "web/data/$filename"
            act.assets.open(assetPath).bufferedReader(Charsets.UTF_8).use { it.readText() }
        } catch (e: Exception) {
            ""
        }
    }

    @JavascriptInterface
    fun getSiguienteConsecutivo(lat: Double, lng: Double): Int {
        val act = activity ?: return 1
        return try {
            DatabaseHelper.getInstance(act).getSiguienteConsecutivo(lat, lng)
        } catch (e: Exception) {
            1
        }
    }

    @JavascriptInterface
    fun getDataInAdjacentPolygons(idObject: Int): String {
        val act = activity ?: return "[]"
        return try {
            DatabaseHelper.getInstance(act).getDataInAdjacentPolygons(idObject)
        } catch (e: Exception) {
            android.util.Log.e("AndroidBridge", "Error en getDataInAdjacentPolygons: ${e.message}")
            "[]"
        }
    }

    @JavascriptInterface
    fun getPropietariosDelPredio(predioId: Int): String {
        val act = activity ?: return "[]"
        return try {
            DatabaseHelper.getInstance(act).getPropietariosDelPredio(predioId)
        } catch (e: Exception) {
            android.util.Log.e("AndroidBridge", "Error en getPropietariosDelPredio: ${e.message}")
            "[]"
        }
    }

    @JavascriptInterface
    fun setToolbarBackEnabled(enabled: Boolean) {
        activity?.setToolbarBackEnabled(enabled)
    }
}

