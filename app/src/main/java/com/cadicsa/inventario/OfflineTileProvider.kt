package com.cadicsa.inventario

import android.content.Context
import com.google.android.gms.maps.model.Tile
import com.google.android.gms.maps.model.TileProvider

/**
 * TileProvider que carga tiles desde la base de datos SQLite offline
 */
class OfflineTileProvider(
    context: Context,
    private val table: String = "tiles"
) : TileProvider {

    private val databaseHelper = DatabaseHelper.getInstance(context)

    override fun getTile(x: Int, y: Int, z: Int): Tile {
        val tileData = try {
            databaseHelper.getTile(x, y, z, table)
        } catch (e: Exception) {
            null
        }
        return if (tileData != null) {
            Tile(256, 256, tileData)
        } else {
            TileProvider.NO_TILE
        }
    }
}
