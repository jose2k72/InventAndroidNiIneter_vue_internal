package com.cadicsa.inventario

import org.locationtech.jts.algorithm.Orientation
import org.locationtech.jts.geom.Coordinate
import org.locationtech.jts.geom.GeometryFactory
import org.locationtech.jts.geom.Point
import org.locationtech.jts.geom.Polygon
import org.locationtech.jts.geom.Geometry as JtsGeometry  // ALIAS para evitar conflicto con clase del proyecto
import org.locationtech.jts.io.WKTReader
import org.locationtech.proj4j.CRSFactory
import org.locationtech.proj4j.CoordinateTransform
import org.locationtech.proj4j.CoordinateTransformFactory
import org.locationtech.proj4j.ProjCoordinate


/**
 * Utilidad de Geometría basada en JTS Topology Suite y Proj4J
 * 
 * Propósito:
 * - Reemplazar dependencias de Google Maps Utils (PolyUtil, SphericalUtil)
 * - Proveer operaciones geométricas robustas y estándares
 * - Manejar reproyección entre WGS84 y CRTM05
 */
object GeometryUtil {
    
    // Factory de JTS para crear geometrías
    private val geometryFactory = GeometryFactory()
    
    // WKTReader para parsear Well-Known Text
    private val wktReader = WKTReader(geometryFactory)
    
    // Sistemas de Coordenadas (definidos con cadenas Proj4 para evitar dependencias de archivos)
    private val crsFactory = CRSFactory()
    
    // WGS84 (EPSG:4326) - Lat/Lng en grados
    private val wgs84 = crsFactory.createFromParameters("WGS84", 
        "+proj=longlat +datum=WGS84 +no_defs")
    
    // CRTM05 (EPSG:5367) - Costa Rica Transverse Mercator 2005
    // Definición Proj4 completa desde spatialreference.org
    private val crtm05 = crsFactory.createFromParameters("CRTM05",
        "+proj=tmerc +lat_0=0 +lon_0=-84 +k=0.9999 +x_0=500000 +y_0=0 +ellps=WGS84 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs")
    
    // UTM 16N (EPSG:32616) - Nicaragua / Costa Rica
    private val utm16n = crsFactory.createFromParameters("UTM16N",
        "+proj=utm +zone=16 +datum=WGS84 +units=m +no_defs")
    
    // Transformadores de coordenadas (cache)
    private val ctFactory = CoordinateTransformFactory()
    private val wgs84ToCrtm05: CoordinateTransform = ctFactory.createTransform(wgs84, crtm05)
    private val crtm05ToWgs84: CoordinateTransform = ctFactory.createTransform(crtm05, wgs84)
    private val wgs84ToUtm16n: CoordinateTransform = ctFactory.createTransform(wgs84, utm16n)
    
    /**
     * Convierte WKT (Well-Known Text) a Geometría JTS
     * @param wkt String en formato WKT (ej: "POLYGON((...))")
     * @return Geometry de JTS o null si hay error
     */
    fun wktToGeometry(wkt: String): JtsGeometry? {
        return try {
            wktReader.read(wkt)
        } catch (e: Exception) {
            android.util.Log.e("GeometryUtil", "Error parseando WKT: ${e.message}")
            null
        }
    }
    
    /**
     * Proyecta coordenadas de WGS84 (Lat/Lng) a CRTM05 (Este/Norte en metros)
     * @param lat Latitud en grados (WGS84)
     * @param lng Longitud en grados (WGS84)
     * @return Par (Este, Norte) en metros CRTM05
     */
    fun projectToCRTM05(lat: Double, lng: Double): Pair<Double, Double> {
        val source = ProjCoordinate(lng, lat) // Nota: Proj4J usa (X, Y) = (Lng, Lat)
        val target = ProjCoordinate()
        wgs84ToCrtm05.transform(source, target)
        return Pair(target.x, target.y) // (Este, Norte)
    }
    
    /**
     * Proyecta coordenadas de CRTM05 (Este/Norte) a WGS84 (Lat/Lng)
     * @param east Este en metros (CRTM05)
     * @param north Norte en metros (CRTM05)
     * @return Par (Latitud, Longitud) en grados WGS84
     */
    fun projectToWGS84(east: Double, north: Double): Pair<Double, Double> {
        val source = ProjCoordinate(east, north)
        val target = ProjCoordinate()
        crtm05ToWgs84.transform(source, target)
        return Pair(target.y, target.x) // (Lat, Lng)
    }
    
    /**
     * Crea un punto JTS desde coordenadas WGS84 (Lat/Lng)
     * Nota: Internamente JTS usa (X, Y) donde X=Lng, Y=Lat
     * @param lat Latitud
     * @param lng Longitud
     * @return Point de JTS
     */
    fun createPoint(lat: Double, lng: Double): Point {
        return geometryFactory.createPoint(Coordinate(lng, lat))
    }
    
    /**
     * Verifica si un punto está dentro de un polígono (Versión optimizada con objeto JTS)
     */
    fun isPointInPolygon(lat: Double, lon: Double, polygon: JtsGeometry): Boolean {
        return try {
            val point = geometryFactory.createPoint(Coordinate(lon, lat))
            polygon.contains(point)
        } catch (e: Exception) {
            android.util.Log.e("GeometryUtil", "Error en isPointInPolygon (JTS Geometry): ${e.message}")
            false
        }
    }

    /**
     * Verifica si un punto está dentro de un polígono dado por su WKT
     * @param lat Latitud del punto
     * @param lon Longitud del punto
     * @param wktPolygon Cadena WKT del polígono
     * @return true si el punto está dentro, false si no o hay error
     */
    fun isPointInPolygon(lat: Double, lon: Double, wktPolygon: String): Boolean {
        val geom = wktToGeometry(wktPolygon) ?: return false
        return isPointInPolygon(lat, lon, geom)
    }
    
    /**
     * Verifica si un polígono está en sentido horario o antihorario
     * Reemplazo de: SphericalUtil.computeSignedArea() < 0
     * 
     * @param polygonWkt WKT del polígono
     * @return true si está en sentido antihorario (CCW = Counter-ClockWise)
     */
    fun isPolygonCounterClockwise(polygonWkt: String): Boolean {
        val geom = wktToGeometry(polygonWkt) ?: return false
        
        return try {
            if (geom is Polygon) {
                val coords = geom.exteriorRing.coordinates
                Orientation.isCCW(coords)
            } else {
                false
            }
        } catch (e: Exception) {
            android.util.Log.e("GeometryUtil", "Error en isPolygonCounterClockwise: ${e.message}")
            false
        }
    }
    
    /**
     * Extrae las coordenadas del anillo exterior de un polígono como lista de pares (Lat, Lng)
     * Útil para convertir a formato compatible con Google Maps si es necesario
     * 
     * @param polygonWkt WKT del polígono
     * @return Lista de pares (Latitud, Longitud)
     */
    fun getPolygonCoordinates(polygonWkt: String): List<Pair<Double, Double>> {
        val geom = wktToGeometry(polygonWkt) ?: return emptyList()
        
        return try {
            if (geom is Polygon) {
                geom.exteriorRing.coordinates.map { coord ->
                    Pair(coord.y, coord.x) // (Lat, Lng)
                }
            } else {
                emptyList()
            }
        } catch (e: Exception) {
            android.util.Log.e("GeometryUtil", "Error en getPolygonCoordinates: ${e.message}")
            emptyList()
        }
    }
    
    /**
     * Invierte el orden de las coordenadas de un polígono (horario ↔ antihorario)
     * @param polygonWkt WKT original
     * @return WKT con coordenadas invertidas
     */
    fun reversePolygon(polygonWkt: String): String? {
        val geom = wktToGeometry(polygonWkt) ?: return null
        
        return try {
            if (geom is Polygon) {
                val coords = geom.exteriorRing.coordinates.reversedArray()
                val reversedRing = geometryFactory.createLinearRing(coords)
                val reversedPolygon = geometryFactory.createPolygon(reversedRing)
                reversedPolygon.toText()
            } else {
                null
            }
        } catch (e: Exception) {
            android.util.Log.e("GeometryUtil", "Error en reversePolygon: ${e.message}")
            null
        }
    }
    
    /**
     * Obtiene el bounding box de una geometría WKT
     * @param wkt WKT de la geometría
     * @return Array [minX, minY, maxX, maxY] (en grados WGS84) o null si hay error
     */
    fun getBoundingBox(wkt: String): DoubleArray? {
        val geom = wktToGeometry(wkt) ?: return null
        
        return try {
            val envelope = geom.envelopeInternal
            doubleArrayOf(envelope.minX, envelope.minY, envelope.maxX, envelope.maxY)
        } catch (e: Exception) {
            android.util.Log.e("GeometryUtil", "Error en getBoundingBox: ${e.message}")
            null
        }
    }
    
    /**
     * Calcula la distancia mínima entre dos geometrías en METROS
     * Proyecta a CRTM05 para obtener distancia precisa en metros
     * 
     * @param wkt1 WKT de la primera geometría
     * @param wkt2 WKT de la segunda geometría
     * @return Distancia en metros, o -1 si hay error
     */
    fun distanceBetweenGeometries(wkt1: String, wkt2: String): Double {
        val geom1 = wktToGeometry(wkt1) ?: return -1.0
        val geom2 = wktToGeometry(wkt2) ?: return -1.0
        
        return try {
            // Proyectar ambas geometrías a CRTM05 para obtener distancia en metros
            val geom1Projected = projectGeometryToCRTM05(geom1)
            val geom2Projected = projectGeometryToCRTM05(geom2)
            
            if (geom1Projected == null || geom2Projected == null) {
                // Fallback: calcular distancia en grados y convertir aproximadamente
                val distanceInDegrees = geom1.distance(geom2)
                distanceInDegrees * 111000 // 1 grado ≈ 111km
            } else {
                geom1Projected.distance(geom2Projected)
            }
        } catch (e: Exception) {
            android.util.Log.e("GeometryUtil", "Error en distanceBetweenGeometries: ${e.message}")
            -1.0
        }
    }
    
    /**
     * Verifica si dos geometrías se intersectan (espacialmente)
     * @param wkt1 WKT de la primera geometría
     * @param wkt2 WKT de la segunda geometría
     * @return true si se intersectan, false si no o error
     */
    fun intersects(wkt1: String, wkt2: String): Boolean {
        val geom1 = wktToGeometry(wkt1) ?: return false
        val geom2 = wktToGeometry(wkt2) ?: return false
        
        return try {
            geom1.intersects(geom2)
        } catch (e: Exception) {
            android.util.Log.e("GeometryUtil", "Error en intersects: ${e.message}")
            false
        }
    }
    
    /**
     * Verifica si dos geometrías se intersectan, aplicando un buffer (en metros) a la segunda geometría.
     * Útil para simular el ancho de una calle/ruta.
     * 
     * @param wkt1 WKT de la primera geometría (ej. línea de visión)
     * @param wkt2 WKT de la segunda geometría (ej. ruta bloqueadora)
     * @param bufferMeters Ancho del buffer en metros para la segunda geometría
     * @return true si intersectan
     */
    fun intersectsWithBuffer(wkt1: String, wkt2: String, bufferMeters: Double): Boolean {
        val geom1 = wktToGeometry(wkt1) ?: return false
        val geom2 = wktToGeometry(wkt2) ?: return false
        
        return try {
            // Proyectar a metros (CRTM05) para aplicar buffer real
            val g1Proj = projectGeometryToCRTM05(geom1) ?: return false
            val g2Proj = projectGeometryToCRTM05(geom2) ?: return false
            
            // Aplicar buffer a la segunda geometría
            val g2Buffered = g2Proj.buffer(bufferMeters)
            
            // Verificar intersección
            g1Proj.intersects(g2Buffered)
        } catch (e: Exception) {
            android.util.Log.e("GeometryUtil", "Error en intersectsWithBuffer: ${e.message}")
            false
        }
    }

    /**
     * Proyecta una geometría de WGS84 a CRTM05
     * @param geom Geometría en WGS84
     * @return Geometría en CRTM05 (metros) o null si hay error
     */
    fun projectGeometryToCRTM05(geom: JtsGeometry): JtsGeometry? {
        return projectGeometryGeneric(geom, wgs84ToCrtm05)
    }

    /**
     * Proyecta una geometría de WGS84 a UTM 16N (EPSG:32616)
     * @param geom Geometría en WGS84
     * @return Geometría en UTM 16N (metros) o null si hay error
     */
    fun projectGeometryTo32616(geom: JtsGeometry): JtsGeometry? {
        return projectGeometryGeneric(geom, wgs84ToUtm16n)
    }

    /**
     * Implementación genérica de proyección de geometría
     */
    private fun projectGeometryGeneric(geom: JtsGeometry, transform: CoordinateTransform): JtsGeometry? {
        return try {
            // Transformar cada coordenada
            val coords = geom.coordinates.map { coord ->
                val source = ProjCoordinate(coord.x, coord.y) // (Lng, Lat)
                val target = ProjCoordinate()
                transform.transform(source, target)
                Coordinate(target.x, target.y) // (East, North)
            }.toTypedArray()
            
            // Crear nueva geometría según el tipo
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
                    android.util.Log.w("GeometryUtil", "Tipo de geometría no soportado para proyección: ${geom.geometryType}")
                    null
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("GeometryUtil", "Error proyectando geometría: ${e.message}")
            null
        }
    }

    /**
     * Calcula el área de una geometría WKT proyectándola a UTM 16N
     * @param wkt Geometría en formato WKT (WGS84)
     * @return Área en metros cuadrados
     */
    fun calculateArea32616(wkt: String): Double {
        return try {
            val geom = wktToGeometry(wkt) ?: return 0.0
            val projected = projectGeometryTo32616(geom)
            projected?.area ?: 0.0
        } catch (e: Exception) {
            android.util.Log.e("GeometryUtil", "Error calculando área: ${e.message}")
            0.0
        }
    }
    
    /**
     * Calcula la dirección cardinal aproximada desde geom1 hacia geom2
     * @param wkt1 WKT de la geometría origen (predio)
     * @param wkt2 WKT de la geometría destino (ruta)
     * @return Dirección cardinal (N, NE, E, SE, S, SO, O, NO) o "" si error
     */
    /**
     * Calcula la dirección cardinal aproximada desde geom1 hacia geom2 (Versión con objetos JTS)
     */
    fun getCardinalDirectionFromGeom(geom1: JtsGeometry, geom2: JtsGeometry): String {
        return try {
            // Calcular los puntos más cercanos entre ambas geometrías
            val nearestPoints = org.locationtech.jts.operation.distance.DistanceOp.nearestPoints(geom1, geom2)
            val p1 = nearestPoints[0] 
            val p2 = nearestPoints[1] 
            
            val dist = p1.distance(p2)
            val originX: Double
            val originY: Double
            
            if (dist < 0.000001) { 
                val centroid = geom1.centroid
                originX = centroid.x
                originY = centroid.y
            } else {
                originX = p1.x
                originY = p1.y
            }
            
            val angle = Math.toDegrees(Math.atan2(p2.y - originY, p2.x - originX))
            val bearing = (450 - angle) % 360
            
            bearingToCardinal(bearing)
        } catch (e: Exception) {
            android.util.Log.e("GeometryUtil", "Error calculando dirección: ${e.message}")
            ""
        }
    }

    /**
     * Calcula la dirección cardinal aproximada desde geom1 hacia geom2
     * @param wkt1 WKT de la geometría origen (predio)
     * @param wkt2 WKT de la geometría destino (ruta)
     * @return Dirección cardinal (N, NE, E, SE, S, SO, O, NO) o "" si error
     */
    fun getCardinalDirection(wkt1: String, wkt2: String): String {
        val geom1 = wktToGeometry(wkt1) ?: return ""
        val geom2 = wktToGeometry(wkt2) ?: return ""
        return getCardinalDirectionFromGeom(geom1, geom2)
    }
    
    private fun bearingToCardinal(degree: Double): String {
        // Redondear y normalizar
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
     * Versión optimizada con objetos JTS pre-parseados.
     */
    /**
     * Calcula la dirección relativa de un polígono B con respecto a un polígono A
     * Versión optimizada con objetos JTS pre-parseados.
     */
    fun getRelativeDirectionFromJts(geomA: JtsGeometry, geomB: JtsGeometry): String {
        return try {
            // Verificar que ambas geometrías sean polígonos
            if (geomA !is Polygon || geomB !is Polygon) {
                // Si es GeometryCollection o MultiPolygon, habría que manejarlo, pero por ahora solo Polygon
                // Permitir MultiPolygon tomando el primer polígono o convex hull
                 if (geomA is org.locationtech.jts.geom.MultiPolygon || geomB is org.locationtech.jts.geom.MultiPolygon) {
                     // Fallback aceptable
                 } else {
                    android.util.Log.d("GeometryUtil", "getRelativeDirectionBetweenPolygons: Geometrías no son Polygon simples: ${geomA.geometryType} vs ${geomB.geometryType}")
                    // return "" -> No retornamos vacío, intentamos seguir si JTS lo permite
                 }
            }
            
            // Calcular centroides
            val centroidA = geomA.centroid
            val centroidB = geomB.centroid
            val arbitroX = centroidB.x - centroidA.x
            val arbitroY = centroidB.y - centroidA.y
            
            // Paso 1: Obtener el borde compartido (intersección)
            val intersection = geomA.intersection(geomB)
            
            // Verificar que haya intersección
            if (intersection.isEmpty) {
                // No hay intersección física, usar vector entre centroides
                // Esto es útil si los predios están *muy* cerca pero no se tocan por error de precisión
                val dist = geomA.distance(geomB)
                if (dist < 0.00001) { // Muy cerca
                     // Usar lógica de centroides
                } else {
                     return ""
                }
            }
            
            // Lógica principal de dirección normal (copiada de la versión String)
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
            
            val angleRadians = Math.atan2(normalY, normalX)
            val angleDegrees = Math.toDegrees(angleRadians)
            angleToCardinal8(angleDegrees)
            
        } catch (e: Exception) {
            android.util.Log.e("GeometryUtil", "Error (Geom) calculando dirección relativa: ${e.message}")
            ""
        }
    }

    /**
     * Calcula la dirección relativa de un polígono B con respecto a un polígono A
     * usando el vector normal del borde compartido entre ambos.
     * 
     * Algoritmo:
     * 1. Obtiene la intersección (borde compartido) entre los dos polígonos
     * 2. Simplifica el borde a una línea recta entre punto inicial y final
     * 3. Calcula la normal (perpendicular) a esa línea
     * 4. Usa el vector centroide A → centroide B como árbitro para determinar
     *    cuál de las dos direcciones normales apunta hacia B
     * 5. Convierte el ángulo de la normal a dirección cardinal (N, NE, E, SE, S, SO, O, NO)
     * 
     * @param wktA WKT del polígono A (origen)
     * @param wktB WKT del polígono B (destino)
     * @return Dirección cardinal (N, NE, E, SE, S, SO, O, NO) o "" si no hay borde compartido o error
     */
    fun getRelativeDirectionBetweenPolygons(wktA: String, wktB: String): String {
        val geomA = wktToGeometry(wktA) ?: return ""
        val geomB = wktToGeometry(wktB) ?: return ""
        return getRelativeDirectionFromJts(geomA, geomB)
    }
    
    /**
     * Convierte un ángulo en grados a dirección cardinal de 8 puntos
     * Usa el sistema matemático estándar: 0° = Este, 90° = Norte, 180° = Oeste, -90° = Sur
     * 
     * @param degrees Ángulo en grados (puede ser negativo)
     * @return Dirección cardinal: E, NE, N, NO, O, SO, S, SE
     */
    private fun angleToCardinal8(degrees: Double): String {
        // Normalizar a rango -180 a 180
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
     * Obtiene los puntos más cercanos entre dos geometrías
     * @param wkt1 WKT de la primera geometría
     * @param wkt2 WKT de la segunda geometría
     * @return Par de coordenadas (punto en geom1, punto en geom2) o null si error
     */
    fun getNearestPoints(wkt1: String, wkt2: String): Pair<Coordinate, Coordinate>? {
        return try {
            val geom1 = wktToGeometry(wkt1) ?: return null
            val geom2 = wktToGeometry(wkt2) ?: return null
            
            // DistanceOp calcula los puntos más cercanos entre dos geometrías
            val distanceOp = org.locationtech.jts.operation.distance.DistanceOp(geom1, geom2)
            val nearestPoints = distanceOp.nearestPoints()
            
            if (nearestPoints != null && nearestPoints.size >= 2) {
                Pair(nearestPoints[0], nearestPoints[1])
            } else {
                null
            }
        } catch (e: Exception) {
            android.util.Log.e("GeometryUtil", "Error obteniendo puntos más cercanos: ${e.message}")
            null
        }
    }
    
    /**
     * Crea una línea (LineString) entre dos coordenadas
     * @param coord1 Primera coordenada
     * @param coord2 Segunda coordenada
     * @return WKT de la línea creada
     */
    fun createLineString(coord1: Coordinate, coord2: Coordinate): String {
        val coords = arrayOf(coord1, coord2)
        val lineString = geometryFactory.createLineString(coords)
        return lineString.toText()
    }
    
    /**
     * Calcula el bearing (ángulo) de un segmento de línea en grados
     * @param wktLine WKT de la línea (LINESTRING)
     * @return Ángulo en grados [0, 360) o null si error
     */
    fun calculateSegmentBearing(wktLine: String): Double? {
        return try {
            val geom = wktToGeometry(wktLine) ?: return null
            
            if (geom is org.locationtech.jts.geom.LineString && geom.numPoints >= 2) {
                val p1 = geom.getCoordinateN(0)
                val p2 = geom.getCoordinateN(geom.numPoints - 1)
                
                val dx = p2.x - p1.x
                val dy = p2.y - p1.y
                
                var angle = Math.toDegrees(Math.atan2(dy, dx))
                
                // Normalizar a [0, 360)
                if (angle < 0) angle += 360.0
                
                angle
            } else {
                null
            }
        } catch (e: Exception) {
            android.util.Log.e("GeometryUtil", "Error calculando bearing: ${e.message}")
            null
        }
    }
    
    /**
     * Verifica si una línea está obstruida por un polígono
     * @param lineWkt WKT de la línea a verificar
     * @param obstructorWkt WKT del polígono obstructor
     * @return true si hay obstrucción (la línea intersecta el polígono)
     */
    fun isLineObstructedByPolygon(lineWkt: String, obstructorWkt: String): Boolean {
        return try {
            val line = wktToGeometry(lineWkt) ?: return false
            val obstructor = wktToGeometry(obstructorWkt) ?: return false
            
            // Verificar si la línea intersecta el interior del polígono obstructor
            line.intersects(obstructor)
        } catch (e: Exception) {
            android.util.Log.e("GeometryUtil", "Error verificando obstrucción: ${e.message}")
            false
        }
    }
    
    /**
     * Extrae las coordenadas de una línea (LINESTRING o MULTILINESTRING) como lista de LatLng
     * Útil para dibujar rutas en Google Maps
     * 
     * @param lineWkt WKT de la línea
     * @return Lista de LatLng (Latitud, Longitud)
     */
    /**
     * Extrae las coordenadas de una línea (LINESTRING o MULTILINESTRING)
     * Retorna una lista de listas de LatLng, para manejar MultiLineString como geometrías separadas
     * 
     * @param lineWkt WKT de la línea
     * @return Lista de Listas de LatLng (Latitud, Longitud)
     */
    fun getPolylineCoordinates(lineWkt: String): List<List<com.google.android.gms.maps.model.LatLng>> {
        return try {
            val geom = wktToGeometry(lineWkt) ?: return emptyList()
            
            val result = mutableListOf<List<com.google.android.gms.maps.model.LatLng>>()
            
            when (geom) {
                is org.locationtech.jts.geom.LineString -> {
                    // LINESTRING simple - una sola lista
                    val coords = mutableListOf<com.google.android.gms.maps.model.LatLng>()
                    for (i in 0 until geom.numPoints) {
                        val coord = geom.getCoordinateN(i)
                        coords.add(com.google.android.gms.maps.model.LatLng(coord.y, coord.x))
                    }
                    if (coords.isNotEmpty()) {
                        result.add(coords)
                    }
                }
                is org.locationtech.jts.geom.MultiLineString -> {
                    // MULTILINESTRING - cada geometría es una lista separada
                    for (i in 0 until geom.numGeometries) {
                        val lineString = geom.getGeometryN(i) as org.locationtech.jts.geom.LineString
                        val coords = mutableListOf<com.google.android.gms.maps.model.LatLng>()
                        for (j in 0 until lineString.numPoints) {
                            val coord = lineString.getCoordinateN(j)
                            coords.add(com.google.android.gms.maps.model.LatLng(coord.y, coord.x))
                        }
                        if (coords.isNotEmpty()) {
                            result.add(coords)
                        }
                    }
                }
                else -> {
                    android.util.Log.w("GeometryUtil", "getPolylineCoordinates: Geometría no es LINESTRING ni MULTILINESTRING")
                }
            }
            
            result
        } catch (e: Exception) {
            android.util.Log.e("GeometryUtil", "Error extrayendo coordenadas de polyline: ${e.message}")
            emptyList()
        }
    }
}
