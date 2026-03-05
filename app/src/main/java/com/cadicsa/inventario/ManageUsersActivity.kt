package com.cadicsa.inventario

import android.content.Context
import android.os.Bundle
import android.view.LayoutInflater
import android.view.MenuItem
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.cadicsa.inventario.security.DeviceUser
import com.cadicsa.inventario.security.SecurityManager
import com.google.android.material.floatingactionbutton.FloatingActionButton
import com.google.android.material.textfield.TextInputEditText
import java.util.Locale

class ManageUsersActivity : AppCompatActivity() {

    private lateinit var adapter: UserAdapter
    private val TAG = "ManageUsersActivity"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_manage_users)

        // Configurar Toolbar
        val toolbar = findViewById<androidx.appcompat.widget.Toolbar>(R.id.toolbar)
        setSupportActionBar(toolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        supportActionBar?.title = "Administrar Usuarios"

        // Lista sin MASTER
        val recyclerView = findViewById<RecyclerView>(R.id.recyclerViewUsers)
        recyclerView.layoutManager = LinearLayoutManager(this)
        
        adapter = UserAdapter(
            users = getVisibleUsers(),
            onEditClick = { user -> openUserForm(user) },
            onPasswordClick = { user -> openChangePasswordDialog(user) },
            onDeleteClick = { user -> confirmDeleteUser(user) }
        )
        recyclerView.adapter = adapter

        // Botón FAB
        val fab = findViewById<FloatingActionButton>(R.id.fabAddUser)
        fab.setOnClickListener { openUserForm(null) }
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        if (item.itemId == android.R.id.home) {
            finish()
            return true
        }
        return super.onOptionsItemSelected(item)
    }

    private fun getVisibleUsers(): List<DeviceUser> {
        return SecurityManager.usersList.filter { it.userName != "MASTER" }
    }

    private fun updateList() {
        adapter.updateUsers(getVisibleUsers())
    }

    private fun getInitials(fullName: String): String {
        if (fullName.isBlank()) return "XXX"
        
        val parts = fullName.trim().split(Regex("\\s+"))
        var initials = ""
        
        when {
            parts.size >= 3 -> {
                initials = "${parts[0][0]}${parts[1][0]}${parts[2][0]}"
            }
            parts.size == 2 -> {
                val secondPart = parts[1].take(2)
                initials = "${parts[0][0]}$secondPart"
            }
            parts.size == 1 -> {
                initials = parts[0].take(3)
            }
        }
        
        return initials.uppercase(Locale.ROOT).padEnd(3, 'X').take(3)
    }

    private fun validateUniqueness(userName: String, fullName: String, initials: String, ignoreUserName: String?): Boolean {
        // Verificar MASTER (nunca en usersList)
        val master = SecurityManager.MASTER_USER
        if (userName == master.userName || fullName == master.fullName || initials == master.initials) {
            return false
        }
        
        // Verificar los demás en la lista
        for (user in SecurityManager.usersList) {
            if (user.userName == ignoreUserName) continue
            
            if (user.userName == userName || user.fullName == fullName || user.initials == initials) {
                return false
            }
        }
        return true
    }

    private fun openUserForm(existingUser: DeviceUser?) {
        val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_user_form, null)
        val etUserName = dialogView.findViewById<TextInputEditText>(R.id.etUserName)
        val etFullName = dialogView.findViewById<TextInputEditText>(R.id.etFullName)
        val etPassword = dialogView.findViewById<TextInputEditText>(R.id.etPassword)

        val isEdit = existingUser != null
        
        if (isEdit) {
            dialogView.findViewById<android.widget.TextView>(R.id.tvDialogTitle).text = "Editar Usuario"
            etUserName.setText(existingUser?.userName)
            etUserName.isEnabled = false // Username inmutable
            etFullName.setText(existingUser?.fullName)
            
            // Ocultar el campo de contraseña en modo edición
            dialogView.findViewById<View>(R.id.tilPassword).visibility = View.GONE
        }

        val builder = AlertDialog.Builder(this)
            .setView(dialogView)
            .setPositiveButton("Guardar", null) // Override later to prevent auto-close
            .setNegativeButton("Cancelar", null)

        val dialog = builder.create()
        dialog.show()

        dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
            val inputUserName = etUserName.text.toString()
            val inputFullName = etFullName.text.toString()
            val inputPassword = etPassword.text.toString()

            if (inputFullName.isBlank()) {
                etFullName.error = "Campo requerido"
                return@setOnClickListener
            }

            val normalizedUserName = inputUserName.trim().uppercase(Locale.ROOT)
            val normalizedFullName = inputFullName.trim().uppercase(Locale.ROOT)
            val generatedInitials = getInitials(normalizedFullName)

            if (!isEdit) {
                // Nuevo Usuario
                if (inputUserName.isBlank()) {
                    etUserName.error = "Campo requerido"
                    return@setOnClickListener
                }
                if (inputPassword.isBlank()) {
                    etPassword.error = "Campo requerido"
                    return@setOnClickListener
                }

                if (!validateUniqueness(normalizedUserName, normalizedFullName, generatedInitials, null)) {
                    Toast.makeText(this, "El Usuario, Nombre o Iniciales ($generatedInitials) ya existen", Toast.LENGTH_LONG).show()
                    return@setOnClickListener
                }

                val newUser = DeviceUser(
                    userName = normalizedUserName,
                    fullName = normalizedFullName,
                    initials = generatedInitials,
                    passwordHash = "",
                    salt = SecurityManager.generateSalt()
                )
                newUser.passwordHash = SecurityManager.hashPassword(inputPassword, newUser.salt)
                
                SecurityManager.usersList.add(newUser)
                
            } else {
                // Edición
                if (!validateUniqueness(normalizedUserName, normalizedFullName, generatedInitials, existingUser!!.userName)) {
                    Toast.makeText(this, "El Nombre o Iniciales ($generatedInitials) ya existen", Toast.LENGTH_LONG).show()
                    return@setOnClickListener
                }

                existingUser.fullName = normalizedFullName
                existingUser.initials = generatedInitials
                
                if (inputPassword.isNotBlank()) {
                    existingUser.salt = SecurityManager.generateSalt()
                    existingUser.passwordHash = SecurityManager.hashPassword(inputPassword, existingUser.salt)
                }
            }

            val saved = SecurityManager.saveUsersToJson(this)
            if (saved) {
                Toast.makeText(this, "Usuario ${if (isEdit) "actualizado" else "creado"} correctamente", Toast.LENGTH_SHORT).show()
                updateList()
                dialog.dismiss()
            } else {
                Toast.makeText(this, "Error al guardar el archivo", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun openChangePasswordDialog(user: DeviceUser) {
        val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_change_password, null)
        val etNewPassword = dialogView.findViewById<TextInputEditText>(R.id.etNewPassword)

        val builder = AlertDialog.Builder(this)
            .setView(dialogView)
            .setPositiveButton("Guardar", null)
            .setNegativeButton("Cancelar", null)

        val dialog = builder.create()
        dialog.show()

        dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
            val pass = etNewPassword.text.toString()
            if (pass.isBlank()) {
                etNewPassword.error = "Ingrese una clave"
                return@setOnClickListener
            }

            user.salt = SecurityManager.generateSalt()
            user.passwordHash = SecurityManager.hashPassword(pass, user.salt)

            if (SecurityManager.saveUsersToJson(this)) {
                Toast.makeText(this, "Contraseña de ${user.fullName} cambiada", Toast.LENGTH_SHORT).show()
                dialog.dismiss()
            } else {
                Toast.makeText(this, "Error al guardar", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun confirmDeleteUser(user: DeviceUser) {
        AlertDialog.Builder(this)
            .setTitle("Confirmar")
            .setMessage("¿Estás seguro que deseas borrar al usuario ${user.fullName}?")
            .setPositiveButton("Sí") { _, _ ->
                SecurityManager.usersList.remove(user)
                if (SecurityManager.saveUsersToJson(this)) {
                    Toast.makeText(this, "Usuario eliminado", Toast.LENGTH_SHORT).show()
                    updateList()
                } else {
                    Toast.makeText(this, "Error al guardar", Toast.LENGTH_SHORT).show()
                    // Revert as fallback usually needed if save fails, but not strictly asked
                    SecurityManager.usersList.add(user)
                }
            }
            .setNegativeButton("No", null)
            .show()
    }
}
