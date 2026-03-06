package com.cadicsa.inventario

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import android.os.Environment
// LatLng import removido - migrado a JTS
import java.io.File
import java.text.SimpleDateFormat
import java.util.*
import org.locationtech.jts.geom.Geometry as JtsGeometry
import org.locationtech.jts.geom.Polygon
import org.locationtech.jts.geom.Point
import org.locationtech.jts.geom.Coordinate
import org.locationtech.jts.geom.LineString
import org.locationtech.jts.geom.MultiPolygon

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
    private val mContext: Context = context

    companion object {
        private const val DATABASE_VERSION = 1
        private const val TAG = "DatabaseHelper"

        @Volatile
        private var instance: DatabaseHelper? = null

        fun getInstance(context: Context): DatabaseHelper {
            return instance ?: synchronized(this) {
                instance ?: try {
                    android.util.Log.d(TAG, "Intentando abrir BD en: ${getDatabasePath()}")
                    DatabaseHelper(context.applicationContext).also { 
                        instance = it 
                        android.util.Log.d(TAG, "BD abierta exitosamente")
                    }
                } catch (e: Exception) {
                    android.util.Log.e(TAG, "Error al abrir BD: ${e.message}")
                    throw IllegalStateException("No se puede acceder a la base de datos: ${e.message}")
                }
            }
        }
        
        fun getDatabasePath(): String {
            return AppConfig.getDatabasePath()
        }
        
        /**
         * Verifica si la base de datos existe y es accesible
         */
        fun isDatabaseAvailable(): Boolean {
            return try {
                val dbPath = getDatabasePath()
                val dbFile = File(dbPath)
                val exists = dbFile.exists()
                val canRead = dbFile.canRead()
                android.util.Log.d(TAG, "isDatabaseAvailable: path=$dbPath, exists=$exists, canRead=$canRead")
                exists && canRead
            } catch (e: Exception) {
                android.util.Log.e(TAG, "Error verificando BD: ${e.message}")
                false
            }
        }
    }

    // SQL para crear tablas
    private val SQL_CREATE_OBJECTS = """
        CREATE TABLE IF NOT EXISTS objects (
            id INTEGER PRIMARY KEY,
            minX FLOAT, minY FLOAT, maxX FLOAT, maxY FLOAT,
            XCentroid FLOAT, YCentroid FLOAT,
            LOCALIZACION TEXT,
            layer TEXT,
            idLayer INTEGER,
            idPredio INTEGER,
            wkt TEXT
        )
    """.trimIndent()

    private val SQL_CREATE_DATA = """
        CREATE TABLE IF NOT EXISTS DATOS (
            ID INTEGER PRIMARY KEY AUTOINCREMENT,
            IDOBJECT INTEGER,
            DATOS TEXT,
            FECHA DATETIME,
            SINCRONIZADO BOOLEAN,
            IMEI TEXT,
            ANDROID_ID TEXT,
            LATITUD DOUBLE,
            LONGITUD DOUBLE,
            LATITUDGPS DOUBLE,
            LONGITUDGPS DOUBLE,
            LAYER TEXT,
            IDLAYER INTEGER,
            IDPREDIO INTEGER
        )
    """.trimIndent()

    private val SQL_CREATE_TILES = """
        CREATE TABLE IF NOT EXISTS tiles (
            x INTEGER, y INTEGER, z INTEGER, s INTEGER,
            tile BLOB,
            PRIMARY KEY (x, y, z, s)
        )
    """.trimIndent()

    private val SQL_CREATE_CONFIG = """
        CREATE TABLE IF NOT EXISTS config (
            ID INTEGER PRIMARY KEY AUTOINCREMENT,
            VARIABLE TEXT,
            VALOR TEXT
        )
    """.trimIndent()

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL(SQL_CREATE_OBJECTS)
        db.execSQL(SQL_CREATE_DATA)
        db.execSQL(SQL_CREATE_TILES)
        db.execSQL(SQL_CREATE_CONFIG)
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        // Sin migraciones por ahora
    }

    // ========== MÉTODOS DE CONFIGURACIÓN ==========

    fun getEncuestador(): String {
        val query = "SELECT VALOR FROM CONFIG WHERE VARIABLE='ENCUESTADOR'"
        val db = readableDatabase
        val cursor = db.rawQuery(query, null)

        return try {
            if (cursor.moveToFirst()) cursor.getString(0) else ""
        } catch (e: Exception) {
            ""
        } finally {
            cursor.close()
        }
    }

    fun updateNombreEncuestador(nombre: String): Boolean {
        val db = writableDatabase
        return try {
            val cv = ContentValues().apply {
                put("valor", nombre)
            }
            db.update("config", cv, "variable='ENCUESTADOR'", null)
            true
        } catch (e: Exception) {
            false
        } finally {
            db.close()
        }
    }

    fun getInitLat(): Float {
        val query = "SELECT VALOR FROM config WHERE VARIABLE='InitLat'"
        val db = readableDatabase
        val cursor = db.rawQuery(query, null)

        return try {
            val result = if (cursor.moveToFirst()) {
                val value = cursor.getString(0)
                android.util.Log.d("DatabaseHelper", "getInitLat: valor encontrado = $value")
                value.toFloat()
            } else {
                android.util.Log.d("DatabaseHelper", "getInitLat: no se encontró registro")
                0f
            }
            result
        } catch (e: Exception) {
            android.util.Log.e("DatabaseHelper", "getInitLat error: ${e.message}")
            0f
        } finally {
            cursor.close()
        }
    }

    fun getInitLng(): Float {
        val query = "SELECT VALOR FROM config WHERE VARIABLE='InitLng'"
        val db = readableDatabase
        val cursor = db.rawQuery(query, null)

        return try {
            val result = if (cursor.moveToFirst()) {
                val value = cursor.getString(0)
                android.util.Log.d("DatabaseHelper", "getInitLng: valor encontrado = $value")
                value.toFloat()
            } else {
                android.util.Log.d("DatabaseHelper", "getInitLng: no se encontró registro")
                0f
            }
            result
        } catch (e: Exception) {
            android.util.Log.e("DatabaseHelper", "getInitLng error: ${e.message}")
            0f
        } finally {
            cursor.close()
        }
    }

    // ========== MÉTODOS DE DATOS ==========

    /**
     * Insertar o actualizar datos (JSON)
     */
    fun insertData(
        id: Int,
        data: String,
        imei: String,
        androidId: String,
        idObject: Int,
        latitud: Double,
        longitud: Double,
        latitudGPS: Double,
        longitudGPS: Double,
        layer: String,
        idLayer: Int,
        idPredio: Int
    ): Int {
        val db = writableDatabase
        var resultId = id

        try {
            val dateFormat = SimpleDateFormat("dd/MM/yyyy HH:mm:ss", Locale.US)
            val fechaActual = dateFormat.format(Date())
            val inicialesActuales = com.cadicsa.inventario.security.SecurityManager.currentUser?.initials ?: "UNK"

            val cv = ContentValues().apply {
                put("DATOS", data)
                put("SINCRONIZADO", false)
                put("IMEI", imei)
                put("ANDROID_ID", androidId)
                put("IDOBJECT", idObject)
                put("LATITUD", latitud)
                put("LONGITUD", longitud)
                put("LATITUDGPS", latitudGPS)
                put("LONGITUDGPS", longitudGPS)
                put("LAYER", layer)
                put("IDLAYER", idLayer)
                put("IDPREDIO", idPredio)
            }

            resultId = if (id == -1) {
                // Nuevo registro: Se setean campos de creación
                cv.put("FECHA", fechaActual)
                cv.put("CREADO_POR", inicialesActuales)
                db.insert("DATOS", null, cv).toInt()
            } else {
                // Modificación: No se toca FECHA ni CREADO_POR original
                cv.put("FECHA_UPDATE", fechaActual)
                cv.put("ACTUALIZADO_POR", inicialesActuales)
                db.update("DATOS", cv, "ID=$id", null)
                id
            }
        } catch (e: Exception) {
            e.printStackTrace()
        } finally {
            db.close()
        }

        return resultId
    }

    /**
     * Obtener datos por ID
     */
    fun getData(id: Int): String {
        val query = "SELECT DATOS FROM DATOS WHERE ID=$id"
        val db = readableDatabase
        val cursor = db.rawQuery(query, null)

        return try {
            if (cursor.moveToFirst()) cursor.getString(0) else ""
        } catch (e: Exception) {
            ""
        } finally {
            cursor.close()
        }
    }

    /**
     * Obtener JSON de datos por ID de registro
     */
    fun getDataById(id: Int): String? {
        val db = readableDatabase
        val cursor = db.rawQuery("SELECT DATOS FROM DATOS WHERE ID = ?", arrayOf(id.toString()))
        return try {
            if (cursor.moveToFirst()) {
                cursor.getString(0)
            } else {
                null
            }
        } catch (e: Exception) {
            e.printStackTrace()
            null
        } finally {
            cursor.close()
        }
    }

    /**
     * Eliminar registro
     */
    fun deleteRow(id: Int): Boolean {
        val db = writableDatabase
        return try {
            db.delete("DATOS", "id=$id", null)
            true
        } catch (e: Exception) {
            false
        } finally {
            db.close()
        }
    }

    /**
     * Clase de datos para representar un registro completo
     */
    data class DataItem(
        val id: Int,
        val data: String,
        val fecha: String,
        val latitud: Double,
        val longitud: Double,
        val latitudGps: Double,
        val longitudGps: Double,
        val idObject: Int,
        val idLayer: Int,
        val idPredio: Int,
        val layer: String
    )

    /**
     * Obtener todos los registros (para marcadores en mapa)
     */
    fun getAllData(): List<DataItem> {
        val items = mutableListOf<DataItem>()
        val query = """
            SELECT ID, DATOS, FECHA, LATITUD, LONGITUD, LATITUDGPS, LONGITUDGPS, 
                   IDOBJECT, IDLAYER, IDPREDIO, LAYER 
            FROM DATOS
        """.trimIndent()
        
        val db = readableDatabase
        val cursor = db.rawQuery(query, null)
        
        try {
            while (cursor.moveToNext()) {
                items.add(
                    DataItem(
                        id = cursor.getInt(0),
                        data = cursor.getString(1) ?: "{}",
                        fecha = cursor.getString(2) ?: "",
                        latitud = cursor.getDouble(3),
                        longitud = cursor.getDouble(4),
                        latitudGps = cursor.getDouble(5),
                        longitudGps = cursor.getDouble(6),
                        idObject = cursor.getInt(7),
                        idLayer = cursor.getInt(8),
                        idPredio = cursor.getInt(9),
                        layer = cursor.getString(10) ?: "Aceras"
                    )
                )
            }
        } catch (e: Exception) {
            android.util.Log.e(TAG, "Error en getAllData: ${e.message}")
        } finally {
            cursor.close()
        }
        
        return items
    }

    /**
     * Obtener lista de datos por coordenadas
     */
    fun getListLatLng(latitud: Double, longitud: Double, idObject: Int): String {
        val query = """
            SELECT ID, DATOS, FECHA, LATITUD, LONGITUD FROM DATOS 
            WHERE ABS(LATITUD - $latitud) < 0.00001 
            AND ABS(LONGITUD - $longitud) < 0.00001 
            AND IDOBJECT = $idObject
        """.trimIndent()

        val db = readableDatabase
        val cursor = db.rawQuery(query, null)
        val result = StringBuilder("[")

        try {
            while (cursor.moveToNext()) {
                result.append("""{"Id":${cursor.getString(0)},""")
                result.append(""""Data": ${cursor.getString(1)},""")
                result.append(""""IdObject":$idObject,""")
                result.append(""""Fecha": "${cursor.getString(2)}"},""")
            }
        } catch (e: Exception) {
            e.printStackTrace()
        } finally {
            cursor.close()
        }

        // Remover última coma si hay datos
        val resultStr = result.toString()
        return if (resultStr.length > 1) {
            resultStr.dropLast(1) + "]"
        } else {
            "[]"
        }
    }

    /**
     * Método unificado para consultas por proximidad geográfica.
     * Útil para snapping (clic cercano a punto existente) y carga de grupos de puntos (clusters).
     * 
     * @param lat Latitud de referencia
     * @param lng Longitud de referencia
     * @param radiusInMeters Radio de búsqueda en metros
     * @param limitToOne Si es true, solo devuelve el primer punto encontrado (modo Snap)
     * @return Lista de DataItem encontrados
     */
    fun getDataByProximity(lat: Double, lng: Double, radiusInMeters: Double, limitToOne: Boolean): List<DataItem> {
        val items = mutableListOf<DataItem>()
        
        // Conversión aproximada de metros a grados decimales para filtro SQL (Bounding Box)
        // 1 grado de latitud ~ 111,111 metros. 
        // 1 grado de longitud varía, pero para filtros de 2-3 metros esta aproximación es segura y rápida.
        val delta = radiusInMeters / 111000.0 
        
        val limitSql = if (limitToOne) "LIMIT 1" else ""
        
        val query = """
            SELECT ID, DATOS, FECHA, LATITUD, LONGITUD, LATITUDGPS, LONGITUDGPS, 
                   IDOBJECT, IDLAYER, IDPREDIO, LAYER 
            FROM DATOS 
            WHERE LATITUD BETWEEN ${lat - delta} AND ${lat + delta}
              AND LONGITUD BETWEEN ${lng - delta} AND ${lng + delta}
            $limitSql
        """.trimIndent()

        val db = readableDatabase
        val cursor = db.rawQuery(query, null)

        try {
            while (cursor.moveToNext()) {
                // Para mayor precisión (opcional), podríamos calcular la distancia real aquí 
                // pero el BBox de 3m es suficiente para determinar proximidad en campo.
                items.add(
                    DataItem(
                        id = cursor.getInt(0),
                        data = cursor.getString(1) ?: "{}",
                        fecha = cursor.getString(2) ?: "",
                        latitud = cursor.getDouble(3),
                        longitud = cursor.getDouble(4),
                        latitudGps = cursor.getDouble(5),
                        longitudGps = cursor.getDouble(6),
                        idObject = cursor.getInt(7),
                        idLayer = cursor.getInt(8),
                        idPredio = cursor.getInt(9),
                        layer = cursor.getString(10) ?: "Aceras"
                    )
                )
            }
        } catch (e: Exception) {
            android.util.Log.e("DatabaseHelper", "Error en getDataByProximity: ${e.message}")
        } finally {
            cursor.close()
        }
        
        return items
    }

    /**
     * Obtener lista de datos por idObject
     */
    fun getList(idObject: Int): String {
        val query = "SELECT ID, DATOS, FECHA FROM DATOS WHERE IDOBJECT=$idObject"
        val db = readableDatabase
        val cursor = db.rawQuery(query, null)
        val result = StringBuilder("[")

        try {
            while (cursor.moveToNext()) {
                result.append("""{"Id":${cursor.getString(0)},""")
                result.append(""""Data": ${cursor.getString(1)},""")
                result.append(""""IdObject":$idObject,""")
                result.append(""""Fecha": "${cursor.getString(2)}"},""")
            }
        } catch (e: Exception) {
            e.printStackTrace()
        } finally {
            cursor.close()
        }

        val resultStr = result.toString()
        return if (resultStr.length > 1) {
            resultStr.dropLast(1) + "]"
        } else {
            "[]"
        }
    }

    /**
     * Obtener todos los datos que caen geográficamente dentro del predio seleccionado
     */
    /**
     * Obtener todos los datos que caen geográficamente dentro del predio seleccionado
     * Implementación con JTS (sin funciones espaciales SQL)
     */
    fun getDataInPolygon(predioId: Int): String {
        val db = readableDatabase
        
        // 1. Obtener WKT del predio (tabla objects)
        var wktPredioString = ""
        var cursorPredio: android.database.Cursor? = null
        try {
            cursorPredio = db.rawQuery("SELECT wkt FROM objects WHERE id = ?", arrayOf(predioId.toString()))
            if (cursorPredio.moveToFirst()) {
                wktPredioString = cursorPredio.getString(0) ?: ""
            }
        } catch (e: Exception) {
            e.printStackTrace()
        } finally {
            cursorPredio?.close()
        }
        
        if (wktPredioString.isEmpty()) {
            android.util.Log.w("DatabaseHelper", "⚠️ No se encontró geometría (objects) para predio ID: $predioId")
            return "[]"
        }

        // 2. Parsear geometría del predio
        val geomPredio = GeometryUtil.wktToGeometry(wktPredioString) ?: return "[]"
        
        // 3. Obtener Bounding Box para filtro inicial rápido
        val envelope = geomPredio.envelopeInternal
        val minX = envelope.minX
        val minY = envelope.minY
        val maxX = envelope.maxX
        val maxY = envelope.maxY

        // 4. Buscar datos candidatos dentro del BBox
        val query = """
            SELECT ID, DATOS, FECHA, LATITUD, LONGITUD 
            FROM DATOS 
            WHERE LATITUD BETWEEN $minY AND $maxY 
            AND LONGITUD BETWEEN $minX AND $maxX
        """.trimIndent()
        
        val cursor = db.rawQuery(query, null)
        val result = StringBuilder("[")
        var count = 0
        
        try {
            while (cursor.moveToNext()) {
                val lat = cursor.getDouble(3)
                val lon = cursor.getDouble(4)
                
                // 5. Verificar punto exacto con JTS
                // Usamos GeometryUtil.isPointInPolygon que es robusto
                if (GeometryUtil.isPointInPolygon(lat, lon, wktPredioString)) {
                    result.append("{\"Id\":${cursor.getString(0)},")
                    result.append("\"Data\": ${cursor.getString(1)},")
                    result.append("\"IdObject\":$predioId,")
                    result.append("\"Fecha\": \"${cursor.getString(2)}\"},")
                    count++
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        } finally {
            cursor.close()
        }
        
        android.util.Log.d("DatabaseHelper", "✅ getDataInPolygon: $count registros encontrados en el polígono $predioId")
        
        val resultStr = result.toString()
        return if (resultStr.length > 1) {
            resultStr.dropLast(1) + "]"
        } else {
            "[]"
        }
    }

    /**
     * Obtener datos que caen en predios adyacentes (que comparten borde/intersección)
     */
    /**
     * Obtener datos que caen en predios adyacentes (que comparten borde/intersección)
     * Implementación con JTS (sin funciones espaciales SQL)
     */
    /**
     * Obtener datos que caen en predios adyacentes (que comparten borde/intersección) - OPTIMIZADO
     */
    fun getDataInAdjacentPolygons(predioId: Int): String {
        val db = readableDatabase
        
        // 1. Obtener WKT del predio origen (tabla objects)
        var wktOrignString = ""
        var cursorOrigin: android.database.Cursor? = null
        try {
            cursorOrigin = db.rawQuery("SELECT wkt FROM objects WHERE id = ?", arrayOf(predioId.toString()))
            if (cursorOrigin.moveToFirst()) {
                wktOrignString = cursorOrigin.getString(0) ?: ""
            }
        } catch (e: Exception) {
            e.printStackTrace()
        } finally {
            cursorOrigin?.close()
        }
        
        if (wktOrignString.isEmpty()) return "[]"
        
        // Optimización: Parsear WKT origen UNA VEZ
        val geomOrigen = GeometryUtil.wktToGeometry(wktOrignString) ?: return "[]"
        
        // 2. Obtener BBox y expandir (para buscar candidatos cercanos)
        val envelope = geomOrigen.envelopeInternal
        val expansion = 0.00045 // ~50m
        val minX = envelope.minX - expansion
        val minY = envelope.minY - expansion
        val maxX = envelope.maxX + expansion
        val maxY = envelope.maxY + expansion
        
        // 3. Buscar predios candidatos (layer='Predios') en BBox
        val queryCandidatos = """
            SELECT id, wkt, LOCALIZACION 
            FROM objects 
            WHERE layer = 'Predios' COLLATE NOCASE
            AND id != $predioId
            AND maxX >= $minX AND minX <= $maxX
            AND maxY >= $minY AND minY <= $maxY
        """.trimIndent()
        
        // Optimización: Guardar geometría parseada
        data class PredioInfo(
            val id: Int, 
            val geom: org.locationtech.jts.geom.Geometry, // JTS Geometry cacheada
            val localizacion: String, 
            val direccionRelativa: String
        )
        val prediosConfirmados = mutableListOf<PredioInfo>()
        
        val cursorCandidatos = db.rawQuery(queryCandidatos, null)
        try {
            while (cursorCandidatos.moveToNext()) {
                val idC = cursorCandidatos.getInt(0)
                val wktC = cursorCandidatos.getString(1) ?: continue
                val locC = cursorCandidatos.getString(2) ?: ""
                
                // Optimización: Parsear candidato UNA VEZ
                val geomC = GeometryUtil.wktToGeometry(wktC) ?: continue
                
                // Verificar intersección real con JTS (Geom vs Geom)
                if (geomOrigen.intersects(geomC)) {
                    // CALCULAR DIRECCIÓN RELATIVA (Fallback a String para evitar conflictos de compilación)
                    // Usamos los WKT originales en lugar de los objetos JTS para esta función específica
                    val dir = GeometryUtil.getRelativeDirectionBetweenPolygons(wktOrignString, wktC)
                    prediosConfirmados.add(PredioInfo(idC, geomC, locC, dir))
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("DatabaseHelper", "Error buscando predios adyacentes: ${e.message}")
        } finally {
            cursorCandidatos.close()
        }
        
        // 4. Buscar DATOS dentro de cada predio confirmado
        data class DatoAdyacente(
            val id: Int, 
            val jsonData: String, 
            val fecha: String, 
            val localizacionPredio: String, 
            val idObject: Int,
            val direccionRelativa: String,
            val codigoCamino: String
        )
        val listaDatos = mutableListOf<DatoAdyacente>()
        
        for (info in prediosConfirmados) {
             // BBox del adyacente para filtro rápido de DATOS (usar envelope de JTS)
             val env = info.geom.envelopeInternal
             
             val queryDatos = """
                SELECT ID, DATOS, FECHA, LATITUD, LONGITUD 
                FROM DATOS 
                WHERE LATITUD BETWEEN ${env.minY} AND ${env.maxY} 
                AND LONGITUD BETWEEN ${env.minX} AND ${env.maxX}
             """.trimIndent()
             
             val cursorD = db.rawQuery(queryDatos, null)
             try {
                 while (cursorD.moveToNext()) {
                     val lat = cursorD.getDouble(3)
                     val lon = cursorD.getDouble(4)
                     
                     // Optimización: Verificar punto con JTS Geometry cacheada (sin re-parsear)
                     if (GeometryUtil.isPointInPolygon(lat, lon, info.geom)) {
                         val jsonData = cursorD.getString(1) ?: "{}"
                         var codigoCamino = ""
                         try {
                             val json = org.json.JSONObject(jsonData)
                             codigoCamino = json.optString("CodigoCamino") ?: ""
                         } catch (e: Exception) {}

                         listaDatos.add(DatoAdyacente(
                             id = cursorD.getInt(0),
                             jsonData = jsonData,
                             fecha = cursorD.getString(2) ?: "",
                             localizacionPredio = info.localizacion,
                             idObject = info.id,
                             direccionRelativa = info.direccionRelativa,
                             codigoCamino = codigoCamino
                         ))
                     }
                 }
             } catch (e: Exception) {
                 e.printStackTrace()
             } finally {
                 cursorD.close()
             }
        }
        
        // 5. Ordenar por Localización del predio y luego por Código de Camino
        listaDatos.sortWith(compareBy({ it.localizacionPredio }, { it.codigoCamino }))
        
        // 6. Construir JSON
        val builder = StringBuilder("[")
        for (dato in listaDatos) {
            builder.append("{")
            builder.append("\"Id\":${dato.id},")
            builder.append("\"Data\": ${dato.jsonData},")
            builder.append("\"IdObject\":${dato.idObject},")
            builder.append("\"Fecha\": \"${dato.fecha}\",") 
            builder.append("\"LocalizacionPredio\": \"${dato.localizacionPredio}\",")
            builder.append("\"DireccionRelativa\": \"${dato.direccionRelativa}\"},")
        }
        
        val resultStr = builder.toString()
        return if (resultStr.length > 1) {
            resultStr.dropLast(1) + "]"
        } else {
            "[]"
        }
    }

    // ========== MÉTODOS DE OBJETOS/MAPA ==========

    /**
     * Obtener puntos de objetos en un bounding box
     */
    // getObjectsBB() removido - legacy, no usado

    // ========== MÉTODOS DE TILES ==========

    private var maxZoomCache = -1
    private var minZoomCache = -1

    fun getMaxZoom(): Int {
        if (maxZoomCache < 0) {
            val query = "SELECT max(z) FROM tiles"
            val db = readableDatabase
            val cursor = db.rawQuery(query, null)

            try {
                if (cursor.moveToFirst()) {
                    maxZoomCache = cursor.getInt(0)
                }
            } finally {
                cursor.close()
            }
        }
        return maxZoomCache
    }

    fun getMinZoom(): Int {
        if (minZoomCache < 0) {
            val query = "SELECT min(z) FROM tiles"
            val db = readableDatabase
            val cursor = db.rawQuery(query, null)

            try {
                if (cursor.moveToFirst()) {
                    minZoomCache = cursor.getInt(0)
                }
            } finally {
                cursor.close()
            }
        }
        return minZoomCache
    }

    fun getInitZoom(): Int {
        var initZoom = 17
        val maxZoom = getMaxZoom()
        val minZoom = getMinZoom()
        val midZoom = minZoom + (maxZoom - minZoom) / 2

        if (initZoom > maxZoom) initZoom = maxZoom
        if (initZoom < midZoom) initZoom = midZoom

        return initZoom
    }

    fun existsTile(x: Int, y: Int, z: Int, s: Int): Boolean {
        val query = "SELECT x FROM tiles WHERE x = $x AND y = $y AND z = $z"
        val db = readableDatabase
        val cursor = db.rawQuery(query, null)

        return try {
            cursor.moveToFirst()
        } finally {
            cursor.close()
        }
    }

    fun getTile(x: Int, y: Int, z: Int): ByteArray? {
        val query = "SELECT tile FROM tiles WHERE x = $x AND y = $y AND z = $z"
        val db = readableDatabase
        val cursor = db.rawQuery(query, null)

        return try {
            if (cursor.moveToFirst()) cursor.getBlob(0) else null
        } finally {
            cursor.close()
        }
    }

    fun getTile(x: Int, y: Int, z: Int, table: String): ByteArray? {
        val query = "SELECT tile FROM $table WHERE z = $z AND y = $y AND x = $x"
        val db = readableDatabase
        val cursor = db.rawQuery(query, null)

        return try {
            if (cursor.moveToFirst()) cursor.getBlob(0) else null
        } catch (e: Exception) {
            null
        } finally {
            cursor.close()
        }
    }

    // ========== MÉTODOS DE GEOMETRÍA ==========

    // getPolygonPoints() removido - reemplazado por GeometryUtil.wktToGeometry()
    // isPathCounterClockwise() removido - reemplazado por GeometryUtil.isPolygonCounterClockwise()

    /**
     * Busca el objeto geométrico (predio) que contiene el punto dado
     * MIGRADO: Ahora usa JTS en lugar de Google Maps PolyUtil
     * 
     * @param lng Longitud del punto clickeado
     * @param lat Latitud del punto clickeado
     * @param layer Nombre de la capa (ej: "predios", "edificaciones")
     * @return Geometry si encuentra un polígono que contiene el punto, null si no
     */
    fun getGeometry(lng: Double, lat: Double, layer: String = "Predios"): Geometry? {
        // Usar LOWER para comparación case-insensitive
        val query = """
            SELECT id, YCentroid, XCentroid, LOCALIZACION, idLayer, idPredio, wkt 
            FROM objects 
            WHERE layer = '$layer' COLLATE NOCASE
            AND minX < $lng AND minY < $lat 
            AND maxX > $lng AND maxY > $lat
        """.trimIndent()

        val db = readableDatabase
        val cursor = db.rawQuery(query, null)

        try {
            if (cursor.moveToFirst()) {
                do {
                    val wktPolygon = cursor.getString(6) ?: continue
                    
                    // Usar JTS para verificar contención
                    // Nota: JTS maneja automáticamente la orientación del polígono
                    if (GeometryUtil.isPointInPolygon(lat, lng, wktPolygon)) {
                        return Geometry(
                            id = cursor.getInt(0),
                            localizacion = cursor.getString(3) ?: "",
                            layer = layer,
                            idLayer = cursor.getInt(4),
                            idPredio = cursor.getInt(5),
                            wkt = wktPolygon  // Incluir WKT para cálculo de rutas adyacentes
                        )
                    }
                } while (cursor.moveToNext())
            }
        } catch (e: Exception) {
            android.util.Log.e("DatabaseHelper", "Error en getGeometry: ${e.message}")
        } finally {
            cursor.close()
        }

        return null
    }

    /**
     * Busca el polígono de la capa 'Municipios' que contiene el punto dado
     */
    fun getMunicipiosAt(lng: Double, lat: Double): String? {
        val query = """
            SELECT LOCALIZACION, wkt 
            FROM objects 
            WHERE layer = 'Municipios' COLLATE NOCASE
            AND minX < $lng AND minY < $lat 
            AND maxX > $lng AND maxY > $lat
        """.trimIndent()

        val db = readableDatabase
        val cursor = db.rawQuery(query, null)

        try {
            if (cursor.moveToFirst()) {
                do {
                    val wktPolygon = cursor.getString(1) ?: continue
                    if (GeometryUtil.isPointInPolygon(lat, lng, wktPolygon)) {
                        return cursor.getString(0) // Retorna el valor de LOCALIZACION
                    }
                } while (cursor.moveToNext())
            }
        } catch (e: Exception) {
            android.util.Log.e("DatabaseHelper", "Error en getMunicipiosAt: ${e.message}")
        } finally {
            cursor.close()
        }

        return null
    }

    /**
     * Busca el polígono de la capa 'Sectores' que contiene el punto dado
     */
    fun getSectorAt(lng: Double, lat: Double): String? {
        val query = """
            SELECT LOCALIZACION, wkt 
            FROM objects 
            WHERE layer = 'Sectores' COLLATE NOCASE
            AND minX < $lng AND minY < $lat 
            AND maxX > $lng AND maxY > $lat
        """.trimIndent()

        val db = readableDatabase
        val cursor = db.rawQuery(query, null)

        try {
            if (cursor.moveToFirst()) {
                do {
                    val wktPolygon = cursor.getString(1) ?: continue
                    if (GeometryUtil.isPointInPolygon(lat, lng, wktPolygon)) {
                        return cursor.getString(0) // Retorna el valor de LOCALIZACION
                    }
                } while (cursor.moveToNext())
            }
        } catch (e: Exception) {
            android.util.Log.e("DatabaseHelper", "Error en getSectorAt: ${e.message}")
        } finally {
            cursor.close()
        }

        return null
    }
    
    /**
     * Clase para representar una ruta adyacente
     */
    data class AdjacentRoute(
        val id: Int,
        val localizacion: String,
        val layer: String,       // "rutas_locales" o "rutas_nacionales"
        val wkt: String,
        val distancia: Double,   // Distancia mínima al predio en metros
        val direccion: String    // Dirección cardinal (N, S, E, O) respecto al predio
    )
    
    /**
     * Busca las rutas viales adyacentes a un polígono (predio)
     * 
     * @param polygonWkt WKT del polígono del predio
     * @param umbralLocal Distancia máxima para rutas locales (metros)
     * @param umbralNacional Distancia máxima para rutas nacionales (metros)
     * @return Lista de rutas ordenadas por distancia y tipo
     */
    /**
     * Clase interna para optimizar operaciones geométricas.
     * Almacena las geometrías ya parseadas y proyectadas para no repetir el proceso.
     */
    private data class CachedRoute(
        val id: Int,
        val localizacion: String,
        val layer: String,
        val wkt: String,           // Original
        val geomWGS84: org.locationtech.jts.geom.Geometry, // JTS Lat/Lng
        val geomCRTM05: org.locationtech.jts.geom.Geometry, // JTS Metros
        var distancia: Double = 0.0,
        var direccion: String = ""
    )

    /**
     * Busca las rutas viales adyacentes a un polígono (predio) - VERSIÓN OPTIMIZADA
     */
    fun getAdjacentRoutes(
        polygonWkt: String,
        umbralLocal: Double = 15.0,
        umbralNacional: Double = 25.0
    ): List<AdjacentRoute> {
        val rutasFinales = mutableListOf<AdjacentRoute>()
        
        try {
            // 1. PRE-PROCESAMIENTO DEL PREDIO (Parsear y Proyectar UNA VEZ)
            val predioGeomWGS84 = GeometryUtil.wktToGeometry(polygonWkt) ?: return emptyList()
            val predioGeomCRTM05 = GeometryUtil.projectGeometryToCRTM05(predioGeomWGS84) ?: return emptyList()
            
            // 2. Definir área de búsqueda (BBox expandido en grados)
            val envelope = predioGeomWGS84.envelopeInternal
            val expansion = 0.00045 // ~50m
            val minX = envelope.minX - expansion
            val minY = envelope.minY - expansion
            val maxX = envelope.maxX + expansion
            val maxY = envelope.maxY + expansion
            
            // 3. Buscar y convertir candidatos (Locales y Nacionales)
            android.util.Log.d("DatabaseHelper", "🚀 Iniciando búsqueda optimizada de rutas...")
            
            val candidatosLocales = findAndCacheRoutes(
                "rutas_locales", minX, minY, maxX, maxY, 
                predioGeomCRTM05, umbralLocal
            )
            val candidatosNacionales = findAndCacheRoutes(
                "rutas_nacionales", minX, minY, maxX, maxY, 
                predioGeomCRTM05, umbralNacional
            )
            
            var todosCandidatos = (candidatosLocales + candidatosNacionales).toMutableList()
            android.util.Log.d("DatabaseHelper", "   📍 Candidatos iniciales por distancia: ${todosCandidatos.size}")

            // 4. VALIDACIÓN DE OBSTRUCCIÓN (Predios bloqueando)
            // Usamos las geometrías ya cacheadas
            val iterator = todosCandidatos.iterator()
            while (iterator.hasNext()) {
                val route = iterator.next()
                if (checkRouteObstructionOptimized(predioGeomWGS84, route.geomWGS84, route.id)) {
                    android.util.Log.d("DatabaseHelper", "      ⛔ Obstruido por predio: ${route.localizacion}")
                    iterator.remove()
                } else {
                    // Calcular dirección (ya que pasó el filtro)
                    // Usamos WGS84 para dirección cardinal (N, S, E, O tienen sentido geográfico)
                    route.direccion = GeometryUtil.getCardinalDirectionFromGeom(predioGeomWGS84, route.geomWGS84)
                }
            }
            
            // 5. ELIMINACIÓN DE DUPLICADOS (Paralelas)
            todosCandidatos = removeDuplicateRoutesByAngleOptimized(todosCandidatos).toMutableList()
            
            // 6. UNIFICACIÓN DE FRAGMENTOS
            todosCandidatos = mergeFragmentedRoutesOptimized(todosCandidatos).toMutableList()
            
            // 7. FILTRO DE OCLUSIÓN ENTRE RUTAS (Ruta tapa a Ruta)
            // Aquí usamos CRTM05 para precisión métrica con buffers
            todosCandidatos = filterOccludedRoutesOptimized(predioGeomCRTM05, todosCandidatos).toMutableList()
            
            // 8. Convertir a AdjacentRoute para retorno
            for (c in todosCandidatos) {
                rutasFinales.add(AdjacentRoute(
                    id = c.id,
                    localizacion = c.localizacion,
                    layer = c.layer,
                    wkt = c.wkt,
                    distancia = c.distancia,
                    direccion = c.direccion
                ))
            }
            
        } catch (e: Exception) {
            android.util.Log.e("DatabaseHelper", "Error en getAdjacentRoutes optimizado: ${e.message}")
            e.printStackTrace()
        }
        
        // Ordenar
        return rutasFinales.sortedWith(
            compareBy({ if (it.layer == "rutas_locales") 0 else 1 }, { it.distancia })
        )
    }

    /**
     * Busca rutas en la BD, calcula distancia en CRTM05 y retorna objetos cacheados si cumplen umbral
     */
    private fun findAndCacheRoutes(
        layerName: String, 
        minX: Double, minY: Double, maxX: Double, maxY: Double,
        predioCRTM05: org.locationtech.jts.geom.Geometry,
        umbralMetros: Double
    ): List<CachedRoute> {
        val resultados = mutableListOf<CachedRoute>()
        val query = "SELECT id, LOCALIZACION, wkt FROM objects WHERE layer = '$layerName' COLLATE NOCASE AND maxX >= $minX AND minX <= $maxX AND maxY >= $minY AND minY <= $maxY"
        
        val db = readableDatabase
        val cursor = db.rawQuery(query, null)
        
        try {
            while (cursor.moveToNext()) {
                val wkt = cursor.getString(2) ?: continue
                
                // Parse WGS84
                val geomWGS84 = GeometryUtil.wktToGeometry(wkt) ?: continue
                
                // Project to CRTM05 (expensive op, done once per candidate)
                val geomCRTM05 = GeometryUtil.projectGeometryToCRTM05(geomWGS84) ?: continue
                
                // Calculate distance in METERS directly
                val dist = predioCRTM05.distance(geomCRTM05)
                
                if (dist <= umbralMetros) {
                    resultados.add(CachedRoute(
                        id = cursor.getInt(0),
                        localizacion = cursor.getString(1) ?: "",
                        layer = layerName,
                        wkt = wkt,
                        geomWGS84 = geomWGS84,
                        geomCRTM05 = geomCRTM05,
                        distancia = dist
                    ))
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("DatabaseHelper", "Error finding routes: ${e.message}")
        } finally {
            cursor.close()
        }
        return resultados
    }

    /**
     * Verifica obstrucción por predios usando geometrías WGS84 (suficiente para topología)
     */
    private fun checkRouteObstructionOptimized(
        predioGeom: org.locationtech.jts.geom.Geometry, 
        rutaGeom: org.locationtech.jts.geom.Geometry, 
        rutaId: Int
    ): Boolean {
        try {
            // Puntos más cercanos
            val ops = org.locationtech.jts.operation.distance.DistanceOp(predioGeom, rutaGeom)
            val points = ops.nearestPoints() // [0]=predio, [1]=ruta
            
            // Línea de conexión
            val connectionLine = org.locationtech.jts.geom.GeometryFactory().createLineString(points)
            
            // Buscar posibles obstructores en BD (solo geometrías)
            // Usamos envelope de la línea para filtrar query
            val env = connectionLine.envelopeInternal
            val query = "SELECT id, wkt FROM objects WHERE layer = 'Predios' COLLATE NOCASE AND maxX >= ${env.minX} AND minX <= ${env.maxX} AND maxY >= ${env.minY} AND minY <= ${env.maxY}"
            
            val db = readableDatabase // Asumimos acceso seguro
            val cursor = db.rawQuery(query, null)
            
            var isObstructed = false
            try {
                while (cursor.moveToNext()) {
                    val obsWkt = cursor.getString(1)
                    val obsGeom = GeometryUtil.wktToGeometry(obsWkt) ?: continue
                    
                    if (connectionLine.intersects(obsGeom)) {
                         // Verificar que no sea el mismo predio origen (intersección trivial)
                         // Una forma robusta es ver si la intersección es solo un punto (toque) o más
                         // O simplemente verificar si obsGeom "cubre" parte sustancial de la línea
                         // Aquí usamos la lógica original: si intersecta y no es el origen
                         if (!predioGeom.intersects(obsGeom)) { 
                             isObstructed = true
                             break
                         }
                    }
                }
            } finally {
                cursor.close()
            }
            return isObstructed
            
        } catch (e: Exception) {
            return false
        }
    }

    private fun removeDuplicateRoutesByAngleOptimized(rutas: List<CachedRoute>): List<CachedRoute> {
        // Misma lógica pero usando geomWGS84 cacheada para ángulos
        // Implementación simplificada para brevedad, manteniendo lógica original
        val setEliminar = mutableSetOf<Int>()
        val locales = rutas.filter { it.layer == "rutas_locales" }
        val nacionales = rutas.filter { it.layer == "rutas_nacionales" }
        
        for (loc in locales) {
            for (nac in nacionales) {
                if (setEliminar.contains(nac.id)) continue
                
                // Distancia entre geometrías CRTM05 (metros precisos)
                if (loc.geomCRTM05.distance(nac.geomCRTM05) <= 3.0) {
                     // Ángulos (usando funciones de GeometryUtil sobre WKT o implementando nuevo)
                     val angLoc = GeometryUtil.calculateSegmentBearing(loc.wkt) ?: 0.0
                     val angNac = GeometryUtil.calculateSegmentBearing(nac.wkt) ?: 0.0
                     
                     var diff = Math.abs(angLoc - angNac)
                     if (diff > 180) diff = 360 - diff
                     
                     if (diff < 30.0) setEliminar.add(nac.id)
                }
            }
        }
        return rutas.filter { !setEliminar.contains(it.id) }
    }

    private fun mergeFragmentedRoutesOptimized(rutas: List<CachedRoute>): List<CachedRoute> {
        // Misma lógica de agrupación
        val grupos = rutas.groupBy { "${it.localizacion}_${it.direccion}" }
        val result = mutableListOf<CachedRoute>()
        
        for ((_, grupo) in grupos) {
             if (grupo.size == 1) {
                 result.add(grupo[0])
             } else {
                 val minD = grupo.minOf { it.distancia }
                 val maxD = grupo.maxOf { it.distancia }
                 if (maxD - minD <= 5.0) {
                     result.add(grupo.minByOrNull { it.distancia }!!)
                 } else {
                     result.addAll(grupo)
                 }
             }
        }
        return result
    }

    /**
     * Filtro de oclusión usando CachedRoute y CRTM05 directamente
     */
    private fun filterOccludedRoutesOptimized(predioCRTM05: org.locationtech.jts.geom.Geometry, rutas: List<CachedRoute>): List<CachedRoute> {
        if (rutas.size < 2) return rutas
        val validas = mutableListOf<CachedRoute>()
        
        for (target in rutas) {
            var isOccluded = false
            try {
                // Nearest points en CRTM05
                val ops = org.locationtech.jts.operation.distance.DistanceOp(predioCRTM05, target.geomCRTM05)
                val points = ops.nearestPoints()
                val lineOfSight = org.locationtech.jts.geom.GeometryFactory().createLineString(points)
                
                for (blocker in rutas) {
                    if (blocker.id == target.id) continue
                    
                    if (blocker.distancia < target.distancia - 0.1) {
                        // Buffer de 2 metros en CRTM05
                        val blockerBuffered = blocker.geomCRTM05.buffer(2.0)
                        
                        // Debug log para ver distancias críticas
                        // android.util.Log.d("DatabaseHelper", "   ? Oclusión Check: Target=${target.localizacion}(${target.distancia}) vs Blocker=${blocker.localizacion}(${blocker.distancia}). Diff=${target.distancia - blocker.distancia}")

                        if (lineOfSight.intersects(blockerBuffered)) {
                            android.util.Log.d("DatabaseHelper", "⛔ (Opt) Oclusión confirmada: '${target.localizacion}' (${String.format("%.2f", target.distancia)}m) está detrás de '${blocker.localizacion}' (${String.format("%.2f", blocker.distancia)}m)")
                            isOccluded = true
                            break
                        }
                    }
                }
            } catch (e: Exception) {
                // ignore
            }
            if (!isOccluded) validas.add(target)
        }
        return validas
    }
    /**
     * Calcula el siguiente consecutivo para una Encuesta Catastral basada en la ubicación.
     * 1. Busca el predio que contiene el punto.
     * 2. Busca todas las fichas previas dentro de ese predio (basado en geometría).
     * 3. Retorna Max(Consecutivo) + 1.
     */
    fun getSiguienteConsecutivo(lat: Double, lng: Double): Int {
        val db = readableDatabase
        
        // 1. Encontrar el predio que contiene la posición actual
        // getGeometry ya usa JTS para verificar contención
        val predio = getGeometry(lng, lat, "Predios") ?: return 1
        
        // El polígono WKT ya lo tenemos en el objeto Geometry retornado por getGeometry
        val wktPredio = predio.wkt
        if (wktPredio.isEmpty()) return 1
        
        val geomPredio = GeometryUtil.wktToGeometry(wktPredio) ?: return 1
        val envelope = geomPredio.envelopeInternal
        
        // 2. Buscar candidatos en el Bounding Box del predio (optimización)
        val query = """
            SELECT DATOS, LATITUD, LONGITUD 
            FROM DATOS 
            WHERE LATITUD BETWEEN ${envelope.minY} AND ${envelope.maxY} 
              AND LONGITUD BETWEEN ${envelope.minX} AND ${envelope.maxX}
        """.trimIndent()
        
        var maxObserved = 0
        var processedCount = 0
        val cursor = db.rawQuery(query, null)
        
        try {
            while (cursor.moveToNext()) {
                val dLat = cursor.getDouble(1)
                val dLng = cursor.getDouble(2)
                
                // 3. Verificar si el punto está dentro del polígono (Verdad Absoluta)
                if (GeometryUtil.isPointInPolygon(dLat, dLng, geomPredio)) {
                    val jsonData = cursor.getString(0) ?: continue
                    processedCount++
                    
                    try {
                        val json = org.json.JSONObject(jsonData)
                        // 4. Identificar si es Ficha por el campo Type y extraer Consecutivo
                        if (json.optString("Type") == "EncuestaCatastral") {
                            val c = json.optInt("Consecutivo", 0)
                            android.util.Log.d("DatabaseHelper", "🔍 Ficha encontrada! Consecutivo actual: $c")
                            if (c > maxObserved) maxObserved = c
                        }
                    } catch (e: Exception) {
                        android.util.Log.e("DatabaseHelper", "Error parseando JSON: ${e.message}")
                    }
                }
            }
            android.util.Log.d("DatabaseHelper", "✅ getSiguienteConsecutivo: Procesados $processedCount elementos en predio. Max observado: $maxObserved")
        } catch (e: Exception) {
            android.util.Log.e("DatabaseHelper", "Error en getSiguienteConsecutivo: ${e.message}")
        } finally {
            cursor.close()
        }
        
        return maxObserved + 1
    }
}
