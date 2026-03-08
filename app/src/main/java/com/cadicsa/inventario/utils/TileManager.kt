package com.cadicsa.inventario.utils

import android.database.sqlite.SQLiteDatabase
import com.cadicsa.inventario.DatabaseHelper

/**
 * TileManager - Gestiona la lógica de mosaicos (tiles) offline
 */
object TileManager {

    private var maxZoomCache = -1
    private var minZoomCache = -1

    fun getMaxZoom(db: SQLiteDatabase): Int {
        if (maxZoomCache < 0) {
            val query = "SELECT max(z) FROM tiles"
            val cursor = db.rawQuery(query, null)
            try {
                if (cursor.moveToFirst()) {
                    maxZoomCache = cursor.getInt(0)
                }
            } finally {
                cursor.close()
            }
        }
        return maxZoomCache
    }

    fun getMinZoom(db: SQLiteDatabase): Int {
        if (minZoomCache < 0) {
            val query = "SELECT min(z) FROM tiles"
            val cursor = db.rawQuery(query, null)
            try {
                if (cursor.moveToFirst()) {
                    minZoomCache = cursor.getInt(0)
                }
            } finally {
                cursor.close()
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
        val query = "SELECT x FROM tiles WHERE x = $x AND y = $y AND z = $z"
        val cursor = db.rawQuery(query, null)
        return try {
            cursor.moveToFirst()
        } finally {
            cursor.close()
        }
    }

    fun getTile(db: SQLiteDatabase, x: Int, y: Int, z: Int): ByteArray? {
        val query = "SELECT tile FROM tiles WHERE x = $x AND y = $y AND z = $z"
        val cursor = db.rawQuery(query, null)
        return try {
            if (cursor.moveToFirst()) cursor.getBlob(0) else null
        } finally {
            cursor.close()
        }
    }

    fun getTile(db: SQLiteDatabase, x: Int, y: Int, z: Int, table: String): ByteArray? {
        val query = "SELECT tile FROM $table WHERE z = $z AND y = $y AND x = $x"
        val cursor = db.rawQuery(query, null)
        return try {
            if (cursor.moveToFirst()) cursor.getBlob(0) else null
        } catch (e: Exception) {
            null
        } finally {
            cursor.close()
        }
    }

    fun getInitLat(db: SQLiteDatabase): Float {
        val query = "SELECT VALOR FROM config WHERE VARIABLE='InitLat'"
        val cursor = db.rawQuery(query, null)
        return try {
            if (cursor.moveToFirst()) {
                cursor.getString(0).toFloat()
            } else 0f
        } catch (e: Exception) {
            0f
        } finally {
            cursor.close()
        }
    }

    fun getInitLng(db: SQLiteDatabase): Float {
        val query = "SELECT VALOR FROM config WHERE VARIABLE='InitLng'"
        val cursor = db.rawQuery(query, null)
        return try {
            if (cursor.moveToFirst()) {
                cursor.getString(0).toFloat()
            } else 0f
        } catch (e: Exception) {
            0f
        } finally {
            cursor.close()
        }
    }
}
