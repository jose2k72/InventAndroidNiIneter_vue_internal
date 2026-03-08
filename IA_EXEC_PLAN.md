# IA_EXEC_PLAN.md

Este documento detalla los pasos a seguir para realizar una refactorización segura, evitando los errores cometidos en el primer intento. El enfoque será **incremental y centrado en la funcionalidad**.

## 🛡️ Reglas de Oro para esta Sesión
1. **Compilar y Probar** después de mover CADA función o bloque lógico.
2. **Normalización de Locale**: Todo cálculo o consulta de coordenadas DEBE usar `SpatialNormalizer` (Locale.US).
3. **Orquestación en la Actividad**: No mover lógica que dependa fuertemente del ciclo de vida (`onCreate`, `onResume`, `onMapReady`) a clases externas si esto rompe la temporalidad de los objetos (como `mMap`).
4. **Verificación de Flujo Crítico**: Probar siempre: Login -> Clic en Mapa -> Interceptación de Parcela -> Formulario -> Guardar -> Salir.

---

## ✅ Fase 1: Infraestructura Espacial Segura
- [x] **Crear `SpatialNormalizer`**: Utilidad central para asegurar punto decimal `.` en SQL.
- [x] **Refactorizar `DatabaseHelper`**: Aplicar normalización en todas las consultas espaciales.
- [x] **Refactorizar `MainActivity` (Queries IP)**: Normalizar consultas de rutas y capas de visualización.

---

## ✅ Fase 2: Reducción de Archivos Grandes (Token Optimization)
- [x] **GeometryUtil.kt**: Dividir responsabilidades.
    - [x] Crear `ProjectionHelper.kt` (WGS84, CRTM05, UTM 16N).
    - [x] Crear `RoutingHelper.kt` (Direcciones, bearings).
    - [x] Simplificar `GeometryUtil.kt` (Delegación y JTS Core).
- [x] **MainActivity.kt**: Adelgazamiento y extracción de helpers.
    - [x] Crear `PermissionHelper.kt` (Manejo de permisos Android).
    - [x] Crear `MapHelper.kt` (Capa de visualización y dibujo de rutas).
    - [x] Crear `MainDialogHelper.kt` (About, Auth, Change Pass).

---

## 🚀 Fase 3: Desacoplamiento de `FormActivity` (Token Optimization)
- [x] **Extraer `FormImageHelper.kt`**: (~170 líneas de lógica)
    - Mover `ActivityResultLaunchers` y flujo de permisos.
    - Gestionar permisos especiales de Android 11+ (`MANAGE_EXTERNAL_STORAGE`).
    - Lógica de creación de archivos, prefijos y conversión Bitmap a Base64.
- [x] **Extraer `AndroidBridge.kt`**: (~240 líneas de lógica)
    - Desacoplar `@JavascriptInterface` de la Actividad.
    - Mover persistencia de base de datos (`sendData`, `deleteData`, `getData`).
    - Delegar lectura de archivos JSON de catálogos.
- [x] **Slim Down `FormActivity.kt`**:
    - Reducir el archivo a < 200 líneas (actualmente ~150).
    - Delegar orquestación y configuración de `WebViewClient` / `WebChromeClient`.
- [x] **Verificación de Flujo**:
    - [x] Probar modo Edición (inyectar JSON de retorno).
    - [x] Probar captura y retorno de fotos a Vue.
    - [x] Probar guardado y actualización de registros en DB.

---

---

## 🚀 Fase 4: Estabilización del Frontend y Consistencia (Vue.js)

- [x] **Estabilización de Propagación de Localización**:
    - [x] **MainActivity.kt**: Validación defensiva (Muni/Sec/Predio) antes de lanzar formulario.
    - [x] **app.js**: Inicialización síncrona de datos del Bridge de Android.
    - [x] **FormEncuestaCatastral.js**: Generación de `NoEncuesta` usando datos inyectados en el modelo (adiós a `SIN_LOC`).
- [x] **Consistencia de Modelos y Conversión**:
    - [x] **Clonación Propietario <-> Entrevistado**: Corregida copia de `ProfessionOtroText`.
    - [x] **Limpieza de "Campos Fantasma"**: Eliminación de `ResidenceDepartamento` (dato redundante).
- [x] **Optimización de Token de `app.js`**:
    - [x] Extraer lógica de guardado/validación a servicios independientes: `js/syncService.js`, `js/photoService.js`, `js/displayService.js` y `js/clonadorService.js`.
    - [x] Reducción de ~200 líneas en el archivo central.
- [x] **Mantenimiento de `modelsFactory.js`**:
    - [x] Actualizar modelos para que nazcan con coordenadas y localización por defecto mediante parámetros de contexto.
    - [x] Refactorizar `resetForm` para usar la fábrica context-aware.

---

## 📋 Checklist de Verificación Final
- [x] ¿Compila sin errores? (BUILD SUCCESSFUL)
- [x] ¿El APK se instala y abre? (Instalado en Active 8 Pro)
- [x] ¿La interceptación de parcelas funciona (Sector/Municipio/Localización)? (Con validación síncrona)
- [x] ¿El botón "Salir" cierra la app sin bucles? (Corregido en sesión anterior)
- [x] ¿Los datos se guardan correctamente con la nueva estructura de servicios? (Verificado en lógica)

---

## 🕒 Progreso Actual
- **Fase 1**: 100% Completada.
- **Fase 2**: 100% Completada.
- **Fase 3**: 100% Completada.
- **Fase 4**: 100% Completada. 🚀
- **Despliegue**: APK instalado y validado en dispositivo físico.


