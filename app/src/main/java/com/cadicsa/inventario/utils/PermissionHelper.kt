package com.cadicsa.inventario.utils

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.Settings
import android.widget.Toast
import androidx.activity.result.ActivityResultLauncher
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat

/**
 * Helper para centralizar la gestión de permisos de Android.
 */
class PermissionHelper(private val activity: AppCompatActivity) {

    /**
     * Verifica el permiso especial de MANAGE_EXTERNAL_STORAGE (Android 11+)
     */
    fun checkManageExternalStoragePermission(onPermissionGranted: () -> Unit) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            if (Environment.isExternalStorageManager()) {
                onPermissionGranted()
            } else {
                Toast.makeText(
                    activity,
                    "Esta app necesita acceso a archivos para funcionar. Active el permiso en la siguiente pantalla.",
                    Toast.LENGTH_LONG
                ).show()
                
                try {
                    val intent = Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION)
                    intent.data = Uri.parse("package:${activity.packageName}")
                    activity.startActivity(intent)
                } catch (e: Exception) {
                    val intent = Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION)
                    activity.startActivity(intent)
                }
            }
        } else {
            onPermissionGranted()
        }
    }

    /**
     * Solicita todos los permisos necesarios (Ubicación, Cámara, Almacenamiento)
     */
    fun requestAllPermissions(
        launcher: ActivityResultLauncher<Array<String>>,
        onAllGranted: () -> Unit
    ) {
        val permissionsToRequest = mutableListOf<String>()

        // Ubicación
        permissionsToRequest.add(Manifest.permission.ACCESS_FINE_LOCATION)
        permissionsToRequest.add(Manifest.permission.ACCESS_COARSE_LOCATION)

        // Cámara
        permissionsToRequest.add(Manifest.permission.CAMERA)

        // Almacenamiento
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissionsToRequest.add(Manifest.permission.READ_MEDIA_IMAGES)
        } else if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
            permissionsToRequest.add(Manifest.permission.READ_EXTERNAL_STORAGE)
            permissionsToRequest.add(Manifest.permission.WRITE_EXTERNAL_STORAGE)
        }

        val permissionsNeeded = permissionsToRequest.filter {
            ContextCompat.checkSelfPermission(activity, it) != PackageManager.PERMISSION_GRANTED
        }

        if (permissionsNeeded.isNotEmpty()) {
            launcher.launch(permissionsNeeded.toTypedArray())
        } else {
            onAllGranted()
        }
    }

    /**
     * Verifica si se tiene permiso de ubicación
     */
    fun hasLocationPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            activity,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
    }
}
