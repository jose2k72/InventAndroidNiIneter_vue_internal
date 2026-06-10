package com.cadicsa.inventario.utils

import android.content.ContentValues
import android.database.sqlite.SQLiteDatabase
import android.util.Log
import com.cadicsa.inventario.AppConfig
import com.cadicsa.inventario.DatabaseHelper
import com.cadicsa.inventario.Geometry
import org.json.JSONObject
import java.io.File

/**
 * Gestiona el proceso de importación desde una BD SQLite externa.
 *
 * Responsabilidades:
 *  - Fase 2: acumula el diccionario localizacion→entry mientras se valida el dominio geográfico.
 *            Al detectar un predio nuevo, consulta de inmediato los IDs locales existentes
 *            (una sola query por predio, sin operaciones geométricas adicionales).
 *  - Fase 3c: ejecuta la importación de forma transaccional, un predio por transacción.
 *             Las fotos asociadas se migran (external→local) SOLO si la transacción tiene éxito.
 *             Las fotos viejas se eliminan SOLO si el reemplazo confirma con éxito.
 *             Cualquier fallo en una transacción lanza [ImportTransactionException] y aborta todo.
 *
 * Invariante de directorios: el directorio de la BD externa NO puede coincidir con
 * [AppConfig.getStorageDirectory()]. Se valida en el constructor.
 */
class ImportManager(
    private val localDbHelper: DatabaseHelper,
    val externalDbPath: String
) {

    // ─────────────────────────────────────────────────────────────────────────
    // Excepción de transacción
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Lanzada cuando falla la transacción de un predio concreto.
     * Al propagarse, el proceso de importación se aborta completamente.
     */
    class ImportTransactionException(
        val localizacion: String,
        override val message: String,
        override val cause: Throwable? = null
    ) : Exception(message, cause)

    // ─────────────────────────────────────────────────────────────────────────
    // Directorios
    // ─────────────────────────────────────────────────────────────────────────

    /** Directorio donde reside la BD externa (y sus fotos asociadas). */
    private val externalDir: File = File(externalDbPath).parentFile
        ?: throw IllegalArgumentException(
            "No se pudo resolver el directorio de la BD externa.\nRuta: $externalDbPath"
        )

    /** Directorio de almacenamiento de la aplicación (destino de las fotos importadas). */
    private val appStorageDir: File = AppConfig.getStorageDirectory()

    init {
        if (externalDir.canonicalPath == appStorageDir.canonicalPath) {
            throw IllegalArgumentException(
                "El directorio de importación es el mismo que el directorio de datos de la aplicación.\n\n" +
                "Ruta conflictiva: ${appStorageDir.canonicalPath}\n\n" +
                "Seleccione una BD que resida en un directorio diferente."
            )
        }
        Log.d(TAG, "ImportManager listo. externalDir=${externalDir.path}")
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Modelo de datos
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Entrada del diccionario por predio (clave = localizacion).
     *
     * @param localGeom         Geometría local con IDs remapeados.
     * @param externalRowIds    IDs en la BD externa a importar.
     * @param localRowIds       IDs en la BD local a eliminar si el usuario elige reemplazar.
     * @param selectedForImport Control del checklist de conflictos (true = reemplazar, false = omitir).
     */
    data class ImportPredioEntry(
        val localGeom: Geometry,
        val externalRowIds: MutableList<Int> = mutableListOf(),
        val localRowIds:    MutableList<Int> = mutableListOf(),
        var selectedForImport: Boolean = true
    )

    /** Diccionario principal: localizacion → ImportPredioEntry */
    val dictionary: MutableMap<String, ImportPredioEntry> = mutableMapOf()

    /** Resultado devuelto por executeImport() */
    data class ImportResult(
        val importedNew:     Int,
        val newPredios:      Int,
        val replacedRecords: Int,
        val replacedPredios: Int,
        val skippedPredios:  Int
    )

    // ─────────────────────────────────────────────────────────────────────────
    // API de Fase 2
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Registra un registro externo en el diccionario.
     * Si la localizacion es nueva, inicializa la entrada Y consulta los IDs locales
     * existentes para ese predio (getOrPut: el bloque solo se ejecuta una vez por predio).
     * Debe llamarse desde el background thread de Phase 2.
     */
    fun addRecord(externalId: Int, localGeom: Geometry) {
        val entry = dictionary.getOrPut(localGeom.localizacion) {
            val newEntry = ImportPredioEntry(localGeom = localGeom)
            // Una sola query por predio nuevo: sin geometría, solo IDOBJECT
            localDbHelper.readableDatabase.rawQuery(
                "SELECT ID FROM DATOS WHERE IDOBJECT = ${localGeom.id}", null
            ).use { cursor ->
                while (cursor.moveToNext()) newEntry.localRowIds.add(cursor.getInt(0))
            }
            newEntry
        }
        entry.externalRowIds.add(externalId)
    }

    fun clear() = dictionary.clear()

    // ─────────────────────────────────────────────────────────────────────────
    // API de Fase 3
    // ─────────────────────────────────────────────────────────────────────────

    fun hasConflicts(): Boolean =
        dictionary.values.any { it.localRowIds.isNotEmpty() }

    fun conflictEntries(): List<ImportPredioEntry> =
        dictionary.values.filter { it.localRowIds.isNotEmpty() }

    fun newEntries(): List<ImportPredioEntry> =
        dictionary.values.filter { it.localRowIds.isEmpty() }

    fun totalExternalRecords(): Int =
        dictionary.values.sumOf { it.externalRowIds.size }

    // ─────────────────────────────────────────────────────────────────────────
    // Fase 3c: ejecución de importación
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Ejecuta la importación de forma transaccional (una transacción por predio).
     * Debe llamarse desde un background thread.
     *
     * Flujo por predio:
     *  1. Recoge [oldPhotos] de los registros locales ANTES del BEGIN (solo en reemplazo).
     *  2. BEGIN TRANSACTION
     *  3.   [Si reemplazo] DELETE registros locales del predio.
     *  4.   INSERT registros externos; si insert retorna -1 → [ImportTransactionException].
     *  5. setTransactionSuccessful() → endTransaction() en el finally.
     *  6. [Solo si la tx tuvo éxito] deletePhotos(oldPhotos) + migratePhotos(newPhotos).
     *
     * Si [ImportTransactionException] es lanzada, se propaga inmediatamente al caller,
     * que debe mostrar un diálogo de error prominente. Los datos importados hasta ese
     * punto NO se revierten (la tx fallida sí se revierte automáticamente).
     *
     * @param onProgress callback (current, total, message) — llamar con runOnUiThread.
     */
    fun executeImport(
        onProgress: (current: Int, total: Int, message: String) -> Unit
    ): ImportResult {

        val writableDb = localDbHelper.writableDatabase
        val externalDb = SQLiteDatabase.openDatabase(
            externalDbPath, null, SQLiteDatabase.OPEN_READONLY
        )

        var importedNew     = 0
        var newPredios      = 0
        var replacedRecords = 0
        var replacedPredios = 0
        var skippedPredios  = 0

        val entries = dictionary.values.toList()
        val total   = entries.size

        try {
            for ((index, entry) in entries.withIndex()) {
                onProgress(
                    index + 1, total,
                    "Procesando ${entry.localGeom.localizacion} (${index + 1}/$total)..."
                )

                val isConflict   = entry.localRowIds.isNotEmpty()
                val shouldImport = !isConflict || entry.selectedForImport

                if (!shouldImport) { skippedPredios++; continue }
                if (entry.externalRowIds.isEmpty()) continue

                // ── 1. Recoger nombres de fotos locales ANTES de la transacción ──────
                val oldPhotos: List<String> =
                    if (isConflict) collectLocalPhotos(entry.localRowIds) else emptyList()

                val placeholders = entry.externalRowIds.joinToString(",")
                val externalCursor = externalDb.rawQuery(
                    """SELECT DATOS, FECHA, IMEI, ANDROID_ID,
                              LATITUD, LONGITUD, LATITUDGPS, LONGITUDGPS,
                              CREADO_POR, FECHA_UPDATE, ACTUALIZADO_POR
                       FROM DATOS WHERE ID IN ($placeholders)""", null
                )

                val newPhotos   = mutableListOf<String>()
                var insertCount = 0

                // ── 2-5. Transacción ────────────────────────────────────────────────
                writableDb.beginTransaction()
                try {
                    // 3. Eliminar registros locales del predio (solo en reemplazo)
                    if (isConflict) {
                        writableDb.delete(
                            "DATOS", "IDOBJECT = ?",
                            arrayOf(entry.localGeom.id.toString())
                        )
                    }

                    // 4. Insertar registros externos con IDs remapeados al dominio local
                    while (externalCursor.moveToNext()) {
                        val datosJson = externalCursor.getString(0)
                        newPhotos.addAll(photoNamesFromJson(datosJson))

                        val cv = ContentValues().apply {
                            put("IDOBJECT",        entry.localGeom.id)
                            put("IDLAYER",         entry.localGeom.idLayer)
                            put("IDPREDIO",        entry.localGeom.idPredio)
                            put("LAYER",           entry.localGeom.layer)
                            put("DATOS",           datosJson)
                            put("FECHA",           externalCursor.getString(1))
                            put("IMEI",            externalCursor.getString(2) ?: "")
                            put("ANDROID_ID",      externalCursor.getString(3) ?: "")
                            put("LATITUD",         externalCursor.getDouble(4))
                            put("LONGITUD",        externalCursor.getDouble(5))
                            put("LATITUDGPS",      externalCursor.getDouble(6))
                            put("LONGITUDGPS",     externalCursor.getDouble(7))
                            put("CREADO_POR",      externalCursor.getString(8) ?: "")
                            put("FECHA_UPDATE",    externalCursor.getString(9))
                            put("ACTUALIZADO_POR", externalCursor.getString(10) ?: "")
                            put("SINCRONIZADO",    false)
                        }

                        val rowId = writableDb.insert("DATOS", null, cv)
                        if (rowId == -1L) {
                            throw ImportTransactionException(
                                localizacion = entry.localGeom.localizacion,
                                message =
                                    "Fallo al insertar un registro en el predio " +
                                    "'${entry.localGeom.localizacion}'.\n\n" +
                                    "La importación ha sido abortada."
                            )
                        }
                        insertCount++
                    }

                    // 5. Marcar transacción como exitosa
                    writableDb.setTransactionSuccessful()

                } catch (e: ImportTransactionException) {
                    throw e   // propagar sin envolver — aborta el proceso completo
                } catch (e: Exception) {
                    throw ImportTransactionException(
                        localizacion = entry.localGeom.localizacion,
                        message =
                            "Error inesperado en el predio '${entry.localGeom.localizacion}':\n" +
                            "${e.message}\n\nLa importación ha sido abortada.",
                        cause = e
                    )
                } finally {
                    writableDb.endTransaction()   // commit si setTransactionSuccessful, rollback si no
                    externalCursor.close()
                }

                // ── 6. Transacción confirmada → operaciones de foto ──────────────
                // Eliminar fotos viejas del almacenamiento local (solo en reemplazo)
                if (isConflict) deletePhotos(oldPhotos, appStorageDir)
                // Mover fotos nuevas desde el directorio externo al almacenamiento local
                migratePhotos(newPhotos)

                // Actualizar contadores
                if (isConflict) {
                    replacedRecords += insertCount
                    replacedPredios++
                } else {
                    importedNew += insertCount
                    newPredios++
                }
            }
        } finally {
            externalDb.close()
        }

        return ImportResult(importedNew, newPredios, replacedRecords, replacedPredios, skippedPredios)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers privados de foto
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Extrae los nombres de archivo de foto de una cadena JSON de DATOS.
     *  - Campo [FotoFrente]: nombre único (string).
     *  - Campo [Imagenes]: lista separada por comas (CSV).
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

    /**
     * Consulta los registros locales por ID y extrae todos sus nombres de foto.
     * Se llama siempre ANTES de iniciar la transacción para tener los nombres
     * disponibles incluso después de que el DELETE los elimine de la BD.
     */
    private fun collectLocalPhotos(rowIds: List<Int>): List<String> {
        if (rowIds.isEmpty()) return emptyList()
        val result       = mutableListOf<String>()
        val placeholders = rowIds.joinToString(",")
        localDbHelper.readableDatabase.rawQuery(
            "SELECT DATOS FROM DATOS WHERE ID IN ($placeholders)", null
        ).use { cursor ->
            while (cursor.moveToNext()) {
                result.addAll(photoNamesFromJson(cursor.getString(0)))
            }
        }
        return result
    }

    /**
     * Elimina físicamente los archivos de foto de [dir].
     * Se llama solo después de que la transacción haya sido confirmada.
     */
    private fun deletePhotos(names: List<String>, dir: File) {
        var count = 0
        names.forEach { name -> if (File(dir, name).delete()) count++ }
        if (count > 0) Log.d(TAG, "🗑️ $count fotos locales eliminadas tras reemplazo")
    }

    /**
     * Copia archivos de foto desde [externalDir] a [appStorageDir].
     * Los originales se conservan intactos en el directorio externo (directorio de salva).
     * Si el archivo destino ya existe, se omite (no sobreescribe).
     * Se llama solo después de que la transacción haya sido confirmada.
     */
    private fun migratePhotos(names: List<String>) {
        var count = 0
        names.forEach { name ->
            val src = File(externalDir, name)
            val dst = File(appStorageDir, name)
            if (src.exists()) {
                try {
                    if (!dst.exists()) {
                        src.copyTo(dst, overwrite = false)
                        count++
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "⚠️ No se pudo copiar foto '$name': ${e.message}")
                }
            }
        }
        if (count > 0) Log.d(TAG, "📷 $count fotos copiadas al directorio local (originales conservados)")
    }

    private companion object {
        const val TAG = "ImportManager"
    }
}
