package com.cadicsa.inventario.utils

import java.util.Locale

/**
 * Utilidad para normalizar coordenadas y valores numéricos asegurando el uso de punto decimal (.)
 * independientemente de la configuración regional del dispositivo.
 * 
 * Objetivo: Evitar errores de interceptación espacial causados por Locale (punto vs coma).
 */
object SpatialNormalizer {

    /**
     * Formatea un valor Double a String con alta precisión usando Locale.US.
     * Ideal para consultas SQL y almacenamiento JSON (GeoJSON/WKT).
     */
    fun format(value: Double): String {
        return String.format(Locale.US, "%.10f", value)
    }

    /**
     * Formatea un valor Float a String usando Locale.US.
     */
    fun format(value: Float): String {
        return String.format(Locale.US, "%.10f", value)
    }
    
    /**
     * Formatea coordenadas para una consulta SQL de tipo Bounding Box.
     */
    fun formatBBox(minX: Double, minY: Double, maxX: Double, maxY: Double): String {
        return "minX >= ${format(minX)} AND minY >= ${format(minY)} AND maxX <= ${format(maxX)} AND maxY <= ${format(maxY)}"
    }
}
