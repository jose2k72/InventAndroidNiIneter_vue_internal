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

    private class DataGroup(val idObject: Int, val centerLat: Double, val centerLng: Double) {
        val items = mutableListOf<com.cadicsa.inventario.DataItem>()
    }

    private val activeMarkers = HashMap<Int, Marker>()
    private val activeEyeMarkers = HashMap<Int, Marker>()
    private val activeColors = HashMap<Int, Float>()

    /**
     * Carga y dibuja los puntos capturados desde la BD de forma incremental y optimizada con Viewport Culling.
     */
    fun loadCapturedPoints(lastSavedDataId: Int) {
        val dbHelper = DatabaseHelper.getInstance(activity)
        
        // 1. Obtener la región visible actual en el Main Thread
        val visibleBounds = try {
            mMap.projection.visibleRegion.latLngBounds
        } catch (e: Exception) {
            null
        }
        
        kotlin.concurrent.thread {
            try {
                val allData = if (visibleBounds != null) {
                    dbHelper.getDataInBounds(
                        visibleBounds.southwest.latitude,
                        visibleBounds.northeast.latitude,
                        visibleBounds.southwest.longitude,
                        visibleBounds.northeast.longitude
                    )
                } else {
                    dbHelper.getAllData()
                }
                if (allData.isEmpty()) {
                    activity.runOnUiThread {
                        activeMarkers.values.forEach { it.remove() }
                        activeMarkers.clear()
                        activeEyeMarkers.values.forEach { it.remove() }
                        activeEyeMarkers.clear()
                        activeColors.clear()
                    }
                    return@thread
                }

                // 2. Agrupar puntos linealmente por IDOBJECT (consolidación catastral) y aplicar Viewport Culling
                val groupedByObject = allData.groupBy { it.idObject }
                val groupsToDraw = mutableListOf<DataGroup>()
                
                for ((idObj, items) in groupedByObject) {
                    val firstItem = items.first()
                    val pos = LatLng(firstItem.latitud, firstItem.longitud)
                    
                    // Viewport Culling: Si está fuera del viewport, se omite
                    if (visibleBounds != null && !visibleBounds.contains(pos)) {
                        continue
                    }
                    
                    val group = DataGroup(idObj, firstItem.latitud, firstItem.longitud)
                    group.items.addAll(items)
                    groupsToDraw.add(group)
                }

                // 3. Pintar de forma incremental e incremental en el hilo principal
                activity.runOnUiThread {
                    val targetIds = groupsToDraw.map { it.idObject }.toSet()
                    
                    // A. Eliminación quirúrgica: Quitar marcadores de predios que salieron del viewport
                    val markerIterator = activeMarkers.entries.iterator()
                    while (markerIterator.hasNext()) {
                        val entry = markerIterator.next()
                        if (!targetIds.contains(entry.key)) {
                            entry.value.remove()
                            activeEyeMarkers[entry.key]?.remove()
                            activeEyeMarkers.remove(entry.key)
                            activeColors.remove(entry.key)
                            markerIterator.remove()
                        }
                    }

                    // B. Actualización incremental o inserción de marcadores
                    groupsToDraw.forEach { group ->
                        val expectedColor = calculateGroupColor(group.items)
                        val isLastSaved = group.items.any { it.id == lastSavedDataId }
                        
                        val existingMarker = activeMarkers[group.idObject]
                        val coordsTag = "${SpatialNormalizer.format(group.centerLat)},${SpatialNormalizer.format(group.centerLng)}"
                        
                        if (existingMarker == null) {
                            // Crear marcador nuevo
                            val marker = mMap.addMarker(
                                MarkerOptions()
                                    .position(LatLng(group.centerLat, group.centerLng))
                                    .title("Unidad: ${group.items.size} registros")
                                    .snippet("ID base: ${group.items.first().id}")
                                    .icon(BitmapDescriptorFactory.defaultMarker(expectedColor))
                                    .zIndex(4000f)
                            )
                            marker?.let {
                                it.tag = coordsTag
                                activeMarkers[group.idObject] = it
                                activeColors[group.idObject] = expectedColor
                            }
                            
                            if (isLastSaved) {
                                val eyeMarker = mMap.addMarker(
                                    MarkerOptions()
                                        .position(LatLng(group.centerLat, group.centerLng))
                                        .icon(createBlackEyeIcon())
                                        .anchor(0.5f, 5.0f)
                                        .zIndex(4001f)
                                )
                                eyeMarker?.let {
                                    it.tag = coordsTag // Compartir el mismo tag para responder al primer toque
                                    activeEyeMarkers[group.idObject] = it
                                }
                            }
                        } else {
                            // Ya existe en pantalla: verificar si cambió el color
                            val currentColor = activeColors[group.idObject]
                            if (currentColor == null || currentColor != expectedColor) {
                                existingMarker.setIcon(BitmapDescriptorFactory.defaultMarker(expectedColor))
                                activeColors[group.idObject] = expectedColor
                            }

                            // Actualizar textos
                            existingMarker.title = "Unidad: ${group.items.size} registros"
                            existingMarker.snippet = "ID base: ${group.items.first().id}"

                            // Comprobar y ajustar en caliente el ojo negro
                            val hasEye = activeEyeMarkers.containsKey(group.idObject)
                            if (isLastSaved && !hasEye) {
                                val eyeMarker = mMap.addMarker(
                                    MarkerOptions()
                                        .position(LatLng(group.centerLat, group.centerLng))
                                        .icon(createBlackEyeIcon())
                                        .anchor(0.5f, 5.0f)
                                        .zIndex(existingMarker.zIndex + 1f)
                                )
                                eyeMarker?.let {
                                    it.tag = coordsTag // Compartir el mismo tag para responder al primer toque
                                    activeEyeMarkers[group.idObject] = it
                                }
                            } else if (!isLastSaved && hasEye) {
                                activeEyeMarkers[group.idObject]?.remove()
                                activeEyeMarkers.remove(group.idObject)
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                android.util.Log.e("MapHelper", "Error cargando marcadores: ${e.message}")
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
            val dataStr = item.data
            if (dataStr.contains("\"Type\":\"Ficha\"")) tieneFicha = true
            else if (dataStr.contains("\"Type\":\"Entrevistado\"")) tieneEntrevistado = true
            else if (dataStr.contains("\"Type\":\"SujetoNatural\"") || dataStr.contains("\"Type\":\"SujetoJuridico\"")) tieneDuenio = true
            else if (dataStr.contains("\"Type\":\"NoEncuestado\"")) esNoEncuestado = true
            else if (dataStr.contains("\"Type\":\"UnionConPredio\"")) esUnionPredio = true
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

    /**
     * Actualiza o elimina de forma puntual e incremental el marcador de un predio (idObject) 
     * consultando solo sus registros asociados, evitando recargas masivas en el mapa.
     */
    fun updateSingleObjectMarker(idObject: Int, lastSavedDataId: Int) {
        val dbHelper = DatabaseHelper.getInstance(activity)
        
        kotlin.concurrent.thread {
            try {
                val items = dbHelper.getDataByObjectId(idObject)
                activity.runOnUiThread {
                    val coordsTag = if (items.isNotEmpty()) {
                        "${SpatialNormalizer.format(items.first().latitud)},${SpatialNormalizer.format(items.first().longitud)}"
                    } else {
                        ""
                    }
                    
                    val existingMarker = activeMarkers[idObject]
                    
                    if (items.isEmpty()) {
                        // Caso A: Se eliminaron todos los registros asociados a este idObject
                        existingMarker?.remove()
                        activeMarkers.remove(idObject)
                        activeEyeMarkers[idObject]?.remove()
                        activeEyeMarkers.remove(idObject)
                        activeColors.remove(idObject)
                    } else {
                        // Caso B: El predio tiene registros (creado o modificado)
                        val expectedColor = calculateGroupColor(items)
                        val isLastSaved = items.any { it.id == lastSavedDataId }
                        
                        if (existingMarker == null) {
                            // Crear marcador nuevo
                            val firstItem = items.first()
                            val marker = mMap.addMarker(
                                MarkerOptions()
                                    .position(LatLng(firstItem.latitud, firstItem.longitud))
                                    .title("Unidad: ${items.size} registros")
                                    .snippet("ID base: ${firstItem.id}")
                                    .icon(BitmapDescriptorFactory.defaultMarker(expectedColor))
                                    .zIndex(4000f)
                            )
                            marker?.let {
                                it.tag = coordsTag
                                activeMarkers[idObject] = it
                                activeColors[idObject] = expectedColor
                            }
                            
                            if (isLastSaved) {
                                val eyeMarker = mMap.addMarker(
                                    MarkerOptions()
                                        .position(LatLng(firstItem.latitud, firstItem.longitud))
                                        .icon(createBlackEyeIcon())
                                        .anchor(0.5f, 5.0f)
                                        .zIndex(4001f)
                                )
                                eyeMarker?.let {
                                    it.tag = coordsTag
                                    activeEyeMarkers[idObject] = it
                                }
                            }
                        } else {
                            // Actualizar marcador existente
                            val currentColor = activeColors[idObject]
                            if (currentColor == null || currentColor != expectedColor) {
                                existingMarker.setIcon(BitmapDescriptorFactory.defaultMarker(expectedColor))
                                activeColors[idObject] = expectedColor
                            }
                            
                            existingMarker.title = "Unidad: ${items.size} registros"
                            existingMarker.snippet = "ID base: ${items.first().id}"
                            
                            // Ajustar el ojo decorativo en caliente
                            val hasEye = activeEyeMarkers.containsKey(idObject)
                            if (isLastSaved && !hasEye) {
                                val eyeMarker = mMap.addMarker(
                                    MarkerOptions()
                                        .position(existingMarker.position)
                                        .icon(createBlackEyeIcon())
                                        .anchor(0.5f, 5.0f)
                                        .zIndex(existingMarker.zIndex + 1f)
                                )
                                eyeMarker?.let {
                                    it.tag = coordsTag
                                    activeEyeMarkers[idObject] = it
                                }
                            } else if (!isLastSaved && hasEye) {
                                activeEyeMarkers[idObject]?.remove()
                                activeEyeMarkers.remove(idObject)
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                android.util.Log.e("MapHelper", "Error actualizando marcador único: ${e.message}")
            }
        }
    }

    private fun calculateDistance(p1: LatLng, p2: LatLng): Double {
        val results = FloatArray(1)
        android.location.Location.distanceBetween(p1.latitude, p1.longitude, p2.latitude, p2.longitude, results)
        return results[0].toDouble()
    }
}
