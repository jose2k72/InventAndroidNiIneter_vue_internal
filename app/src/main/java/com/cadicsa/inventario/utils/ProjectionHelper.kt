package com.cadicsa.inventario.utils

import org.locationtech.jts.geom.Coordinate
import org.locationtech.jts.geom.GeometryFactory
import org.locationtech.jts.geom.Geometry as JtsGeometry
import org.locationtech.proj4j.CRSFactory
import org.locationtech.proj4j.CoordinateTransform
import org.locationtech.proj4j.CoordinateTransformFactory
import org.locationtech.proj4j.ProjCoordinate

/**
 * Helper para transformaciones de coordenadas y proyecciones geográficas.
 * Centraliza el uso de Proj4J.
 */
object ProjectionHelper {

    private val geometryFactory = GeometryFactory()
    private val crsFactory = CRSFactory()
    private val ctFactory = CoordinateTransformFactory()

    // WGS84 (EPSG:4326) - Lat/Lng en grados
    private val wgs84 = crsFactory.createFromParameters("WGS84", 
        "+proj=longlat +datum=WGS84 +no_defs")
    
    // CRTM05 (EPSG:5367) - Costa Rica Transverse Mercator 2005
    private val crtm05 = crsFactory.createFromParameters("CRTM05",
        "+proj=tmerc +lat_0=0 +lon_0=-84 +k=0.9999 +x_0=500000 +y_0=0 +ellps=WGS84 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs")
    
    // UTM 16N (EPSG:32616) - Nicaragua / Costa Rica
    private val utm16n = crsFactory.createFromParameters("UTM16N",
        "+proj=utm +zone=16 +datum=WGS84 +units=m +no_defs")

    // Transformadores
    private val wgs84ToCrtm05: CoordinateTransform = ctFactory.createTransform(wgs84, crtm05)
    private val crtm05ToWgs84: CoordinateTransform = ctFactory.createTransform(crtm05, wgs84)
    private val wgs84ToUtm16n: CoordinateTransform = ctFactory.createTransform(wgs84, utm16n)

    /**
     * Proyecta coordenadas de WGS84 (Lat/Lng) a CRTM05 (Este/Norte en metros)
     */
    fun projectToCRTM05(lat: Double, lng: Double): Pair<Double, Double> {
        val source = ProjCoordinate(lng, lat)
        val target = ProjCoordinate()
        wgs84ToCrtm05.transform(source, target)
        return Pair(target.x, target.y)
    }

    /**
     * Proyecta coordenadas de CRTM05 (Este/Norte) a WGS84 (Lat/Lng)
     */
    fun projectToWGS84(east: Double, north: Double): Pair<Double, Double> {
        val source = ProjCoordinate(east, north)
        val target = ProjCoordinate()
        crtm05ToWgs84.transform(source, target)
        return Pair(target.y, target.x)
    }

    /**
     * Proyecta una geometría de WGS84 a CRTM05
     */
    fun projectGeometryToCRTM05(geom: JtsGeometry): JtsGeometry? {
        return projectGeometryGeneric(geom, wgs84ToCrtm05)
    }

    /**
     * Proyecta una geometría de WGS84 a UTM 16N (EPSG:32616)
     */
    fun projectGeometryTo32616(geom: JtsGeometry): JtsGeometry? {
        return projectGeometryGeneric(geom, wgs84ToUtm16n)
    }

    /**
     * Implementación genérica de proyección de geometría
     */
    private fun projectGeometryGeneric(geom: JtsGeometry, transform: CoordinateTransform): JtsGeometry? {
        return try {
            val coords = geom.coordinates.map { coord ->
                val source = ProjCoordinate(coord.x, coord.y)
                val target = ProjCoordinate()
                transform.transform(source, target)
                Coordinate(target.x, target.y)
            }.toTypedArray()
            
            when (geom.geometryType) {
                "Point" -> geometryFactory.createPoint(coords[0])
                "LineString" -> geometryFactory.createLineString(coords)
                "Polygon" -> {
                    val ring = geometryFactory.createLinearRing(coords)
                    geometryFactory.createPolygon(ring)
                }
                "MultiLineString" -> {
                    val multiLine = geom as org.locationtech.jts.geom.MultiLineString
                    val lines = (0 until multiLine.numGeometries).map { i ->
                        val lineCoords = multiLine.getGeometryN(i).coordinates.map { coord ->
                            val src = ProjCoordinate(coord.x, coord.y)
                            val tgt = ProjCoordinate()
                            transform.transform(src, tgt)
                            Coordinate(tgt.x, tgt.y)
                        }.toTypedArray()
                        geometryFactory.createLineString(lineCoords)
                    }.toTypedArray()
                    geometryFactory.createMultiLineString(lines)
                }
                else -> {
                    android.util.Log.w("ProjectionHelper", "Tipo no soportado: ${geom.geometryType}")
                    null
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("ProjectionHelper", "Error proyectando: ${e.message}")
            null
        }
    }
}
