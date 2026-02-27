# INETER CADIC Vue - Android App

Aplicación Android híbrida para la captura de encuestas catastrales en campo (INETER CADIC). Utiliza Vue.js embebido en un WebView nativo para combinar la flexibilidad del desarrollo web con el acceso a hardware del dispositivo y persistencia robusta.

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
- **Componentes Reactivos**: Modulares, estructurados para control de estado local

---

## Formularios Disponibles (Encuesta Catastral)

El sistema soporta una estructura compleja de recolección georreferenciada, dividida en múltiples componentes modulares:

### 1. 📋 Encuesta Catastral (`FormEncuestaCatastral.js`)
- Formulario base o general (Ficha DTO) para captura de predios.
- Manejo de sector e identificadores clave de la propiedad.

### 2. 👤 Propietario Natural (`FormPropietarioNatural.js`)
- Datos de identificación, situación civil y dirección del propietario humano.
- Selección avanzada de catálogos (ej. Profesión) y jerarquía geográfica (Departamento/Municipio).

### 3. 🏢 Propietario Jurídico (`FormPropietarioJuridica.js`)
- Gestión de personas jurídicas o entidades socias del predio.

### 4. 🎤 Entrevistado (`FormEntrevistado.js`)
- Información de la persona que brinda los datos durante el levantamiento.
- Funcionalidad especial: **Auto-creación directa (one-click) desde Propietario Natural** si la misma persona da la entrevista.

### 5. 👨‍👩‍👧‍👦 Composición Familiar (`FormFamiliares.js`)
- Levantamiento de la estructura familiar del predio.
- Permite agregar múltiples integrantes.
- Validación estricta y dependencia lógica de la existencia de un "Propietario Natural" base.

*(Nota: Históricamente, el sistema surgió de un marco de "Aceras y Costos", cuyos formularios se mantienen únicamente como material de referencia técnica para lógica de negocio antigua).*

---

## Selectores Globales de Catálogo

El aplicativo ha integrado selectores interactivos avanzados para mejorar la usabilidad web dentro del WebView móvil:

- **`CatalogoSelectorGrande.js`**: Reemplaza combos nativos (Selects) por un componente de pantalla completa con barra de búsqueda, lazy loading e `IntersectionObserver`. Pensado para catálogos extensos (ej. Profesiones).
- **`CatalogoSelectorTwoLevels.js`**: Selector jerárquico apilado. Implementado para catálogos combinados como "Departamento y Municipio", permitiendo filtrar municipios solo del departamento seleccionado y guardando directamente su identificador compuesto final.

---

## Estructura del Proyecto

```text
src.android.ineter.vue/
├── app/
│   ├── build.gradle.kts           
│   └── src/main/
│       ├── AndroidManifest.xml    
│       ├── java/com/cadicsa/inventario/
│       │   ├── MainActivity.kt    
│       │   └── FormActivity.kt    
│       ├── res/                   
│       └── assets/web/
│           ├── index.html         # Entrada Vue.js
│           ├── css/styles.css     # Estilos modernos
│           └── js/
│               ├── app.js                          # State principal y Orquestación
│               ├── vue.global.prod.js              # Vue 3 Core
│               └── components/
│                   ├── FormEncuestaCatastral.js
│                   ├── FormPropietarioNatural.js
│                   ├── FormPropietarioJuridica.js
│                   ├── FormEntrevistado.js
│                   ├── FormFamiliares.js
│                   ├── CatalogoSelectorGrande.js
│                   └── CatalogoSelectorTwoLevels.js
├── docs/                          # Documentación técnica
├── build.gradle.kts               # Build principal
└── settings.gradle.kts            # Configuración proyecto
```

---

## Documentación Adicional

Para información detallada técnica, se han segmentado documentos puntuales en el directorio `docs/`:

- [`docs/ARQUITECTURA_TECNICA.md`](docs/ARQUITECTURA_TECNICA.md) (Arquitectura híbrida global)
- [`docs/SELECTORES_CATALOGO_GLOBAL.md`](docs/SELECTORES_CATALOGO_GLOBAL.md) (Especificación, eventos y optimización WebView de los Catálogos)
- [`docs/CHANGELOG.md`](docs/CHANGELOG.md) (Bitácora cronológica de actualizaciones y reglas de negocio)
