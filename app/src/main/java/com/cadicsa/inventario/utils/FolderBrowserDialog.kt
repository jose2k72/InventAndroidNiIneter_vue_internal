package com.cadicsa.inventario.utils

import android.app.Activity
import android.os.Environment
import android.widget.ArrayAdapter
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ListView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import java.io.File

/**
 * Selector de directorios personalizado basado en navegación de carpetas con [java.io.File].
 *
 * Requiere que la app tenga permiso MANAGE_EXTERNAL_STORAGE.
 * Muestra únicamente carpetas para permitir al usuario seleccionar un directorio destino.
 * Permite crear nuevos directorios dentro del directorio actual de navegación.
 *
 * @param activity         Actividad host (necesaria para construir el diálogo).
 * @param onFolderSelected Callback invocado con el path absoluto de la carpeta seleccionada.
 */
class FolderBrowserDialog(
    private val activity: Activity,
    private val onFolderSelected: (String) -> Unit
) {
    private var currentDir: File = Environment.getExternalStorageDirectory()

    private val items   = mutableListOf<String>()
    private val entries = mutableListOf<File>()

    private lateinit var adapter:    ArrayAdapter<String>
    private lateinit var pathLabel:  TextView
    private lateinit var dialog:     AlertDialog

    /** Muestra el diálogo de navegación de carpetas. */
    fun show() {
        val density   = activity.resources.displayMetrics.density
        val padPx     = (12 * density).toInt()
        val listHPx   = (400 * density).toInt()

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

        // ListView de carpetas
        val listView = ListView(activity)
        adapter = ArrayAdapter(activity, android.R.layout.simple_list_item_1, items)
        listView.adapter = adapter
        layout.addView(listView, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, listHPx
        ))

        // ── Construir diálogo ─────────────────────────────────────────────────
        refresh()

        dialog = AlertDialog.Builder(activity)
            .setTitle("Seleccionar carpeta de destino")
            .setView(layout)
            .setPositiveButton("Seleccionar") { _, _ ->
                onFolderSelected(currentDir.absolutePath)
            }
            .setNeutralButton("Nueva Carpeta 📁+") { _, _ -> } // Se sobrescribe abajo para evitar cierre automático
            .setNegativeButton("Cancelar", null)
            .create()

        dialog.show()

        // Sobrescribir el botón neutral para que no cierre el diálogo al pulsarlo
        dialog.getButton(AlertDialog.BUTTON_NEUTRAL).setOnClickListener {
            showCreateFolderDialog()
        }

        listView.setOnItemClickListener { _, _, position, _ ->
            if (position < entries.size) {
                val f = entries[position]
                if (f.isDirectory) {
                    currentDir = f
                    refresh()
                }
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

        // Contenido del directorio actual: únicamente carpetas
        val children = currentDir.listFiles()
            ?.filter { !it.isHidden && it.isDirectory }
            ?.sortedWith(compareBy { it.name.lowercase() })
            ?: emptyList()

        for (f in children) {
            items.add("📁  ${f.name}")
            entries.add(f)
        }

        if (items.size == (if (currentDir.parentFile != null) 1 else 0)) {
            // Directorio vacío (sin subcarpetas)
            items.add("— sin subcarpetas —")
        }

        if (::adapter.isInitialized)   adapter.notifyDataSetChanged()
        if (::pathLabel.isInitialized) pathLabel.text = currentDir.absolutePath
    }

    /** Muestra un diálogo emergente de texto para crear una carpeta física. */
    private fun showCreateFolderDialog() {
        val input = EditText(activity).apply {
            hint = "Nombre de la carpeta"
            setSingleLine()
        }

        val pad = (16 * activity.resources.displayMetrics.density).toInt()
        val container = LinearLayout(activity).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(pad, pad / 2, pad, 0)
            addView(input)
        }

        AlertDialog.Builder(activity)
            .setTitle("Crear Nueva Carpeta")
            .setView(container)
            .setPositiveButton("Crear") { _, _ ->
                val folderName = input.text.toString().trim()
                if (folderName.isNotEmpty()) {
                    val newFolder = File(currentDir, folderName)
                    if (!newFolder.exists()) {
                        if (newFolder.mkdir()) {
                            currentDir = newFolder
                            refresh()
                            Toast.makeText(activity, "Carpeta creada: $folderName", Toast.LENGTH_SHORT).show()
                        } else {
                            Toast.makeText(activity, "No se pudo crear la carpeta", Toast.LENGTH_LONG).show()
                        }
                    } else {
                        Toast.makeText(activity, "La carpeta ya existe", Toast.LENGTH_LONG).show()
                    }
                } else {
                    Toast.makeText(activity, "El nombre no puede estar vacío", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("Cancelar", null)
            .show()
    }
}
