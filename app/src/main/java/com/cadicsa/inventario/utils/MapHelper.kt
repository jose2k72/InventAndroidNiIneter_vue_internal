package com.cadicsa.inventario.utils

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.Typeface
import androidx.appcompat.app.AppCompatActivity
import com.cadicsa.inventario.DatabaseHelper
import com.cadicsa.inventario.GeometryUtil
import com.cadicsa.inventario.R
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.model.BitmapDescriptor
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.Marker
import com.google.android.gms.maps.model.MarkerOptions
import com.google.android.gms.maps.model.Polyline
import com.google.android.gms.maps.model.PolylineOptions
import com.google.android.gms.maps.model.RoundCap
import org.json.JSONObject

/**
 * Helper para gestionar capas del mapa, marcadores de captura y rutas.
 */
class MapHelper(private val activity: AppCompatActivity, private val mMap: GoogleMap) {

    private class DataGroup(val centerLat: Double, val centerLng: Double) {
        val items = mutableListOf<com.cadicsa.inventario.DataItem>()
    }

    private val rutasPolylines = mutableListOf<Polyline>()
    private val rutasMarkers = mutableListOf<Marker>()
    private val captureMarkers = mutableListOf<Marker>()

    /**
     * Carga y dibuja los puntos capturados desde la BD.
     * Implementa agrupamiento por proximidad (3m) y lógica de colores.
     */
    fun loadCapturedPoints(lastSavedDataId: Int) {
        captureMarkers.forEach { it.remove() }
        captureMarkers.clear()

        val dbHelper = DatabaseHelper.getInstance(activity)
        val allData = dbHelper.getAllData()
        if (allData.isEmpty()) return

        // 1. Agrupar puntos en un radio de 3 metros
        val groups = mutableListOf<DataGroup>()
        allData.forEach { item ->
            val existingGroup = groups.find { g ->
                calculateDistance(LatLng(item.latitud, item.longitud), LatLng(g.centerLat, g.centerLng)) <= 3.0
            }
            if (existingGroup != null) {
                existingGroup.items.add(item)
            } else {
                val newGroup = DataGroup(item.latitud, item.longitud)
                newGroup.items.add(item)
                groups.add(newGroup)
            }
        }

        // 2. Pintar un marcador por cada grupo con el color correspondiente
        groups.forEach { group ->
            val markerColor = calculateGroupColor(group.items, lastSavedDataId)
            
            // Usamos la posición del primer elemento para el marcador
            val firstItem = group.items.first()
            val marker = mMap.addMarker(
                MarkerOptions()
                    .position(LatLng(firstItem.latitud, firstItem.longitud))
                    .title("Unidad: ${group.items.size} registros")
                    .snippet("ID base: ${firstItem.id}")
                    .icon(BitmapDescriptorFactory.defaultMarker(markerColor))
            )
            
            marker?.let {
                // El tag se usa en el listener de clic para saber qué abrir
                it.tag = "${SpatialNormalizer.format(firstItem.latitud)},${SpatialNormalizer.format(firstItem.longitud)}"
                captureMarkers.add(it)
            }
        }
    }

    /**
     * Determina el color del marcador basado en el estado del grupo de registros.
     * Rojo: Contiene el último guardado.
     * Verde: Combo completo (Ficha + Entrevistado + Dueño).
     * Amarillo: Incompleto.
     */
    private fun calculateGroupColor(items: List<com.cadicsa.inventario.DataItem>, lastSavedDataId: Int): Float {
        // Prioridad 1: ¿Contiene el último guardado?
        if (items.any { it.id == lastSavedDataId }) return 270f // HUE_VIOLET

        // Prioridad 2: ¿Está completo? (Ficha + Entrevistado + SujetoNatural/Juridico)
        var tieneFicha = false
        var tieneEntrevistado = false
        var tieneDuenio = false
        var esNoEncuestado = false
        var esUnionPredio = false

        items.forEach { item ->
            try {
                val json = JSONObject(item.data)
                val type = json.optString("Type")
                when (type) {
                    "Ficha" -> tieneFicha = true
                    "Entrevistado" -> tieneEntrevistado = true
                    "SujetoNatural", "SujetoJuridico" -> tieneDuenio = true
                    "NoEncuestado" -> esNoEncuestado = true
                    "UnionConPredio" -> esUnionPredio = true
                }
            } catch (e: Exception) {}
        }

        if (esNoEncuestado) return 0f // HUE_RED
        if (esUnionPredio) return 180f // HUE_CYAN
        
        return if (tieneFicha && tieneEntrevistado && tieneDuenio) 120f else 60f // GREEN : YELLOW
    }

    /**
     * Limpia las capas de rutas.
     */
    fun clearRouteLayers() {
        rutasPolylines.forEach { it.remove() }
        rutasPolylines.clear()
        rutasMarkers.forEach { it.remove() }
        rutasMarkers.clear()
    }

    /**
     * Carga las rutas dentro del viewport actual.
     */
    fun loadRoutesInViewport(showLocales: Boolean, showNacionales: Boolean) {
        clearRouteLayers()
        if (!showLocales && !showNacionales) return

        val bounds = mMap.projection.visibleRegion.latLngBounds
        val dbHelper = DatabaseHelper.getInstance(activity)
        val db = dbHelper.readableDatabase

        fun processLayer(layerName: String, colorStr: String) {
            val query = """
                SELECT id, LOCALIZACION, wkt FROM objects 
                WHERE layer = '$layerName' COLLATE NOCASE
                AND maxX >= ${SpatialNormalizer.format(bounds.southwest.longitude)} 
                AND minX <= ${SpatialNormalizer.format(bounds.northeast.longitude)}
                AND maxY >= ${SpatialNormalizer.format(bounds.southwest.latitude)} 
                AND minY <= ${SpatialNormalizer.format(bounds.northeast.latitude)}
            """.trimIndent()

            db.rawQuery(query, null).use { cursor ->
                while (cursor.moveToNext()) {
                    val loc = cursor.getString(1) ?: continue
                    val wkt = cursor.getString(2) ?: continue
                    drawRoute(wkt, loc, Color.parseColor(colorStr))
                }
            }
        }

        if (showLocales) processLayer("rutas_locales", "#2196F3")
        if (showNacionales) processLayer("rutas_nacionales", "#F44336")
    }

    private fun drawRoute(wkt: String, localizacion: String, color: Int) {
        val segments = GeometryUtil.getPolylineCoordinates(wkt)
        if (segments.isEmpty()) return

        var longestSegment: List<LatLng>? = null
        var maxLength = -1.0

        for (coords in segments) {
            if (coords.isEmpty()) continue
            val polyline = mMap.addPolyline(PolylineOptions().addAll(coords).color(color).width(5f).zIndex(10000f).startCap(RoundCap()).endCap(RoundCap()))
            rutasPolylines.add(polyline)

            // Extremos
            mMap.addMarker(MarkerOptions().position(coords.first()).anchor(0.5f, 0.5f).flat(true).zIndex(10001f).icon(createCircleIcon(color)))?.let { rutasMarkers.add(it) }
            mMap.addMarker(MarkerOptions().position(coords.last()).anchor(0.5f, 0.5f).flat(true).zIndex(10001f).icon(createCircleIcon(color)))?.let { rutasMarkers.add(it) }

            val len = calculateDistanceSum(coords)
            if (len > maxLength) { maxLength = len; longestSegment = coords }
        }

        longestSegment?.let { drawRouteLabels(it, localizacion, color, maxLength) }
    }

    private fun drawRouteLabels(coords: List<LatLng>, text: String, color: Int, totalLen: Double) {
        val numLabels = if (totalLen > 150) Math.max(2, Math.round(totalLen / 100.0).toInt()) else 1
        val spacing = 100.0
        val startOffset = if (numLabels == 1) totalLen / 2.0 else (totalLen - (numLabels - 1) * spacing) / 2.0

        for (i in 0 until numLabels) {
            val dist = startOffset + (i * spacing)
            getPointAtDistance(coords, dist)?.let { (pos, bearing) ->
                var rotation = ((bearing - 90 + 360) % 360).toFloat()
                if (rotation > 90 && rotation < 270) rotation = (rotation + 180) % 360
                
                mMap.addMarker(MarkerOptions().position(pos).anchor(0.5f, 0.5f).rotation(rotation).flat(true).zIndex(10002f).icon(createTextIcon(text, color)))?.let { rutasMarkers.add(it) }
            }
        }
    }

    private fun calculateDistanceSum(coords: List<LatLng>): Double {
        var sum = 0.0
        for (i in 0 until coords.size - 1) sum += calculateDistance(coords[i], coords[i+1])
        return sum
    }

    private fun calculateDistance(p1: LatLng, p2: LatLng): Double {
        val results = FloatArray(1)
        android.location.Location.distanceBetween(p1.latitude, p1.longitude, p2.latitude, p2.longitude, results)
        return results[0].toDouble()
    }

    private fun getPointAtDistance(coords: List<LatLng>, target: Double): Pair<LatLng, Double>? {
        var current = 0.0
        for (i in 0 until coords.size - 1) {
            val dist = calculateDistance(coords[i], coords[i+1])
            if (current + dist >= target) {
                val frac = (target - current) / dist
                val lat = coords[i].latitude + (coords[i+1].latitude - coords[i].latitude) * frac
                val lng = coords[i].longitude + (coords[i+1].longitude - coords[i].longitude) * frac
                return Pair(LatLng(lat, lng), calculateBearing(coords[i], coords[i+1]))
            }
            current += dist
        }
        return null
    }

    private fun calculateBearing(p1: LatLng, p2: LatLng): Double {
        val dLon = Math.toRadians(p2.longitude - p1.longitude)
        val lat1 = Math.toRadians(p1.latitude)
        val lat2 = Math.toRadians(p2.latitude)
        val y = Math.sin(dLon) * Math.cos(lat2)
        val x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
        return Math.toDegrees(Math.atan2(y, x))
    }

    private fun createCircleIcon(color: Int): BitmapDescriptor {
        val den = activity.resources.displayMetrics.density
        val size = (16 * den).toInt()
        val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bmp)
        val paint = Paint().apply { this.color = color; isAntiAlias = true; style = Paint.Style.FILL }
        canvas.drawCircle(size/2f, size/2f, size/2f, paint)
        paint.style = Paint.Style.STROKE; paint.color = Color.WHITE; paint.strokeWidth = 2 * den
        canvas.drawCircle(size/2f, size/2f, size/2f - den, paint)
        return BitmapDescriptorFactory.fromBitmap(bmp)
    }

    private fun createTextIcon(text: String, color: Int): BitmapDescriptor {
        val paint = Paint().apply { textSize = 20f; this.color = Color.WHITE; textAlign = Paint.Align.CENTER; isAntiAlias = true; typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD) }
        val bounds = Rect()
        paint.getTextBounds(text, 0, text.length, bounds)
        val w = bounds.width() + 16; val h = bounds.height() + 16
        val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bmp)
        canvas.drawRoundRect(0f, 0f, w.toFloat(), h.toFloat(), 4f, 4f, Paint().apply { this.color = color; alpha = 200; style = Paint.Style.FILL })
        canvas.drawText(text, w/2f, h/2f - bounds.exactCenterY(), paint)
        return BitmapDescriptorFactory.fromBitmap(bmp)
    }
}
