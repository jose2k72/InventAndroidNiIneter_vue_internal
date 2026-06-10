package com.cadicsa.inventario.utils

import android.util.Log
import com.cadicsa.inventario.AppConfig
import com.cadicsa.inventario.DatabaseHelper
import java.io.File
import org.json.JSONObject

/**
 * Gestiona la limpieza completa de datos de encuesta (tabla DATOS) y sus fotos asociadas.
 *
 * Responsabilidades:
 *  - Eliminar físicamente las fotos referenciadas en los campos FotoFrente e Imagenes
 *    de cada registro JSON antes de borrar los registros de la BD.
 *  - Ejecutar la eliminación de todos los registros de DATOS y resetear el autoincrement.
 *  - Reportar el número de fotos que no pudieron eliminarse para que el caller informe al usuario.
 */
class DataCleaner(private val localDbHelper: DatabaseHelper) {

    /**
     * Resultado de una operación de limpieza completa.
     * @param deletedRecords  Número de registros eliminados de la tabla DATOS (-1 si error en BD).
     * @param deletedPhotos   Número de archivos de foto eliminados físicamente del disco.
     * @param failedPhotos    Número de archivos de foto que existían pero NO pudieron eliminarse.
     */
    data class CleanResult(
        val deletedRecords: Int,
        val deletedPhotos:  Int,
        val failedPhotos:   Int
    )

    /**
     * Recorre todos los registros de DATOS y elimina físicamente las fotos referenciadas:
     *  - Campo [FotoFrente]: nombre de archivo único (string).
     *  - Campo [Imagenes]: lista de nombres separados por coma (CSV).
     *
     * Solo consulta los registros que realmente tienen fotos (LIKE filter).
     * Los registros con JSON malformado o sin campos de foto se ignoran silenciosamente.
     *
     * @return Pair<deletedFiles, failedFiles> — archivos eliminados y archivos que fallaron.
     */
    fun deletePhotosFromDatos(): Pair<Int, Int> {
        val storageDir = AppConfig.getStorageDirectory()
        var deletedFiles = 0
        var failedFiles  = 0

        localDbHelper.readableDatabase.rawQuery(
            "SELECT DATOS FROM DATOS WHERE DATOS LIKE '%FotoFrente%' OR DATOS LIKE '%Imagenes%'",
            null
        ).use { cursor ->
            while (cursor.moveToNext()) {
                try {
                    val json = JSONObject(cursor.getString(0))

                    // Foto de frente (nombre de archivo único)
                    json.optString("FotoFrente", "").takeIf { it.isNotBlank() }?.let { name ->
                        val file = File(storageDir, name)
                        if (file.exists()) {
                            if (file.delete()) deletedFiles++ else failedFiles++
                        }
                    }

                    // Fotos adicionales (lista separada por comas)
                    json.optString("Imagenes", "").split(",")
                        .map { it.trim() }.filter { it.isNotBlank() }.forEach { name ->
                            val file = File(storageDir, name)
                            if (file.exists()) {
                                if (file.delete()) deletedFiles++ else failedFiles++
                            }
                        }

                } catch (_: Exception) { /* JSON sin fotos o malformado — se ignora */ }
            }
        }

        Log.d(TAG, "🗑️ Fotos: $deletedFiles eliminadas, $failedFiles fallidas")
        return Pair(deletedFiles, failedFiles)
    }

    /**
     * Operación completa de limpieza:
     * 1. Elimina físicamente todas las fotos referenciadas en DATOS.
     * 2. Elimina todos los registros de la tabla DATOS y resetea el autoincrement a 1.
     *
     * Si alguna foto no pudo eliminarse, el fallo queda reflejado en [CleanResult.failedPhotos]
     * pero NO interrumpe la eliminación de los registros en BD.
     *
     * @return [CleanResult] con el conteo de registros, fotos eliminadas y fotos fallidas.
     */
    fun deleteAll(): CleanResult {
        val (deletedPhotos, failedPhotos) = deletePhotosFromDatos()
        val deletedRecords = localDbHelper.deleteAllData()
        Log.d(TAG, "✅ Limpieza completada: $deletedRecords registros, $deletedPhotos fotos OK, $failedPhotos fotos fallidas.")
        return CleanResult(deletedRecords, deletedPhotos, failedPhotos)
    }

    private companion object {
        const val TAG = "DataCleaner"
    }
}
