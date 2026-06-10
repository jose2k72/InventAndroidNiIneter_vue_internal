package com.cadicsa.inventario.utils

import android.content.ContentValues
import android.database.sqlite.SQLiteDatabase
import android.util.Log
import com.cadicsa.inventario.AppConfig
import com.cadicsa.inventario.DatabaseHelper
import org.json.JSONObject
import java.io.File

/**
 * Gestiona el proceso de exportación hacia una BD SQLite externa en un directorio seleccionado.
 *
 * Responsabilidades:
 *  - Valida que el directorio de destino no coincida con el almacenamiento activo.
 *  - Copia la base de datos original Map.db al destino, manteniendo la estructura, objetos y tiles.
 *  - Limpia la tabla DATOS del clon para que inicie vacía.
 *  - Copia selectivamente los registros de DATOS y las fotos asociadas de los predios seleccionados.
 *  - Limpia archivos copiados si la transacción o el copiado fallan.
 */
class ExportManager(
    private val localDbHelper: DatabaseHelper,
    private val targetDirPath: String
) {

    class ExportTransactionException(
        override val message: String,
        override val cause: Throwable? = null
    ) : Exception(message, cause)

    private val targetDir = File(targetDirPath)
    private val appStorageDir = AppConfig.getStorageDirectory()
    private val localDbFile = File(AppConfig.getDatabasePath())

    init {
        if (!targetDir.exists()) {
            throw IllegalArgumentException("El directorio de destino no existe:\n$targetDirPath")
        }
        if (!targetDir.isDirectory) {
            throw IllegalArgumentException("La ruta de destino no es un directorio válido:\n$targetDirPath")
        }
        if (targetDir.canonicalPath == appStorageDir.canonicalPath) {
            throw IllegalArgumentException(
                "El directorio de destino no puede ser el mismo que el directorio de datos de la aplicación.\n\n" +
                "Ruta conflictiva: ${appStorageDir.canonicalPath}\n\n" +
                "Seleccione un directorio diferente."
            )
        }
    }

    /**
     * Devuelve un mapa de localización -> cantidad de registros con encuestas guardadas en la base de datos local.
     */
    fun getExportableLocalizaciones(): Map<String, Int> {
        val map = mutableMapOf<String, Int>()
        val query = """
            SELECT o.LOCALIZACION, COUNT(d.ID)
            FROM DATOS d
            JOIN objects o ON d.IDOBJECT = o.id
            WHERE o.LOCALIZACION IS NOT NULL AND o.LOCALIZACION != ''
            GROUP BY o.LOCALIZACION
            ORDER BY o.LOCALIZACION
        """
        localDbHelper.readableDatabase.rawQuery(query, null).use { cursor ->
            while (cursor.moveToNext()) {
                map[cursor.getString(0)] = cursor.getInt(1)
            }
        }
        return map
    }

    data class ExportResult(
        val exportedRecords: Int,
        val exportedPhotos: Int
    )

    /**
     * Ejecuta el proceso completo de exportación de base de datos e imágenes asociadas.
     *
     * @param selectedLocalizaciones Lista de códigos de localización de predios seleccionados para exportar.
     * @param onProgress Callback (current, total, message) para actualizar la UI del progreso.
     */
    fun executeExport(
        selectedLocalizaciones: List<String>,
        onProgress: (current: Int, total: Int, message: String) -> Unit
    ): ExportResult {
        if (selectedLocalizaciones.isEmpty()) {
            throw IllegalArgumentException("Debe seleccionar al menos una localización para exportar.")
        }

        val targetDbFile = File(targetDir, AppConfig.DATABASE_NAME)
        
        // 1. Copiar base de datos completa de origen al destino
        onProgress(0, selectedLocalizaciones.size, "Clonando base de datos a destino...")
        try {
            localDbFile.copyTo(targetDbFile, overwrite = true)
        } catch (e: Exception) {
            throw ExportTransactionException("No se pudo copiar el archivo de base de datos al destino: ${e.message}", e)
        }

        // 2. Abrir la BD del destino y limpiar la tabla DATOS
        val targetDb = try {
            SQLiteDatabase.openDatabase(targetDbFile.absolutePath, null, SQLiteDatabase.OPEN_READWRITE)
        } catch (e: Exception) {
            targetDbFile.delete()
            throw ExportTransactionException("No se pudo abrir la base de datos exportada: ${e.message}", e)
        }

        try {
            targetDb.execSQL("DELETE FROM DATOS")
            targetDb.execSQL("DELETE FROM sqlite_sequence WHERE name='DATOS'")
        } catch (e: Exception) {
            targetDb.close()
            targetDbFile.delete()
            throw ExportTransactionException("Fallo al inicializar la tabla DATOS en el destino: ${e.message}", e)
        }

        var exportedRecords = 0
        var exportedPhotos = 0
        val copiedPhotoFiles = mutableListOf<File>()

        try {
            val total = selectedLocalizaciones.size
            for ((index, loc) in selectedLocalizaciones.withIndex()) {
                onProgress(
                    index + 1, total,
                    "Exportando predio $loc (${index + 1}/$total)..."
                )

                // 3. Buscar los registros en la base de datos local asociados a esta localización
                val query = """
                    SELECT d.IDOBJECT, d.IDLAYER, d.IDPREDIO, d.LAYER, d.DATOS, d.FECHA, 
                           d.IMEI, d.ANDROID_ID, d.LATITUD, d.LONGITUD, d.LATITUDGPS, d.LONGITUDGPS,
                           d.CREADO_POR, d.FECHA_UPDATE, d.ACTUALIZADO_POR, d.SINCRONIZADO
                    FROM DATOS d
                    JOIN objects o ON d.IDOBJECT = o.id
                    WHERE o.LOCALIZACION = ?
                """
                val cursor = localDbHelper.readableDatabase.rawQuery(query, arrayOf(loc))

                targetDb.beginTransaction()
                try {
                    while (cursor.moveToNext()) {
                        val datosJson = cursor.getString(4)
                        
                        // Insertar el registro en la base de datos destino
                        val cv = ContentValues().apply {
                            put("IDOBJECT",        cursor.getInt(0))
                            put("IDLAYER",         cursor.getInt(1))
                            put("IDPREDIO",        cursor.getInt(2))
                            put("LAYER",           cursor.getString(3))
                            put("DATOS",           datosJson)
                            put("FECHA",           cursor.getString(5))
                            put("IMEI",            cursor.getString(6) ?: "")
                            put("ANDROID_ID",      cursor.getString(7) ?: "")
                            put("LATITUD",         cursor.getDouble(8))
                            put("LONGITUD",        cursor.getDouble(9))
                            put("LATITUDGPS",      cursor.getDouble(10))
                            put("LONGITUDGPS",     cursor.getDouble(11))
                            put("CREADO_POR",      cursor.getString(12) ?: "")
                            put("FECHA_UPDATE",    cursor.getString(13))
                            put("ACTUALIZADO_POR", cursor.getString(14) ?: "")
                            put("SINCRONIZADO",    cursor.getInt(15))
                        }

                        val newRowId = targetDb.insert("DATOS", null, cv)
                        if (newRowId == -1L) {
                            throw ExportTransactionException("Fallo al insertar registro para localización $loc en el destino.")
                        }

                        // 4. Copiar fotos asociadas
                        val photos = photoNamesFromJson(datosJson)
                        for (photoName in photos) {
                            val srcFile = File(appStorageDir, photoName)
                            val dstFile = File(targetDir, photoName)
                            if (srcFile.exists() && !dstFile.exists()) {
                                try {
                                    srcFile.copyTo(dstFile, overwrite = false)
                                    copiedPhotoFiles.add(dstFile)
                                    exportedPhotos++
                                } catch (e: Exception) {
                                    Log.w(TAG, "No se pudo copiar foto de exportación '$photoName': ${e.message}")
                                }
                            }
                        }
                        exportedRecords++
                    }
                    targetDb.setTransactionSuccessful()
                } finally {
                    targetDb.endTransaction()
                    cursor.close()
                }
            }
        } catch (e: Exception) {
            // Rollback físico: eliminar fotos copiadas y la base de datos generada
            for (file in copiedPhotoFiles) {
                if (file.exists()) file.delete()
            }
            targetDb.close()
            if (targetDbFile.exists()) targetDbFile.delete()
            throw ExportTransactionException("Exportación fallida: ${e.message}", e)
        } finally {
            if (targetDb.isOpen) {
                targetDb.close()
            }
        }

        return ExportResult(exportedRecords, exportedPhotos)
    }

    /**
     * Extrae los nombres de fotos de una cadena JSON de DATOS (FotoFrente e Imagenes).
     */
    private fun photoNamesFromJson(jsonStr: String): List<String> {
        return try {
            val json   = JSONObject(jsonStr)
            val result = mutableListOf<String>()
            json.optString("FotoFrente", "").takeIf { it.isNotBlank() }?.let { result.add(it) }
            json.optString("Imagenes", "").split(",")
                .map { it.trim() }.filter { it.isNotBlank() }
                .forEach { result.add(it) }
            result
        } catch (_: Exception) {
            emptyList()
        }
    }

    companion object {
        private const val TAG = "ExportManager"
    }
}
