package com.cadicsa.inventario.utils

import android.app.Activity
import android.os.Environment
import android.widget.ArrayAdapter
import android.widget.LinearLayout
import android.widget.ListView
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import java.io.File

/**
 * Selector de archivos propio basado en navegación de directorios con [java.io.File].
 *
 * Requiere que la app tenga permiso MANAGE_EXTERNAL_STORAGE.
 * Muestra únicamente carpetas y archivos cuya extensión esté en [validExtensions].
 *
 * @param activity       Actividad host (necesaria para construir el diálogo).
 * @param validExtensions Conjunto de extensiones a mostrar, en minúsculas (sin punto).
 * @param onFileSelected  Callback invocado con el path absoluto del archivo seleccionado.
 */
class FileBrowserDialog(
    private val activity: Activity,
    private val validExtensions: Set<String>,
    private val onFileSelected: (String) -> Unit
) {
    private var currentDir: File = Environment.getExternalStorageDirectory()

    private val items   = mutableListOf<String>()
    private val entries = mutableListOf<File>()

    private lateinit var adapter:    ArrayAdapter<String>
    private lateinit var pathLabel:  TextView
    private lateinit var dialog:     AlertDialog

    /** Muestra el diálogo de navegación. */
    fun show() {
        val density   = activity.resources.displayMetrics.density
        val padPx     = (12 * density).toInt()
        val listHPx   = (440 * density).toInt()

        // ── Layout principal ──────────────────────────────────────────────────
        val layout = LinearLayout(activity).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(padPx, padPx / 2, padPx, 0)
        }

        // Etiqueta con la ruta actual
        pathLabel = TextView(activity).apply {
            textSize  = 11f
            alpha     = 0.75f
            maxLines  = 2
            setPadding(4, 0, 4, (6 * density).toInt())
        }
        layout.addView(pathLabel)

        // ListView de archivos y carpetas
        val listView = ListView(activity)
        adapter = ArrayAdapter(activity, android.R.layout.simple_list_item_1, items)
        listView.adapter = adapter
        layout.addView(listView, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, listHPx
        ))

        // ── Construir diálogo ─────────────────────────────────────────────────
        refresh()

        dialog = AlertDialog.Builder(activity)
            .setTitle("Seleccionar base de datos")
            .setView(layout)
            .setNegativeButton("Cancelar", null)
            .show()

        listView.setOnItemClickListener { _, _, position, _ ->
            val f = entries[position]
            if (f.isDirectory) {
                currentDir = f
                refresh()
            } else {
                dialog.dismiss()
                onFileSelected(f.absolutePath)
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────

    private fun refresh() {
        items.clear()
        entries.clear()

        // Ítem "subir un nivel"
        currentDir.parentFile?.let { parent ->
            items.add("⬆  ..   (${parent.name.ifBlank { "/" }})")
            entries.add(parent)
        }

        // Contenido del directorio actual: primero carpetas, luego archivos válidos
        val children = currentDir.listFiles()
            ?.filter { !it.isHidden }
            ?.sortedWith(compareBy({ !it.isDirectory }, { it.name.lowercase() }))
            ?: emptyList()

        for (f in children) {
            when {
                f.isDirectory -> {
                    items.add("📁  ${f.name}")
                    entries.add(f)
                }
                f.isFile && f.extension.lowercase() in validExtensions -> {
                    items.add("🗄  ${f.name}")
                    entries.add(f)
                }
            }
        }

        if (items.size == (if (currentDir.parentFile != null) 1 else 0)) {
            // Directorio vacío (sin subcarpetas ni archivos válidos)
            items.add("— directorio vacío —")
        }

        if (::adapter.isInitialized)   adapter.notifyDataSetChanged()
        if (::pathLabel.isInitialized) pathLabel.text = currentDir.absolutePath
    }
}
