package com.cadicsa.inventario.utils

import android.database.sqlite.SQLiteDatabase

/**
 * TileManager - Gestiona la lógica de mosaicos (tiles) offline
 */
object TileManager {

    private var maxZoomCache = -1
    private var minZoomCache = -1

    fun getMaxZoom(db: SQLiteDatabase): Int {
        if (maxZoomCache < 0) {
            db.rawQuery("SELECT max(z) FROM tiles", null).use { cursor ->
                if (cursor.moveToFirst()) maxZoomCache = cursor.getInt(0)
            }
        }
        return maxZoomCache
    }

    fun getMinZoom(db: SQLiteDatabase): Int {
        if (minZoomCache < 0) {
            db.rawQuery("SELECT min(z) FROM tiles", null).use { cursor ->
                if (cursor.moveToFirst()) minZoomCache = cursor.getInt(0)
            }
        }
        return minZoomCache
    }

    fun getInitZoom(db: SQLiteDatabase): Int {
        var initZoom = 17
        val maxZoom = getMaxZoom(db)
        val minZoom = getMinZoom(db)
        val midZoom = minZoom + (maxZoom - minZoom) / 2
        if (initZoom > maxZoom) initZoom = maxZoom
        if (initZoom < midZoom) initZoom = midZoom
        return initZoom
    }

    fun existsTile(db: SQLiteDatabase, x: Int, y: Int, z: Int, s: Int): Boolean {
        db.rawQuery("SELECT x FROM tiles WHERE x = $x AND y = $y AND z = $z", null).use { cursor ->
            return cursor.moveToFirst()
        }
    }

    fun getTile(db: SQLiteDatabase, x: Int, y: Int, z: Int): ByteArray? {
        db.rawQuery("SELECT tile FROM tiles WHERE x = $x AND y = $y AND z = $z", null).use { cursor ->
            return if (cursor.moveToFirst()) cursor.getBlob(0) else null
        }
    }

    fun getTile(db: SQLiteDatabase, x: Int, y: Int, z: Int, table: String): ByteArray? {
        return try {
            db.rawQuery("SELECT tile FROM $table WHERE z = $z AND y = $y AND x = $x", null).use { cursor ->
                if (cursor.moveToFirst()) cursor.getBlob(0) else null
            }
        } catch (e: Exception) {
            null
        }
    }

    fun getInitLat(db: SQLiteDatabase): Float {
        return try {
            db.rawQuery("SELECT VALOR FROM config WHERE VARIABLE='InitLat'", null).use { cursor ->
                if (cursor.moveToFirst()) cursor.getString(0).toFloat() else 0f
            }
        } catch (e: Exception) { 0f }
    }

    fun getInitLng(db: SQLiteDatabase): Float {
        return try {
            db.rawQuery("SELECT VALOR FROM config WHERE VARIABLE='InitLng'", null).use { cursor ->
                if (cursor.moveToFirst()) cursor.getString(0).toFloat() else 0f
            }
        } catch (e: Exception) { 0f }
    }
}
