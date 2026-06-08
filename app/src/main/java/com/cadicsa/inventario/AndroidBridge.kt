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
            val items = dbHelper.getDataByProximity(act.latitude, act.longitude, 3.0, false)
            
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

