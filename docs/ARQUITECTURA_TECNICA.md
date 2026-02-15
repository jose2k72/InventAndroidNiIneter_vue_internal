# Documentación Técnica: Inventario de Aceras (Vue + Android)

## 1. Arquitectura General

Esta aplicación utiliza una arquitectura híbrida donde la lógica de presentación y el formulario residen en una aplicación web (Vue.js) embebida dentro de una aplicación Android nativa (Kotlin) mediante un `WebView`.

### Componentes Principales

*   **Frontend (Web/Vue.js)**:
    *   Ubicación: `app/src/main/assets/web/`
    *   Tecnología: Vue 3 (Composition API), HTML5, CSS3.
    *   Responsabilidad: Mostrar el formulario, validar datos de entrada, calcular índices automáticamente.
*   **Backend (Android Nativo)**:
    *   Ubicación: `app/src/main/java/com/cadicsa/inventario/`
    *   Tecnología: Kotlin, Android SDK.
    *   Responsabilidad: Acceso a hardware (Cámara, GPS), manejo de archivos, persistencia en SQLite/GeoPackage, y contenedor del WebView.
*   **Puente (Bridge)**:
    *   Mecanismo: `JavascriptInterface`.
    *   Responsabilidad: Comunicación bidireccional entre Vue y Android.

---

## 2. Formularios Disponibles

La aplicación cuenta con dos formularios de captura de datos:

### 2.1 Formulario Acera (`FormAcera.js`) - **ACTIVO**

Formulario principal para la evaluación de condición de aceras urbanas. Incluye:

*   **Evaluación Estructural**: Grietas, huecos, desnudamiento, escalonamiento, drenaje.
*   **Evaluación Funcional**: Pendientes (transversal/longitudinal), ancho libre, obstrucciones, accesibilidad, tapas/rejillas.
*   **Factor de Actividad**: Proximidad a escuelas, servicios gubernamentales, terminales de bus, hospitales, zonas de alta población.
*   **Cálculo Automático**: Índice de Condición de Aceras (ICA).

### 2.2 Formulario Costo (`FormCosto.js`) - **DESHABILITADO (pero funcional)**

> ⚠️ **Nota**: Este formulario está actualmente **comentado/deshabilitado** en `index.html`, pero el componente Vue es **completamente funcional** y puede habilitarse cuando sea necesario.

Formulario para estimación de costos de reparación/construcción. Incluye:

*   **Obras Preliminares**: Demolición, limpieza, etc.
*   **Colocación de Tubería Pluvial**: Materiales y mano de obra.
*   **Colocación de Tragantes**: Unidades y costos.
*   **Construcción de Aceras**: Área y costo por m².
*   **Construcción de Cordón y Cuneta**: Metros lineales.
*   **Obras Complementarias**: Varios.
*   **Cálculo Automático**: Total general del presupuesto.

Para habilitarlo, descomentar la sección correspondiente en `assets/web/index.html`.

---

## 3. Integración de Cámara y Fotos

El sistema de captura de fotos es uno de los puntos más críticos, requiriendo una coordinación precisa entre el formulario web y el sistema operativo.

### Flujo de Captura

1.  **Usuario (Web)**: Presiona el botón "📷 CAPTURAR FOTO" en el formulario.
2.  **Vue (`FormAcera.js`)**:
    *   Ejecuta la función `capturarFoto()`.
    *   **Validación Estricta**: Verifica que existan datos en los campos `Localizacion` y `CodigoCamino`.
        *   *Si falla*: Muestra alerta y detiene el proceso.
    *   **Construcción de Prefijo**: Concatena `Localizacion` + `CodigoCamino` (ej. `"SanJose_Ruta101"`).
    *   **Llamada al Puente**: Invoca `Android.Camera(prefijo)`.
3.  **Android (`FormActivity.kt`)**:
    *   Recibe el `prefijo` en el método anotado con `@JavascriptInterface`.
    *   Solicita permisos de cámara/almacenamiento si no están concedidos.
    *   Lanza el `Intent` de cámara nativa.
4.  **Sistema de Archivos (Android)**:
    *   Crea el archivo físico en: `/storage/emulated/0/CADIC.ACERAS/`.
    *   **Nomenclatura**: `PREFIJO_TIMESTAMP.jpg`
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
/src.android.aceras.vue
├── app
│   ├── src/main
│   │   ├── assets/web              <-- Código Fuente Frontend (Vue)
│   │   │   ├── js
│   │   │   │   ├── components
│   │   │   │   │   ├── FormAcera.js    <-- Formulario Acera (ACTIVO)
│   │   │   │   │   └── FormCosto.js    <-- Formulario Costo (deshabilitado)
│   │   │   │   ├── app.js              <-- Punto de entrada Vue
│   │   │   │   ├── vue.global.prod.js  <-- Librería Vue 3 (Core)
│   │   │   │   └── proj4.min.js        <-- Librería Proyecciones Geográficas
│   │   │   ├── css                     <-- Estilos
│   │   │   └── index.html              
│   │   ├── java/com/cadicsa/inventario
│   │   │   ├── MainActivity.kt         <-- Menú Principal / Mapa
│   │   │   └── FormActivity.kt         <-- Contenedor del Formulario / Cámara
│   │   └── res/layout                  <-- Interfaces Nativas (XML)
│   └── build.gradle.kts                <-- Configuración de Build
├── docs                                <-- Esta documentación
└── gradle.properties                   <-- Configuración JDK local
```

---

## 6. Notas de Mantenimiento

*   **Java Version**: El proyecto requiere **JDK 17** para compilar debido a las versiones recientes de Gradle/Android Plugin. Se ha configurado `gradle.properties` localmente para forzar esta versión sin afectar el `JAVA_HOME` del sistema.
*   **Splash Screen**: Implementado mediante un "About Dialog" en `MainActivity` que se muestra por 4 segundos al inicio, reemplazando la antigua pantalla de carga.
*   **Versionamiento Automático**: El `versionName` y `versionCode` se generan automáticamente basándose en timestamp de compilación.

---

---

## 8. Consultas Espaciales y Clonación de Datos

Se ha implementado una capa de lógica espacial avanzada para mejorar la recolección de datos en campo.

### 8.1 Lógica Espacial (JTS)
Debido a la ausencia de extensiones SpatiaLite nativas en algunos entornos, se utiliza **JTS (Java Topology Suite)** en el backend (Kotlin) para realizar operaciones geométricas precisas:
*   **Contención (`ST_Contains`)**: Se recuperan datos cuyos puntos (Lat/Lng) caen dentro del polígono del predio seleccionado.
*   **Adyacencia (`ST_Intersects`)**: Se identifican predios vecinos que comparten límites con el seleccionado para recuperar sus datos.
*   **Optimización BBox**: Todas las consultas SQL filtran primero por *Bounding Box* (minX, minY, maxX, maxY) para minimizar el procesamiento geométrico en memoria.

### 8.2 Clonación de Registros (Copy Action)
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

### Frontend (Web/Vue.js)
- **Vue 3**: Composition API (Sin build step)
- **Proj4.js**: Soporte para EPSG:8908 (CRTM05) en frontend
- **CSS3**: Diseño basado en Glassmorphism y Flexbox
