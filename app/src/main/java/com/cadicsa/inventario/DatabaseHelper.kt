package com.cadicsa.inventario

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import com.cadicsa.inventario.utils.*
import java.io.File
import java.text.SimpleDateFormat
import java.util.*

// --- Clases de Datos (Top-level para mejor accesibilidad) ---
data class DataItem(
    val id: Int, val data: String, val fecha: String,
    val latitud: Double, val longitud: Double,
    val latitudGps: Double, val longitudGps: Double,
    val idObject: Int, val idLayer: Int, val idPredio: Int, val layer: String
)

data class AdjacentRoute(
    val id: Int, val localizacion: String, val layer: String,
    val wkt: String, val distancia: Double, val direccion: String
)

/**
 * DatabaseHelper - Acceso a base de datos SQLite
 * Similar al proyecto legacy, almacena datos en JSON
 */
class DatabaseHelper private constructor(context: Context) : SQLiteOpenHelper(
    context,
    AppConfig.getDatabasePath(),
    null,
    DATABASE_VERSION
) {
    companion object {
        private const val DATABASE_VERSION = 1
        private const val TAG = "DatabaseHelper"

        @Volatile
        private var instance: DatabaseHelper? = null

        fun getInstance(context: Context): DatabaseHelper {
            return instance ?: synchronized(this) {
                instance ?: try {
                    DatabaseHelper(context.applicationContext).also { instance = it }
                } catch (e: Exception) {
                    throw IllegalStateException("No se puede acceder a la base de datos: ${e.message}")
                }
            }
        }
        
        fun getDatabasePath(): String = AppConfig.getDatabasePath()
        
        fun isDatabaseAvailable(): Boolean {
            return try {
                val dbFile = File(getDatabasePath())
                dbFile.exists() && dbFile.canRead()
            } catch (e: Exception) {
                false
            }
        }

    }

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL("CREATE TABLE IF NOT EXISTS objects (id INTEGER PRIMARY KEY, minX FLOAT, minY FLOAT, maxX FLOAT, maxY FLOAT, XCentroid FLOAT, YCentroid FLOAT, LOCALIZACION TEXT, layer TEXT, idLayer INTEGER, idPredio INTEGER, wkt TEXT)")
        db.execSQL("CREATE TABLE IF NOT EXISTS DATOS (ID INTEGER PRIMARY KEY AUTOINCREMENT, IDOBJECT INTEGER, DATOS TEXT, FECHA DATETIME, SINCRONIZADO BOOLEAN, IMEI TEXT, ANDROID_ID TEXT, LATITUD DOUBLE, LONGITUD DOUBLE, LATITUDGPS DOUBLE, LONGITUDGPS DOUBLE, LAYER TEXT, IDLAYER INTEGER, IDPREDIO INTEGER, CREADO_POR TEXT, FECHA_UPDATE DATETIME, ACTUALIZADO_POR TEXT)")
        db.execSQL("CREATE TABLE IF NOT EXISTS tiles (x INTEGER, y INTEGER, z INTEGER, s INTEGER, tile BLOB, PRIMARY KEY (x, y, z, s))")
        db.execSQL("CREATE TABLE IF NOT EXISTS config (ID INTEGER PRIMARY KEY AUTOINCREMENT, VARIABLE TEXT, VALOR TEXT)")
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {}


    // ========== CONFIGURACIÓN ==========

    fun getEncuestador(): String {
        readableDatabase.rawQuery("SELECT VALOR FROM CONFIG WHERE VARIABLE='ENCUESTADOR'", null).use { cursor ->
            return if (cursor.moveToFirst()) cursor.getString(0) ?: "" else ""
        }
    }

    fun updateNombreEncuestador(nombre: String): Boolean {
        return try {
            val cv = ContentValues().apply { put("valor", nombre) }
            writableDatabase.update("config", cv, "variable='ENCUESTADOR'", null)
            true
        } catch (e: Exception) { false }
    }

    // ========== DELEGACIÓN A TILE MANAGER ==========

    fun getMaxZoom(): Int = TileManager.getMaxZoom(readableDatabase)
    fun getMinZoom(): Int = TileManager.getMinZoom(readableDatabase)
    fun getInitZoom(): Int = TileManager.getInitZoom(readableDatabase)
    fun existsTile(x: Int, y: Int, z: Int, s: Int): Boolean = TileManager.existsTile(readableDatabase, x, y, z, s)
    fun getTile(x: Int, y: Int, z: Int): ByteArray? = TileManager.getTile(readableDatabase, x, y, z)
    fun getTile(x: Int, y: Int, z: Int, table: String): ByteArray? = TileManager.getTile(readableDatabase, x, y, z, table)
    fun getInitLat(): Float = TileManager.getInitLat(readableDatabase)
    fun getInitLng(): Float = TileManager.getInitLng(readableDatabase)

    // ========== DELEGACIÓN A SPATIAL HELPER ==========

    fun getGeometry(lng: Double, lat: Double, layer: String = "Predios"): Geometry? = SpatialHelper.getGeometry(readableDatabase, lng, lat, layer)
    fun getMunicipiosAt(lng: Double, lat: Double): String? = SpatialHelper.getMunicipiosAt(readableDatabase, lng, lat)
    fun getSectorAt(lng: Double, lat: Double): String? = SpatialHelper.getSectorAt(readableDatabase, lng, lat)
    fun getManzanaForPredio(geomPredio: org.locationtech.jts.geom.Geometry): String? = SpatialHelper.getManzanaForPredio(readableDatabase, geomPredio)
    fun getLoteForPredio(geomPredio: org.locationtech.jts.geom.Geometry): String? = SpatialHelper.getLoteForPredio(readableDatabase, geomPredio)
    fun getDataByProximity(lat: Double, lng: Double, radiusInMeters: Double, limitToOne: Boolean): List<DataItem> = SpatialHelper.getDataByProximity(readableDatabase, lat, lng, radiusInMeters, limitToOne)
    fun getDataInPolygon(predioId: Int): String = SpatialHelper.getDataInPolygon(readableDatabase, predioId)
    fun getDataInAdjacentPolygons(predioId: Int): String = SpatialHelper.getDataInAdjacentPolygons(readableDatabase, predioId)
    fun getPropietariosDelPredio(predioId: Int): String = SpatialHelper.getPropietariosDelPredio(readableDatabase, predioId)
    fun getSiguienteConsecutivo(lat: Double, lng: Double): Int = SpatialHelper.getSiguienteConsecutivo(readableDatabase, lat, lng)
    fun getAdjacentRoutes(polygonWkt: String, umbralLocal: Double = 15.0, umbralNacional: Double = 25.0): List<AdjacentRoute> = SpatialHelper.getAdjacentRoutes(readableDatabase, polygonWkt, umbralLocal, umbralNacional)

    // ========== CRUD BÁSICO DE DATOS ==========

    fun insertData(id: Int, data: String, imei: String, androidId: String, idObject: Int, latitud: Double, longitud: Double, latitudGPS: Double, longitudGPS: Double, layer: String, idLayer: Int, idPredio: Int): Int {
        val db = writableDatabase
        return try {
            val dateFormat = SimpleDateFormat("dd/MM/yyyy HH:mm:ss", Locale.US)
            val fechaActual = dateFormat.format(Date())
            val userInitials = com.cadicsa.inventario.security.SecurityManager.currentUser?.initials ?: "UNK"
            val cv = ContentValues().apply {
                put("DATOS", data); put("SINCRONIZADO", false); put("IMEI", imei); put("ANDROID_ID", androidId)
                put("IDOBJECT", idObject); put("LATITUD", latitud); put("LONGITUD", longitud)
                put("LATITUDGPS", latitudGPS); put("LONGITUDGPS", longitudGPS); put("LAYER", layer)
                put("IDLAYER", idLayer); put("IDPREDIO", idPredio)
            }
            if (id == -1) {
                cv.put("FECHA", fechaActual); cv.put("CREADO_POR", userInitials)
                db.insert("DATOS", null, cv).toInt()
            } else {
                cv.put("FECHA_UPDATE", fechaActual); cv.put("ACTUALIZADO_POR", userInitials)
                db.update("DATOS", cv, "ID=$id", null); id
            }
        } catch (e: Exception) { -1 }
    }

    fun getData(id: Int): String {
        readableDatabase.rawQuery("SELECT DATOS FROM DATOS WHERE ID=$id", null).use { cursor ->
            return if (cursor.moveToFirst()) cursor.getString(0) ?: "" else ""
        }
    }

    fun getDataById(id: Int): String? {
        readableDatabase.rawQuery("SELECT DATOS FROM DATOS WHERE ID = ?", arrayOf(id.toString())).use { cursor ->
            return if (cursor.moveToFirst()) cursor.getString(0) else null
        }
    }

    fun deleteRow(id: Int): Boolean {
        return try {
            writableDatabase.delete("DATOS", "id=$id", null) > 0
        } catch (e: Exception) { false }
    }

    fun getAllData(): List<DataItem> {
        val items = mutableListOf<DataItem>()
        readableDatabase.rawQuery("SELECT ID, DATOS, FECHA, LATITUD, LONGITUD, LATITUDGPS, LONGITUDGPS, IDOBJECT, IDLAYER, IDPREDIO, LAYER FROM DATOS", null).use { cursor ->
            while (cursor.moveToNext()) {
                items.add(DataItem(cursor.getInt(0), cursor.getString(1) ?: "{}", cursor.getString(2) ?: "", cursor.getDouble(3), cursor.getDouble(4), cursor.getDouble(5), cursor.getDouble(6), cursor.getInt(7), cursor.getInt(8), cursor.getInt(9), cursor.getString(10) ?: "Aceras"))
            }
        }
        return items
    }

    fun getListLatLng(latitud: Double, longitud: Double, idObject: Int): String {
        val query = "SELECT ID, DATOS, FECHA, LATITUD, LONGITUD FROM DATOS WHERE ABS(LATITUD - ${SpatialNormalizer.format(latitud)}) < 0.00001 AND ABS(LONGITUD - ${SpatialNormalizer.format(longitud)}) < 0.00001 AND IDOBJECT = $idObject"
        val result = StringBuilder("[")
        readableDatabase.rawQuery(query, null).use { cursor ->
            while (cursor.moveToNext()) {
                result.append("{\"Id\":${cursor.getString(0)},\"Data\": ${cursor.getString(1)},\"IdObject\":$idObject,\"Fecha\": \"${cursor.getString(2)}\"},")
            }
        }
        return if (result.length > 1) result.dropLast(1).toString() + "]" else "[]"
    }

    fun getList(idObject: Int): String {
        val result = StringBuilder("[")
        readableDatabase.rawQuery("SELECT ID, DATOS, FECHA FROM DATOS WHERE IDOBJECT=$idObject", null).use { cursor ->
            while (cursor.moveToNext()) {
                result.append("{\"Id\":${cursor.getString(0)},\"Data\": ${cursor.getString(1)},\"IdObject\":$idObject,\"Fecha\": \"${cursor.getString(2)}\"},")
            }
        }
        return if (result.length > 1) result.dropLast(1).toString() + "]" else "[]"
    }

    fun getDataByObjectId(idObject: Int): List<DataItem> {
        val items = mutableListOf<DataItem>()
        readableDatabase.rawQuery("SELECT ID, DATOS, FECHA, LATITUD, LONGITUD, LATITUDGPS, LONGITUDGPS, IDOBJECT, IDLAYER, IDPREDIO, LAYER FROM DATOS WHERE IDOBJECT=$idObject", null).use { cursor ->
            while (cursor.moveToNext()) {
                items.add(DataItem(
                    cursor.getInt(0), 
                    cursor.getString(1) ?: "{}", 
                    cursor.getString(2) ?: "", 
                    cursor.getDouble(3), 
                    cursor.getDouble(4), 
                    cursor.getDouble(5), 
                    cursor.getDouble(6), 
                    cursor.getInt(7), 
                    cursor.getInt(8), 
                    cursor.getInt(9), 
                    cursor.getString(10) ?: "Aceras"
                ))
            }
        }
        return items
    }

    fun getDataByObjectId(idObject: Int, lat: Double, lng: Double, radiusInMeters: Double): List<DataItem> {
        val allPoints = getDataByObjectId(idObject)
        val results = FloatArray(1)
        return allPoints.filter { point ->
            android.location.Location.distanceBetween(lat, lng, point.latitud, point.longitud, results)
            results[0] <= radiusInMeters
        }
    }

    /**
     * Obtiene el mapa de estadísticas agrupadas por día con filtrado espacial de 3 metros
     */
    fun getDailyStatisticsMap(): Map<String, Int> {
        val query = """
            SELECT substr(FECHA, 1, 10) as Dia, LATITUD, LONGITUD 
            FROM DATOS 
            ORDER BY substr(FECHA, 7, 4) || substr(FECHA, 4, 2) || substr(FECHA, 1, 2) ASC, substr(FECHA, 12) ASC
        """.trimIndent()
        
        val db = readableDatabase
        val cursor = db.rawQuery(query, null)
        
        data class Point(val dia: String, val lat: Double, val lon: Double)
        val representativos = mutableListOf<Point>()
        val countsByDay = mutableMapOf<String, Int>()
        val results = FloatArray(1)
        
        try {
            while (cursor.moveToNext()) {
                val dia = cursor.getString(0) ?: "Desconocido"
                val lat = cursor.getDouble(1)
                val lon = cursor.getDouble(2)
                
                var isDuplicate = false
                for (rep in representativos) {
                    val dLat = Math.abs(lat - rep.lat)
                    val dLon = Math.abs(lon - rep.lon)
                    
                    if (dLat < 0.00005 && dLon < 0.00005) {
                        android.location.Location.distanceBetween(lat, lon, rep.lat, rep.lon, results)
                        if (results[0] <= 3.0f) {
                            isDuplicate = true
                            break
                        }
                    }
                }
                
                if (!isDuplicate) {
                    representativos.add(Point(dia, lat, lon))
                    countsByDay[dia] = countsByDay.getOrDefault(dia, 0) + 1
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("DatabaseHelper", "Error calculando estadísticas espaciales: ${e.message}")
        } finally {
            cursor.close()
        }
        
        return countsByDay
    }

    /**
     * Obtener estadísticas de datos capturados agrupados por día con filtrado espacial de 3 metros
     */
    fun getDailyStatistics(): String {
        val countsByDay = getDailyStatisticsMap()
        
        val sortedDays = countsByDay.keys.sortedByDescending { dia ->
            if (dia.length >= 10) {
                "${dia.substring(6, 10)}${dia.substring(3, 5)}${dia.substring(0, 2)}"
            } else {
                dia
            }
        }
        
        val resultString = StringBuilder()
        for (dia in sortedDays) {
            resultString.append("📅 $dia: ${countsByDay[dia]} entradas\n")
        }
        
        val finalResult = resultString.toString()
        return if (finalResult.isEmpty()) "No hay datos registrados aún." else finalResult.trim()
    }

    /**
     * Obtiene la cantidad de puntos válidos para el día actual
     */
    fun getTodayStatisticsCount(): Int {
        val todayStr = java.text.SimpleDateFormat("dd/MM/yyyy", java.util.Locale.US).format(java.util.Date())
        return getDailyStatisticsMap()[todayStr] ?: 0
    }
}
