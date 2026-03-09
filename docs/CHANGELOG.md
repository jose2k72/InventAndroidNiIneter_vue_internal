# Changelog - INETER CADIC (Encuesta Catastral)

## [2026-03-08 - Noche] - Modelo de Derecho Parcelario Centrado en el Sujeto

### ⚖️ Migración de Tenencia y Derechos
- **Desacoplamiento Predial**: Se eliminó la sección de "Derecho sobre la Parcela" y "A Favor de Terceros" del formulario de **Ficha**, trasladando toda la lógica de tenencia a las personas.
- **SujetoNatural Empoderado**: El modelo `SujetoNatural` ahora porta el derecho legal sobre el predio mediante los campos:
    - `DerehoParcelaCatalog` (Tipo de derecho).
    - `NoPersonasSimilarDerecho` (Cuantificación de titulares).
    - `RelacionConPropietarioCatalog` (Vínculo con el dueño legal).
- **Eliminación de Redundancia**: Se suprimió el campo booleano `TieneRelacionConPropietario`, ya que el sistema ahora infiere la necesidad de relación basándose en el tipo de derecho de forma dinámica.

### 🎨 Mejoras en la Interfaz y Experiencia (UI/UX)
- **Visualización de Roles en Listas**: El `DisplayService.js` fue actualizado para mostrar el rol o vínculo del sujeto junto a su nombre en las listas de registros (ej: `[PROP.]`, `[Hijo(a)]`, `[Inquilino]`).
- **Lógica Condicional en FormSujetoNatural**: Implementación de un selector de relación que solo aparece cuando el derecho seleccionado NO es "Propietario (Dominio Pleno)".
- **Limpieza de Ficha**: Simplificación drástica del formulario de encuesta física, renumerando las secciones restantes (Uso, Documentos, Conflictos, etc.).

### 🛠️ Backend y Persistencia
- **Sincronización de DTOs**: Actualización de `SujetoNatural.cs` y `Ficha.cs` en el Core de C# para alineación total con el nuevo paradigma.
- **Validación de Datos**: Los modelos en `modelsFactory.js` fueron actualizados para asegurar que la persistencia JSON coincida con los nuevos requerimientos del backend.

---

## [2026-03-08 - Tarde] - Refactorización Estructural de Modelos y Estandarización Técnica

### 🏗️ Renombramiento de Modelos (Sujeto y Ficha)
- **Unificación Semántica**: Renombrado de todas las capas de `PropietarioNatural` a **`SujetoNatural`** y de `PropietarioJuridico` a **`SujetoJuridico`**.
- **Identidad de Ficha**: El término técnico `EncuestaCatastral` ha sido reemplazado por **`Ficha`** en archivos y lógica interna, manteniendo el nombre visual para el usuario.
- **Sincronización de Componentes**: Renombrado de archivos físicos (`FormSujetoNatural.js`, `FormSujetoJuridico.js`, `FormFicha.js`) y sus etiquetas de registro en Vue.

### 📅 Estandarización de Datos Operativos (JSON)
- **Fechas ISO 8601**: Implementación de captura y persistencia estrictamente en formato `YYYY-MM-DD`, con utilidades de conversión para visualización local.
- **Auditoría Minimalista**: El campo `Encuestador` ahora almacena automáticamente solo las iniciales del usuario (ej: "JB").
- **Coordenadas Cartesianas**: Estandarización de `LocalProj` usando claves **`x`** e **`y`** en minúsculas, alineándose con estándares de geometría.

### 🛠️ Mejoras en el Backend (C#)
- **Alineación de DTOs**: Las clases C# fueron renombradas y sincronizadas con el frontend.
- **Nulabilidad Segura**: Se hizo nullable el campo `FechaRegistro` en `SujetoJuridico.cs` para evitar errores de deserialización.
- **Mapeo Perfecto**: Se corrigió el nombre de `TipoPersonaJuridicaCatalog` para coincidir perfectamente con el DTO.

### 📄 Documentación y Normativa
- **.cursorrules**: Creación de la sección de estándares de auditoría y geometría para garantizar la consistencia en futuras refactorizaciones.
- **Actualización de Manuales**: Sincronización de `ARQUITECTURA_TECNICA.md`, `DATABASE_MAP_DB.md` y `MODELO_Y_PROCESO.md`.

## [2026-03-07 - Final de Sesión] - Arquitectura de Servicios Frontend (Fase 4)

### 🏗️ Reestructuración de la Capa Web (`app.js`)
- **Desacoplamiento en Servicios**: Reducción masiva de la complejidad en `app.js` mediante la creación de una arquitectura orientada a servicios:
    - `syncService.js`: Centraliza la persistencia (`saveData`/`deleteData`) y el enriquecimiento de metadatos espaciales y de auditoría.
    - `photoService.js`: Gestiona el ciclo de vida de imágenes (carga de miniaturas y borrado físico en disco).
    - `displayService.js`: Maneja la lógica de etiquetas y nombres visibles de los registros.
    - `clonadorService.js`: Unifica las reglas de negocio para la clonación de identidades entre formularios.
- **Optimización de Memoria y Rendimiento**: Se redujo el peso de `app.js` en cerca de 200 líneas, facilitando el mantenimiento y el procesamiento por asistentes de IA.

### 🧬 Modelos Contextuales y Fábrica de Datos
- **Fábrica Inteligente (`modelsFactory.js`)**: Los modelos ahora aceptan un objeto de contexto (`ctx`) que inyecta automáticamente Lat, Lng, UTM, Localización y datos de Auditoría en el momento de creación, eliminando redundancias en la UI.
- **Corrección de Coordenadas UTM**: Se resolvió un bug crítico donde las coordenadas `East` y `North` se enviaban como `undefined` por inconsistencias en los nombres de variables internas.

### 🧪 Integración y Despliegue
- **Registro Global**: Actualización de `index.html` para incluir la nueva cadena de dependencias de servicios antes del arranque de Vue.
- **Validación en Dispositivo**: Instalación exitosa y verificación de flujos de guardado y clonación en Active 8 Pro.

---

## [2026-03-07 - Horario Nocturno] - Propagación de Datos Geográficos y Validación Estricta

### 🌍 Estabilización de la Localización y Geometría
- **Corrección Crítica de Propagación**: Eliminación definitiva del error `SIN_LOC` en el ID de la Encuesta Catastral. Ahora la localización se inyecta directamente en el modelo de datos (`formData`) en el momento de su creación en `app.js`, eliminando la dependencia de *props* externas desincronizadas.
- **Validación Estricta en Mapa (`MainActivity.kt`)**: Se implementó una lógica de "Programación Defensiva" que impide la apertura de cualquier formulario si no se intersectan correctamente los tres pilares de ubicación: **Municipio**, **Sector** y **Predio con Localización**. Se añadieron mensajes dinámicos (`Toast`) para informar al usuario de fallos en la BD espacial.
- **Sincronización síncrona en `app.js`**: Reestructuración de la función `init()` para capturar de forma prioritaria y síncrona todos los datos del Bridge de Android (Lat, Lng, Localización, Muni, Sector) antes de renderizar la interfaz o permitir el reset de formularios.

### 🧹 Limpieza y Consistencia de Modelos
- **Eliminación de Campos Fantasma**: Se eliminó el campo `ResidenceDepartamento` de los modelos de JavaScript (`modelsFactory.js`) y de la lógica de clonación en `app.js`. Se confirmó que este dato se genera dinámicamente en la UI a partir del código de municipio y no es persistente en el Backend (DTO).
- **Mejora en Clonación Bidireccional**: Restauración de la copia correcta del campo `ProfessionOtroText` entre Propietario Natural y Entrevistado, asegurando que los datos de profesiones personalizadas no se pierdan al convertir registros.
- **Consistencia en Edición**: Se actualizó `openFormActivityForEdit` en Android para incluir los extras de localización y metadatos espaciales, garantizando que el "Vuelo de Regreso" a la interfaz web sea tan completo como la creación de uno nuevo.

## [2026-03-07] - Refactorización Estructural y Optimización de Tokens

### 🏗️ Arquitectura y Estabilidad (Core)

#### 📱 Desacoplamiento de `FormActivity.kt`
- **Reducción de Deuda Técnica**: El archivo principal se redujo de **~650 líneas a 151 líneas** (~77% de reducción).
- **Extracción de Responsabilidades**:
    - `FormImageHelper.kt`: Gestión delegada de cámara, permisos multimedia (soporte Android 11+ MANAGE_EXTERNAL_STORAGE) y procesamiento de imágenes a Base64.
    - `AndroidBridge.kt`: Desacoplamiento de la interfaz JavaScript (`@JavascriptInterface`) usando `WeakReference` para evitar fugas de memoria.
    - `FormWebViewHelper.kt`: Centralización de la configuración técnica, depuración de consola JS y estrategias de *cache-busting*.

#### 🌍 Estabilización del Núcleo Espacial
- **Normalización de Locale**: Implementación de `SpatialNormalizer` para forzar `Locale.US` (punto decimal `.`) en todas las consultas SQL, eliminando el error crítico de interceptación de parcelas en dispositivos con configuración regional en español.
- **Optimización de Consultas**: Refactorización de `DatabaseHelper.kt` para delegar lógica espacial pesada, mejorando el rendimiento de respuesta en el mapa.

#### 🗺️ Mejoras en `MainActivity.kt`
- **Modularización de Componentes**: Extracción de `MapHelper.kt`, `MainDialogHelper.kt` y `PermissionHelper.kt`.
- **Corrección de Ciclo de Vida**: Estabilización de la inicialización de `GoogleMap` y corrección del bucle infinito en el flujo de salida de la aplicación.
- **Refactorización de `GeometryUtil.kt`**: Conversión a una **Fachada** simplificada, moviendo proyecciones a `ProjectionHelper.kt` y algoritmos de rutas a `RoutingHelper.kt`.

### 🛠️ Mejoras Técnicas
- **Inyección de Datos**: Optimización del flujo de edición (`injectExistingData`) asegurando la consistencia de datos entre el Intent nativo y el estado reactivo de Vue.
- **Depuración**: Mejora en el sistema de logs de consola de WebView para facilitar el diagnóstico de errores en el frontend desde Logcat.

---

## [2026-03-05] - Refactorización de Modelos y Nuevos Perfiles

### Nuevas Funcionalidades

#### 👤 Propietario Natural: Perfiles y Carnetización
- **Perfil del Propietario**: Se agregó el selector de catálogo `PerfilPropietario.json` (Desmovilizado, Retirado, Campesino Tradicional, etc.).
- **Carnet de Perfil**: Nuevo campo obligatorio (`PerfilPropietarioCarnet`) que se activa automáticamente al seleccionar cualquier perfil. 
- **Validación Estricta**: Si se selecciona un perfil, el número de carnet es obligatorio. Si se elige la opción "Otro", el campo descriptivo también es obligatorio.
- **Limpieza Dinámica**: Al deseleccionar un perfil, se limpian automáticamente el carnet y las descripciones adicionales.

#### 🏡 Encuesta Catastral: Conflictos y Reseña Histórica
- **Gestión de Conflictos Anidada**: Se implementó una sub-sección "Vía de Gestión de Conflictos" dentro de Conflictos, controlada por el checkbox `TieneGestionConflicto`.
- **Reseña Histórica**: Se añadió un campo de texto multilínea (`ResenaHistorica`) no obligatorio para documentar antecedentes del predio.
- **Origen de la Tierra**: Integración total del catálogo con soporte para la opción "Otro" y persistencia de nombres visuales.

### Mejoras de Interfaz (UI/UX)
- **Claridad de Campo**: El campo "Caserío" se renombró visualmente a "**Comarca/Caserío**" para reflejar mejor la realidad del terreno.
- **Organización de Formularios**: Los campos de Perfil y Carnet ahora comparten fila para optimizar el espacio vertical.
- **Simplificación Jurídica**: Se eliminó el campo "Colectivo" en el formulario de Propietario Jurídico por redundancia.

### Cambios Técnicos y de Modelo (DTO)
- **Renombramiento Semántico**:
  - `SectorId` → `IdSector`: Unificación de nomenclatura en Backend y Frontend.
  - `IdParcela` → `IdPropiedad`: Cambio de término "Parcela" a "Propiedad" para alinearse con el flujo legal.
- **Sincronización DTO**: Las clases `Ficha.cs`, `PropietarioNatural.cs` y `PropietarioPersonaJuridica.cs` fueron actualizadas con atributos `[Display]` y nuevas propiedades.

---


### Nuevas Funcionalidades

#### 👤 Encuesta Catastral: Flexibilización y Validaciones
- **Eliminación de Restricciones**: Se eliminó la obligación de registrar un "Propietario" antes de crear una "Encuesta Catastral". Ahora solo se requiere un "Entrevistado" registrado.
- **Validación Estricta**: Se implementó una validación en el campo "Número de personas con derecho similar", exigiendo que sea mayor a **0** para permitir el guardado.
- **Jerarquía de Borrado**: Se eliminó la restricción que impedía borrar al único propietario si existía una encuesta, manteniendo la consistencia con la nueva regla de creación.

#### 🛠️ Mejoras de Formularios (Propietario y Entrevistado)
- **Validación de Edad**: Se añadió validación para asegurar que la edad sea mayor o igual a **0**.
- **Limpieza de UI**: Se eliminó el texto de ejemplo (placeholder) del campo de número de identificación para mejorar la usabilidad.

#### ⚙️ Configuración del Sistema
- **Target SDK**: Ajustado a **30** para evitar restricciones de acceso a archivos en versiones recientes de Android (Android 14+).
- **Versionamiento Automático**: Se optimizaron las funciones de autoz-versionado en `build.gradle.kts` basándose en timestamps.

### Cambios en el Modelo de Datos (DTO)

#### 📝 Evolución de `Ficha` DTO
- Se añadió la propiedad `Sector` para alinear el modelo con el esquema de base de datos final.
- **`Familiar` DTO**: Se formalizó la estructura de los familiares heredando todas las propiedades base de `Person` y agregando el catálogo específico de parentesco (`ParentescoCatalog`).
- Los catálogos fueron extraídos satisfactoriamente de la base Excel (`CatalogosV2.xlsx`) a JSON independientes para consumirse desde los selectores de pantalla completa.

---

## [2026-02-26] - Composición Familiar + Reglas de Negocio

### Nuevas Funcionalidades

#### 👨‍👩‍👧‍👦 `FormFamiliares` — Gestión de Composición Familiar
- Nuevo formulario para capturar los integrantes de la familia de un predio.
- Permite agregar ilimitados integrantes con: **Primer Nombre**, **Primer Apellido**, **Sexo**, **Edad** y **Parentesco** (obligatorios).
- Segundo nombre y segundo apellido son opcionales.
- Usa `CatalogoSelectorGrande` para el campo Parentesco (`Parentesco.json`).
- **Archivo:** `js/components/FormFamiliares.js`

### Reglas de Negocio Implementadas

- **Registro Único**: Solo se permite un (1) registro de "Composición Familiar" por predio. Si ya existe, el menú redirige automáticamente a la edición del existente.
- **Dependencia de Propietario Natural**:
  - No se puede crear una familia si no existe al menos un **Propietario Natural** registrado.
  - Al eliminar el último Propietario Natural del predio, se elimina el registro de Familiares de forma automática (**borrado en cascada**).
- **Validación Estricta**: Al guardar, se verifica que cada integrante tenga todos sus campos obligatorios completos.

### Mejoras Técnicas

- **Persistencia Directa**: El formulario trabaja sobre la referencia reactiva de `app.js`, garantizando que los datos no se pierdan al navegar hacia/desde los selectores de catálogo.
- **Scroll Restoration**: Se mantiene la posición de lectura perfecta al retornar de búsquedas de catálogo.
- **Watcher Profundo**: Sistema dinámico para limpiar estados de error visual conforme el usuario corrige los campos de cualquier integrante.

### Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `js/components/FormFamiliares.js` | **Nuevo** — componente de gestión de familia |
| `js/app.js` | Registro del nuevo tipo, validaciones de exclusividad y borrado en cascada |
| `index.html` | Botón "FAMILIA" con icono nuevo y registro del componente |
| `images/family.svg` | **Nuevo** — icono para el menú principal |

---

## [2026-02-26] - Selectores Globales de Catálogo + Municipio

### Nuevas Funcionalidades

#### 🔍 `CatalogoSelectorGrande` — Selector a Pantalla Completa (Un nivel)
- Nuevo componente Vue que reemplaza el `<select>` nativo para catálogos grandes.
- Layout: campo de búsqueda fijo arriba → lista scrolleable central → botones ACEPTAR/CANCELAR fijos al fondo.
- Búsqueda en tiempo real filtrada por nombre o ID.
- Carga progresiva (lazy): 35 items iniciales + 30 más por scroll (`IntersectionObserver`).
- Usa **solo estilos inline** para máxima compatibilidad con Android WebView.
- **Archivo:** `js/components/CatalogoSelectorGrande.js`

#### 🗺️ `CatalogoSelectorTwoLevels` — Selector Jerárquico (Dos niveles)
- Nuevo componente para selección de Departamento→Municipio.
- Dos listas scrolleables apiladas: Departamentos arriba, Municipios del depto seleccionado abajo.
- Código depto completo (`"55"`) + código municipio últimos 2 dígitos (`"25"` de `"5525"`).
- El DTO recibe el `CodMuni` completo (`"5525"`) en `ResidenceMunicipioCatalog`.
- **Archivo:** `js/components/CatalogoSelectorTwoLevels.js`
- **Datos:** `data/DepartamentosMunicipios.json`

#### 🔄 Mecanismo Global de Operaciones en `app.js`
- Nuevo estado `operation = 'SelectCatalog'` para activar `CatalogoSelectorGrande`.
- Nuevo estado `operation = 'SelectMunicipio'` para activar `CatalogoSelectorTwoLevels`.
- Referencias y funciones expuestas en `vueAppContext` para que los formularios hijos las invoquen:
  - `openCatalog(options)` / `onCatalogSelect(result)` / `cancelCatalog()`
  - `openMunicipio(params)` / `onMunicipioSelect(resultado)` / `cancelMunicipio()`

### Mejoras en Formularios

#### 📝 `FormPropietarioNatural` — Sección Identificación y Residencia
- **Selección de Profesión**: Campo visual con lupa (🔍) que abre `CatalogoSelectorGrande` al toque.
- **Selección de Municipio**: Campo visual con pin (📍) que abre `CatalogoSelectorTwoLevels`.
  - Muestra departamento seleccionado en ficha azul (readonly).
  - Muestra municipio seleccionado en ficha verde (readonly).
- **Comarca y Barrio/Caserío**: Rediseñados como campos de línea individual (no en grid).
- `ResidenceMunicipioCatalog` ahora es `String` (antes `Number`) con el código completo.

### Correcciones Técnicas

#### 🐛 Persistencia de Datos al Regresar del Selector
- **Problema:** Vue destruye y recrea el formulario al cambiar `operation`. Los nombres visuales se perdían.
- **Solución:** `formData = Vue.reactive(props.data)` sin spread, más campos `_helper`:
  - `formData._ProfessionName` — nombre de profesión seleccionada
  - `formData._CodDepto`, `formData._DeptoNombre`, `formData._MuniNombre` — datos de municipio
- Los `_helpers` persisten porque `formData` apunta al mismo objeto reactivo de `app.js`.

#### 🐛 Funciones de Cierre del Selector no Accesibles desde Template
- **Problema:** `cancelMunicipio` y `onMunicipioSelect` definidas en `setup()` pero no en `return {}`.
- **Solución:** Añadidas al `return { ... }` de app.js.

### Documentación Creada

| Documento | Descripción |
|-----------|-------------|
| `SELECTORES_CATALOGO_GLOBAL.md` | Documentación completa: arquitectura, props, eventos, patrones de uso, checklist para nuevos selectores, notas técnicas WebView |

### Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `js/components/CatalogoSelectorGrande.js` | Rediseño total: estilos inline, lista scrolleable robusta, selección visual con ✓ |
| `js/components/CatalogoSelectorTwoLevels.js` | **Nuevo** — selector dos niveles depto/municipio |
| `js/app.js` | Añadidos `openMunicipio`, `cancelMunicipio`, `onMunicipioSelect`, `municipioParams`; `ResidenceMunicipioCatalog` en modelo |
| `js/components/FormPropietarioNatural.js` | Sección Residencia rediseñada; persistencia de nombres visuales |
| `index.html` | Vista `SelectMunicipio`; carga del nuevo script |
| `docs/SELECTORES_CATALOGO_GLOBAL.md` | **Nuevo** — documentación de selectores |

---



### Nuevas Funcionalidades

#### 🧭 Posición Relativa de Predios Adyacentes
- **Implementado** algoritmo para calcular la dirección cardinal (N, NE, E, SE, S, SO, O, NO) de un predio adyacente respecto al predio actual.
- Utiliza la **normal del borde compartido** corregida por el **vector árbitro** (centroides).
- Maneja casos especiales: polígonos que solo se tocan en un punto, bordes degenerados, formas irregulares.
- **Archivo:** `GeometryUtil.kt` - función `getRelativeDirectionBetweenPolygons()`

#### 📊 Mejoras en la Tabla de Predios Adyacentes
- **Unificadas** las columnas "PREDIO" y "CAMINO" en una sola: "PREDIO/CAMINO".
- Formato de visualización: `[Dirección] [Predio]/[Camino]`
- Ejemplo: `[E] [025300200466]/[5-01-001]`
- Si la dirección no puede calcularse, se muestra `[-]`.
- **Ordenación mejorada:** por predio y luego por código de camino.

### Cambios en la Interfaz

#### 🏷️ Encabezados de Tablas
- Cambiado "Datos dentro del predio" → "**Registros dentro del predio**"
- Cambiado "Datos en predios adyacentes" → "**Registros en predios adyacentes**"
- **Archivo:** `index.html`

#### 🔕 Eliminación de Elementos Redundantes
- **Eliminado** el Toast "Página cargada!" que aparecía al cargar el formulario Vue.
  - Razón: Cumplió su propósito durante desarrollo, ya no es necesario.
  - **Archivo:** `FormActivity.kt`

- **Deshabilitado** el click en marcadores del mapa que mostraba un diálogo con registros.
  - Razón: Esa información ahora se muestra de mejor forma en el formulario.
  - Los marcadores ahora son solo visuales (indican dónde hay datos capturados).
  - **Archivo:** `MainActivity.kt`

### Mejoras Técnicas

#### 🗄️ DatabaseHelper.kt
- Actualizado `getDataInAdjacentPolygons()` para:
  - Calcular la dirección relativa de cada predio adyacente.
  - Extraer el código de camino del JSON de datos.
  - Ordenar resultados por predio y código de camino.
  - Incluir campo `DireccionRelativa` en el JSON de respuesta.

#### 📐 GeometryUtil.kt
- Nueva función `getRelativeDirectionBetweenPolygons(wktA, wktB)`.
- Nueva función auxiliar `angleToCardinal8(degrees)`.
- Eliminada validación redundante de `coords.size < 2` (una polilínea siempre tiene ≥2 puntos).

### Pendientes / No Implementados

#### ⏳ Versión en Barra de Título
- Se intentó mostrar la versión de la app en el ActionBar (`INETER CADIC v2026...`).
- El método `PackageManager.getPackageInfo()` no está funcionando correctamente.
- El intento con `BuildConfig.VERSION_NAME` causó error de compilación.
- **Estado:** Pendiente de investigar. La funcionalidad base está lista pero comentada.

### Documentación Creada

| Documento | Descripción |
|-----------|-------------|
| `ALGORITMO_POSICION_RELATIVA_PREDIOS.md` | Especificación completa del algoritmo de dirección relativa |
| `CHANGELOG.md` | Este documento de cambios |

---

## Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `GeometryUtil.kt` | +2 funciones nuevas, limpieza de código |
| `DatabaseHelper.kt` | Actualizado método de datos adyacentes |
| `MainActivity.kt` | Removido listener de click en marcadores |
| `FormActivity.kt` | Removido Toast de página cargada |
| `index.html` | Cambios en encabezados y tabla de adyacentes |

---

*Generado automáticamente: 2026-02-08 12:33*
