package com.cadicsa.inventario

import org.locationtech.jts.geom.Geometry as JtsGeometry

/**
 * Clase que representa un objeto geométrico de la tabla objects
 */
data class Geometry(
    var id: Int = 0,
    var idObject: String = "",
    var localizacion: String = "",
    var layer: String = "",
    var idLayer: Int = 0,
    var idPredio: Int = 0,
    var jtsGeom: JtsGeometry? = null  // Geometría nativa en memoria
) {
    val wkt: String
        get() = jtsGeom?.toText() ?: ""
}
