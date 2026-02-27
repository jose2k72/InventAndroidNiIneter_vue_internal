# Selectores de Catálogos a Pantalla Completa

> Documentación de los componentes `CatalogoSelectorGrande` y `CatalogoSelectorTwoLevels` —
> mecanismo de selección global para catálogos de gran volumen en formularios Vue/Android WebView.

---

## 1. Motivación

Los selectores nativos (`<select>` HTML) son inadecuados para catálogos con cientos o miles de
elementos en un dispositivo Android:

- Se renderizan mal en pantallas pequeñas.
- No permiten búsqueda eficiente.
- No soportan selección jerárquica (dos niveles).

La solución adoptada es una **pantalla completa independiente** que se superpone completamente
al formulario activo, permite buscar o navegar la jerarquía, y al confirmar regresa al formulario
con el valor seleccionado.

---

## 2. Arquitectura Global de Estado

Todo el mecanismo se centraliza en `app.js` mediante un par de **refs de estado** y **funciones
de control** que se exponen al template de `index.html`.

### 2.1 Para `CatalogoSelectorGrande` (un nivel)

```javascript
// Refs en app.js setup()
const catalogParams = ref(null);  // null = cerrado, {...} = abierto

// Funciones expuestas en return { ... }
const openCatalog    = (options) => { catalogParams.value = options; operation.value = 'SelectCatalog'; };
const onCatalogSelect = (result) => { catalogParams.value.onSelect(result); operation.value = 'Edit'; };
const cancelCatalog  = () => { catalogParams.value = null; operation.value = 'Edit'; };
```

### 2.2 Para `CatalogoSelectorTwoLevels` (dos niveles)

```javascript
// Refs en app.js setup()
const municipioParams = Vue.ref(null);

// Funciones expuestas en return { ... }
const openMunicipio    = (params) => { municipioParams.value = params; operation.value = 'SelectMunicipio'; };
const onMunicipioSelect = (resultado) => { municipioParams.value.onSelect(resultado); operation.value = 'Edit'; };
const cancelMunicipio  = () => { municipioParams.value = null; operation.value = 'Edit'; };
```

### 2.3 Flujo de operaciones

```
operation = 'Edit'           → Muestra el formulario activo
operation = 'SelectCatalog'  → Muestra CatalogoSelectorGrande
operation = 'SelectMunicipio'→ Muestra CatalogoSelectorTwoLevels
```

El valor de `operation` controla cuál bloque `v-else-if` renderiza `index.html`.

> **IMPORTANTE**: Las funciones `openMunicipio`, `cancelMunicipio`, etc. deben aparecer
> tanto en el **`setup()` como en el `return { ... }`** del componente raíz de app.js;
> de lo contrario el template no puede acceder a ellas.

---

## 3. `CatalogoSelectorGrande` — Selector de Un Nivel

### Propósito
Seleccionar un elemento de un catálogo plano de gran volumen (ej. Profesiones, ~1000 entradas).

### Archivo
`app/src/main/assets/web/js/components/CatalogoSelectorGrande.js`

### Props

| Prop | Tipo | Requerida | Default | Descripción |
|------|------|-----------|---------|-------------|
| `catalogName` | String | ✅ | — | Nombre del archivo JSON (sin extensión). Ej: `'Profesion'` |
| `label` | String | ❌ | `'Seleccionar...'` | Título descriptivo de la sección |
| `placeholder` | String | ❌ | `'Buscar...'` | Texto del campo de búsqueda |

### Eventos Emitidos

| Evento | Payload | Descripción |
|--------|---------|-------------|
| `select` | `{ id: string, name: string }` | El usuario seleccionó un elemento y presionó ACEPTAR |
| `cancel` | — | El usuario presionó CANCELAR |

### Layout Visual

```
┌──────────────────────────────────────────────────────────┐
│                  NOMBRE DEL CATÁLOGO                     │  ← Barra azul (position: fixed)
│  [ Buscar...______________________________________ ]      │  ← Input búsqueda, full width
├──────────────────────────────────────────────────────────┤
│  Item 1                                                  │  ↑
│  Item 2                               ✓ (seleccionado)   │  │
│  Item 3                                                  │  Área scrolleable
│   ...                                                    │  │
│  Item N                                                  │  ↓
├──────────────────────────────────────────────────────────┤
│  [  CANCELAR  ]              [  ACEPTAR  ]               │  ← Footer fijo
└──────────────────────────────────────────────────────────┘
```

### Datos del Catálogo

El componente carga el JSON desde dos fuentes en orden de prioridad:

1. **Android Bridge**: `window.Android.loadCatalogJson('Profesion.json')`
2. **HTTP (desarrollo)**: `fetch('data/Profesion.json')`

**Formato JSON esperado:**
```json
[
  { "id": 1, "nombre": "Agricultor" },
  { "id": 2, "nombre": "Ganadero" }
]
```

### Paginación / Lazy Load

Muestra los primeros **35 elementos** y carga 30 más cuando el usuario hace scroll hasta el final,
usando `IntersectionObserver` con `{ root: contenedorLista }`.

Al cambiar el texto de búsqueda, el scroll se reinicia al principio y el contador de visibles
se resetea a 35.

---

## 4. `CatalogoSelectorTwoLevels` — Selector de Dos Niveles

### Propósito
Seleccionar un **Municipio** a partir de dos listas jerárquicas: primero **Departamento**, luego **Municipio** del departamento seleccionado.

### Archivo
`app/src/main/assets/web/js/components/CatalogoSelectorTwoLevels.js`

### Props
_Sin props._ El catálogo está fijo (`DepartamentosMunicipios.json`).

### Eventos Emitidos

| Evento | Payload | Descripción |
|--------|---------|-------------|
| `select` | `{ codMuni, municipio, codDepto, departamento }` | Usuario seleccionó un municipio y presionó ACEPTAR |
| `cancel` | — | Usuario presionó CANCELAR |

**Detalle del payload `select`:**

| Campo | Tipo | Ejemplo | Descripción |
|-------|------|---------|-------------|
| `codMuni` | String | `"5525"` | Código completo del municipio — **campo DTO** |
| `municipio` | String | `"Managua"` | Nombre del municipio |
| `codDepto` | String | `"55"` | Código del departamento |
| `departamento` | String | `"Managua"` | Nombre del departamento |

### Layout Visual

```
┌──────────────────────────────────────────────────────────┐
│                  SELECCIONAR MUNICIPIO                   │  ← Barra azul (fijo)
├──────────────────────────────────────────────────────────┤
│  DEPARTAMENTOS                                           │  ← Label azul claro
│  05  Nueva Segovia                                       │  ↑
│  10  Jinotega                                            │  │
│  55  Managua                          › (activo)         │  Mitad scrolleable
│  60  Masaya                                              │  │
│   ...                                                    │  ↓
├──────────────────────────────────────────────────────────┤
│  MUNICIPIOS — Managua                                    │  ← Label verde, dinámico
│  05  San Francisco Libre                                 │  ↑
│  10  Tipitapa                                            │  │
│  25  Managua                          ✓ (seleccionado)   │  Mitad scrolleable
│   ...                                                    │  │
├──────────────────────────────────────────────────────────┤
│  [  CANCELAR  ]              [  ACEPTAR  ]               │  ← Footer fijo
└──────────────────────────────────────────────────────────┘
```

### Visualización de Códigos

- **Departamentos**: Se muestra el código completo de 2 dígitos (`"55"`) + nombre.
- **Municipios**: Se muestran los **últimos 2 dígitos** del `CodMuni` (`"5525"` → `"25"`) + nombre.
  Esto corresponde al sufijo del municipio dentro del departamento.
- **Al DTO**: Se graba el `CodMuni` **completo** (`"5525"`) en `ResidenceMunicipioCatalog`.

### Fuente de Datos
`app/src/main/assets/web/data/DepartamentosMunicipios.json`

**Formato JSON:**
```json
[
  {
    "CodDepto": "55",
    "Departamento": "Managua",
    "Municipios": [
      { "CodMuni": "5505", "Municipio": "San Francisco Libre" },
      { "CodMuni": "5525", "Municipio": "Managua" }
    ]
  }
]
```

---

## 5. Cómo Usar los Selectores Desde un Formulario

### 5.1 Usar `CatalogoSelectorGrande` (un nivel)

```javascript
// En setup() del formulario
const profesionName = Vue.ref(formData._ProfessionName || '');

const pedirProfesionGlobal = () => {
    if (typeof vueAppContext !== 'undefined' && typeof vueAppContext.openCatalog === 'function') {
        vueAppContext.openCatalog({
            catalogName: 'Profesion',       // nombre del .json sin extensión
            label: 'Buscar Profesión...',
            placeholder: 'Nombre o ID...',
            onSelect: (val) => {
                formData.ProfessionCatalog = val.id;    // campo DTO
                formData._ProfessionName   = val.name;  // helper UI (persiste)
                profesionName.value        = val.name;  // actualiza vista inmediata
            }
        });
    }
};

// En return { ... } del setup:
return { ..., profesionName, pedirProfesionGlobal };
```

**En el template:**
```html
<div class="selector-display" @click="pedirProfesionGlobal">
    <span v-if="profesionName">{{ profesionName }}</span>
    <span v-else style="color:#757575">Seleccione una profesión...</span>
    <span>🔍</span>
</div>
```

### 5.2 Usar Selectores en Listas Dinámicas (Items Repetibles)

Cuando el selector se usa dentro de un `v-for` (ej. Composición Familiar), se debe pasar el **índice** para actualizar el integrante correcto del array:

```javascript
const pedirParentesco = (index) => {
    if (typeof vueAppContext !== 'undefined') {
        vueAppContext.openCatalog({
            catalogName: 'Parentesco',
            label: 'Seleccionar Parentesco...',
            onSelect: (val) => {
                // Actualización directa usando el índice del bucle
                formData.Familiares[index].ParentescoCatalog = parseInt(val.id);
                formData.Familiares[index]._ParentescoName = val.name;
            }
        });
    }
};
```

### 5.3 Usar `CatalogoSelectorTwoLevels` (dos niveles)

```javascript
// En setup() del formulario
const deptoDisplay = Vue.ref(
    formData._DeptoNombre ? { cod: formData._CodDepto, nombre: formData._DeptoNombre } : null
);
const muniDisplay = Vue.ref(
    formData._MuniNombre
        ? { cod: String(formData.ResidenceMunicipioCatalog).slice(-2), nombre: formData._MuniNombre }
        : null
);

const pedirMunicipioGlobal = () => {
    if (typeof vueAppContext !== 'undefined' && typeof vueAppContext.openMunicipio === 'function') {
        vueAppContext.openMunicipio({
            onSelect: (resultado) => {
                formData.ResidenceMunicipioCatalog = resultado.codMuni;  // campo DTO
                formData._CodDepto    = resultado.codDepto;              // helpers UI
                formData._DeptoNombre = resultado.departamento;
                formData._MuniNombre  = resultado.municipio;
                deptoDisplay.value = { cod: resultado.codDepto, nombre: resultado.departamento };
                muniDisplay.value  = { cod: resultado.codMuni.slice(-2), nombre: resultado.municipio };
            }
        });
    }
};

// En return { ... }
return { ..., deptoDisplay, muniDisplay, pedirMunicipioGlobal };
```

**En el template:**
```html
<!-- Trigger -->
<div class="selector-display" @click="pedirMunicipioGlobal">
    <span v-if="muniDisplay">Cambiar...</span>
    <span v-else style="color:#757575">Seleccione departamento / municipio...</span>
    <span>📍</span>
</div>

<!-- Visualización Departamento (readonly, azul) -->
<div v-if="deptoDisplay" style="background:#e3f2fd; border:1px solid #90caf9; ...">
    <span style="color:#1565C0; font-weight:bold;">{{ deptoDisplay.cod }}</span>
    <span>{{ deptoDisplay.nombre }}</span>
</div>

<!-- Visualización Municipio (readonly, verde) -->
<div v-if="muniDisplay" style="background:#e8f5e9; border:1px solid #a5d6a7; ...">
    <span style="color:#2e7d32; font-weight:bold;">{{ muniDisplay.cod }}</span>
    <span>{{ muniDisplay.nombre }}</span>
</div>
```

---

## 6. Patrón de Persistencia de Nombres Visual (`_NombreCampo`)

Al usar `v-else-if` en `index.html`, Vue **destruye y recrea** el componente del formulario
cada vez que cambia la `operation`. Para que el nombre visual no se pierda al regresar de la
selección, se usa el siguiente patrón:

### Reglas

1. `formData` en el formulario **NO usa spread** (`{...props.data}`).  
   Debe ser la **referencia directa** al objeto reactivo de `app.js`:
   ```javascript
   const formData = Vue.reactive(props.data);  // ✅ CORRECTO
   // const formData = Vue.reactive({...props.data});  // ❌ EVITAR
   ```

2. Los **campos DTO** (van al backend) se graban directamente: `formData.MiCampo = valor`.

3. Los **helpers de UI** (solo para visualización) se graban con prefijo `_`:
   - `formData._ProfessionName` — nombre de la profesión
   - `formData._CodDepto` — código del departamento
   - `formData._DeptoNombre` — nombre del departamento
   - `formData._MuniNombre` — nombre del municipio

4. Al montar el formulario, los refs de visualización se inicializan desde los `_helpers`:
   ```javascript
   const profesionName = Vue.ref(formData._ProfessionName || '');
   ```

### ¿Por qué funciona?

`formData` es el MISMO objeto reactivo que vive en `app.js`. Los campos `_helper` persisten
en ese objeto aunque el componente del formulario sea destruido y recreado. Cuando Vue vuelve a
montar el formulario con `operation = 'Edit'`, el `setup()` lee los `_helpers` y restaura la
visualización automáticamente.

---

## 7. Checklist para Agregar un Nuevo Selector

Si en el futuro se necesita otro tipo de selector global, seguir estos pasos:

### En `app.js`
- [ ] Definir `const xParams = Vue.ref(null)`
- [ ] Definir `openX(params)` → cambia `operation = 'SelectX'`
- [ ] Definir `onXSelect(resultado)` → llama `params.onSelect()`, resetea `operation = 'Edit'`
- [ ] Definir `cancelX()` → resetea `operation = 'Edit'`
- [ ] Exponer las 4 en el `return { ... }`
- [ ] Exponer `openX` en `vueAppContext` (para los formularios hijos)

### En `index.html`
- [ ] Agregar `<div v-else-if="operation === 'SelectX'">` con el nuevo componente
- [ ] Añadir `<script src="js/components/MiNuevoSelector.js">` en la lista de scripts

### En el Componente Selector (`MiNuevoSelector.js`)
- [ ] Emitir `cancel` y `select`
- [ ] Usar **únicamente estilos inline** (no bloques `<style>` dentro del template)
- [ ] El div raíz debe tener `position: fixed; top:0; left:0; right:0; bottom:0`
- [ ] La lista central debe tener `flex: 1; min-height: 0; overflow-y: scroll`
- [ ] El footer de botones debe tener `flex-shrink: 0`
- [ ] Registrar con `window.app.component('mi-nuevo-selector', MiNuevoSelector)`

### En el Formulario Consumidor
- [ ] Añadir refs de visualización inicializados desde `formData._helpers`
- [ ] Definir función `pedirXGlobal()` que llama `vueAppContext.openX({...})`
- [ ] En el callback `onSelect`, actualizar DTO + `_helpers` + refs de visualización
- [ ] Exponer todo en el `return { ... }` del setup
- [ ] Usar `Vue.reactive(props.data)` sin spread

---

## 8. Notas Técnicas Críticas (Android WebView)

| Problema | Causa | Solución Aplicada |
|----------|-------|-------------------|
| Scroll no funciona en lista flex | `min-height: auto` por defecto en flex | Siempre añadir `min-height: 0` al contenedor scrolleable dentro de flex |
| Botones del footer no son visibles | Flex container desborda | Footer con `flex-shrink: 0`; nunca poner tamaño relativo |
| Touch no dispara eventos de click | `user-select` interfiere | Añadir `user-select: none; -webkit-user-select: none` en items |
| Estilos no se aplican | `<style>` dentro del template tiene problemas de especificidad | Usar **solo estilos inline** en componentes WebView |
| Componente no renderiza | Template string con `\`` (backslash + backtick) inválido | Verificar que el template cierre con `` ` `` sin backslash |
