package com.cadicsa.inventario.utils

import android.database.sqlite.SQLiteDatabase
import com.cadicsa.inventario.DatabaseHelper
import com.cadicsa.inventario.DataItem
import com.cadicsa.inventario.AdjacentRoute
import com.cadicsa.inventario.Geometry
import com.cadicsa.inventario.GeometryUtil
import org.locationtech.jts.geom.Coordinate
import org.locationtech.jts.geom.LineString
import org.locationtech.jts.geom.Polygon
import org.locationtech.jts.geom.Geometry as JtsGeometry
import java.util.Locale

/**
 * SpatialHelper - Gestiona las consultas geoespaciales complejas usando JTS
 */
object SpatialHelper {

    fun getGeometry(db: SQLiteDatabase, lng: Double, lat: Double, layer: String = "Predios"): Geometry? {
        val query = """
            SELECT id, YCentroid, XCentroid, LOCALIZACION, idLayer, idPredio, wkb 
            FROM objects 
            WHERE layer = '$layer' COLLATE NOCASE
            AND minX < ${SpatialNormalizer.format(lng)} AND minY < ${SpatialNormalizer.format(lat)} 
            AND maxX > ${SpatialNormalizer.format(lng)} AND maxY > ${SpatialNormalizer.format(lat)}
        """.trimIndent()

        val cursor = db.rawQuery(query, null)
        try {
            if (cursor.moveToFirst()) {
                do {
                    val wkbBytes = cursor.getBlob(6) ?: continue
                    val geom = GeometryUtil.wkbToGeometry(wkbBytes) ?: continue
                    if (GeometryUtil.isPointInPolygon(lat, lng, geom)) {
                        return Geometry(
                            id = cursor.getInt(0),
                            localizacion = cursor.getString(3) ?: "",
                            layer = layer,
                            idLayer = cursor.getInt(4),
                            idPredio = cursor.getInt(5),
                            jtsGeom = geom
                        )
                    }
                } while (cursor.moveToNext())
            }
        } catch (e: Exception) {
            android.util.Log.e("SpatialHelper", "Error en getGeometry: ${e.message}")
        } finally {
            cursor.close()
        }
        return null
    }

    fun getMunicipiosAt(db: SQLiteDatabase, lng: Double, lat: Double): String? {
        val query = """
            SELECT LOCALIZACION, wkb 
            FROM objects 
            WHERE (layer = 'Municipios' OR layer = 'Municipio') COLLATE NOCASE
            AND minX < ${SpatialNormalizer.format(lng)} AND minY < ${SpatialNormalizer.format(lat)} 
            AND maxX > ${SpatialNormalizer.format(lng)} AND maxY > ${SpatialNormalizer.format(lat)}
        """.trimIndent()

        android.util.Log.d("SpatialHelper", "Consultando Municipio en: $lng, $lat")
        val cursor = db.rawQuery(query, null)
        try {
            if (cursor.moveToFirst()) {
                do {
                    val wkbBytes = cursor.getBlob(1) ?: continue
                    val geom = GeometryUtil.wkbToGeometry(wkbBytes) ?: continue
                    if (GeometryUtil.isPointInPolygon(lat, lng, geom)) {
                        val result = cursor.getString(0)
                        android.util.Log.d("SpatialHelper", "Municipio encontrado: $result")
                        return result
                    }
                } while (cursor.moveToNext())
            }
        } catch (e: Exception) {
            android.util.Log.e("SpatialHelper", "Error en getMunicipiosAt: ${e.message}")
        } finally {
            cursor.close()
        }
        android.util.Log.w("SpatialHelper", "No se encontró municipio para la ubicación dada")
        return null
    }

    fun getSectorAt(db: SQLiteDatabase, lng: Double, lat: Double): String? {
        val query = """
            SELECT LOCALIZACION, wkb 
            FROM objects 
            WHERE (layer = 'Sectores' OR layer = 'Sector') COLLATE NOCASE
            AND minX < ${SpatialNormalizer.format(lng)} AND minY < ${SpatialNormalizer.format(lat)} 
            AND maxX > ${SpatialNormalizer.format(lng)} AND maxY > ${SpatialNormalizer.format(lat)}
        """.trimIndent()

        android.util.Log.d("SpatialHelper", "Consultando Sector en: $lng, $lat")
        val cursor = db.rawQuery(query, null)
        try {
            if (cursor.moveToFirst()) {
                do {
                    val wkbBytes = cursor.getBlob(1) ?: continue
                    val geom = GeometryUtil.wkbToGeometry(wkbBytes) ?: continue
                    if (GeometryUtil.isPointInPolygon(lat, lng, geom)) {
                        val result = cursor.getString(0)
                        android.util.Log.d("SpatialHelper", "Sector encontrado: $result")
                        return result
                    }
                } while (cursor.moveToNext())
            }
        } catch (e: Exception) {
            android.util.Log.e("SpatialHelper", "Error en getSectorAt: ${e.message}")
        } finally {
            cursor.close()
        }
        android.util.Log.w("SpatialHelper", "No se encontró sector para la ubicación dada")
        return null
    }

    fun getManzanaForPredio(db: SQLiteDatabase, geomPredio: org.locationtech.jts.geom.Geometry): String? {
        val envelope = geomPredio.envelopeInternal
        val query = """
            SELECT LOCALIZACION, wkb 
            FROM objects 
            WHERE layer = 'Sectores' COLLATE NOCASE
            AND minX <= ${SpatialNormalizer.format(envelope.maxX)} AND maxX >= ${SpatialNormalizer.format(envelope.minX)}
            AND minY <= ${SpatialNormalizer.format(envelope.maxY)} AND maxY >= ${SpatialNormalizer.format(envelope.minY)}
        """.trimIndent()

        val cursor = db.rawQuery(query, null)
        try {
            if (cursor.moveToFirst()) {
                do {
                    val wkbBytes = cursor.getBlob(1) ?: continue
                    val geomManzana = GeometryUtil.wkbToGeometry(wkbBytes) ?: continue
                    if (geomManzana.intersects(geomPredio)) {
                        val result = cursor.getString(0)
                        android.util.Log.d("SpatialHelper", "Manzana encontrada por intersección de predio: $result")
                        return result
                    }
                } while (cursor.moveToNext())
            }
        } catch (e: Exception) {
            android.util.Log.e("SpatialHelper", "Error en getManzanaForPredio: ${e.message}")
        } finally {
            cursor.close()
        }
        return null
    }

    fun getLoteForPredio(db: SQLiteDatabase, geomPredio: org.locationtech.jts.geom.Geometry): String? {
        val envelope = geomPredio.envelopeInternal
        val query = """
            SELECT LOCALIZACION, wkb 
            FROM objects 
            WHERE layer = 'PredNumber' COLLATE NOCASE
            AND minX <= ${SpatialNormalizer.format(envelope.maxX)} AND maxX >= ${SpatialNormalizer.format(envelope.minX)}
            AND minY <= ${SpatialNormalizer.format(envelope.maxY)} AND maxY >= ${SpatialNormalizer.format(envelope.minY)}
        """.trimIndent()

        val cursor = db.rawQuery(query, null)
        try {
            if (cursor.moveToFirst()) {
                do {
                    val wkbBytes = cursor.getBlob(1) ?: continue
                    val geomLote = GeometryUtil.wkbToGeometry(wkbBytes) ?: continue
                    if (geomPredio.intersects(geomLote)) {
                        val result = cursor.getString(0)
                        android.util.Log.d("SpatialHelper", "Lote encontrado por intersección de predio: $result")
                        return result
                    }
                } while (cursor.moveToNext())
            }
        } catch (e: Exception) {
            android.util.Log.e("SpatialHelper", "Error en getLoteForPredio: ${e.message}")
        } finally {
            cursor.close()
        }
        return null
    }

    fun getDataByProximity(db: SQLiteDatabase, lat: Double, lng: Double, radiusInMeters: Double, limitToOne: Boolean): List<DataItem> {
        val items = mutableListOf<DataItem>()
        val delta = radiusInMeters / 111000.0 
        val limitSql = if (limitToOne) "LIMIT 1" else ""
        
        val query = """
            SELECT ID, DATOS, FECHA, LATITUD, LONGITUD, LATITUDGPS, LONGITUDGPS, 
                   IDOBJECT, IDLAYER, IDPREDIO, LAYER 
            FROM DATOS 
            WHERE LATITUD BETWEEN ${SpatialNormalizer.format(lat - delta)} AND ${SpatialNormalizer.format(lat + delta)}
              AND LONGITUD BETWEEN ${SpatialNormalizer.format(lng - delta)} AND ${SpatialNormalizer.format(lng + delta)}
            $limitSql
        """.trimIndent()

        val cursor = db.rawQuery(query, null)
        try {
            while (cursor.moveToNext()) {
                items.add(DataItem(
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
                ))
            }
        } finally {
            cursor.close()
        }
        return items
    }

    fun getDataInPolygon(db: SQLiteDatabase, predioId: Int): String {
        var wkbPredioBytes: ByteArray? = null
        db.rawQuery("SELECT wkb FROM objects WHERE id = ?", arrayOf(predioId.toString())).use { cursor ->
            if (cursor.moveToFirst()) {
                wkbPredioBytes = cursor.getBlob(0)
            }
        }
        
        if (wkbPredioBytes == null || wkbPredioBytes!!.isEmpty()) return "[]"

        val geomPredio = GeometryUtil.wkbToGeometry(wkbPredioBytes) ?: return "[]"
        val envelope = geomPredio.envelopeInternal
        
        val query = """
            SELECT ID, DATOS, FECHA, LATITUD, LONGITUD 
            FROM DATOS 
            WHERE LATITUD BETWEEN ${SpatialNormalizer.format(envelope.minY)} AND ${SpatialNormalizer.format(envelope.maxY)} 
            AND LONGITUD BETWEEN ${SpatialNormalizer.format(envelope.minX)} AND ${SpatialNormalizer.format(envelope.maxX)}
        """.trimIndent()
        
        val cursor = db.rawQuery(query, null)
        val result = StringBuilder("[")
        try {
            while (cursor.moveToNext()) {
                val lat = cursor.getDouble(3)
                val lon = cursor.getDouble(4)
                if (GeometryUtil.isPointInPolygon(lat, lon, geomPredio)) {
                    result.append("{\"Id\":${cursor.getString(0)},")
                    result.append("\"Data\": ${cursor.getString(1)},")
                    result.append("\"IdObject\":$predioId,")
                    result.append("\"Fecha\": \"${cursor.getString(2)}\"},")
                }
            }
        } finally {
            cursor.close()
        }
        
        val resultStr = result.toString()
        return if (resultStr.length > 1) resultStr.dropLast(1) + "]" else "[]"
    }

    fun getPropietariosDelPredio(db: SQLiteDatabase, predioId: Int): String {
        var wkbPredioBytes: ByteArray? = null
        db.rawQuery("SELECT wkb FROM objects WHERE id = ?", arrayOf(predioId.toString())).use { cursor ->
            if (cursor.moveToFirst()) {
                wkbPredioBytes = cursor.getBlob(0)
            }
        }
        
        if (wkbPredioBytes == null || wkbPredioBytes!!.isEmpty()) return "[]"

        val geomPredio = GeometryUtil.wkbToGeometry(wkbPredioBytes) ?: return "[]"
        val envelope = geomPredio.envelopeInternal
        
        val query = """
            SELECT id, LOCALIZACION, wkb 
            FROM objects 
            WHERE layer = 'Propietarios' COLLATE NOCASE
              AND minX BETWEEN ${SpatialNormalizer.format(envelope.minX)} AND ${SpatialNormalizer.format(envelope.maxX)} 
              AND minY BETWEEN ${SpatialNormalizer.format(envelope.minY)} AND ${SpatialNormalizer.format(envelope.maxY)}
        """.trimIndent()
        
        val cursor = db.rawQuery(query, null)
        val jsonArray = org.json.JSONArray()
        try {
            while (cursor.moveToNext()) {
                val wkbBytes = cursor.getBlob(2) ?: continue
                val geomOwner = GeometryUtil.wkbToGeometry(wkbBytes) ?: continue
                if (geomPredio.intersects(geomOwner)) {
                    val obj = org.json.JSONObject()
                    obj.put("id", cursor.getInt(0))
                    obj.put("nombre", cursor.getString(1) ?: "")
                    jsonArray.put(obj)
                }
            }
        } finally {
            cursor.close()
        }
        
        return jsonArray.toString()
    }

    fun getDataInAdjacentPolygons(db: SQLiteDatabase, predioId: Int): String {
        var wkbOrignBytes: ByteArray? = null
        db.rawQuery("SELECT wkb FROM objects WHERE id = ?", arrayOf(predioId.toString())).use { cursor ->
            if (cursor.moveToFirst()) wkbOrignBytes = cursor.getBlob(0)
        }
        if (wkbOrignBytes == null || wkbOrignBytes!!.isEmpty()) return "[]"
        
        val geomOrigen = GeometryUtil.wkbToGeometry(wkbOrignBytes) ?: return "[]"
        val envelope = geomOrigen.envelopeInternal
        val expansion = 0.00045 // ~50m
        
        val queryCandidatos = """
            SELECT id, wkb, LOCALIZACION 
            FROM objects 
            WHERE layer = 'Predios' COLLATE NOCASE
            AND id != $predioId
            AND maxX >= ${SpatialNormalizer.format(envelope.minX - expansion)} AND minX <= ${SpatialNormalizer.format(envelope.maxX + expansion)}
            AND maxY >= ${SpatialNormalizer.format(envelope.minY - expansion)} AND minY <= ${SpatialNormalizer.format(envelope.maxY + expansion)}
        """.trimIndent()
        
        data class PredioInfo(val id: Int, val geom: JtsGeometry, val localizacion: String, val direccionRelativa: String)
        val prediosConfirmados = mutableListOf<PredioInfo>()
        
        db.rawQuery(queryCandidatos, null).use { cursor ->
            while (cursor.moveToNext()) {
                val idC = cursor.getInt(0)
                val wkbC = cursor.getBlob(1) ?: continue
                val geomC = GeometryUtil.wkbToGeometry(wkbC) ?: continue
                if (geomOrigen.intersects(geomC)) {
                    val dir = GeometryUtil.getRelativeDirectionFromJts(geomOrigen, geomC)
                    prediosConfirmados.add(PredioInfo(idC, geomC, cursor.getString(2) ?: "", dir))
                }
            }
        }
        
        data class DatoAdyacente(val id: Int, val jsonData: String, val fecha: String, val localizacionPredio: String, val idObject: Int, val direccionRelativa: String, val codigoCamino: String, val latitud: Double, val longitud: Double)
        val listaDatos = mutableListOf<DatoAdyacente>()
        
        for (info in prediosConfirmados) {
            val env = info.geom.envelopeInternal
            val queryDatos = "SELECT ID, DATOS, FECHA, LATITUD, LONGITUD FROM DATOS WHERE LATITUD BETWEEN ${SpatialNormalizer.format(env.minY)} AND ${SpatialNormalizer.format(env.maxY)} AND LONGITUD BETWEEN ${SpatialNormalizer.format(env.minX)} AND ${SpatialNormalizer.format(env.maxX)}"
            db.rawQuery(queryDatos, null).use { cursorD ->
                while (cursorD.moveToNext()) {
                    val lat = cursorD.getDouble(3)
                    val lon = cursorD.getDouble(4)
                    if (GeometryUtil.isPointInPolygon(lat, lon, info.geom)) {
                        val jsonData = cursorD.getString(1) ?: "{}"
                        val codigoCamino = try { org.json.JSONObject(jsonData).optString("CodigoCamino") ?: "" } catch (e: Exception) { "" }
                        listaDatos.add(DatoAdyacente(cursorD.getInt(0), jsonData, cursorD.getString(2) ?: "", info.localizacion, info.id, info.direccionRelativa, codigoCamino, lat, lon))
                    }
                }
            }
        }
        
        listaDatos.sortWith(compareBy({ it.localizacionPredio }, { it.codigoCamino }))
        val builder = StringBuilder("[")
        for (dato in listaDatos) {
            builder.append("{\"Id\":${dato.id},\"Data\": ${dato.jsonData},\"IdObject\":${dato.idObject},\"Fecha\": \"${dato.fecha}\",\"LocalizacionPredio\": \"${dato.localizacionPredio}\",\"DireccionRelativa\": \"${dato.direccionRelativa}\", \"Latitud\": ${dato.latitud}, \"Longitud\": ${dato.longitud}},")
        }
        val resultStr = builder.toString()
        return if (resultStr.length > 1) resultStr.dropLast(1) + "]" else "[]"
    }

    fun getSiguienteConsecutivo(db: SQLiteDatabase, lat: Double, lng: Double): Int {
        val predio = getGeometry(db, lng, lat, "Predios") ?: return 1
        val geomPredio = predio.jtsGeom ?: return 1
        val envelope = geomPredio.envelopeInternal
        
        val query = "SELECT DATOS, LATITUD, LONGITUD FROM DATOS WHERE LATITUD BETWEEN ${SpatialNormalizer.format(envelope.minY)} AND ${SpatialNormalizer.format(envelope.maxY)} AND LONGITUD BETWEEN ${SpatialNormalizer.format(envelope.minX)} AND ${SpatialNormalizer.format(envelope.maxX)}"
        var maxObserved = 0
        db.rawQuery(query, null).use { cursor ->
            while (cursor.moveToNext()) {
                if (GeometryUtil.isPointInPolygon(cursor.getDouble(1), cursor.getDouble(2), geomPredio)) {
                    val json = try { org.json.JSONObject(cursor.getString(0)) } catch (e: Exception) { null }
                    if (json?.optString("Type") == "Ficha") {
                        val c = json.optInt("Consecutivo", 0)
                        if (c > maxObserved) maxObserved = c
                    }
                }
            }
        }
        return maxObserved + 1
    }

    fun getAdjacentRoutes(db: SQLiteDatabase, polygonWkt: String, umbralLocal: Double = 15.0, umbralNacional: Double = 25.0): List<AdjacentRoute> {
        val basePredioWgs84 = GeometryUtil.wktToGeometry(polygonWkt) ?: return emptyList()
        return getAdjacentRoutes(db, basePredioWgs84, umbralLocal, umbralNacional)
    }

    fun getAdjacentRoutes(db: SQLiteDatabase, basePredioWgs84: JtsGeometry, umbralLocal: Double = 15.0, umbralNacional: Double = 25.0): List<AdjacentRoute> {
        val basePredioCrtm05 = GeometryUtil.projectGeometryToCRTM05(basePredioWgs84) ?: return emptyList()
        val envelope = basePredioWgs84.envelopeInternal
        val expansion = 0.00045 // ~50m

        val candidatos = mutableListOf<CachedRoute>()
        candidatos.addAll(findAndCacheRoutes(db, "rutas_locales", envelope.minX - expansion, envelope.minY - expansion, envelope.maxX + expansion, envelope.maxY + expansion, basePredioCrtm05, umbralLocal))
        candidatos.addAll(findAndCacheRoutes(db, "rutas_nacionales", envelope.minX - expansion, envelope.minY - expansion, envelope.maxX + expansion, envelope.maxY + expansion, basePredioCrtm05, umbralNacional))

        val iterator = candidatos.iterator()
        while (iterator.hasNext()) {
            val route = iterator.next()
            if (checkRouteObstructionOptimized(db, basePredioWgs84, route.geomWGS84)) {
                iterator.remove()
            } else {
                route.direccion = GeometryUtil.getCardinalDirectionFromGeom(basePredioWgs84, route.geomWGS84)
            }
        }

        val result = filterOccludedRoutesOptimized(basePredioCrtm05, mergeFragmentedRoutesOptimized(removeDuplicateRoutesByAngleOptimized(candidatos)))
        return result.map { AdjacentRoute(it.id, it.localizacion, it.layer, it.wkt, it.distancia, it.direccion) }
            .sortedWith(compareBy({ r: AdjacentRoute -> if (r.layer == "rutas_locales") 0 else 1 }, { r: AdjacentRoute -> r.distancia }))
    }

    private fun findAndCacheRoutes(db: SQLiteDatabase, layerName: String, minX: Double, minY: Double, maxX: Double, maxY: Double, predioCRTM05: JtsGeometry, umbralMetros: Double): List<CachedRoute> {
        val res = mutableListOf<CachedRoute>()
        val query = "SELECT id, LOCALIZACION, wkb FROM objects WHERE layer = '$layerName' COLLATE NOCASE AND maxX >= ${SpatialNormalizer.format(minX)} AND minX <= ${SpatialNormalizer.format(maxX)} AND maxY >= ${SpatialNormalizer.format(minY)} AND minY <= ${SpatialNormalizer.format(maxY)}"
        db.rawQuery(query, null).use { cursor ->
            while (cursor.moveToNext()) {
                val wkb = cursor.getBlob(2) ?: continue
                val geomWGS84 = GeometryUtil.wkbToGeometry(wkb) ?: continue
                val geomCRTM05 = GeometryUtil.projectGeometryToCRTM05(geomWGS84) ?: continue
                val dist = predioCRTM05.distance(geomCRTM05)
                if (dist <= umbralMetros) {
                    val wkt = geomWGS84.toText()
                    res.add(CachedRoute(cursor.getInt(0), cursor.getString(1) ?: "", layerName, wkt, geomWGS84, geomCRTM05, dist))
                }
            }
        }
        return res
    }

    private fun checkRouteObstructionOptimized(db: SQLiteDatabase, predioGeom: JtsGeometry, rutaGeom: JtsGeometry): Boolean {
        val points = org.locationtech.jts.operation.distance.DistanceOp(predioGeom, rutaGeom).nearestPoints()
        val connectionLine = org.locationtech.jts.geom.GeometryFactory().createLineString(points)
        val env = connectionLine.envelopeInternal
        val query = "SELECT id, wkb FROM objects WHERE layer = 'Predios' COLLATE NOCASE AND minX < ${SpatialNormalizer.format(env.maxX)} AND maxX > ${SpatialNormalizer.format(env.minX)} AND minY < ${SpatialNormalizer.format(env.maxY)} AND maxY > ${SpatialNormalizer.format(env.minY)}"
        db.rawQuery(query, null).use { cursor ->
            while (cursor.moveToNext()) {
                val obsWkb = cursor.getBlob(1) ?: continue
                val obsGeom = GeometryUtil.wkbToGeometry(obsWkb) ?: continue
                if (connectionLine.intersects(obsGeom) && !predioGeom.intersects(obsGeom)) return true
            }
        }
        return false
    }

    private fun removeDuplicateRoutesByAngleOptimized(rutas: List<CachedRoute>): List<CachedRoute> {
        val list = rutas.toMutableList()
        val setEliminar = mutableSetOf<Int>()
        val locales = list.filter { it.layer == "rutas_locales" }
        val nacionales = list.filter { it.layer == "rutas_nacionales" }
        for (loc in locales) {
            for (nac in nacionales) {
                if (setEliminar.contains(nac.id)) continue
                if (loc.geomCRTM05.distance(nac.geomCRTM05) <= 3.0) {
                    val angLoc = GeometryUtil.calculateSegmentBearing(loc.wkt) ?: 0.0
                    val angNac = GeometryUtil.calculateSegmentBearing(nac.wkt) ?: 0.0
                    var diff = Math.abs(angLoc - angNac)
                    if (diff > 180) diff = 360 - diff
                    if (diff < 30.0) setEliminar.add(nac.id)
                }
            }
        }
        return list.filter { !setEliminar.contains(it.id) }
    }

    private fun mergeFragmentedRoutesOptimized(rutas: List<CachedRoute>): List<CachedRoute> {
        return rutas.groupBy { "${it.localizacion}_${it.direccion}" }.flatMap { (_, grupo) ->
            if (grupo.size == 1) grupo else {
                val minD = grupo.minOf { it.distancia }
                val maxD = grupo.maxOf { it.distancia }
                if (maxD - minD <= 5.0) listOf(grupo.minByOrNull { it.distancia }!!) else grupo
            }
        }
    }

    private fun filterOccludedRoutesOptimized(predioCRTM05: JtsGeometry, rutas: List<CachedRoute>): List<CachedRoute> {
        if (rutas.size < 2) return rutas
        val validas = mutableListOf<CachedRoute>()
        for (target in rutas) {
            var isOccluded = false
            val points = org.locationtech.jts.operation.distance.DistanceOp(predioCRTM05, target.geomCRTM05).nearestPoints()
            val lineOfSight = org.locationtech.jts.geom.GeometryFactory().createLineString(points)
            for (blocker in rutas) {
                if (blocker.id == target.id) continue
                if (blocker.distancia < target.distancia - 0.1) {
                    if (lineOfSight.intersects(blocker.geomCRTM05.buffer(2.0))) {
                        isOccluded = true
                        break
                    }
                }
            }
            if (!isOccluded) validas.add(target)
        }
        return validas
    }

    private data class CachedRoute(
        val id: Int, val localizacion: String, val layer: String, val wkt: String,
        val geomWGS84: JtsGeometry, val geomCRTM05: JtsGeometry,
        var distancia: Double = 0.0, var direccion: String = ""
    )
}
