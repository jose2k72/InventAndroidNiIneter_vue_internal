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

    /**
     * Un grupo (agrupación) visual dentro de un predio. La clave [key] combina idObject y
     * grupoId porque GRUPO_ID está escalado por predio (dos predios distintos pueden compartir
     * el mismo GRUPO_ID) — sin el idObject en la clave, marcadores de predios distintos chocarían.
     */
    private class DataGroup(val idObject: Int, val grupoId: Int, val centerLat: Double, val centerLng: Double) {
        val items = mutableListOf<com.cadicsa.inventario.DataItem>()
        val key: String get() = "$idObject:$grupoId"
    }

    private val activeMarkers = HashMap<String, Marker>()
    private val activeEyeMarkers = HashMap<String, Marker>()
    private val activeColors = HashMap<String, Float>()

    /**
     * Subagrupa los registros de un predio en grupos visuales independientes:
     * - Si el predio contiene un registro No Encuestado o Unión con Predio, se colapsa a un
     *   único grupo/marcador para todo el predio (estas marcas bloquean cualquier otro dato
     *   en el polígono, por lo que conceptualmente nunca coexisten con múltiples agrupaciones).
     * - En cualquier otro caso, se subagrupa por GRUPO_ID: cada agrupación real dentro del
     *   predio recibe su propio marcador independiente.
     */
    private fun buildSubGroups(idObj: Int, itemsInPredio: List<com.cadicsa.inventario.DataItem>): List<DataGroup> {
        if (itemsInPredio.isEmpty()) return emptyList()

        val isExceptionType = itemsInPredio.any {
            it.data.contains("\"Type\":\"NoEncuestado\"") || it.data.contains("\"Type\":\"UnionConPredio\"")
        }
        val subGroups = if (isExceptionType) {
            mapOf(1 to itemsInPredio)
        } else {
            itemsInPredio.groupBy { it.grupoId }
        }

        return subGroups.map { (grupoId, items) ->
            val first = items.first()
            DataGroup(idObj, grupoId, first.latitud, first.longitud).apply { this.items.addAll(items) }
        }
    }

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

                // 2. Subagrupar por predio y, dentro de cada predio, por GRUPO_ID (salvo excepción) + Viewport Culling
                val groupedByObject = allData.groupBy { it.idObject }
                val groupsToDraw = mutableListOf<DataGroup>()

                for ((idObj, itemsInPredio) in groupedByObject) {
                    for (group in buildSubGroups(idObj, itemsInPredio)) {
                        val pos = LatLng(group.centerLat, group.centerLng)
                        // Viewport Culling: Si está fuera del viewport, se omite
                        if (visibleBounds != null && !visibleBounds.contains(pos)) {
                            continue
                        }
                        groupsToDraw.add(group)
                    }
                }

                // 3. Pintar de forma incremental en el hilo principal
                activity.runOnUiThread {
                    val targetKeys = groupsToDraw.map { it.key }.toSet()

                    // A. Eliminación quirúrgica: Quitar marcadores de grupos que salieron del viewport
                    val markerIterator = activeMarkers.entries.iterator()
                    while (markerIterator.hasNext()) {
                        val entry = markerIterator.next()
                        if (!targetKeys.contains(entry.key)) {
                            entry.value.remove()
                            activeEyeMarkers[entry.key]?.remove()
                            activeEyeMarkers.remove(entry.key)
                            activeColors.remove(entry.key)
                            markerIterator.remove()
                        }
                    }

                    // B. Actualización incremental o inserción de marcadores
                    groupsToDraw.forEach { group -> paintOrUpdateGroup(group, lastSavedDataId) }
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

    /**
     * Crea o actualiza en caliente el marcador (y su "ojo" decorativo si aplica) de un grupo.
     * Compartida entre loadCapturedPoints() y updateSingleObjectMarker() para no duplicar la
     * lógica de creación/actualización de marcadores.
     */
    private fun paintOrUpdateGroup(group: DataGroup, lastSavedDataId: Int) {
        val expectedColor = calculateGroupColor(group.items)
        val isLastSaved = group.items.any { it.id == lastSavedDataId }
        val coordsTag = "${SpatialNormalizer.format(group.centerLat)},${SpatialNormalizer.format(group.centerLng)}"
        val existingMarker = activeMarkers[group.key]

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
                activeMarkers[group.key] = it
                activeColors[group.key] = expectedColor
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
                    activeEyeMarkers[group.key] = it
                }
            }
        } else {
            // Ya existe en pantalla: verificar si cambió el color
            val currentColor = activeColors[group.key]
            if (currentColor == null || currentColor != expectedColor) {
                existingMarker.setIcon(BitmapDescriptorFactory.defaultMarker(expectedColor))
                activeColors[group.key] = expectedColor
            }

            // Actualizar textos
            existingMarker.title = "Unidad: ${group.items.size} registros"
            existingMarker.snippet = "ID base: ${group.items.first().id}"

            // Comprobar y ajustar en caliente el ojo negro
            val hasEye = activeEyeMarkers.containsKey(group.key)
            if (isLastSaved && !hasEye) {
                val eyeMarker = mMap.addMarker(
                    MarkerOptions()
                        .position(existingMarker.position)
                        .icon(createBlackEyeIcon())
                        .anchor(0.5f, 5.0f)
                        .zIndex(existingMarker.zIndex + 1f)
                )
                eyeMarker?.let {
                    it.tag = coordsTag // Compartir el mismo tag para responder al primer toque
                    activeEyeMarkers[group.key] = it
                }
            } else if (!isLastSaved && hasEye) {
                activeEyeMarkers[group.key]?.remove()
                activeEyeMarkers.remove(group.key)
            }
        }
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
     * Actualiza o elimina de forma puntual e incremental los marcadores de un predio (idObject),
     * consultando solo sus registros asociados y reconciliando todos sus subgrupos (un predio
     * puede tener más de un grupo/marcador), evitando recargas masivas en el mapa.
     */
    fun updateSingleObjectMarker(idObject: Int, lastSavedDataId: Int) {
        val dbHelper = DatabaseHelper.getInstance(activity)

        kotlin.concurrent.thread {
            try {
                val items = dbHelper.getDataByObjectId(idObject)
                val newGroups = buildSubGroups(idObject, items)

                activity.runOnUiThread {
                    val prefix = "$idObject:"
                    val newKeys = newGroups.map { it.key }.toSet()

                    // Eliminar marcadores de subgrupos de este predio que ya no existen
                    // (ej. se borró el único registro de un grupo, o se fusionó con otro por snapping)
                    val markerIterator = activeMarkers.entries.iterator()
                    while (markerIterator.hasNext()) {
                        val entry = markerIterator.next()
                        if (entry.key.startsWith(prefix) && entry.key !in newKeys) {
                            entry.value.remove()
                            activeEyeMarkers[entry.key]?.remove()
                            activeEyeMarkers.remove(entry.key)
                            activeColors.remove(entry.key)
                            markerIterator.remove()
                        }
                    }

                    // Crear/actualizar cada subgrupo vigente del predio
                    newGroups.forEach { group -> paintOrUpdateGroup(group, lastSavedDataId) }
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
