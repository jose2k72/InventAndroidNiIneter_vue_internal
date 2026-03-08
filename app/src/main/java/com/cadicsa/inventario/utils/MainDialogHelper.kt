package com.cadicsa.inventario.utils

import android.app.AlertDialog
import android.content.Intent
import android.text.InputType
import android.widget.ArrayAdapter
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.Spinner
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.cadicsa.inventario.DatabaseHelper
import com.cadicsa.inventario.DataItem
import com.cadicsa.inventario.FormActivity
import com.cadicsa.inventario.ManageUsersActivity
import com.cadicsa.inventario.R
import com.cadicsa.inventario.security.SecurityManager
import org.json.JSONObject
import java.util.Locale

/**
 * Helper para gestionar los diálogos complejos de MainActivity.
 */
class MainDialogHelper(private val activity: AppCompatActivity) {

    /**
     * Diálogo para configurar el nombre del encuestador
     */
    fun showEncuestadorDialog(onSaved: (String) -> Unit) {
        val builder = AlertDialog.Builder(activity)
        builder.setTitle("Configuración Inicial")
        builder.setMessage("Por favor ingrese su nombre de encuestador:")
        builder.setCancelable(false)
        
        val input = EditText(activity)
        input.inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_CAP_WORDS
        input.hint = "Nombre del encuestador"
        
        val padding = (16 * activity.resources.displayMetrics.density).toInt()
        input.setPadding(padding, padding, padding, padding)
        builder.setView(input)
        
        builder.setPositiveButton("Guardar") { dialog, _ ->
            val nombre = input.text.toString().trim()
            if (nombre.isEmpty()) {
                Toast.makeText(activity, "Debe ingresar un nombre", Toast.LENGTH_SHORT).show()
                showEncuestadorDialog(onSaved)
            } else {
                val dbHelper = DatabaseHelper.getInstance(activity)
                if (dbHelper.updateNombreEncuestador(nombre)) {
                    onSaved(nombre)
                } else {
                    Toast.makeText(activity, "Error guardando configuración", Toast.LENGTH_SHORT).show()
                    showEncuestadorDialog(onSaved)
                }
            }
            dialog.dismiss()
        }
        builder.create().show()
    }

    /**
     * Diálogo de autenticación
     */
    fun showAuthDialog(onAuthenticated: () -> Unit, onExit: () -> Unit) {
        SecurityManager.initUsers(activity)
        val builder = AlertDialog.Builder(activity)
        builder.setTitle(activity.getString(R.string.app_name) + " - Autenticación")
        builder.setCancelable(false)
        
        val layout = LinearLayout(activity).apply {
            orientation = LinearLayout.VERTICAL
            val padding = (16 * activity.resources.displayMetrics.density).toInt()
            setPadding(padding, padding, padding, padding)
        }
        
        val spinner = Spinner(activity)
        val userNames = SecurityManager.usersList.map { it.fullName }
        spinner.adapter = ArrayAdapter(activity, android.R.layout.simple_spinner_dropdown_item, userNames)
        layout.addView(spinner)
        
        val input = EditText(activity).apply {
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
            hint = "Contraseña"
            val marginTop = (16 * activity.resources.displayMetrics.density).toInt()
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, 
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { topMargin = marginTop }
        }
        layout.addView(input)
        
        builder.setView(layout)
        builder.setPositiveButton("Entrar", null)
        builder.setNegativeButton("Salir") { _, _ -> onExit() }
        
        val dialog = builder.create()
        dialog.show()
        
        dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
            val position = spinner.selectedItemPosition
            if (position < 0) return@setOnClickListener
            
            val selectedUser = SecurityManager.usersList[position]
            val password = input.text.toString()
            
            if (password.isEmpty()) {
                Toast.makeText(activity, "Debe ingresar contraseña", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            
            if (SecurityManager.authenticate(selectedUser, password)) {
                dialog.dismiss()
                DatabaseHelper.getInstance(activity).updateNombreEncuestador(selectedUser.fullName)
                onAuthenticated()
            } else {
                Toast.makeText(activity, "Contraseña incorrecta", Toast.LENGTH_SHORT).show()
                input.setText("") 
            }
        }
    }

    /**
     * Diálogo para ver datos en un punto específico
     */
    fun showPointDataDialog(coords: String, onNewRecord: (Double, Double) -> Unit, onEditRecord: (DataItem) -> Unit) {
        try {
            val parts = coords.split(",")
            val targetLat = parts[0].toDouble()
            val targetLng = parts[1].toDouble()
            
            val dbHelper = DatabaseHelper.getInstance(activity)
            val pointData = dbHelper.getAllData().filter { item ->
                val latStr = SpatialNormalizer.format(item.latitud)
                val lngStr = SpatialNormalizer.format(item.longitud)
                latStr == parts[0] && lngStr == parts[1]
            }
            
            if (pointData.isEmpty()) {
                Toast.makeText(activity, "No hay registros en este punto", Toast.LENGTH_SHORT).show()
                return
            }
            
            val options = pointData.map { item ->
                val type = try { JSONObject(item.data).optString("Type", "Desconocido") } catch (e: Exception) { "Desconocido" }
                val fecha = try { JSONObject(item.data).optString("Fecha", "").take(10) } catch (e: Exception) { "" }
                "✏️ $type - $fecha (ID:${item.id})"
            }.toMutableList()
            options.add(0, "➕ Agregar nuevo registro")
            
            AlertDialog.Builder(activity)
                .setTitle("Registros en este punto (${pointData.size})")
                .setItems(options.toTypedArray()) { _, which ->
                    if (which == 0) onNewRecord(targetLat, targetLng)
                    else onEditRecord(pointData[which - 1])
                }
                .setNegativeButton("Cancelar", null)
                .show()
        } catch (e: Exception) {
            Toast.makeText(activity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    /**
     * Diálogo para cambiar contraseña
     */
    fun showChangePasswordDialog() {
        val currentUser = SecurityManager.currentUser ?: return
        val builder = AlertDialog.Builder(activity).setTitle("Cambiar mi contraseña")
        
        val layout = LinearLayout(activity).apply {
            orientation = LinearLayout.VERTICAL
            val padding = (16 * activity.resources.displayMetrics.density).toInt()
            setPadding(padding, padding, padding, padding)
        }
        
        val currentPassInput = EditText(activity).apply { 
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
            hint = "Contraseña Actual"
        }
        layout.addView(currentPassInput)
        
        val newPassInput = EditText(activity).apply { 
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
            hint = "Nueva Contraseña"
        }
        layout.addView(newPassInput)
        
        val confirmPassInput = EditText(activity).apply { 
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
            hint = "Confirmar Nueva Contraseña"
        }
        layout.addView(confirmPassInput)
        
        builder.setView(layout)
        builder.setPositiveButton("Guardar", null)
        builder.setNegativeButton("Cancelar", null)
        
        val dialog = builder.create()
        dialog.show()
        
        dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
            val curr = currentPassInput.text.toString()
            val new = newPassInput.text.toString()
            val conf = confirmPassInput.text.toString()
            
            if (curr.isEmpty() || new.isEmpty() || conf.isEmpty()) {
                Toast.makeText(activity, "Debe completar todos los campos", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            if (new != conf) {
                Toast.makeText(activity, "Las contraseñas no coinciden", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            if (!SecurityManager.authenticate(currentUser, curr)) {
                Toast.makeText(activity, "La contraseña actual no es correcta", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            
            val newSalt = SecurityManager.generateSalt()
            currentUser.salt = newSalt
            currentUser.passwordHash = SecurityManager.hashPassword(new, newSalt)
            
            if (SecurityManager.saveUsersToJson(activity)) {
                Toast.makeText(activity, "Contraseña cambiada exitosamente", Toast.LENGTH_SHORT).show()
                dialog.dismiss()
            } else {
                Toast.makeText(activity, "Error guardando los cambios", Toast.LENGTH_SHORT).show()
            }
        }
    }

    /**
     * Diálogo "Acerca de"
     */
    fun showAboutDialog(seconds: Int = 10) {
        val dialogView = activity.layoutInflater.inflate(R.layout.dialog_about, null)
        val versionName = try { activity.packageManager.getPackageInfo(activity.packageName, 0).versionName } catch (e: Exception) { "1.0.0" }
        val compileYear = java.util.Calendar.getInstance().get(java.util.Calendar.YEAR)
        
        dialogView.findViewById<android.widget.TextView>(R.id.aboutAppInfo).text = 
            "Aplicación de captura de datos de campo\n${activity.getString(R.string.app_name)} v$versionName"
        dialogView.findViewById<android.widget.TextView>(R.id.aboutCopyright).text = 
            "Copyright © $compileYear CADIC Consultores, S.A."
        
        val dialog = AlertDialog.Builder(activity).setView(dialogView).setCancelable(true).create()
        dialogView.setOnClickListener { dialog.dismiss() }
        
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            if (dialog.isShowing) dialog.dismiss()
        }, (seconds * 1000).toLong())
        
        dialog.show()
    }

    /**
     * Diálogo de confirmación de salida
     */
    fun showExitDialog(onConfirm: () -> Unit, onCancel: (() -> Unit)? = null) {
        val currentUser = SecurityManager.currentUser
        val builder = androidx.appcompat.app.AlertDialog.Builder(activity)
            .setTitle("Salir")
            .setMessage("¿Está seguro que desea salir de la aplicación?")
            .setPositiveButton("Sí") { _, _ -> onConfirm() }
            
        if (currentUser == null) {
            builder.setCancelable(false)
            builder.setNegativeButton("No") { _, _ -> onCancel?.invoke() }
        } else {
            builder.setNegativeButton("No", null)
        }
    /**
     * Diálogo de error fatal - Cierra la aplicación por completo
     */
    fun showFatalErrorDialog(message: String) {
        androidx.appcompat.app.AlertDialog.Builder(activity)
            .setTitle("Error Crítico")
            .setMessage(message)
            .setCancelable(false)
            .setPositiveButton("OK") { _, _ ->
                activity.finishAffinity()
                System.exit(0)
            }
            .show()
    }
}
