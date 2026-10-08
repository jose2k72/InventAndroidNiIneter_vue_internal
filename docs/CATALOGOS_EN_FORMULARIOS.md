# Catálogos usados en los formularios activos

Inventario de qué campo de cada formulario Vue (accesible desde `index.html`) se relaciona con
qué catálogo de `app/src/main/assets/web/data/`, y qué valores aparecen **quemados directamente
en el código** (HTML/JS) en vez de venir de un catálogo externo.

Generado por revisión directa del código (no automatizado) — fecha: 2026-09-18.

## Formularios activos (montados desde `index.html`)

`index.html` monta condicionalmente estos 7 componentes según `formType` (líneas 441-454):

`form-ficha`, `form-sujeto-natural`, `form-sujeto-juridico`, `form-entrevistado`,
`form-familiares`, `form-no-encuestado`, `form-union-con-predio`.

`FormNoEncuestado.js` y `FormUnionConPredio.js` **no usan ningún catálogo** — se revisaron
completos y no tienen `catalogos.*`, `openCatalog` ni `openMunicipio`.

## Cómo se cargan los catálogos (3 mecanismos, todos apuntando a `data/*.json`)

1. **`cargarCatalogos()` + `<select><option v-for>` inline** — cada componente define un objeto
   `mapeo` (`{ clave: 'Archivo.json' }`), lo carga en `onMounted` (primero intenta
   `Android.loadCatalogJson(fileName)`, si no hay bridge cae a `fetch('data/' + fileName)`), y lo
   guarda en `catalogos.<clave>` (reactive). El `<select>` del template itera
   `catalogos.<clave>` con `v-for`. Usado para catálogos chicos, de una sola pantalla.
2. **`vueAppContext.openCatalog({ catalogName: 'Archivo', onSelect })`** — abre la pantalla
   modal de búsqueda/selección (`operation = 'SelectCatalog'` en `app.js`), que carga
   `Archivo.json` internamente. Usado para catálogos más largos o buscables (Profesión, tipos de
   documento, etc.).
3. **`vueAppContext.openMunicipio({ onSelect })`** — pantalla de dos niveles
   Departamento→Municipio, siempre respaldada por `DepartamentosMunicipios.json`. Es el único
   mecanismo para cualquier campo de Municipio en todo el proyecto.

## Tabla: campo → catálogo

| Formulario | Campo (`formData.*`) | Catálogo (`data/*.json`) | Mecanismo |
|---|---|---|---|
| FormFicha | `MunicipioCatalog` | `DepartamentosMunicipios.json` | `openMunicipio` |
| FormFicha | `TipoEncuestaCatalog` | `TipoEncuesta.json` | inline (`mapeo`) |
| FormFicha | `TipoUsoCatalog` | `TipoUso.json` | inline (`mapeo`) |
| FormFicha | `UnidadMedidaAreaEstimadaCatalog` | `UnidadMedida.json` | inline (`mapeo`) |
| FormFicha | `UnidadMedidaAreaTituladaCatalog` | `UnidadMedida.json` | inline (`mapeo`) |
| FormFicha | `ServidumbreAguaCatalog` | `Servidumbre.json` | inline (`mapeo`) |
| FormFicha | `ServidumbrePaseCatalog` | `Servidumbre.json` | inline (`mapeo`) |
| FormFicha | `ServidumbreOtroCatalog` | `Servidumbre.json` | inline (`mapeo`) |
| FormFicha | `ClaseConflictoCatalog` | `ClaseConflicto.json` | `openCatalog` |
| FormFicha | `DescripcionUsoCatalog` | `UsoParcela.json` | `openCatalog` |
| FormFicha | `OrigenTierraCatalog` | `OrigenTierra.json` | `openCatalog` |
| FormFicha | `GestionConflictoCatalog` | `GestionConflicto.json` | `openCatalog` |
| FormFicha | `Documentos[i].DocumentoCatalog` | `Documento-Mod.json` | `openCatalog` |
| FormSujetoNatural | `TipoIdentificacionCatalog` | `TipoIdentificacion.json` | inline (`mapeo`) |
| FormSujetoNatural | `GenderCatalog` | `Genero.json` | inline (`mapeo`, clave `Generos`) |
| FormSujetoNatural | `CivilStateCatalog` | `EstadoCivil.json` | inline (`mapeo`) |
| FormSujetoNatural | `DerehoParcelaCatalog` | `TipoDerecho.json` | inline (`mapeo`) |
| FormSujetoNatural | `ResidenceMunicipioCatalog` | `DepartamentosMunicipios.json` | `openMunicipio` |
| FormSujetoNatural | `ProfessionCatalog` | `Profesion.json` | `openCatalog` |
| FormSujetoNatural | `RelacionConPropietarioCatalog` | `RelacionInformantePropietario.json` | `openCatalog` |
| FormSujetoNatural | `PerfilPropietarioCatalog` | `PerfilPropietario.json` | `openCatalog` |
| FormSujetoJuridico | `DerehoParcelaCatalog` | `TipoDerecho.json` | inline (`mapeo`) |
| FormSujetoJuridico | `TipoPersonaJuridicaCatalog` | `TipoPersonaJuridica.json` | inline (`mapeo`) |
| FormEntrevistado | `RelacionConParcelaCatalog` | `RelacionInformanteParcela.json` | inline (`mapeo`) |
| FormEntrevistado | `TipoIdentificacionCatalog` | `TipoIdentificacion.json` | inline (`mapeo`) |
| FormEntrevistado | `GenderCatalog` | `Genero.json` | inline (`mapeo`, clave `Generos`) |
| FormEntrevistado | `CivilStateCatalog` | `EstadoCivil.json` | inline (`mapeo`) |
| FormEntrevistado | `ResidenceMunicipioCatalog` | `DepartamentosMunicipios.json` | `openMunicipio` |
| FormEntrevistado | `ProfessionCatalog` | `Profesion.json` | `openCatalog` |
| FormEntrevistado | `RelacionInformantePropietarioCatalog` | `RelacionInformantePropietario.json` | `openCatalog` |
| FormFamiliares | `Familiares[i].ParentescoCatalog` | `Parentesco.json` | `openCatalog` |

Nota: varios campos comparten el mismo catálogo entre formularios distintos
(`TipoIdentificacion.json`, `Genero.json`, `EstadoCivil.json`, `TipoDerecho.json`,
`Profesion.json`, `RelacionInformantePropietario.json`, `DepartamentosMunicipios.json`) — es el
mismo archivo, no una copia por formulario.

## Valores "quemados" (hardcoded) en el código, no en un catálogo

Solo se encontró **un** caso real de valores de catálogo quemados directamente en JS (no una
lista de opciones nueva, sino códigos de un catálogo existente referenciados por número):

- **`FormFicha.js:11`** — `const DOCUMENTOS_SIN_FECHA_OBLIGATORIA = [73, 74, 154];`
  Son los `id` de 3 entradas de `Documento-Mod.json` que por naturaleza nunca tienen una fecha
  real que dar (confirmado con datos reales de `Map.db`, según el comentario del propio código):
  | id | Código | Nombre en `Documento-Mod.json` |
  |---|---|---|
  | 73 | NC01 | No Codificado |
  | 74 | NP01 | Existen documentos pero no fueron presentados |
  | 154 | SD35 | Sin Documento: Ninguno |
  Se usa en `docSinFechaObligatoria(doc)` para no exigir "Fecha del Documento" en esos 3 casos.

No se encontraron `<select>`/listas de opciones con valores y etiquetas escritos directamente en
el template (todas las opciones de todos los `<select>` salen de `catalogos.*` o de `openCatalog`/
`openMunicipio`, nunca de un `<option value="X">Texto</option>` literal).

### Los botones rápidos de "Motivo" (Ficha sin datos / No Encuestado) NO son un catálogo

`FormFicha.js:456-473` (visible solo cuando `ConDatos` está desmarcado) y el patrón equivalente
en `FormNoEncuestado.js` muestran 4 botones con textos fijos ("No atendió", "No había personas en
el lugar", "Propietario se negó a brindar información (Rechazo)", "Vivienda deshabitada /
desocupada") que simplemente **anexan ese texto literal** al campo de texto libre
`ObservacionesGenerales` / `Descripcion` (`selectReasonObservaciones()`) — no escriben un código
de catálogo en ningún campo `*Catalog`, así que no califican como catálogo quemado, son solo
atajos de redacción.

## Catálogos en `data/` que NO se usan en ningún formulario activo

Se buscó cada nombre de archivo en todo `app/src/main/assets/web/` (HTML y JS) y no aparece
ninguna referencia fuera del propio archivo listado aquí:

- `TipoRolEncuesta.json`
- `EstadoEncuesta.json`
- `PuntoCardinal.json`
- `TipoSector.json`
- `TipoPersona.json`
- `Documento.json` (existe la variante `Documento-Mod.json`, que sí se usa activamente — el
  original solo aparece mencionado en un comentario de `FormFicha.js:6`, no se carga en runtime)

`data/sistema/ProyeccionesLocales.json` es de otra naturaleza (configuración de proyección
espacial local, no un catálogo de campo de formulario) — no se incluye en este inventario.
