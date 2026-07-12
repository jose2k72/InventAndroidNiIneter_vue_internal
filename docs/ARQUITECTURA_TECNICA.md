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

## 3. Integración de Cámara In-App (CameraX) y Motor OCR Offline (ML Kit)

El sistema de captura fotográfica y reconocimiento óptico de caracteres (OCR) es uno de los módulos más críticos, requiriendo un acoplamiento estrecho y de alto rendimiento entre la interfaz híbrida (Vue) y el hardware de la tablet (Kotlin).

### 3.1 Flujo de Captura Fotográfica Estándar (Fachadas y Documentos)

1.  **Disparo (Web/Vue)**: El usuario pulsa el botón de captura en el formulario (ej: "Foto Frente" o "Agregar Documento").
2.  **Preparación (Vue)**: La app valida los metadatos necesarios, construye un prefijo formateado con el ID de la encuesta (`NoEncuesta`) y llama al puente: `Android.Camera(prefijo)`.
3.  **Captura Nativa (Android/CameraX)**:
    *   `FormActivity.kt` lanza la cámara interna integrada (desarrollada con **CameraX**).
    *   Se utiliza un flujo basado en `ProcessCameraProvider` enlazando en paralelo el caso de uso `Preview` (visor en vivo) y `ImageCapture` (captura en alta calidad).
    *   **Nomenclatura física**: Las fotos se guardan en el almacenamiento privado de la app con el nombre `{PREFIJO}_{TIMESTAMP}.jpg`.
    *   **Inyección EXIF**: Si el dispositivo cuenta con señal GPS georreferenciada activa al abrir el formulario, Kotlin captura la latitud y longitud, y las inyecta en formato de grados racionales en la cabecera EXIF (`ExifInterface`) de la imagen JPEG antes de guardarla.
4.  **Retorno a Vue**: Al finalizar, Android convierte la imagen capturada a miniatura Base64 e invoca `window.addPhoto(nombreArchivo, base64)` para renderizarla en la interfaz web de manera inmediata.

---

### 3.2 Arquitectura y Diseño del Motor OCR Offline

Para digitalizar de forma ágil y offline cédulas de identidad, números de finca catastrales y registros RUC, se ha integrado un flujo de escaneo continuo en tiempo real basado en **Google ML Kit Text Recognition** y **CameraX ImageAnalysis**.

#### A. Visor de Captura de Rendija Estrecha (Single-Line Visor)
Para evitar que el reconocedor procese bloques de texto adyacentes irrelevantes (como etiquetas del documento, firmas u otros metadatos), el visor de captura fuerza un recuadro o visor central restringido de tamaño estático (`320dp` de ancho por `72dp` de alto). 
* El flujo nativo del analizador recorta la imagen física capturada exactamente sobre las coordenadas de esta rendija en la pantalla antes de enviarla al reconocedor de texto.
* Para asegurar la alocación de coordenadas y evitar deformaciones o desfases de recorte, tanto el caso de uso de `Preview` como el de `ImageCapture` y `ImageAnalysis` se homologan al mismo ratio de aspecto (`AspectRatio.RATIO_4_3`).

#### B. Heurística de Selección de Candidatos (Text Size Heuristic)
Cuando el documento contiene etiquetas o descripciones cercanas al valor real (por ejemplo, la palabra "CÉDULA" o "SEXO" cerca del número), el sistema nativo analiza las dimensiones de todos los bloques de texto detectados:
* Se calcula el tamaño de fuente relativo de cada bloque utilizando la altura de su caja contenedora (`BoundingBox.height()`).
* El motor selecciona automáticamente la cadena de texto que posee el **mayor tamaño de fuente** (el texto físicamente más grande dentro de la rendija), descartando efectivamente las etiquetas secundarias y de menor tamaño.

#### C. Separación Lógica de Nombres y Apellidos
Dado que el visor opera bajo un esquema estrecho de lectura de una sola línea, la captura del nombre del propietario se divide en dos fases/botones independientes:
* **Escaneo de Nombres**: Lee y asigna `Primer Nombre` y `Segundo Nombre`.
* **Escaneo de Apellidos**: Lee y asigna `Primer Apellido` y `Segundo Apellido`.
Esto garantiza que la tasa de precisión del reconocimiento se mantenga al máximo al no intentar procesar bloques de texto multilinea complejos.

#### D. Validación e Integración Reactiva post-OCR
Una vez que el motor nativo retorna el texto leído mediante `window.onOcrResult(fieldName, extractedText)` a `app.js`:
* Si el campo afectado es `'Identificacion'`, el sistema invoca de forma inmediata la validación asociada al formulario activo en el ciclo de vida (registrada de forma dinámica en `vueAppContext.validarIdentificacion`).
* Los formularios de **Sujeto Natural**, **Entrevistado** y **Sujeto Jurídico** se encargan de registrar su propio método de validación al montarse (`onMounted`) y limpiarlo al desmontarse (`onUnmounted`).
* Esto fuerza la validación y el formateo automático inmediato (por ejemplo, autocompletado en mayúsculas e inserción de guiones en las cédulas de identidad nicaragüenses) sin necesidad de que el usuario interaccione con la caja de texto.

---

### 3.3 Flujo de Importación Masiva de Imágenes (File Importer)

Como alternativa a la captura en tiempo real, el sistema permite la importación masiva de imágenes preexistentes navegando por el sistema de archivos del dispositivo, operando indistintamente a nivel visual como si hubiesen sido tomadas con la cámara.

1.  **Llamado a Importación (Web/Vue)**: El usuario presiona el botón "IMPORTAR FOTOS". Vue inicializa la vista global `FileBrowser` y oculta temporalmente el formulario activo.
2.  **Exploración de Directorios**: El componente interactúa en tiempo real con Android mediante el puente nativo llamando a `Android.listDirectory(path)`, recibiendo la lista de carpetas y archivos en formato JSON para navegación interactiva sin depender de la UI estandar confusa de Android.
3.  **Selección y Confirmación**:
    *   Si es importación de **Foto del Frente** (campo obligatorio único): la interfaz fuerza la selección de **una sola foto** (`singleselection=true` en `FileBrowser`). El formulario permanece oculto hasta que Android termina de copiar el archivo y notifica.
    *   Si es importación de **Fotos Adicionales**: el usuario puede seleccionar múltiples archivos. Vue recolecta las rutas absolutas y llama a `Android.processSelectedFiles(jsonPaths, prefijo)`, cerrando el `FileBrowser` inmediatamente.
4.  **Procesamiento Asíncrono (Kotlin)**:
    *   La copia física de los archivos originales al directorio privado de la app se ejecuta en un hilo secundario (`Thread`). **Los archivos originales nunca se mueven ni se alteran.**
    *   **Nomenclatura (Timestamp con milisegundos)**: Cada archivo procesado recibe un timestamp único con milisegundos (`yyyyMMdd_HHmmss_SSS`) generado dentro del bucle, garantizando unicidad absoluta incluso en importaciones rápidas: `{PREFIJO}_20240510_142030_123.jpg`.
    *   Se notifica al Media Scanner del sistema operativo para registrar las nuevas copias físicas.
    *   Android envía la versión miniatura (Base64) de vuelta a Vue llamando individualmente a `window.addPhoto`.
5.  **Reintegración Reactiva y Control de Cierre (Vue)**:
    *   **Foto del Frente**: el `FileBrowser` permanece visible hasta recibir la confirmación de `window.addPhoto`. Solo entonces `PhotoService.handleAndroidPhoto` asigna el nombre al campo `formData.FotoFrente` y llama a `cancelFileBrowser()`, garantizando que el watcher de `FormFicha` detecte el valor correcto al montarse. Esto elimina el *race condition* donde el componente se remontaba antes de que el archivo estuviese disponible en disco.
    *   **Fotos Adicionales**: el `FileBrowser` se cierra inmediatamente tras confirmar la selección; las fotos se inyectan reactivamente en el arreglo del formulario al llegar los callbacks de `window.addPhoto`.

---

### 3.4 Exploración de Directorios y Exportación de Fotos (File Exporter)

El sistema permite a los usuarios exportar imágenes almacenadas localmente en la app a directorios específicos del dispositivo utilizando la misma interfaz del explorador de archivos.

1.  **Llamado a Exportación (Vue)**: El usuario pulsa "Exportar foto". Vue activa el estado reactivo `isExportingPhoto=true` y despliega la vista global `FileBrowser` en modo de navegación de carpetas.
2.  **Exploración de Carpetas (`FileBrowser.js` con `folderSelection`)**: 
    *   Al estar activo `folderSelection`, el componente oculta los archivos comunes de imagen y lista únicamente los subdirectorios.
    *   La barra de herramientas del pie muestra la ruta actual navegada y expone el botón verde **"📁 Seleccionar carpeta"**.
3.  **Confirmación y Copia Nativa (Android Bridge)**:
    *   Al presionar el botón de selección, se emite el evento `@select-folder` pasando la ruta absoluta.
    *   Vue invoca al puente nativo: `Android.exportPhoto(nombreArchivo, rutaDestino)`.
    *   Kotlin ejecuta la copia asíncrona del archivo JPEG utilizando `File.copyTo()`.
    *   Se actualiza el Media Scanner para que el archivo sea reconocido inmediatamente en la galería de fotos del sistema operativo Android.
    *   Se muestra un mensaje flotante (Toast) de confirmación con el resultado.

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
| `Android.listDirectory(path)` | Explora el sistema de archivos local (Retorna JSON). | `path` (String) |
| `Android.processSelectedFiles(paths, prefijo)` | Copia y renombra masivamente fotos seleccionadas. | `paths` (String JSON), `prefijo` (String) |
| `Android.exportPhoto(filename, destinationPath)` | Copia una foto a una carpeta de almacenamiento externo. | `filename` (String), `destinationPath` (String) |
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
│   │   │   │   ├── app.js          <-- Orquestador Vue (Composition API) - Delgado/Slim
│   │   │   │   ├── workflowService.js <-- Reglas de Negocio y Validación de Flujo (NUEVO)
│   │   │   │   ├── syncService.js   <-- Capa de Persistencia y Recepción de Datos Android
│   │   │   │   ├── photoService.js  <-- Gestión de Archivos y Recepción de Cámara Android
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
*   **`workflowService.js` (Cerebro de Negocio)**:
    - Centraliza las validaciones de "quién puede crear a quién".
    - Gestiona los límites de registros (ej. un solo Entrevistado, una sola Ficha).
    - Valida dependencias jerárquicas antes de iniciar la creación.

*   **`syncService.js` (Persistencia y Puentes)**:
    - Orquesta el guardado (`saveData`) y borrado (`deleteData`).
    - **Bridge Handler**: Maneja la carga de datos existentes (`handleLoadData`) inyectada desde el mapa de Android.
    - **Enriquecimiento**: Inyecta automáticamente metadatos de auditoría y espaciales.

*   **`photoService.js` (Multimedia y Eventos)**:
    - **Bridge Handler**: Procesa las fotos recibidas de Android (`handleAndroidPhoto`) y sincroniza el estado reactivo de Vue.
    - **Gestión Transaccional**: Implementa métodos `commit()` y `rollback()` para garantizar que los archivos en disco solo se mantengan si el registro se guarda exitosamente.

*   **`conversionService.js` (Clonación de Identidades)**:
    - Maneja la transformación de registros entre tipos (ej. Crear **Entrevistado** desde un **Sujeto Natural** existente).
    - **Clonación Inteligente (Higiene de Datos)**: Implementa mapeo dinámico de roles (Propietario 1 / Poseedor 2) y limpia automáticamente el campo de relación con el dueño si el destino es Propietario Pleno, evitando inconsistencias ("churres").

*   **`displayService.js` (UI Helpers)**:
    - Encapsula la lógica de etiquetas y la construcción de strings informativos.

*   **`clonadorService.js` (Utilidades de Clonación)**:
    - Provee el motor de copia profunda de campos basado en diccionarios de mapeo.

### 9.2 Fábrica Contextual (`modelsFactory.js`)
Los modelos ya no se crean de forma aislada. La fábrica ahora utiliza un **Objeto de Contexto (`ctx`)** que contiene la ubicación y auditoría actual del mapa. Esto garantiza que todos los formularios nazcan con su contexto geográfico completo:
```javascript
const ctx = { lat, lng, x, y, loc, fecha, enc, idObject };
const nuevoModel = ModelsFactory.createFicha(ctx);
```

---

## 10. Notas de Mantenimiento Final

*   **Java Version (CRÍTICO - NO CAMBIAR)**: El proyecto **REQUIERE ESTRICTAMENTE JDK 17** para compilar correctamente (configurado en `gradle.properties`, `app/build.gradle.kts` y `.vscode/settings.json`).
    **PROHIBIDO CAMBIAR A JDK 21 O SUPERIORES**. 
    *Razón:* Existe un bug de incompatibilidad entre la herramienta interna `jlink` (introducida a partir de Java 21) y los archivos construidos del SDK de Android 34 (específicamente el archivo `core-for-system-modules.jar`). Si se intenta forzar Java 21, el proceso de Gradle arrojará siempre el fallo `jdk.tools.jlink.plugin.PluginException: ModuleTarget is malformed`. Todo el entorno, plugins y compatibilidades deben permanecer intactos en **Java 17**.
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
- **Borrado en Cascada**: Si se elimina el registro de "Familiares", no afecta a la encuesta, pero si se elimina el único **"Sujeto Natural"**, el sistema ejecuta un borrado en cascada automático de su composición familiar vinculada.
- **Validación de Borrado**: No se permite eliminar al **Entrevistado** si ya existe una **Ficha** (Encuesta) vinculada, protegiendo la integridad referencial.
- **Relación Entrevistado-Propietario**: Si el entrevistado es el mismo propietario, el sistema permite una creación silenciosa para evitar doble entrada de datos mediante el `ConversionService`.

---

## 2. Gestión Transaccional de Archivos

El ciclo de vida de las fotografías está estrictamente controlado por las acciones del usuario. El sistema distingue entre dos tipos de fotos con lógicas de tracking independientes:

### 2.1 Fotos Generales (`formData.Imagenes`)

Se rastrean mediante tres arreglos reactivos en `app.js`:

| Arreglo | Contenido |
|---|---|
| `fotosOriginales` | Snapshot inmutable de las fotos de la BD al abrir el registro |
| `fotosNuevas` | Fotos capturadas/importadas en la sesión actual (ya en disco) |
| `fotosMarcadasBorrar` | Fotos originales que el usuario eliminó (aún en disco, pendientes) |

- **Rollback (Cancelar)**: Las `fotosNuevas` se borran físicamente del disco. Las `fotosMarcadasBorrar` se descartan sin borrar — los archivos originales quedan intactos. Al reabrir el registro, la DB recarga el estado original.
- **Commit (Guardar)**: Las `fotosMarcadasBorrar` se eliminan físicamente del disco y todos los arreglos de tracking se limpian.

### 2.2 Foto del Frente del Predio (`formData.FotoFrente`)

Campo obligatorio único con tracking propio independiente de `Imagenes`:

- **`fotoFrenteOriginal`** (`ref` en `app.js`): Captura el nombre del archivo de FotoFrente en el momento de abrir el registro. Se inicializa en `updateData()` y se limpia a `''` en `resetForm()` (registro nuevo).
- **Rollback (Cancelar)**: Si se capturó/importó una nueva FotoFrente, el archivo nuevo se borra del disco (estaba en `fotosNuevas`). `volver()` limpia `formData`, por lo que al reabrir el registro la FotoFrente original de la BD se muestra correctamente.
- **Commit (Guardar) con reemplazo**: Si `formData.FotoFrente !== fotoFrenteOriginal`, `commit()` borra el archivo viejo del disco, evitando archivos huérfanos.
- **Eliminar FotoFrente original**: `handleAndroidDelete` detecta si el archivo eliminado es la FotoFrente original (comparando con `fotoFrenteOriginal`) y la marca en `fotosMarcadasBorrar` para borrado diferido, manteniendo el archivo seguro hasta confirmar con "Guardar".

### 2.3 Control de Cierre del FileBrowser (Anti Race Condition)

El `FileBrowser` se cierra en momentos distintos según el tipo de importación:

- **Fotos Adicionales**: `onFilesImported` llama a `cancelFileBrowser()` síncronamente tras despachar el trabajo a Kotlin. El `FileBrowser` se cierra de inmediato.
- **Foto del Frente**: `onFilesImported` NO cierra el `FileBrowser`. El cierre ocurre en `PhotoService.handleAndroidPhoto`, **después** de que Kotlin haya copiado el archivo, notificado vía `window.addPhoto`, y el campo `formData.FotoFrente` se haya actualizado. Esto garantiza que el watcher de `FormFicha` (`Vue.watch(() => formData.FotoFrente, cargarFotoFrente)`) se dispare con el valor correcto al montarse el componente.

---

## 3. Validaciones Específicas de Formularios
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
*   **Lógica y Consultas (WKB/WKT como Fuente de Verdad)**: Independientemente de lo que se muestre en los tiles, **todas las consultas espaciales** (selección de predio al hacer clic, recuperación de registros dentro del polígono, ubicación de municipales) se realizan exclusivamente contra la geometría almacenada en la tabla `objects`. La aplicación puede usar tanto `WKT` (Well-Known Text) como `WKB` (Well-Known Binary), prefiriendo `WKB` en consultas directas (ej. en `SpatialHelper.kt`) por su mayor rapidez y eficiencia en la deserialización.
*   **Independencia Técnica**: Esta arquitectura garantiza que la aplicación sea robusta: los tiles sirven para la orientación visual del usuario, mientras que los datos vectoriales garantizan la precisión matemática y la integridad de la información capturada. Esto también facilita la adición de nuevos predios en el futuro, ya que la lógica de consulta (JTS) funcionará inmediatamente al insertar el WKT, sin depender de la actualización de la cartografía raster.

2.  **Capa de Municipios**: Capa de soporte "invisible" utilizada por el motor JTS para la asignación automática de catálogos basados en la ubicación.
2.  **Capa de Municipios**: Capa de soporte "invisible" utilizada por el motor JTS para la asignación automática de catálogos basados en la ubicación.
3.  **Capas Viales (Rutas)**: Los módulos de rutas locales y nacionales están completamente implementados en el código y presentes en la base de datos (tablas `objects` y `tiles`). Sin embargo, se encuentran **deshabilitadas por diseño** en la interfaz de usuario de esta variante del proyecto.
4.  **Preservación de Código**: Esta desactivación es puramente a nivel de UI/Configuración para simplificar el flujo del encuestador, manteniendo toda la lógica técnica (procedimientos de cálculo, renderizado de líneas y filtros de base de datos) intacta para futuras activaciones o referencias técnicas.

