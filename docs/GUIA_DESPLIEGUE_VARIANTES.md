# Guía de Despliegue: Variantes de Aplicación

Este proyecto está diseñado para funcionar como una **base de código común** para múltiples aplicaciones de inventario (distintas municipalidades o proyectos), manteniendo una lógica compartida pero desplegándose como aplicaciones independientes en el mismo dispositivo.

## 1. Conceptos Fundamentales de Identidad

Para crear variantes independientes que coexistan en el mismo dispositivo, es vital distinguir entre estos tres elementos:

### A. `applicationId` (El "DNI" de la App)
*   **¿Qué es?**: El identificador **único e irrepetible** de la aplicación en el ecosistema Android (y Google Play).
*   **Ubicación**: Archivo `app/build.gradle.kts`, bloque `defaultConfig`.
*   **Comportamiento**:
    *   Si instalas una app con el **mismo** `applicationId`, Android la considerará una **actualización** de la existente y sobrescribirá los datos.
    *   Si cambias el `applicationId` (ej: `com.cadicsa.ineter.occidente` vs `com.cadicsa.ineter.oriente`), Android la tratará como una **aplicación completamente nueva y separada**.
*   **Acción Requerida**: **DEBE CAMBIARSE OBLIGATORIAMENTE** para cada nueva variante.

### B. `namespace` (Estructura Interna del Código)
*   **¿Qué es?**: El paquete base de Java/Kotlin utilizado internamente para compilar el código y generar la clase `R.java` (recursos).
*   **Ubicación**: Archivo `app/build.gradle.kts`, bloque `android`.
*   **Comportamiento**: Desacopla la estructura del código del ID de la aplicación.
*   **Acción Requerida**: **NO CAMBIAR**. Se mantiene fijo (`com.cadicsa.inventario`) para que no tengas que refactorizar los `package` ni los `import` en tus cientos de archivos de código fuente. Permite reutilizar el 100% del código.

### C. `app_name` (Nombre Visible al Usuario)
*   **¿Qué es?**: El nombre que aparece debajo del icono en el menú del dispositivo y en la barra de título.
*   **Ubicación**: Archivo `app/src/main/res/values/strings.xml`.
*   **Comportamiento**: Es puramente cosmético pero vital para que el usuario distinga entre "INETER Occidente" e "INETER Oriente".
*   **Acción Requerida**: **DEBE CAMBIARSE** para evitar confusión en el usuario.

## 2. Cómo Crear una Nueva Variante

Para desplegar una nueva versión del inventario para otro proyecto (ej: "INETER Occidente" vs "INETER Oriente"), siga estos pasos:

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

### Paso 3: Configuración de Almacenamiento

⚠️ **Configuración Centralizada Implementada**

El proyecto utiliza una **configuración centralizada** para el directorio de almacenamiento a través de la clase `AppConfig.kt`. Todos los accesos a:
- Base de datos SQLite
- Fotos capturadas
- Cualquier archivo de la aplicación

...pasan por esta clase única, lo que facilita la creación de variantes.

**Ubicaciones en el código:**
1.  **Configuración**: `app/build.gradle.kts` → `buildConfigField("String", "STORAGE_DIR_NAME", "...")`
2.  **Implementación**: `AppConfig.kt` → Lee `BuildConfig.STORAGE_DIR_NAME`
3.  **Uso**: `DatabaseHelper.kt`, `FormActivity.kt`, `MainActivity.kt` → Usan `AppConfig.getStorageDirectory()`

**Para crear una variante con datos aislados:**

Simplemente cambie el valor en `app/build.gradle.kts`:

```kotlin
defaultConfig {
    applicationId = "com.cadicsa.inventario.nuevo.proyecto"
    
    // CAMBIAR ESTE VALOR para aislar datos de esta variante
    buildConfigField("String", "STORAGE_DIR_NAME", "\"CADIC.NUEVO_PROYECTO\"")
}
```

**Resultado:**
- App original: `/sdcard/CADIC.INETER/Map.db` + fotos
- App nueva: `/sdcard/CADIC.NUEVO_PROYECTO/Map.db` + fotos

**Compartir datos entre variantes:**
Si desea que dos variantes compartan la misma base de datos y fotos (ej: para testing), use el **mismo** `STORAGE_DIR_NAME` en ambas.

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
package:/data/app/~~...==/com.cadicsa.inventario.ineter.occidente-base.apk=com.cadicsa.inventario.ineter.occidente
package:/data/app/~~...==/com.cadicsa.inventario.ineter.oriente-base.apk=com.cadicsa.inventario.ineter.oriente
```
