package com.cadicsa.inventario.security

import android.content.Context
import android.util.Log
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
        
        // Cargar lista auxiliar desde archivo
        val auxList = loadAuxiliaryList(context)
        
        if (auxList != null) {
            Log.d(TAG, "Archivo JSON válido. Fusionando con MASTER.")
            // Ordenamiento: 1. Normales alfabético, 2. ADMIN, 3. MASTER
            
            val normales = auxList.filter { it.userName != "ADMIN" }.sortedBy { it.fullName }
            val admin = auxList.find { it.userName == "ADMIN" }
            
            usersList.addAll(normales)
            if (admin != null) {
                usersList.add(admin)
            }
            usersList.add(MASTER_USER)
        } else {
            Log.w(TAG, "JSON inválido o inexistente. Activando Modo Fallback (Solo MASTER).")
            usersList.add(MASTER_USER)
        }
    }

    private fun loadAuxiliaryList(context: Context): List<DeviceUser>? {
        try {
            // El archivo reside en el directorio privado de la aplicación
            val file = File(context.filesDir, "DeviceUsers.json")
            
            if (!file.exists()) {
                Log.e(TAG, "Archivo DeviceUsers.json no existe en filesDir.")
                return null
            }

            val jsonString = file.readText()
            val jsonArray = JSONArray(jsonString)
            
            val tempUsers = mutableListOf<DeviceUser>()
            
            for (i in 0 until jsonArray.length()) {
                val obj = jsonArray.getJSONObject(i)
                val userName = obj.optString("userName", "").trim().uppercase(Locale.ROOT)
                val fullName = obj.optString("fullName", "").trim().uppercase(Locale.ROOT)
                val initials = obj.optString("initials", "").trim().uppercase(Locale.ROOT)
                val passwordHash = obj.optString("passwordHash", "").trim()
                val salt = obj.optString("salt", "").trim()
                
                // Regla 2: Completitud (Si falta algo, se ignora solo este usuario, no toda la lista)
                if (userName.isEmpty() || fullName.isEmpty() || initials.isEmpty() || passwordHash.isEmpty() || salt.isEmpty()) {
                    Log.w(TAG, "Usuario ignorado por campos incompletos: \$userName")
                    continue
                }
                
                // Regla 6: Exclusividad MASTER
                if (userName == "MASTER" || initials == "MASTER") {
                    Log.w(TAG, "Intento de suplantar MASTER ignorado.")
                    continue
                }
                
                // Unicidad (Si ya existe en la lista temporal, lo ignoramos)
                if (tempUsers.any { it.userName == userName || it.initials == initials }) {
                    Log.w(TAG, "Usuario duplicado ignorado: \$userName / \$initials")
                    continue
                }
                
                tempUsers.add(DeviceUser(userName, fullName, initials, passwordHash, salt))
            }
            
            // Regla 7 (Eliminada): Ya no obligamos a que exista un ADMIN.
            // Retornamos todos los usuarios válidos que hayamos encontrado.
            return tempUsers

        } catch (e: Exception) {
            Log.e(TAG, "Error procesando JSON: ${e.message}")
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
        try {
            val hashBase64 = hashPassword(plainPasswordIngresada, user.salt)
            
            Log.d(TAG, "Auth intento | Hash calc: \$hashBase64 | Hash saved: \${user.passwordHash}")
            
            if (hashBase64 == user.passwordHash) {
                currentUser = user
                return true
            }
            return false
        } catch (e: Exception) {
            Log.e(TAG, "Error en hash auth: ${e.message}")
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
            Log.d(TAG, "JSON saved successfully. Total users: ${usersToSave.size}")
            return true
        } catch (e: Exception) {
            Log.e(TAG, "Error guardando JSON: ${e.message}")
            return false
        }
    }
}
