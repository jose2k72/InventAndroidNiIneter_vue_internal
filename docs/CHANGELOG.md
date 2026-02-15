# Changelog - Inv Goico ACERAS

## [2026-02-08] - Sesión de Desarrollo

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
