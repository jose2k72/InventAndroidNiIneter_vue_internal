package com.cadicsa.inventario

import android.os.Environment
import java.io.File
import java.text.SimpleDateFormat
import java.util.*

/**
 * Configuración centralizada de la aplicación
 * 
 * Esta clase proporciona acceso unificado a:
 * - Directorio de almacenamiento (base de datos, fotos, etc.)
 * - Rutas de archivos
 * - Configuraciones específicas de la variante
 */
object AppConfig {
    
    /**
     * Nombre del directorio de almacenamiento en la SD externa
     * Se configura desde build.gradle.kts mediante buildConfigField
     * 
     * Ejemplo: "CADIC.INETER", "CADIC.NUEVO_PROYECTO", etc.
     */
    val STORAGE_DIR_NAME: String = BuildConfig.STORAGE_DIR_NAME
    
    /**
     * Nombre del archivo de base de datos SQLite
     */
    const val DATABASE_NAME = "Map.db"
    
    /**
     * Obtiene la ruta base de la tarjeta SD externa
     * Intenta detectar rutas comunes de SD externa en tablets Samsung
     */
    fun getExternalSdCardPath(): String {
        return try {
            val sdCardPossiblePaths = listOf("external_sd", "ext_sd", "external", "extSdCard")

            for (sdPath in sdCardPossiblePaths) {
                val file = File("/mnt/", sdPath)
                if (file.isDirectory && file.canWrite()) {
                    val timeStamp = SimpleDateFormat("ddMMyyyy_HHmmss", Locale.US).format(Date())
                    val testWritable = File(file.absolutePath, "test_$timeStamp")

                    if (testWritable.mkdirs()) {
                        testWritable.delete()
                        return file.absolutePath
                    }
                }
            }

            Environment.getExternalStorageDirectory().absolutePath
        } catch (e: Exception) {
            // Si falla, usar el directorio por defecto
            "/storage/emulated/0"
        }
    }
    
    /**
     * Obtiene el directorio completo de almacenamiento de la aplicación
     * Ejemplo: /storage/emulated/0/CADIC.INETER
     */
    fun getStorageDirectory(): File {
        val root = getExternalSdCardPath()
        return File(root, STORAGE_DIR_NAME)
    }
    
    /**
     * Obtiene la ruta completa del archivo de base de datos
     * Ejemplo: /storage/emulated/0/CADIC.INETER/Map.db
     */
    fun getDatabasePath(): String {
        return File(getStorageDirectory(), DATABASE_NAME).absolutePath
    }
    
    /**
     * Crea el directorio de almacenamiento si no existe
     * @return true si el directorio existe o fue creado exitosamente
     */
    fun ensureStorageDirectoryExists(): Boolean {
        val dir = getStorageDirectory()
        return if (!dir.exists()) {
            dir.mkdirs()
        } else {
            true
        }
    }
}
