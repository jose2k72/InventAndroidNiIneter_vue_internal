package com.cadicsa.inventario.utils

import com.cadicsa.inventario.GeometryUtil
import org.locationtech.jts.geom.Polygon
import org.locationtech.jts.geom.Geometry as JtsGeometry

/**
 * Helper para lógica de negocio espacial: direcciones, rumbos (bearings) y análisis de vecindad.
 */
object RoutingHelper {

    /**
     * Calcula la dirección cardinal aproximada (N, NE, E, SE, S, SO, O, NO)
     */
    fun getCardinalDirection(geom1: JtsGeometry, geom2: JtsGeometry): String {
        return try {
            val nearestPoints = org.locationtech.jts.operation.distance.DistanceOp.nearestPoints(geom1, geom2)
            val p1 = nearestPoints[0] 
            val p2 = nearestPoints[1] 
            
            val dist = p1.distance(p2)
            val originX = if (dist < 0.000001) geom1.centroid.x else p1.x
            val originY = if (dist < 0.000001) geom1.centroid.y else p1.y
            
            val angle = Math.toDegrees(Math.atan2(p2.y - originY, p2.x - originX))
            val bearing = (450 - angle) % 360
            
            bearingToCardinal(bearing)
        } catch (e: Exception) {
            android.util.Log.e("RoutingHelper", "Error calculando dirección: ${e.message}")
            ""
        }
    }

    private fun bearingToCardinal(degree: Double): String {
        val normalized = (degree % 360 + 360) % 360
        return when {
            normalized >= 337.5 || normalized < 22.5 -> "N"
            normalized >= 22.5 && normalized < 67.5 -> "NE"
            normalized >= 67.5 && normalized < 112.5 -> "E"
            normalized >= 112.5 && normalized < 157.5 -> "SE"
            normalized >= 157.5 && normalized < 202.5 -> "S"
            normalized >= 202.5 && normalized < 247.5 -> "SO"
            normalized >= 247.5 && normalized < 292.5 -> "O"
            normalized >= 292.5 && normalized < 337.5 -> "NO"
            else -> ""
        }
    }

    /**
     * Calcula la dirección relativa de un polígono B con respecto a un polígono A
     */
    fun getRelativeDirectionBetweenPolygons(geomA: JtsGeometry, geomB: JtsGeometry): String {
        return try {
            val centroidA = geomA.centroid
            val centroidB = geomB.centroid
            val arbitroX = centroidB.x - centroidA.x
            val arbitroY = centroidB.y - centroidA.y
            
            val intersection = geomA.intersection(geomB)
            
            var normalX: Double
            var normalY: Double
            
            if (intersection.isEmpty || intersection.length == 0.0) {
                 normalX = arbitroX
                 normalY = arbitroY
            } else {
                val coords = intersection.coordinates
                if (coords.size < 2) {
                    normalX = arbitroX
                    normalY = arbitroY
                } else {
                    val p1 = coords.first()
                    val p2 = coords.last()
                    val dx = p2.x - p1.x
                    val dy = p2.y - p1.y
                    
                    if (Math.abs(dx) < 1e-10 && Math.abs(dy) < 1e-10) {
                        normalX = arbitroX
                        normalY = arbitroY
                    } else {
                        normalX = -dy
                        normalY = dx
                        val dotProduct = normalX * arbitroX + normalY * arbitroY
                        if (dotProduct < 0) {
                            normalX = -normalX
                            normalY = -normalY
                        }
                    }
                }
            }
            
            val angleDegrees = Math.toDegrees(Math.atan2(normalY, normalX))
            angleToCardinal8(angleDegrees)
            
        } catch (e: Exception) {
            android.util.Log.e("RoutingHelper", "Error calculando dirección relativa: ${e.message}")
            ""
        }
    }

    private fun angleToCardinal8(degrees: Double): String {
        var normalized = degrees % 360
        if (normalized > 180) normalized -= 360
        if (normalized < -180) normalized += 360
        
        return when {
            normalized >= -22.5 && normalized < 22.5   -> "E"
            normalized >= 22.5 && normalized < 67.5    -> "NE"
            normalized >= 67.5 && normalized < 112.5   -> "N"
            normalized >= 112.5 && normalized < 157.5  -> "NO"
            normalized >= 157.5 || normalized < -157.5 -> "O"
            normalized >= -157.5 && normalized < -112.5 -> "SO"
            normalized >= -112.5 && normalized < -67.5  -> "S"
            normalized >= -67.5 && normalized < -22.5   -> "SE"
            else -> ""
        }
    }

    /**
     * Calcula el bearing (ángulo) de un segmento de línea en grados [0, 360)
     */
    fun calculateSegmentBearing(geom: JtsGeometry): Double? {
        return try {
            if (geom is org.locationtech.jts.geom.LineString && geom.numPoints >= 2) {
                val p1 = geom.getCoordinateN(0)
                val p2 = geom.getCoordinateN(geom.numPoints - 1)
                val dx = p2.x - p1.x
                val dy = p2.y - p1.y
                var angle = Math.toDegrees(Math.atan2(dy, dx))
                if (angle < 0) angle += 360.0
                angle
            } else null
        } catch (e: Exception) {
            null
        }
    }
}
