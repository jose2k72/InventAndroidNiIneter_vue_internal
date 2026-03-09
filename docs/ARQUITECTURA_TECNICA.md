# Documentación Técnica: INETER CADIC (Vue + Android)

## 1. Arquitectura General

Esta aplicación utiliza una arquitectura híbrida donde la lógica de presentación y el formulario residen en una aplicación web (Vue.js) embebida dentro de una aplicación Android nativa (Kotlin) mediante un `WebView`.

### Componentes Principales

*   **Frontend (Web/Vue.js)**:
    *   Ubicación: `app/src/main/assets/web/`
    *   Tecnología: Vue 3 (Composition API), HTML5, CSS3.
    *   Responsabilidad: Mostrar el formulario, validar datos de entrada, calcular índices automáticamente.
*   **Backend (Android Nativo)**:
    - Ubicación: `app/src/main/java/com/cadicsa/inventario/`
    - Tecnología: Kotlin, Android SDK.
    - **Estructura Desacoplada (Helpers)**:
        - `FormImageHelper`: Gestión de multimedia y permisos.
        - `FormWebViewHelper`: Configuración de motor de renderizado.
        - `utils/SpatialHelper`: Lógica de geocodificación inversa.
        - `utils/MapHelper`: Orquestación de capas de Google Maps.
*   **Puente (Bridge)**:
    - Archivo: `AndroidBridge.kt`
    - Mecanismo: `JavascriptInterface` inyectado mediante `WeakReference` para seguridad de memoria.
    - Responsabilidad: Comunicación bidireccional entre Vue y Android, manejando persistencia y acceso a hardware.

---

## 2. Componentes de Formularios de Encuesta Catastral

La aplicación se transformó desde su prototipo de inventario georreferenciado (Aceras) hacia una red compleja de formularios que integran el **Levantamiento Catastral**, estructurando la información alrededor de la "Ficha":

### 2.1 Módulos Principales de la Encuesta

*   **Sujeto Natural** (`FormSujetoNatural.js`): Controla datos personales, estado civil, y dirección de residencia detallada a nivel jerárquico.
*   **Encuestado/Entrevistado** (`FormEntrevistado.js`): Mapeado directamente o autocreado silenciosamente del Propietario.
*   **Composición Familiar** (`FormFamiliares.js`): Captura iterativa de múltiples integrantes aserando dependencia del propietario bajo el mismo predio.
*   **Ficha (Encuesta Catastral)** (`FormFicha.js`): Formulario núcleo que orquesta la información del predio.
*   **Catálogos UI** (`CatalogoSelectorGrande`, `CatalogoSelectorTwoLevels`): Interfaces hechas en Vue (sin depender de WebView/Selects nativos problemáticos) para listas extensas como profesiones y selección Departamento->Municipio.

> ⚠️ **Nota**: Los formularios heredados del prototipo original de inventario (`FormAcera.js`, `FormCosto.js`) aún están disponibles en el código fuente exclusivamente por motivos de análisis de persistencia o referencia estructural; sin embargo, no forman parte de las reglas del negocio de INETER CADIC.

---

## 3. Integración de Cámara y Fotos

El sistema de captura de fotos es uno de los puntos más críticos, requiriendo una coordinación precisa entre el formulario web y el sistema operativo.

### Flujo de Captura

1.  **Usuario (Web)**: Presiona el botón "📷 CAPTURAR FOTO" en el formulario.
2.  **Vue** (desde el formulario activo):
    *   Ejecuta la función `capturarFoto()`.
    *   **Validación Estricta**: Verifica que existan datos en los campos `Localizacion` y `CodigoCamino`.
        *   *Si falla*: Muestra alerta y detiene el proceso.
    *   **Construcción de Prefijo**: Concatena `Localizacion` + `CodigoCamino` (ej. `"SanJose_Ruta101"`).
    *   **Llamada al Puente**: Invoca `Android.Camera(prefijo)`.
3.  **Android (`FormActivity.kt`)**:
    *   Recibe el `prefijo` en el método anotado con `@JavascriptInterface`.
    *   Solicita permisos de cámara/almacenamiento si no están concedidos.
    *   Lanza el `Intent` de cámara nativa.
45.  **Sistema de Archivos (Android)**:
    - Utiliza `AppConfig.getStorageDirectory()` (donde reside `map.db`).
    - **Nomenclatura**: `PREFIJO_TIMESTAMP.jpg`
        *   `PREFIJO`: El string enviado desde Vue, sanitizado (sin caracteres especiales).
        *   `TIMESTAMP`: Formato `yyyyMMdd_HHmmss`.
        *   Ejemplo final: `SanJose_Ruta101_20260129_143000.jpg`
5.  **Retorno a Vue**:
    *   Al confirmar la captura, Android convierte la imagen a Base64 (miniatura).
    *   Invoca función JS: `window.addPhoto(nombreArchivo, base64)`.
    *   Vue actualiza la galería visual y el campo oculto `Imagenes` en el `formData`.

### Consideraciones de Datos

*   **En Base de Datos**: NO se guarda la imagen binaria. Solo se guarda una cadena de texto con los nombres de archivo separados por comas.
*   **En Disco**: Las imágenes originales (resolución completa) residen en la carpeta de la aplicación en el dispositivo.

---

## 4. Interfaz Javascript (API Bridge)

El objeto global `Android` inyectado en el WebView expone los siguientes métodos clave:

| Método JS | Descripción | Parámetros |
| :--- | :--- | :--- |
| `Android.Camera(prefijo)` | Inicia captura de foto con prefijo. | `prefijo` (String): Usado para el nombre del archivo. |
| `Android.saveData(id, json)` | Guarda el formulario en BD. | `id` (int), `json` (String) |
| `Android.getData()` | Obtiene datos dentro del predio seleccionado. | - |
| `Android.getDataAdyacentes()` | Obtiene datos en predios vecinos. | - |
| `Android.deleteData(id)` | Elimina un registro por ID. | `id` (int) |
| `Android.getRutasAdyacentes()` | Obtiene rutas viales cercanas al predio. | - |
| `Android.getIdObject()` | Obtiene el ID del predio seleccionado. | - |
| `Android.getLocalizacion()` | Obtiene ubicación textual del predio. | - |
| `Android.getLat()` / `getLng()` | Obtiene coordenadas de clic en el mapa. | - |

---

## 5. Estructura de Proyecto

```text
/src.android.ineter.vue
├── app
│   ├── src/main
│   │   ├── assets/web              <-- Código Fuente Frontend (Vue)
│   │   │   ├── js
│   │   │   │   ├── app.js          <-- Orquestador Vue (Composition API)
│   │   │   │   ├── syncService.js   <-- Capa de Persistencia y Metadatos
│   │   │   │   ├── photoService.js  <-- Gestión de Archivos de Imagen
│   │   │   │   ├── displayService.js <-- Helpers de Visualización
│   │   │   │   └── clonadorService.js <-- Lógica de Clonación
│   │   ├── java/com/cadicsa/inventario
│   │   │   ├── MainActivity.kt         <-- Orquestador Principal
│   │   │   ├── FormActivity.kt         <-- Orquestador de Formulario (Slim)
│   │   │   ├── AndroidBridge.kt        <-- Interfaz JS (Persistencia/Hardware)
│   │   │   └── utils
│   │   │       ├── FormImageHelper.kt  <-- Cámara y Multimedia
│   │   │       ├── FormWebViewHelper.kt <-- Configuración WebView
│   │   │       ├── MapHelper.kt        <-- Lógica de Mapa
│   │   │       └── SpatialNormalizer.kt <-- Fix de Locale (Punto/Coma)
│   │   └── res/layout                  <-- Interfaces Nativas (XML)
│   └── build.gradle.kts                <-- Configuración de Build
├── docs                                <-- Esta documentación
└── gradle.properties                   <-- Configuración JDK local
```

---

## 9. Arquitectura de Servicios Frontend (Vue.js)

Para reducir la complejidad del controlador principal (`app.js`) y mejorar la mantenibilidad, se ha implementado una capa de servicios en JavaScript que abstrae las operaciones críticas:

### 9.1 Servicios del Sistema
*   **`syncService.js` (Persistencia)**: 
    - Orquesta el guardado (`saveData`) y borrado (`deleteData`) de registros.
    - **Enriquecimiento**: Inyecta automáticamente metadatos de auditoría (`Fecha`, `Encuestador`) y espaciales (`LatLng`, `LocalProj`, `Localizacion`) antes de enviar el JSON a Android.
    - **Estandarización**: Asegura que las coordenadas UTM se envíen como `x` e `y` y las fechas en formato ISO conforme a .cursorrules.

*   **`photoService.js` (Multimedia)**:
    - Centraliza la carga de miniaturas (`loadPhotosFromDisk`) convirtiendo nombres de archivo a Base64 mediante el Bridge.
    - Gestiona el borrado físico de archivos en el almacenamiento del dispositivo.

*   **`displayService.js` (UI Helpers)**:
    - Encapsula la lógica de etiquetas (`getShortName`) y la construcción de strings informativos para la lista de registros (`getDisplayInfo`).

*   **`clonadorService.js` (Reglas de Negocio)**:
    - Define los campos comunes compartidos entre `PropietarioNatural` y `Entrevistado`.
    - Realiza la clonación de datos y metadatos de forma atómica.

### 9.2 Fábrica Contextual (`modelsFactory.js`)
Los modelos ya no se crean de forma aislada. La fábrica ahora utiliza un **Objeto de Contexto (`ctx`)** que contiene la ubicación y auditoría actual del mapa. Esto garantiza que todos los formularios nazcan con su contexto geográfico completo:
```javascript
const ctx = { lat, lng, x, y, loc, fecha, enc, idObject };
const nuevoModel = ModelsFactory.createFicha(ctx);
```

---

## 10. Notas de Mantenimiento Final

*   **Java Version**: El proyecto requiere **JDK 17** para compilar debido a las versiones recientes de Gradle/Android Plugin. Se ha configurado `gradle.properties` localmente para forzar esta versión sin afectar el `JAVA_HOME` del sistema.
*   **Splash Screen**: Implementado mediante un "About Dialog" en `MainActivity` que se muestra por 4 segundos al inicio, reemplazando la antigua pantalla de carga.
*   **Versionamiento Automático**: El `versionName` y `versionCode` se generan automáticamente basándose en timestamp de compilación.
*   **Cache-Busting**: Se utiliza una estrategia de sufijo en el cargado del WebView para asegurar que los cambios en los archivos `.js` se reflejen inmediatamente sin intervención del usuario.

---

---

## 8. Consultas Espaciales y Clonación de Datos

Se ha implementado una capa de lógica espacial avanzada para mejorar la recolección de datos en campo.

### 8.1 Lógica Espacial (JTS)
Debido a la ausencia de extensiones SpatiaLite nativas en algunos entornos y para mayor precisión en la nube de Android, se utiliza **JTS (Java Topology Suite)** en el backend (Kotlin) para realizar todas las operaciones geométricas:
*   **Contención (`ST_Contains`)**: Se recuperan datos cuyos puntos (Lat/Lng) caen dentro del polígono del predio seleccionado.
*   **Adyacencia (`ST_Intersects`)**: Se identifican predios vecinos que comparten límites con el seleccionado para recuperar sus datos.
*   **Optimización BBox**: Todas las consultas SQL filtran primero por *Bounding Box* (minX, minY, maxX, maxY) para minimizar el procesamiento geométrico en memoria.

### 8.2 Reglas de Validación y Creación
1.  **Creación de Encuesta**: Para iniciar una "Encuesta Catastral", el sistema solo requiere que exista al menos un **Entrevistado** registrado en el predio. La obligatoriedad de un Propietario fue eliminada para permitir mayor flexibilidad en campo.
2.  **Validación de Derecho Similar**: El campo "No Personas Similar Derecho" debe ser estrictamente **mayor que 0** para permitir el guardado de la encuesta.
3.  **Identificadores Técnicos**:
    - `IdPropiedad` (UUID): Generado automáticamente para cada nueva encuesta.
    - `IdSector`: Código de 3 dígitos usado para la nomenclatura de la encuesta.
4.  **Persistencia de Edad**: Se garantiza que la edad mínima aceptable en personas es **0**.

### 8.3 Clonación de Registros (Copy Action)
Permite duplicar información existente para acelerar la captura:
1.  **Origen**: Se puede copiar un dato del predio actual o de un predio vecino.
2.  **Destino**: La nueva ubicación se define por el punto de clic en el mapa.
3.  **Filtrado**: Se copian todos los campos del formulario, pero se **omiten las fotografías** y se generan nuevos metadatos (ID, Fecha, NumBoleta).
4.  **Flujo**: El sistema re-valida las rutas en la nueva ubicación, permitiendo al usuario re-catalogar el camino si es necesario.

### 8.3 Tablas Dinámicas
La interfaz muestra dos listas diferenciadas:
*   **Datos dentro del predio**: Puntos de inventario vinculados geográficamente al objeto seleccionado.
*   **Datos en predios adyacentes**: Registros de vecinos útiles para referencia o clonación.

---

## 9. Stack Tecnológico

### Android (Kotlin)
- **Gradle**: 8.4
- **Android Gradle Plugin**: 8.2.0
- **Kotlin**: 1.9.20
- **JTS Topology Suite**: 1.19.0 (Para lógica espacial)
- **compileSdk**: 34 (Android 14)
- **minSdk**: 24 (Android 7.0)

### Dependencias Android
- AndroidX Core KTX
- Google Maps SDK 18.2.0
- WebKit para WebView moderno
- Proj4J (Para proyecciones en backend)

### 9.2 Frontend (Web/Vue.js)
- **Vue 3**: Composition API (Sin build step)
- **Proj4.js**: Soporte para EPSG:32616 (UTM 16N) para Nicaragua
- **CSS3**: Diseño basado en Glassmorphism y Flexbox

---

## 10. Gestión de Capas y Visualización

### 10.1 Separación de Visualización (Tiles) y Lógica (WKT)

El sistema opera bajo una separación estricta entre lo que el usuario ve y cómo el sistema calcula:

*   **Visualización (Tiles para Rendimiento)**: Los tiles en la tabla `tiles` contienen la ortofoto con las poligonales de predios **quemadas** (baked). Esta es una optimización visual probada para mantener la fluidez del mapa en el dispositivo móvil, evitando el costo de renderizado vectorial masivo.
*   **Lógica y Consultas (WKT como Fuente de Verdad)**: Independientemente de lo que se muestre en los tiles, **todas las consultas espaciales** (selección de predio al hacer clic, recuperación de registros dentro del polígono, ubicación de municipales) se realizan exclusivamente contra la geometría **WKT** almacenada en la tabla `objects`.
*   **Independencia Técnica**: Esta arquitectura garantiza que la aplicación sea robusta: los tiles sirven para la orientación visual del usuario, mientras que los datos vectoriales garantizan la precisión matemática y la integridad de la información capturada. Esto también facilita la adición de nuevos predios en el futuro, ya que la lógica de consulta (JTS) funcionará inmediatamente al insertar el WKT, sin depender de la actualización de la cartografía raster.

2.  **Capa de Municipios**: Capa de soporte "invisible" utilizada por el motor JTS para la asignación automática de catálogos basados en la ubicación.
2.  **Capa de Municipios**: Capa de soporte "invisible" utilizada por el motor JTS para la asignación automática de catálogos basados en la ubicación.
3.  **Capas Viales (Rutas)**: Los módulos de rutas locales y nacionales están completamente implementados en el código y presentes en la base de datos (tablas `objects` y `tiles`). Sin embargo, se encuentran **deshabilitadas por diseño** en la interfaz de usuario de esta variante del proyecto.
4.  **Preservación de Código**: Esta desactivación es puramente a nivel de UI/Configuración para simplificar el flujo del encuestador, manteniendo toda la lógica técnica (procedimientos de cálculo, renderizado de líneas y filtros de base de datos) intacta para futuras activaciones o referencias técnicas.

