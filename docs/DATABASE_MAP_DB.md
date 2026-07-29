# Documentación de Base de Datos: Map.db

## 1. Información General

| Atributo | Valor |
|:---------|:------|
| **Nombre del archivo** | `Map.db` |
| **Motor** | SQLite |
| **Ubicación en Android** | `/storage/emulated/0/CADIC.INETER/Map.db` |
| **Versión actual** | 1 |
| **Clase de acceso** | `DatabaseHelper.kt` (Singleton) |

### Ruta de Almacenamiento

La base de datos se almacena en el almacenamiento externo del dispositivo, fuera del directorio privado de la aplicación:

```
/storage/emulated/0/CADIC.INETER/Map.db
```

> ⚠️ **Nota**: La lógica de detección de ruta intenta primero tarjetas SD externas (`/mnt/external_sd`, `/mnt/ext_sd`, etc.) antes de usar el almacenamiento interno. Si ninguna tarjeta SD está disponible o es escribible, usa el directorio por defecto.

---

## 2. Esquema de Tablas

### 2.1 Tabla `config`

Almacena configuraciones clave-valor para la aplicación.

```sql
CREATE TABLE IF NOT EXISTS config (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    VARIABLE TEXT,
    VALOR TEXT
)
```

| Campo | Tipo | Descripción |
|:------|:-----|:------------|
| `ID` | INTEGER | Identificador único (autoincremental) |
| `VARIABLE` | TEXT | Nombre de la variable de configuración |
| `VALOR` | TEXT | Valor de la configuración (siempre texto) |

#### Variables de Configuración Conocidas

| VARIABLE | Tipo Esperado | Descripción |
|:---------|:--------------|:------------|
| `ENCUESTADOR` | String | Nombre del encuestador/operador del dispositivo |
| `InitLat` | Float (como string) | Latitud inicial para centrar el mapa al abrir |
| `InitLng` | Float (como string) | Longitud inicial para centrar el mapa al abrir |

**Ejemplo de uso:**
- Al iniciar la app, se leen `InitLat` e `InitLng` para posicionar el mapa.
- El nombre del `ENCUESTADOR` puede mostrarse en reportes o registros.

---

### 2.2 Tabla `objects`

Almacena geometrías (polígonos de predios, áreas de trabajo) con sus bounding boxes para consultas espaciales rápidas.

```sql
CREATE TABLE IF NOT EXISTS objects (
    id INTEGER PRIMARY KEY,
    minX FLOAT, minY FLOAT, maxX FLOAT, maxY FLOAT,
    XCentroid FLOAT, YCentroid FLOAT,
    LOCALIZACION TEXT,
    layer TEXT,
    idLayer INTEGER,
    idPredio INTEGER,
    wkb BLOB
)
```

| Campo | Tipo | Descripción |
|:------|:-----|:------------|
| `id` | INTEGER | Identificador único del objeto geométrico |
| `minX`, `minY` | FLOAT | Esquina inferior-izquierda del bounding box (longitud, latitud) |
| `maxX`, `maxY` | FLOAT | Esquina superior-derecha del bounding box (longitud, latitud) |
| `XCentroid`, `YCentroid` | FLOAT | Centroide del polígono (longitud, latitud) |
| `LOCALIZACION` | TEXT | Descripción textual de la ubicación |
| `layer` | TEXT | Capa a la que pertenece (ej: "Predios", "Edificaciones") |
| `idLayer` | INTEGER | ID numérico de la capa |
| `idPredio` | INTEGER | ID del predio asociado |
| `wkb` | BLOB | Geometría en formato binario WKB (Well-Known Binary) |

#### Uso Principal

Esta tabla se usa para:
1. **Detección de clic en mapa**: Al hacer clic, se buscan objetos cuyo bounding box contenga el punto.
2. **Verificación de punto en polígono**: Se lee el campo `wkb` y se verifica si el punto está dentro del polígono en memoria mediante objetos JTS deserializados.

---

### 2.3 Tabla `DATOS`

Almacena los registros de evaluación capturados por los formularios. **Esta es la tabla principal de datos de trabajo.**

```sql
CREATE TABLE IF NOT EXISTS DATOS (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    IDOBJECT INTEGER,
    DATOS TEXT,
    FECHA DATETIME,
    SINCRONIZADO BOOLEAN,
    IMEI TEXT,
    ANDROID_ID TEXT,
    LATITUD DOUBLE,
    LONGITUD DOUBLE,
    LATITUDGPS DOUBLE,
    LONGITUDGPS DOUBLE,
    LAYER TEXT,
    IDLAYER INTEGER,
    IDPREDIO INTEGER,
    CREADO_POR TEXT,
    FECHA_UPDATE DATETIME,
    ACTUALIZADO_POR TEXT,
    GRUPO_ID INTEGER NOT NULL DEFAULT 1
)
```

| Campo | Tipo | Descripción |
|:------|:-----|:------------|
| `ID` | INTEGER | Identificador único del registro (autoincremental) |
| `IDOBJECT` | INTEGER | Referencia al objeto geométrico asociado (FK lógica a `objects.id`) |
| `DATOS` | TEXT | **JSON completo del formulario** (ver sección siguiente) |
| `FECHA` | DATETIME | Fecha y hora de captura (formato ISO 8601: `dd/MM/yyyy HH:mm:ss`) |
| `SINCRONIZADO` | BOOLEAN | Campo heredado de una estructura anterior; **no se usa actualmente** en el flujo de la app, se conserva por compatibilidad |
| `IMEI` | TEXT | IMEI del dispositivo |
| `ANDROID_ID` | TEXT | Android ID del dispositivo |
| `LATITUD`, `LONGITUD` | DOUBLE | Coordenadas del punto seleccionado en el mapa |
| `LATITUDGPS`, `LONGITUDGPS` | DOUBLE | Coordenadas del GPS en el momento de la captura |
| `LAYER` | TEXT | Nombre de la capa de origen |
| `IDLAYER` | INTEGER | ID de la capa |
| `IDPREDIO` | INTEGER | ID del predio asociado |
| `CREADO_POR` | TEXT | Iniciales del usuario de sesión (`SecurityManager.currentUser.initials`) que creó el registro |
| `FECHA_UPDATE` | DATETIME | Fecha/hora de la última edición (solo se llena en updates, `id > 0`) |
| `ACTUALIZADO_POR` | TEXT | Iniciales del usuario que hizo la última edición |
| `GRUPO_ID` | INTEGER | Identificador de la **agrupación (grupo)** a la que pertenece el registro dentro del predio. Ver sección 5 para el detalle completo del mecanismo de subgrupos. |

> ⚠️ **Migración**: `GRUPO_ID` se agregó después del despliegue inicial. `DatabaseHelper.onOpen()` verifica en cada apertura de la BD (vía `PRAGMA table_info`, no depende de `PRAGMA user_version`) si la columna existe; si falta, ejecuta `ALTER TABLE DATOS ADD COLUMN GRUPO_ID INTEGER NOT NULL DEFAULT 1`, que rellena automáticamente el valor `1` en todos los registros preexistentes. Esta verificación es necesaria porque `Map.db` se entrega pre-poblada por una herramienta externa, no siempre creada a través de este `SQLiteOpenHelper`.

#### Estructura del Campo `DATOS` (JSON)

El campo `DATOS` almacena todo el formulario serializado como JSON. La estructura depende del tipo de formulario:

**Ejemplo para Ficha:**
```json
{
  "Type": "Ficha",
  "NoEncuesta": "001",
  "IdSector": "1",
  "Localizacion": "Barrio Central",
  "LocalProj": {
    "x": 492500.25,
    "y": 1095800.50
  },
  "LatLng": {
    "Lat": 9.9281,
    "Lng": -84.0907
  },
  "Identificacion": "001-123456-0000A",
  "NombreFinca": "LA ESPERANZA",
  "Encuestador": "JB",
  "Fecha": "2026-03-08"
}
```

**Ejemplo para No Encuestado:**
```json
{
  "Type": "NoEncuestado",
  "Descripcion": "El ocupante se niega a brindar datos por conflicto de linderos.",
  "Localizacion": "Barrio San José, Sector 4",
  "Encuestador": "JB",
  "Fecha": "2026-03-29",
  "IdObject": 45021
}
```

**Ejemplo para Unión con Predio:**
```json
{
  "Type": "UnionConPredio",
  "LocalizacionMaster": "6065-01-002-045",
  "_MasterDireccionRelativa": "Norte",
  "Localizacion": "6065-01-002-046",
  "Encuestador": "JB",
  "Fecha": "2026-03-29",
  "IdObject": 45022
}
```



#### Operaciones CRUD

| Operación | Método en `DatabaseHelper` |
|:----------|:---------------------------|
| **Crear** | `insertData()` con `id = -1` |
| **Leer uno** | `getData(id)` → retorna JSON |
| **Leer todos** | `getAllData()` → lista de `DataItem` |
| **Actualizar** | `insertData()` con `id > 0` |
| **Eliminar** | `deleteRow(id)` |

---

### 2.4 Tabla `tiles`

Almacena tiles de mapas offline en formato binario (imágenes PNG/JPG). Permite que la aplicación funcione sin conexión a internet.

```sql
CREATE TABLE IF NOT EXISTS tiles (
    x INTEGER, y INTEGER, z INTEGER, s INTEGER,
    tile BLOB,
    PRIMARY KEY (x, y, z, s)
)
```

| Campo | Tipo | Descripción |
|:------|:-----|:------------|
| `x` | INTEGER | Coordenada X del tile (columna) |
| `y` | INTEGER | Coordenada Y del tile (fila) |
| `z` | INTEGER | Nivel de zoom (mayor = más detalle) |
| `s` | INTEGER | Índice de servidor/fuente (para múltiples capas) |
| `tile` | BLOB | Imagen binaria del tile (PNG/JPG) |

#### Sistema de Coordenadas de Tiles

Los tiles siguen el sistema TMS (Tile Map Service) o similar:
- **Z (Zoom)**: Nivel de detalle. Típicamente 10-19 para aplicaciones urbanas.
- **X, Y**: Posición del tile en la grilla del nivel de zoom.

#### Métodos de Consulta

| Método | Descripción |
|:-------|:------------|
| `getTile(x, y, z)` | Obtiene el blob de un tile específico |
| `existsTile(x, y, z, s)` | Verifica si un tile existe |
| `getMaxZoom()` | Máximo nivel de zoom disponible |
| `getMinZoom()` | Mínimo nivel de zoom disponible |
| `getInitZoom()` | Zoom inicial recomendado (punto medio) |

---

## 3. Diagrama de Relaciones

```
┌─────────────────┐
│     config      │
│  (clave-valor)  │
└─────────────────┘

┌─────────────────┐         ┌─────────────────┐
│     tiles       │         │    objects      │
│  (mapa offline) │         │  (geometrías)   │
└─────────────────┘         └────────┬────────┘
                                     │
                                     │ IDOBJECT (FK lógica)
                                     │
                            ┌────────▼────────┐
                            │      DATOS      │
                            │  (formularios)  │
                            │   + JSON data   │
                            └─────────────────┘
```

---

## 4. Consideraciones Técnicas

### Pre-población

La base de datos `Map.db` se entrega **pre-poblada** con:
- Tabla `config`: Valores iniciales (`InitLat`, `InitLng`, `ENCUESTADOR`).
- Tabla `tiles`: Tiles de mapa offline pre-descargados.
- Tabla `objects`: Geometrías de predios con sus bounding boxes y WKB.

La tabla `DATOS` inicia vacía y se llena con los formularios capturados.

### Campo `SINCRONIZADO` (heredado, sin uso activo)

El campo existe en el esquema pero **no se usa actualmente** en el flujo de la app — es herencia de una estructura anterior y se conserva por compatibilidad con una futura sincronización (ver `docs/propuesta_sincronizacion_web.md`, roadmap no implementado). Ningún método de `DatabaseHelper` lo lee ni lo actualiza fuera del valor `false` fijo que se escribe al insertar/importar/exportar un registro.

### Almacenamiento de Imágenes

Las imágenes **NO** se almacenan en la base de datos. Solo se guarda el nombre del archivo en el campo `Imagenes` dentro del JSON de `DATOS`. Los archivos físicos residen en:

```
/storage/emulated/0/CADIC.INETER/*.jpg
```

---

## 5. Subgrupos Catastrales (`GRUPO_ID`)

### 5.1 Motivación

Un predio (polígono en la capa `Predios`) puede estar segregado en la documentación catastral presentada en campo, pero esa segregación **no siempre está reflejada en la poligonal** cargada en `Map.db`. Antes de esta funcionalidad, el sistema asumía un único conjunto de datos por `IDOBJECT` (un pin, una Ficha, un Entrevistado, etc. por predio). Ahora un mismo polígono puede contener **múltiples agrupaciones independientes** ("grupos"), cada una con su propia Ficha, Entrevistado, Propietario y Familiares — como si fueran parcelas separadas, aunque compartan la misma geometría.

### 5.2 Qué identifica un grupo

- `GRUPO_ID` es un entero **escalado por predio**, no global: dos predios distintos pueden ambos tener grupos `1`, `2`, etc. La clave real de identidad es siempre el par `(IDOBJECT, GRUPO_ID)`. Cualquier conteo agregado debe usar ambos campos (ej. `COUNT(DISTINCT IDOBJECT || '-' || GRUPO_ID)`), nunca `GRUPO_ID` solo.
- Un grupo "pertenece" a quien lo creó primero — no hay una columna separada para esto, se infiere del primer registro insertado en ese grupo (su `CREADO_POR`/`FECHA`).
- Los huecos en la secuencia de `GRUPO_ID` (ej. 1, 3, 4 si el grupo 2 se eliminó) no son un problema: es un identificador interno, no visible al usuario (a diferencia del consecutivo del `NoEncuesta`, que si es visible y no implementa relleno de huecos).

### 5.3 Algoritmo de resolución (al capturar un punto nuevo)

Implementado en `DatabaseHelper.resolveGrupoForNewPoint(idObject, lat, lng)` y `getGruposForObject(idObject)`, invocado desde `MainActivity.handleMapPosition()` **en el hilo de fondo**, junto con el resto de metadatos espaciales (municipio/sector/manzana/lote), antes de abrir `FormActivity`:

1. Si el predio no tiene ningún grupo todavía → `GRUPO_ID = 1`, posicionado **exactamente donde el usuario tocó** (no en el Polo de Inaccesibilidad; se probó y se descartó por inútil para este caso de uso).
2. Si el punto cae a **≤ 3 metros** de un grupo ya existente (`Location.distanceBetween`) → hereda ese `GRUPO_ID` y su posición exacta (*snapping*): todo lo que comparte posición debe compartir grupo.
3. Si no coincide con ningún grupo existente → nuevo grupo, `GRUPO_ID = máximo existente + 1`, en la posición exacta del toque.

### 5.4 Excepción: No Encuestado / Unión con Predio

Estas dos marcas son de **exclusividad total del predio**, no del grupo: si un predio tiene un registro `NoEncuestado` o `UnionConPredio`, no se permite agregar ningún otro dato (de ningún grupo) hasta que se quite esa marca — y viceversa, no se puede marcar como excepción un predio que ya tiene datos normales en cualquier grupo. Por eso, para efectos de pintado de marcadores, un predio en este estado siempre colapsa a un único marcador, independientemente de `GRUPO_ID`.

### 5.5 Áreas afectadas por el mecanismo de grupos

| Área | Cómo cambió |
|---|---|
| **Estadísticas** (`DatabaseHelper.getDailyStatisticsMap`, `getStatisticsByUserAndDateMap`) | Cuentan pares distintos `(IDOBJECT, GRUPO_ID)` en vez de solo `IDOBJECT`. |
| **Pintado de marcadores** (`MapHelper.kt`) | Agrupamiento jerárquico: por `IDOBJECT` y luego por `GRUPO_ID` dentro de cada predio (salvo la excepción de 5.4). Claves de marcador tipo `"idObject:grupoId"`. |
| **Listado del predio en las formas** (`Android.getData()`) | Filtra por `IDOBJECT` **y** `GRUPO_ID` juntos — solo muestra los datos del grupo que se está trabajando, no todo el predio. Para las reglas de exclusividad de No Encuestado/Unión existe `Android.getDataPredioCompleto()`, sin filtrar por grupo. |
| **Reglas de negocio** (`workflowService.js`) | Unicidad de Ficha/Entrevistado/tipo de propietario evaluada por grupo (`listData`, ya acotado). Exclusividad No Encuestado/Unión evaluada sobre todo el predio (`listDataPredio`). |
| **Direcciones por colindancia** | `AndroidBridge.getGruposHermanos()` (usa `SpatialHelper.getSiblingGroupsInSamePredio`) agrega, además de los predios adyacentes reales, los grupos hermanos del mismo predio como candidatos de dirección — función separada de `getDataInAdjacentPolygons()` para no contaminar la elegibilidad Master. |
| **Master/Esclavo** | Un predio solo es candidato a Master si tiene **una sola agrupación** (`TotalGrupos === 1`, calculado en SQL e incluido en el JSON de `getDataInAdjacentPolygons`). Esto reemplazó el clustering manual por distancia que existía antes en `workflowService.getMasterCandidates()`. |
| **Import/Export** (`ImportManager.kt`, `ExportManager.kt`) | Ambos incluyen `GRUPO_ID`. La importación detecta si la BD externa tiene la columna (`PRAGMA table_info`); si no la tiene, asume `GRUPO_ID = 1` para todos sus registros. |
