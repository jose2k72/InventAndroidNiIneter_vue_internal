# Changelog - Inv Goico ACERAS

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
- Se intentó mostrar la versión de la app en el ActionBar (`Inv Goico ACERAS v2026...`).
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
