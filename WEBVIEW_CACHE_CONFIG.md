# Configuración de Caché del WebView

## 🔧 Estado Actual: DESARROLLO

La aplicación está configurada para **deshabilitar completamente el caché del WebView** durante el desarrollo.

### ⚠️ IMPORTANTE: Qué NO afecta esta configuración
- ✅ **Tiles offline** (tabla `tiles` en BD) → NO afectados
- ✅ **Caché de Google Maps** → NO afectado  
- ✅ **Datos de la BD** (tabla `DATOS`) → NO afectados
- ✅ Solo afecta archivos web: HTML, JS, CSS del formulario

### ✅ Ventajas (Desarrollo):
- ✅ NO necesitas desinstalar la app entre compilaciones
- ✅ Los cambios en HTML/JS/CSS se ven inmediatamente
- ✅ NO necesitas limpiar caché manualmente
- ✅ NO necesitas aceptar permisos cada vez

### ⚠️ Desventajas (Producción):
- ❌ La app carga más lento (recarga assets cada vez)
- ❌ Mayor consumo de RAM
- ❌ Experiencia de usuario menos fluida

---

## 🚀 Para PRODUCCIÓN

Cuando estés listo para release, **cambia estas configuraciones** en `FormActivity.kt`:

### Busca esta sección (línea ~156):
```kotlin
// ========== CONFIGURACIONES ANTI-CACHÉ PARA DESARROLLO ==========
// Esto evita que tengas que desinstalar la app en cada cambio
// NOTA: NO afecta el caché de tiles offline ni Google Maps

// 1. Deshabilitar caché del WebView completamente
webView.settings.cacheMode = android.webkit.WebSettings.LOAD_NO_CACHE

// 2. Limpiar todo el caché existente del WebView
webView.clearCache(true)
webView.clearFormData()
webView.clearHistory()

android.util.Log.d("FormActivity", "🗑️ Caché del WebView limpiado y deshabilitado")
// ===============================================================
```

### Cámbiala por esto:
```kotlin
// ========== CONFIGURACIONES PARA PRODUCCIÓN ==========
// Habilitar caché para mejor rendimiento

// Usar caché normal (recomendado para producción)
webView.settings.cacheMode = android.webkit.WebSettings.LOAD_DEFAULT

// NO limpiar caché en producción
// webView.clearCache(true) <- COMENTADO

android.util.Log.d("FormActivity", "✅ Caché habilitado para producción")
// ===================================================
```

### Y en la carga de URL (línea ~250):
```kotlin
// DESARROLLO: Con timestamp
val timestamp = System.currentTimeMillis()
val url = "file:///android_asset/web/index.html?v=$timestamp"
```

Cambiar a:
```kotlin
// PRODUCCIÓN: Sin timestamp
val url = "file:///android_asset/web/index.html"
```

---

## 📋 Checklist para Release:

- [ ] Cambiar `cacheMode` a `LOAD_DEFAULT`
- [ ] Habilitar `setAppCacheEnabled(true)`
- [ ] Quitar timestamp de la URL
- [ ] Incrementar `versionCode` en `build.gradle.kts`
- [ ] Probar en dispositivo limpio

---

## 🎯 Configuración Ideal (Híbrida):

Puedes usar `BuildConfig.DEBUG` para cambiar automáticamente:

```kotlin
if (BuildConfig.DEBUG) {
    // Desarrollo: SIN caché
    webView.settings.cacheMode = android.webkit.WebSettings.LOAD_NO_CACHE
    webView.clearCache(true)
    val url = "file:///android_asset/web/index.html?v=${System.currentTimeMillis()}"
    webView.loadUrl(url)
} else {
    // Producción: CON caché
    webView.settings.cacheMode = android.webkit.WebSettings.LOAD_DEFAULT
    val url = "file:///android_asset/web/index.html"
    webView.loadUrl(url)
}
```

---

**Última actualización**: 2025-12-17  
**Estado**: ✅ Configurado para desarrollo sin caché  
**Nota**: Compatible con Android SDK 34+ (sin métodos deprecados)
