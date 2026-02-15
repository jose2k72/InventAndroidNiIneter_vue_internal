# Inventario ACERAS Vue - Android App

Aplicación Android híbrida para captura de datos de evaluación de aceras urbanas. Utiliza Vue.js embebido en un WebView nativo para combinar la flexibilidad del desarrollo web con el acceso a hardware del dispositivo.

## Stack Tecnológico

### Android (Kotlin)
- **Gradle**: 8.4
- **Android Gradle Plugin**: 8.2.0
- **Kotlin**: 1.9.20
- **compileSdk**: 34 (Android 14)
- **minSdk**: 24 (Android 7.0)
- **targetSdk**: 34

### Dependencias Android
- AndroidX Core KTX
- Google Maps SDK 18.2.0
- Google Location Services 21.0.1
- WebKit para WebView moderno
- Coroutines para operaciones asíncronas

### Frontend (Vue.js)
- **Vue 3**: Composition API (CDN, sin build)
- **CSS**: Variables CSS, diseño moderno responsive
- **Proj4.js**: Reproyección de coordenadas EPSG:4326 → CRTM05

---

## Formularios Disponibles

### 1. Formulario Acera - **ACTIVO**
- Evaluación Estructural (grietas, huecos, desnudamiento, escalonamiento, drenaje)
- Evaluación Funcional (pendientes, ancho, obstrucciones, accesibilidad, rejillas)  
- Factor de Actividad (proximidad a escuelas, hospitales, etc.)
- Cálculo automático del Índice de Condición de Aceras

### 2. Formulario Costo - **DESHABILITADO (pero funcional)**
> ⚠️ El componente Vue está **completamente funcional**. Actualmente deshabilitado en `index.html`. Para habilitarlo, descomentar la sección correspondiente.

- Obras Preliminares
- Colocación de Tubería Pluvial
- Colocación de Tragantes
- Construcción de Aceras
- Construcción de Cordón y Cuneta
- Obras Complementarias
- Cálculo automático de montos y total general

---

## Estructura del Proyecto

```
src.android.aceras.vue/
├── app/
│   ├── build.gradle.kts           # Configuración del módulo
│   └── src/main/
│       ├── AndroidManifest.xml    # Manifiesto Android
│       ├── java/com/cadicsa/inventario/
│       │   ├── MainActivity.kt    # Actividad principal con mapa
│       │   └── FormActivity.kt    # Actividad con WebView para Vue
│       ├── res/
│       │   ├── layout/            # Layouts XML
│       │   ├── values/            # Recursos (strings, colors, themes)
│       │   ├── drawable/          # Iconos vectoriales
│       │   └── xml/               # FileProvider paths
│       └── assets/web/
│           ├── index.html         # Entrada Vue.js
│           ├── css/styles.css     # Estilos modernos
│           └── js/
│               ├── app.js              # App Vue principal
│               ├── vue.global.prod.js  # Vue 3 Core
│               ├── proj4.min.js        # Reproyección coordenadas
│               └── components/
│                   ├── FormAcera.js    # Formulario Acera (activo)
│                   └── FormCosto.js    # Formulario Costo (deshabilitado)
├── docs/                          # Documentación técnica
├── gradle/wrapper/
├── build.gradle.kts               # Build principal
├── settings.gradle.kts            # Configuración proyecto
└── gradle.properties              # JDK 17 configurado localmente
```

---

## Configuración Inicial

1. **Google Maps API Key**: Editar `res/values/strings.xml` y reemplazar `YOUR_API_KEY_HERE`

2. **JDK 17**: Ya configurado en `gradle.properties` para este proyecto (no afecta `JAVA_HOME` global)

3. **Sincronizar Gradle**: Abrir en Android Studio y sincronizar

---

## Documentación Adicional

Para información detallada sobre:
- Arquitectura híbrida Vue + Android
- Sistema de captura de fotos (prefijos inteligentes)
- API Bridge (interfaz Javascript)

- API Bridge (interfaz Javascript)
 
 Ver:
 - [`docs/ARQUITECTURA_TECNICA.md`](docs/ARQUITECTURA_TECNICA.md)
 - [`docs/FUNCIONALIDADES_ESPACIALES.md`](docs/FUNCIONALIDADES_ESPACIALES.md) (Optimización JTS y algoritmos espaciales)
 - [`docs/GUIA_DESPLIEGUE_VARIANTES.md`](docs/GUIA_DESPLIEGUE_VARIANTES.md) (Cómo crear múltiples apps con este código base)

---

## Migración desde proyecto anterior

Este proyecto reemplaza:
- AngularJS → Vue 3
- Support Libraries → AndroidX
- Java → Kotlin
- Gradle 4.6 → Gradle 8.4
- compileSdkVersion 25 → 34
