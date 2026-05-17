package com.cadicsa.inventario.utils

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
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
            val markerColor = calculateGroupColor(group.items)
            val isLastSaved = group.items.any { it.id == lastSavedDataId }
            
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

            // Si es el último guardado, superponemos el ojito negro exactamente en el centro de su cabeza
            if (isLastSaved) {
                val eyeMarker = mMap.addMarker(
                    MarkerOptions()
                        .position(LatLng(firstItem.latitud, firstItem.longitud))
                        .icon(createBlackEyeIcon())
                        .anchor(0.5f, 5.0f) // Matemáticamente alineado con el "ojito" del pin nativo (30dp arriba del punto de anclaje)
                        .zIndex((marker?.zIndex ?: 1.0f) + 1f)
                )
                eyeMarker?.let {
                    captureMarkers.add(it)
                }
            }
        }
    }

    /**
     * Determina el color del marcador basado en el estado del grupo de registros.
     * Rojo: No encuestado.
     * Cian: Unión con predio.
     * Verde: Combo completo (Ficha + Entrevistado + Dueño).
     * Amarillo: Incompleto.
     */
    private fun calculateGroupColor(items: List<com.cadicsa.inventario.DataItem>): Float {

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

    private fun createBlackEyeIcon(): BitmapDescriptor {
        val den = activity.resources.displayMetrics.density
        val size = (6 * den).toInt() // Tamaño exacto de 6dp para el ojo del marcador
        val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bmp)
        val paint = Paint().apply {
            this.color = Color.BLACK
            isAntiAlias = true
            style = Paint.Style.FILL
        }
        canvas.drawCircle(size / 2f, size / 2f, size / 2f, paint)
        return BitmapDescriptorFactory.fromBitmap(bmp)
    }

    private fun calculateDistance(p1: LatLng, p2: LatLng): Double {
        val results = FloatArray(1)
        android.location.Location.distanceBetween(p1.latitude, p1.longitude, p2.latitude, p2.longitude, results)
        return results[0].toDouble()
    }
}
