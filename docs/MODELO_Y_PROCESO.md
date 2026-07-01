# Origen del Modelo y Proceso de Modelado

Este documento detalla el flujo de información, los orígenes de datos y las transformaciones realizadas en el modelo SurveyCat hasta su implementación actual en las aplicaciones Android y su representación en C#.

## 1. Flujo de Catálogos (Diccionario)

Los catálogos dinámicos (Diccionario) siguen un proceso de extracción y propagación para mantener la integridad en todos los sistemas.

### Orígenes Primarios
La definición original de los catálogos y sus valores se encuentra en:
*   `DOCS\20260220\CaratulaDPA.pdf`: Definición de la División Política Administrativa.
*   `DOCS\20260220\CatalogosV2.xlsx`: Definición estructurada de todos los enumerados y catálogos de la V2.

### Generación de JSONs
A partir de estos orígenes, se generaron los archivos JSON individuales que contienen los pares ID/Nombre:
*   **Directorio de Salida:** `DOCS\20260220\CATALOGOS`
*   **Ejemplo:** `OrigenTierra.json`, `EstadoCivil.json`, `Profesion.json`, etc.

### Propagación por Comodidad
Para facilitar el consumo desde las diferentes capas del proyecto, estos archivos JSON se copiaron a:
1.  **C# (Backend/Core):** `SRC\NI.INETER.Core\Catalogs\Json` (Para validaciones y lógica de negocio).
2.  **Android (Local Assets):** `app\src\main\assets\web\data` (Para alimentar los selectores en el formulario web/Vue).

> [!NOTE]
> Se asume que los catálogos en todas estas ubicaciones deben mantenerse sincronizados para evitar inconsistencias en el intercambio de datos.

---

## 2. Flujo de Modelado de Datos (Esquema)

El diseño de las entidades (Ficha, Persona, Propietario, Familia) sigue una arquitectura pragmática que equilibra la normativa institucional con la viabilidad técnica en campo.

### El "Norte" (Documentación Original / Modelo Institucional)
Ubicación: `DOCS\20260220\`
Este es el bloque de referencia institucional de INETER, compuesto por elementos altamente sincronizados:
*   **Origen Físico**: `ModeloDatos_SurveyCatV2.pdf` (especificación completa).
*   **Análisis Técnico**: Carpeta `ANALISIS` (incluye SQL DDL destilado).
*   **Modelos de Referencia**: Carpeta `MODELO` (clases `.cs` que reflejan el modelo teórico 1:1).

### El DTO como Herramienta Operativa (C# Core)
Ubicación: `SRC\NI.INETER.Core\Models`
Es nuestra **adaptación oficial de intercambio**. Es vital entender que el DTO **no es un subordinado** ni un espejo exacto del modelo original por las siguientes razones:
*   **Modelado Selectivo**: Solo se incluyen las entidades y campos que hemos decidido implementar para la solución actual.
*   **Re-conceptualización**: El DTO se toma la libertad de tratar ciertos datos de forma distinta a la documentación institucional, simplificando procesos y estructuras rígidas del modelo teórico para adaptarlas al negocio real.
*   **Unicidad de la Verdad (Tríada de Referencia)**: La identificación y comparación de datos no se hace solo contra el PDF; se debe realizar contra el **Bloque de Referencia Unificado** (PDF, Análisis SQL/MD y Modelos .cs). Estos tres elementos son "la misma verdad" en formatos distintos.
*   **Dificultad de Comparación**: Debido a las simplificaciones técnicas del DTO, compararlo contra la Tríada de Referencia requiere un análisis de intención y concepto, ya que los nombres de columnas o la granularidad pueden haber variado drásticamente en favor de la operatividad.

---

## 3. Representación en Android e Intercambio (JSON)

La aplicación Android (Vue.js) consume y produce datos basados en la estructura definida en los DTOs de C#, pero con una capa adicional de enriquecimiento operativo.

### 3.1 El Modelo JS/JSON (Extensión del DTO)
El modelo JS que reside en la App es, en esencia, **el mismo DTO de C#** con las siguientes características:
*   **Espejo de Negocio**: Mantiene una correspondencia exacta en nombre y tipo con los campos del DTO para asegurar la persistencia.
*   **Campos Operativos/Enriquecidos**: Se inyectan propiedades adicionales necesarias para el funcionamiento de la App (ej: metadatos de UI `_isFromMap`, auditoría local `Encuestador`, coordenadas `LatLng`). 
*   **Persistencia Futura**: Aunque estos campos operativos no se persigan actualmente en tablas SQL individuales, viajan dentro del BLOB JSON. Esto no interfiere con el sistema; al contrario, es información que queda disponible para futuras decisiones de negocio o auditoría.

### 3.2 Estándares de Datos Operativos (JSON)
Para asegurar la consistencia, se aplican las siguientes reglas:
1. **Fechas**: Siempre en formato **ISO 8601** (`YYYY-MM-DD`). La conversión a formato local para visualización debe ocurrir solo en la capa de UI.
2. **Encuestador**: Se deben almacenar únicamente las **iniciales** (ej: "JB").
3. **Coordenadas**: El objeto `LocalProj` usa estrictamente las claves **`x`** e **`y`** (minúsculas).

### 3.2 Tabla de Mapeo de Clases

| `Ficha` | `Ficha.cs` | Datos físicos del predio (uso del suelo, área e infraestructura). |
| `SujetoNatural` | `SujetoNatural.cs` | Datos del titular o poseedor; incluye derechos y tenencia parcelaria (Propietario/Poseedor). |
| `SujetoJuridico` | `SujetoJuridico.cs` | Datos de empresas o entidades legales propietarias. |
| `Entrevistado` | `Entrevistado.cs` | Datos del informante del predio. |
| `Familiares` | `Familiar.cs` (Colección) | Composición del núcleo familiar residente. |

### 3.3 Flujo de Implementación de Nuevos Campos
1.  Identificar la característica en la **Documentación Original** (`DOCS\ANALISIS`).
2.  Estudiar su **Adaptación** al negocio y crear/modificar la propiedad en el **DTO de C#** (`NI.INETER.Core\Models`).
3.  Implementar el campo correspondiente en la **Forma Android** (Vue/JSON) asegurando el "match" perfecto con el DTO para los datos de negocio, añadiendo los campos operativos necesarios.

---

## 4. Detalles de Implementación: Ficha (Encuesta Catastral)

### 4.1 Identidad Visual vs. Estructural (La "Ley" del Etiquetado)
Para mantener la coherencia con el backend C# sin sacrificar la usabilidad, se aplica la siguiente convención de nombres:

1.  **Código Interno (Estructural)**: El término técnico es `Ficha`. Se usa en la propiedad `Type` del JSON, nombres de archivos (`FormFicha.js`), y lógica de base de datos.
2.  **Formulario (Título)**: Usa el `DisplayName` exacto del DTO: **"Encuesta Catastral"**.
3.  **Acceso Rápido (Botonera)**: Usa el `DisplayName` en mayúsculas: **"ENCUESTA CATASTRAL"**.
4.  **Lista/Grid (Abreviado)**: Versión reducida para legibilidad: **"ENCUESTA"**.
5.  **Comportamiento Multilínea**: En la botonera principal, si el nombre es extenso, el texto se ajustará a **dos líneas centradas** (vía CSS) para mantener el ancho de los botones uniforme y legible.

### 4.2 Campos de Utilidad Interna (Solo JS/JSON)
Existen campos en el modelo JavaScript que NO persisten en columnas individuales de la base de datos SQL definitiva, pero que son vitales para la operación de la App Android y se envían en el BLOB JSON para auditoría.

| Campo | Propósito | Comportamiento |
| :--- | :--- | :--- |
| `Type` | Discriminador | Valor fijo `'Ficha'`. Permite al backend identificar el DTO a instanciar. |
| `_isFromMap` | Flag de Origen | Si es `true`, la ficha se creó desde el mapa y bloquea edición de Área/Municipio. |
| `LatLng` | Localización GPS | Captura el punto exacto `{ Lat, Lng }` donde se inició la encuesta. |
| `IdSector` | Vínculo Espacial | Almacena el sector catastral obtenido por "snap" geográfico en el mapa. |
| `Localizacion` | Vínculo Espacial | Código de localización del predio interceptado en el mapa. |
| `_DeptoNombre` | UI Helper | Nombre del departamento (solo para visualización en el selector). |
| `_MuniNombre` | UI Helper | Nombre del municipio (solo para visualización en el selector). |
| `_ParentescoName`| UI Helper | Etiqueta del ID de parentesco para mostrar en la lista de registros. |
| `_RelacionPropietarioName`| UI Helper | Nombre visual (etiqueta) de la relación con el propietario. |

### 4.3 Diferencias y Similitudes Clave (JS vs C#)
*   **Similitud Estricta**: Campos como `NoEncuesta`, `NombreFinca`, `AreaEstimada`, `UnidadMedidaAreaEstimadaCatalog` deben ser idénticos en nombre (Case Sensitive) para el mapeo automático.
*   **Diferencia de Estructura**: 
    *   En JS, `Documentos` es un array de objetos con `_DocumentoName` (auxiliar).
    *   En C#, se espera una `List<DocumentoFicha>` donde los campos coincidan con los del objeto JS del array.
*   **Fechas**: En JS se manejan como strings (`YYYY-MM-DD`), en C# el DTO debe usar `DateTime?` para permitir nulos sin romper el mapeo.
*   **Tenencia**: La Ficha ya **NO** contiene campos de derecho parcelario. Estos han sido movidos a `SujetoNatural`.

---

## 4. Análisis de Identificación y Ubicación (Divergencias Técnicas)

Para evitar errores de interpretación al proyectar el DTO hacia la Tríada de Referencia (original), se deben considerar las siguientes realidades de negocio:

### 4.1 Identidad de la Encuesta (`Ficha`)
*   **UUID de Identificación (Unívoco)**: Aunque no sea un campo institucional, en el DTO/JS (`IdPropiedad`) se genera un UUID único por encuesta. Esto garantiza la integridad y trazabilidad absoluta del registro ante cualquier cambio de nomenclatura oficial posterior.
*   **No. Encuesta (Campañista)**: El campo `NoEncuesta` es un código de referencia interno/no oficial. Se utiliza para identificar la encuesta de forma rápida durante la campaña técnica, pero no sustituye al folio real.
*   **Localización (Vínculo No Oficial)**: El campo `Localizacion` **no es un dato oficial de catastro**. Es un identificador generado por nuestro equipo durante la preparación de la cartografía WGS84. Es vital para:
    *   Soportar la lógica de relación espacial de la App.
    *   Generar nomenclaturas y códigos temporales únicos.
    *   Una vez entregados los datos, la institución se encargará de asignar su propia codificación "oficial" definitiva.

### 4.2 El Concepto de "Sector" (Divergencia Semántica)
*   **Sector Logístico vs Geográfico**: Existe una homonimia con el modelo original. El `IdSector` en el DTO **no representa** el sector geográfico administrativo.
*   **Propósito**: Representa el **Sector de Campaña de Encuesta** (Lote de trabajo). Responde a un requerimiento operativo para organizar la entrega de datos por grupos de manzanas (lotes), facilitando el ingreso manual posterior por parte de la entidad.

### 4.3 Flexibilidad Geográfica y "Truth on Ground"
*   **Aplanamiento de Tablas**: Se decidió usar `string` (texto libre) para **Caserío** y **Barrio/Comarca**, rompiendo el esquema relacional rígido del original.
*   **Razón**: La entidad solo posee límites normalizados fiables a nivel de **Municipio y Departamento**. Exigir catálogos en niveles inferiores bloquearía el levantamiento en zonas rurales o urbanas no saneadas.
*   **Realidad del Terreno**: La App ignora las delimitaciones teóricas de límites urbanos/rurales institucionales. El objetivo es capturar el estado real de la verdad física sobre el terreno en el momento del levantamiento.

### 4.4 Relación de Sectores y Manzanas (Evolución de Capas)
*   **Historial**: En fases iniciales, las capas `Sectores` y `Manzanas` se trataron como equivalentes en la base de datos (con una relación exacta 1:1 de 23 registros cada una), utilizándose indistintamente para referirse a la manzana de terreno.
*   **Separación de Conceptos**: A partir de ahora, se establece la distinción conceptual formal:
    *   **Sector**: Capa de división territorial superior.
    *   **Manzana**: Capa correspondiente a las manzanas físicas de terreno.
*   **Diseño Futuro (Relación 1 a N)**: Se contempla que un único `Sector` albergue múltiples `Manzanas`. Las consultas espaciales en la base de datos y la lógica de negocio (como `SpatialHelper.kt`) deben evolucionar para consumir explícitamente la capa `Manzanas` cuando se busque la manzana colindante o de origen de un predio, en lugar de consultar la capa `Sectores`.

---

## 5. Tareas Pendientes y Deuda Técnica

### 5.1 Pendiente Inmediato (Refactorización)
*   [x] **Alineación de SujetoNatural**: Se unificaron los tipos y se integró la sección de Derecho Parcelario.
*   [x] **Campo Imágenes**: Ya integrado en el DTO de C# (`Ficha.cs`) y JS.
*   [x] **Derecho sobre Parcela**: Movido de Ficha a SujetoNatural.
*   [ ] **Sincronización de Catálogos**: Verificar que el ID `1` en `OrigenTierra.json` realmente represente "Otros".

### 5.2 Deuda Técnica
*   **Ortografía**: El campo `DerehoParcelaCatalog` (falta la "c") se mantiene por compatibilidad histórica entre capas.
*   **Renombramiento SujetoNatural / SujetoJuridico**: Se renombraron las clases `PropietarioNatural_Poseedor` y `PropietarioJuridico` a `SujetoNatural` y `SujetoJuridico` respectivamente. Esto refleja su rol como entidades de diagnóstico y auditoría en lugar de asumir titularidad legal definitiva, manteniendo sus `DisplayName` originales por requisitos de negocio.
*   **Alineación de Tipos (SujetoNatural)**: Existe deuda técnica en los campos obligatorios `ResidenceMunicipioCatalog` (usa `''`) y `ProfessionCatalog` (usa `0`). Deben alinearse a `null` en el futuro una vez se refuerce la validación en la interfaz para que C# no reciba valores vacíos en tipos numéricos.
*   **Saneamiento de SujetoJuridico**: Se añadió el campo `Identificacion` (RUC) y se renombró `TipoPersonaJuridica` a `TipoPersonaJuridicaCatalog` para alineación perfecta con el DTO.
*   **Migración de Datos**: Si se encuentran registros antiguos en producción con `Type: 'EncuestaCatastral'`, será necesaria una script de actualización al nuevo Type `'Ficha'`. Si existen `PropietarioNatural` o `PropietarioJuridica`, deberán migrar a `SujetoNatural` y `SujetoJuridico` respectivamente.


