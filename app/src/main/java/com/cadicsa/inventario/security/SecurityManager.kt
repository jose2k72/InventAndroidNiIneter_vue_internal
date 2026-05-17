package com.cadicsa.inventario.security

import android.content.Context
import org.json.JSONArray
import java.io.File
import java.security.MessageDigest
import java.util.Locale

object SecurityManager {
    private const val TAG = "SecurityManager"

    // Usuario Master predeterminado (Quemado en el código)
    val MASTER_USER = DeviceUser(
        userName = "MASTER",
        fullName = "MASTER",
        initials = "MASTER",
        passwordHash = "fj1mttsGau9KTablizcz27W/3WqFXgsfu1Fj+1GYWsk=",
        salt = "jH8kP2oL6xG9vN4m1Qw==="
    )

    // Lista principal a ser usada por la UI para el dropdown
    val usersList = mutableListOf<DeviceUser>()
    
    // Usuario actualmente autenticado
    var currentUser: DeviceUser? = null

    /**
     * Inicializa la lista de usuarios. 
     * Debe llamarse al inicio de arrancar MainActivity.
     */
    fun initUsers(context: Context) {
        usersList.clear()
        val auxList = loadAuxiliaryList(context)
        if (auxList != null) {
            val normales = auxList.filter { it.userName != "ADMIN" }.sortedBy { it.fullName }
            val admin = auxList.find { it.userName == "ADMIN" }
            usersList.addAll(normales)
            if (admin != null) usersList.add(admin)
            usersList.add(MASTER_USER)
        } else {
            usersList.add(MASTER_USER)
        }
    }

    private fun loadAuxiliaryList(context: Context): List<DeviceUser>? {
        try {
            val file = File(context.filesDir, "DeviceUsers.json")
            if (!file.exists()) return null

            val jsonArray = JSONArray(file.readText())
            val tempUsers = mutableListOf<DeviceUser>()
            
            for (i in 0 until jsonArray.length()) {
                val obj = jsonArray.getJSONObject(i)
                val userName = obj.optString("userName", "").trim().uppercase(Locale.ROOT)
                val fullName = obj.optString("fullName", "").trim().uppercase(Locale.ROOT)
                val initials = obj.optString("initials", "").trim().uppercase(Locale.ROOT)
                val passwordHash = obj.optString("passwordHash", "").trim()
                val salt = obj.optString("salt", "").trim()
                
                if (userName.isEmpty() || fullName.isEmpty() || initials.isEmpty() || passwordHash.isEmpty() || salt.isEmpty()) {
                    continue  // no abortar toda la lista por un usuario malformado
                }
                if (userName == "MASTER" || initials == "MASTER") {
                    continue  // no permitir suplantar MASTER
                }
                tempUsers.add(DeviceUser(userName, fullName, initials, passwordHash, salt))
            }
            
            // Unicidad de userName e initials
            if (tempUsers.map { it.userName }.toSet().size != tempUsers.size) return null
            if (tempUsers.map { it.initials }.toSet().size != tempUsers.size) return null

            return tempUsers

        } catch (e: Exception) {
            return null
        }
    }

    fun generateSalt(): String {
        val bytes = ByteArray(16)
        java.security.SecureRandom().nextBytes(bytes)
        return android.util.Base64.encodeToString(bytes, android.util.Base64.NO_WRAP)
    }

    fun hashPassword(plainPassword: String, salt: String): String {
        val textToHash = plainPassword + salt
        val digest = MessageDigest.getInstance("SHA-256")
        val hashBytes = digest.digest(textToHash.toByteArray(Charsets.UTF_8))
        return android.util.Base64.encodeToString(hashBytes, android.util.Base64.NO_WRAP)
    }

    /**
     * Aplica la Receta Híbrida C# SHA-256(password + salt) y valida contra el hash guardado
     */
    fun authenticate(user: DeviceUser, plainPasswordIngresada: String): Boolean {
        return try {
            val hashBase64 = hashPassword(plainPasswordIngresada, user.salt)
            val match = hashBase64 == user.passwordHash
            if (match) currentUser = user
            match
        } catch (e: Exception) {
            return false
        }
    }

    /**
     * Guarda la lista de usuarios en memoria de vuelta al archivo JSON en el directorio privado.
     * EXCLUYE estrictamente al usuario MASTER.
     */
    fun saveUsersToJson(context: Context): Boolean {
        try {
            val jsonArray = JSONArray()
            val usersToSave = usersList.filter { it.userName != "MASTER" }
            
            for (user in usersToSave) {
                val obj = org.json.JSONObject()
                obj.put("userName", user.userName)
                obj.put("fullName", user.fullName)
                obj.put("initials", user.initials)
                obj.put("passwordHash", user.passwordHash)
                obj.put("salt", user.salt)
                jsonArray.put(obj)
            }
            
            val file = File(context.filesDir, "DeviceUsers.json")
            file.writeText(jsonArray.toString(2))
            return true
        } catch (e: Exception) {
            return false
        }
    }
}
