# Guía de Despliegue: Variantes de Aplicación

Este proyecto está diseñado para funcionar como una **base de código común** para múltiples aplicaciones de inventario (distintas municipalidades o proyectos), manteniendo una lógica compartida pero desplegándose como aplicaciones independientes en el mismo dispositivo.

## 1. Concepto de Base Común

- **Namespace de Código**: `com.cadicsa.inventario`
  - Todas las clases Java/Kotlin y recursos mantienen este paquete.
  - No es necesario refactorizar el código fuente para crear una nueva variante.

- **Identificador de Aplicación**: `applicationId` (en `build.gradle.kts`)
  - Es el identificador único para el sistema Android y Google Play.
  - Define la identidad de instalación.

## 2. Cómo Crear una Nueva Variante

Para desplegar una nueva versión del inventario para otro proyecto (ej: "Inventario Goicoechea" vs "Inventario Tibás"), siga estos pasos:

### Paso 1: Modificar `build.gradle.kts`

Abra el archivo `app/build.gradle.kts` y localice el bloque `defaultConfig`. Cambie **únicamente** el `applicationId`.

```kotlin
android {
    namespace = "com.cadicsa.inventario" // NO CAMBIAR
    // ...
    defaultConfig {
        // CAMBIAR ESTO para la nueva variante:
        applicationId = "com.cadicsa.inventario.nuevo.proyecto" 
        
        // ...
    }
}
```

### Paso 2: Configuración de Recursos (Opcional)

Si la nueva variante requiere:
- **Icono diferente**: Reemplace los iconos en `src/main/res/mipmap-*`.
- **Nombre visible**: Edite `src/main/res/values/strings.xml`:
  ```xml
  <string name="app_name">Inventario Nuevo Proyecto</string>
  ```
- **Mapas**: Si el proyecto usa una API Key diferente, edite `google_maps_key` en `strings.xml`.

### Paso 3: Base de Datos Inicial

Cada variante debe tener su propia carpeta de datos en el dispositivo si van a coexistir.
Actualmente, la ruta de base de datos está hardcodeada en `DatabaseHelper.kt` como `CADIC.ACERAS`.

> **Recomendación**: Para despliegues futuros, considere mover el nombre de la carpeta a una variable de configuración en `buildConfigField` dentro del `build.gradle.kts` para que cada variante use su propia carpeta de datos:

**En `build.gradle.kts` (Mejora sugerida):**
```kotlin
buildConfigField("String", "DB_FOLDER_NAME", "\"CADIC.NUEVO_PROYECTO\"")
```

**En `DatabaseHelper.kt`:**
```kotlin
getExternalSdCardPath() + File.separator + BuildConfig.DB_FOLDER_NAME + ...
```

## 3. Comandos de Instalación

Al cambiar el `applicationId`, Gradle generará un APK que se instala como una app completamente nueva.

```bash
# Limpiar y construir
./gradlew clean assembleDebug

# Instalar y Sobrescribir (si ya existe esa variante)
adb install -r -t app/build/outputs/apk/debug/app-debug.apk
```

## 4. Verificación

Para verificar qué variantes están instaladas en el dispositivo:

```bash
adb shell pm list packages -f | grep cadicsa
```

Salida esperada (ejemplo):
```
package:/data/app/~~...==/com.cadicsa.inventario.goico.aceras-base.apk=com.cadicsa.inventario.goico.aceras
package:/data/app/~~...==/com.cadicsa.inventario.tibas-base.apk=com.cadicsa.inventario.tibas
```
