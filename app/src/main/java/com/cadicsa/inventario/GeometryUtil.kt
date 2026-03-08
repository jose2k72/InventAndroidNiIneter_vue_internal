package com.cadicsa.inventario

import com.cadicsa.inventario.utils.ProjectionHelper
import com.cadicsa.inventario.utils.RoutingHelper
import org.locationtech.jts.algorithm.Orientation
import org.locationtech.jts.geom.Coordinate
import org.locationtech.jts.geom.GeometryFactory
import org.locationtech.jts.geom.Point
import org.locationtech.jts.geom.Polygon
import org.locationtech.jts.geom.Geometry as JtsGeometry
import org.locationtech.jts.io.WKTReader

/**
 * Utilidad de Geometría basada en JTS Topology Suite.
 * Delega proyecciones a ProjectionHelper y lógica de rutas a RoutingHelper.
 */
object GeometryUtil {
    
    private val geometryFactory = GeometryFactory()
    private val wktReader = WKTReader(geometryFactory)
    
    /**
     * Convierte WKT (Well-Known Text) a Geometría JTS
     */
    fun wktToGeometry(wkt: String): JtsGeometry? {
        return try {
            wktReader.read(wkt)
        } catch (e: Exception) {
            android.util.Log.e("GeometryUtil", "Error parseando WKT: ${e.message}")
            null
        }
    }
    
    // --- Delegación a ProjectionHelper ---
    
    fun projectToCRTM05(lat: Double, lng: Double) = ProjectionHelper.projectToCRTM05(lat, lng)
    fun projectToWGS84(east: Double, north: Double) = ProjectionHelper.projectToWGS84(east, north)
    fun projectGeometryToCRTM05(geom: JtsGeometry) = ProjectionHelper.projectGeometryToCRTM05(geom)
    fun projectGeometryTo32616(geom: JtsGeometry) = ProjectionHelper.projectGeometryTo32616(geom)

    // --- Operaciones Geométricas Básicas ---

    fun createPoint(lat: Double, lng: Double): Point {
        return geometryFactory.createPoint(Coordinate(lng, lat))
    }
    
    fun isPointInPolygon(lat: Double, lon: Double, polygon: JtsGeometry): Boolean {
        return try {
            val point = geometryFactory.createPoint(Coordinate(lon, lat))
            polygon.contains(point)
        } catch (e: Exception) {
            false
        }
    }

    fun isPointInPolygon(lat: Double, lon: Double, wktPolygon: String): Boolean {
        val geom = wktToGeometry(wktPolygon) ?: return false
        return isPointInPolygon(lat, lon, geom)
    }
    
    fun isPolygonCounterClockwise(polygonWkt: String): Boolean {
        val geom = wktToGeometry(polygonWkt) ?: return false
        return try {
            if (geom is Polygon) Orientation.isCCW(geom.exteriorRing.coordinates) else false
        } catch (e: Exception) {
            false
        }
    }
    
    fun getPolygonCoordinates(polygonWkt: String): List<Pair<Double, Double>> {
        val geom = wktToGeometry(polygonWkt) ?: return emptyList()
        return try {
            if (geom is Polygon) {
                geom.exteriorRing.coordinates.map { Pair(it.y, it.x) }
            } else emptyList()
        } catch (e: Exception) {
            emptyList()
        }
    }
    
    fun reversePolygon(polygonWkt: String): String? {
        val geom = wktToGeometry(polygonWkt) ?: return null
        return try {
            if (geom is Polygon) {
                val coords = geom.exteriorRing.coordinates.reversedArray()
                val reversedRing = geometryFactory.createLinearRing(coords)
                geometryFactory.createPolygon(reversedRing).toText()
            } else null
        } catch (e: Exception) {
            null
        }
    }
    
    fun getBoundingBox(wkt: String): DoubleArray? {
        val geom = wktToGeometry(wkt) ?: return null
        return try {
            val env = geom.envelopeInternal
            doubleArrayOf(env.minX, env.minY, env.maxX, env.maxY)
        } catch (e: Exception) {
            null
        }
    }
    
    fun distanceBetweenGeometries(wkt1: String, wkt2: String): Double {
        val geom1 = wktToGeometry(wkt1) ?: return -1.0
        val geom2 = wktToGeometry(wkt2) ?: return -1.0
        return try {
            val g1p = projectGeometryToCRTM05(geom1)
            val g2p = projectGeometryToCRTM05(geom2)
            if (g1p == null || g2p == null) {
                geom1.distance(geom2) * 111000
            } else {
                g1p.distance(g2p)
            }
        } catch (e: Exception) {
            -1.0
        }
    }
    
    fun intersects(wkt1: String, wkt2: String): Boolean {
        val geom1 = wktToGeometry(wkt1) ?: return false
        val geom2 = wktToGeometry(wkt2) ?: return false
        return try { geom1.intersects(geom2) } catch (e: Exception) { false }
    }
    
    fun intersectsWithBuffer(wkt1: String, wkt2: String, bufferMeters: Double): Boolean {
        val geom1 = wktToGeometry(wkt1) ?: return false
        val geom2 = wktToGeometry(wkt2) ?: return false
        return try {
            val g1p = projectGeometryToCRTM05(geom1) ?: return false
            val g2p = projectGeometryToCRTM05(geom2) ?: return false
            g1p.intersects(g2p.buffer(bufferMeters))
        } catch (e: Exception) {
            false
        }
    }

    fun calculateArea32616(wkt: String): Double {
        val geom = wktToGeometry(wkt) ?: return 0.0
        return projectGeometryTo32616(geom)?.area ?: 0.0
    }
    
    // --- Delegación a RoutingHelper ---

    fun getCardinalDirectionFromGeom(geom1: JtsGeometry, geom2: JtsGeometry) = RoutingHelper.getCardinalDirection(geom1, geom2)
    fun getCardinalDirection(wkt1: String, wkt2: String) = RoutingHelper.getCardinalDirection(wktToGeometry(wkt1)!!, wktToGeometry(wkt2)!!)
    fun getRelativeDirectionFromJts(geomA: JtsGeometry, geomB: JtsGeometry) = RoutingHelper.getRelativeDirectionBetweenPolygons(geomA, geomB)
    fun getRelativeDirectionBetweenPolygons(wktA: String, wktB: String) = RoutingHelper.getRelativeDirectionBetweenPolygons(wktToGeometry(wktA)!!, wktToGeometry(wktB)!!)
    fun calculateSegmentBearing(wktLine: String) = RoutingHelper.calculateSegmentBearing(wktToGeometry(wktLine)!!)

    // --- Utilidades Especiales ---

    fun getNearestPoints(wkt1: String, wkt2: String): Pair<Coordinate, Coordinate>? {
        val g1 = wktToGeometry(wkt1) ?: return null
        val g2 = wktToGeometry(wkt2) ?: return null
        val pts = org.locationtech.jts.operation.distance.DistanceOp(g1, g2).nearestPoints()
        return if (pts != null && pts.size >= 2) Pair(pts[0], pts[1]) else null
    }
    
    fun createLineString(coord1: Coordinate, coord2: Coordinate): String {
        return geometryFactory.createLineString(arrayOf(coord1, coord2)).toText()
    }
    
    fun isLineObstructedByPolygon(lineWkt: String, obstructorWkt: String): Boolean {
        val line = wktToGeometry(lineWkt) ?: return false
        val obs = wktToGeometry(obstructorWkt) ?: return false
        return line.intersects(obs)
    }
    
    fun getPolylineCoordinates(lineWkt: String): List<List<com.google.android.gms.maps.model.LatLng>> {
        val geom = wktToGeometry(lineWkt) ?: return emptyList()
        val result = mutableListOf<List<com.google.android.gms.maps.model.LatLng>>()
        try {
            when (geom) {
                is org.locationtech.jts.geom.LineString -> {
                    result.add((0 until geom.numPoints).map { com.google.android.gms.maps.model.LatLng(geom.getCoordinateN(it).y, geom.getCoordinateN(it).x) })
                }
                is org.locationtech.jts.geom.MultiLineString -> {
                    (0 until geom.numGeometries).forEach { i ->
                        val line = geom.getGeometryN(i) as org.locationtech.jts.geom.LineString
                        result.add((0 until line.numPoints).map { com.google.android.gms.maps.model.LatLng(line.getCoordinateN(it).y, line.getCoordinateN(it).x) })
                    }
                }
            }
        } catch (e: Exception) {}
        return result
    }
}
