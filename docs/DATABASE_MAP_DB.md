# Documentación de Base de Datos: Map.db

## 1. Información General

| Atributo | Valor |
|:---------|:------|
| **Nombre del archivo** | `Map.db` |
| **Motor** | SQLite |
| **Ubicación en Android** | `/storage/emulated/0/CADIC.ACERAS/Map.db` |
| **Versión actual** | 1 |
| **Clase de acceso** | `DatabaseHelper.kt` (Singleton) |

### Ruta de Almacenamiento

La base de datos se almacena en el almacenamiento externo del dispositivo, fuera del directorio privado de la aplicación:

```
/storage/emulated/0/CADIC.ACERAS/Map.db
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
    wkt TEXT
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
| `wkt` | TEXT | Geometría en formato WKT (Well-Known Text) |

#### Uso Principal

Esta tabla se usa para:
1. **Detección de clic en mapa**: Al hacer clic, se buscan objetos cuyo bounding box contenga el punto.
2. **Verificación de punto en polígono**: Se parsea el campo `wkt` y se verifica si el punto está dentro del polígono usando `PolyUtil.containsLocation()`.

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
    IDPREDIO INTEGER
)
```

| Campo | Tipo | Descripción |
|:------|:-----|:------------|
| `ID` | INTEGER | Identificador único del registro (autoincremental) |
| `IDOBJECT` | INTEGER | Referencia al objeto geométrico asociado (FK lógica a `objects.id`) |
| `DATOS` | TEXT | **JSON completo del formulario** (ver sección siguiente) |
| `FECHA` | DATETIME | Fecha y hora de captura (formato: `dd/MM/yyyy HH:mm:ss`) |
| `SINCRONIZADO` | BOOLEAN | Flag de sincronización con servidor (0=pendiente, 1=sincronizado) |
| `IMEI` | TEXT | IMEI del dispositivo |
| `ANDROID_ID` | TEXT | Android ID del dispositivo |
| `LATITUD`, `LONGITUD` | DOUBLE | Coordenadas del punto seleccionado en el mapa |
| `LATITUDGPS`, `LONGITUDGPS` | DOUBLE | Coordenadas del GPS en el momento de la captura |
| `LAYER` | TEXT | Nombre de la capa de origen |
| `IDLAYER` | INTEGER | ID de la capa |
| `IDPREDIO` | INTEGER | ID del predio asociado |

#### Estructura del Campo `DATOS` (JSON)

El campo `DATOS` almacena todo el formulario serializado como JSON. La estructura depende del tipo de formulario:

**Ejemplo para FormAcera:**
```json
{
  "Localizacion": "San José Centro",
  "CodigoCamino": "SJ-001",
  "LocalProj_East": 492500.25,
  "LocalProj_North": 1095800.50,
  "LatLng_Lat": 9.9281,
  "LatLng_Lng": -84.0907,
  "Grietas": 3,
  "Huecos": 2,
  "Desnudamiento": 1,
  "Escalonamiento": 2,
  "Drenaje": 3,
  "PendienteTransversal": 2,
  "PendienteLongitudinal": 1,
  "AnchoLibre": 3,
  "Obstrucciones": 2,
  "Accesibilidad": 1,
  "TapasRejillas": 2,
  "Escuelas": true,
  "GobLocal": false,
  "TerminalBus": true,
  "Hospitales": false,
  "Poblacion": true,
  "Imagenes": "SanJose_SJ001_20260129_143000.jpg,SanJose_SJ001_20260129_143015.jpg",
  "Observaciones": "Acera en mal estado cerca de la escuela"
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
- Tabla `objects`: Geometrías de predios con sus bounding boxes y WKT.

La tabla `DATOS` inicia vacía y se llena con los formularios capturados.

### Sincronización

El campo `SINCRONIZADO` en la tabla `DATOS` permite:
1. Marcar registros como pendientes (`FALSE`).
2. Después de subir al servidor, marcarlos como sincronizados (`TRUE`).
3. Evitar duplicados en futuras sincronizaciones.

### Almacenamiento de Imágenes

Las imágenes **NO** se almacenan en la base de datos. Solo se guarda el nombre del archivo en el campo `Imagenes` dentro del JSON de `DATOS`. Los archivos físicos residen en:

```
/storage/emulated/0/CADIC.ACERAS/*.jpg
```
