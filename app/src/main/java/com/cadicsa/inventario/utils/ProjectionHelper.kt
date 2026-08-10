package com.cadicsa.inventario.utils

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

    private const val TAG = "ProjectionHelper"
    private const val DEFAULT_LOCAL_PROJ_EPSG = "32616"
    private const val CATALOGO_ASSET_PATH = "web/data/sistema/ProyeccionesLocales.json"

    private val crsFactory = CRSFactory()
    private val ctFactory = CoordinateTransformFactory()

    // WGS84 (EPSG:4326) - Lat/Lng en grados
    private val wgs84 = crsFactory.createFromParameters("WGS84",
        "+proj=longlat +datum=WGS84 +no_defs")

    // CRTM05 (EPSG:5367) - Costa Rica Transverse Mercator 2005. Es un destino fijo y explícito
    // (no forma parte de la selección de "proyección local"), se mantiene aparte.
    private val crtm05 = crsFactory.createFromParameters("CRTM05",
        "+proj=tmerc +lat_0=0 +lon_0=-84 +k=0.9999 +x_0=500000 +y_0=0 +ellps=WGS84 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs")
    private val wgs84ToCrtm05: CoordinateTransform = ctFactory.createTransform(wgs84, crtm05)
    private val crtm05ToWgs84: CoordinateTransform = ctFactory.createTransform(crtm05, wgs84)

    // Proyección local activa (única fuente de verdad compartida con app.js): se resuelve una
    // sola vez en configure(), a partir de config.LocalProjEpsg + el catálogo
    // assets/web/data/ProyeccionesLocales.json — el mismo archivo que lee el lado JS vía
    // AndroidBridge.loadCatalogJson. Arranca en UTM 16N (32616) como respaldo hasta que
    // configure() se ejecute (o si config/catálogo no están disponibles).
    @Volatile
    private var localProjEpsg: String = DEFAULT_LOCAL_PROJ_EPSG
    @Volatile
    private var wgs84ToLocalProj: CoordinateTransform = ctFactory.createTransform(
        wgs84,
        crsFactory.createFromParameters("UTM16N", "+proj=utm +zone=16 +datum=WGS84 +units=m +no_defs")
    )

    /**
     * Configura la proyección local activa a partir del catálogo compartido con JS
     * (ProyeccionesLocales.json) y el EPSG guardado en config.LocalProjEpsg. Debe llamarse una
     * vez al iniciar la app (ver DatabaseHelper.getInstance). Si el EPSG no está en el catálogo,
     * o falla la carga, se conserva UTM 16N (32616) como respaldo.
     */
    fun configure(context: android.content.Context, epsg: String) {
        try {
            val json = context.assets.open(CATALOGO_ASSET_PATH)
                .bufferedReader(Charsets.UTF_8).use { it.readText() }
            val arr = org.json.JSONArray(json)
            for (i in 0 until arr.length()) {
                val item = arr.getJSONObject(i)
                if (item.getInt("epsg").toString() == epsg) {
                    val proj4Str = item.getString("proj4")
                    val crsLocal = crsFactory.createFromParameters("LOCALPROJ_$epsg", proj4Str)
                    wgs84ToLocalProj = ctFactory.createTransform(wgs84, crsLocal)
                    localProjEpsg = epsg
                    android.util.Log.i(TAG, "Proyección local configurada: EPSG:$epsg")
                    return
                }
            }
            android.util.Log.w(TAG, "EPSG:$epsg no está en $CATALOGO_ASSET_PATH — se mantiene UTM 16N (32616) por defecto")
        } catch (e: Exception) {
            android.util.Log.e(TAG, "Error configurando proyección local, se mantiene UTM 16N (32616): ${e.message}")
        }
    }

    /** EPSG de la proyección local actualmente activa (ver configure()). */
    fun getLocalProjEpsg(): String = localProjEpsg

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
     * Proyecta una geometría de WGS84 a la proyección local activa (ver configure()/getLocalProjEpsg()).
     */
    fun projectGeometryToLocalProj(geom: JtsGeometry): JtsGeometry? {
        return projectGeometryGeneric(geom, wgs84ToLocalProj)
    }

    /**
     * Implementación genérica de proyección de geometría. Usa CoordinateSequenceFilter en vez de
     * aplanar geom.coordinates: JTS recorre él solo cada anillo/parte de la geometría (incluyendo
     * anillos interiores/huecos de un Polygon) y transforma cada coordenada in-place, preservando
     * la estructura original — equivalente en espíritu a OGRGeometry::Transform() de GDAL.
     */
    private fun projectGeometryGeneric(geom: JtsGeometry, transform: CoordinateTransform): JtsGeometry? {
        return try {
            val copia = geom.copy()
            copia.apply(object : org.locationtech.jts.geom.CoordinateSequenceFilter {
                override fun filter(seq: org.locationtech.jts.geom.CoordinateSequence, i: Int) {
                    val source = ProjCoordinate(seq.getX(i), seq.getY(i))
                    val target = ProjCoordinate()
                    transform.transform(source, target)
                    seq.setOrdinate(i, 0, target.x)
                    seq.setOrdinate(i, 1, target.y)
                }
                override fun isDone(): Boolean = false
                override fun isGeometryChanged(): Boolean = true
            })
            copia
        } catch (e: Exception) {
            android.util.Log.e(TAG, "Error proyectando: ${e.message}")
            null
        }
    }
}
