package com.cadicsa.inventario

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
    var wkt: String = ""  // Polígono WKT para cálculos de rutas adyacentes
)
