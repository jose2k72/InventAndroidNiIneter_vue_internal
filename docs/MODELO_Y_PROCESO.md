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

El diseño de las entidades (como la Ficha, Persona, Propietario) no es estático y ha pasado por un proceso de refinamiento y sincronización.

### El "Norte" (Modelo Original)
El modelo de datos ideal y completo está documentado en:
*   `DOCS\20260220\ModeloDatos_SurveyCatV2.pdf`: Especificación técnica completa del modelo V2 de INETER.

### El DTO como Adaptación (C# Core)
El **DTO (Data Transfer Object)** en `NI.INETER.Core\Models` es nuestra estructura de intercambio oficial, pero es importante entender su naturaleza:
*   **Construcción Selectiva:** No es un espejo 1:1 del PDF original; es una selección de lo que realmente se requiere representar en la solución actual.
*   **Adaptación de Negocio:** El DTO adapta conceptos del modelo original para que sean funcionales en el sistema. Hay cosas que se tratan de forma diferente en el modelo teórico vs el DTO de intercambio.
*   **Estado Evolutivo:** Muchas características de la documentación original aún no están implementadas y requieren un estudio previo antes de reflejarlas en el DTO.

---

## 3. Representación en Android e Intercambio (JSON)

La aplicación Android (Vue.js) consume y produce datos basados en la estructura definida en los DTOs de C#, pero con matices operativos.

### 3.1 La Regla del Espejo Flexibilizada (DTO + Contexto)
La relación entre el **DTO y el modelo JS** ya no es 1:1 estricta, sino que se define de la siguiente manera:
*   **Campos de Negocio (Persistentes)**: Debe existir una correspondencia exacta en nombre y tipo entre el JS y el C# para asegurar que los datos se guarden en la base de datos final.
*   **Campos Operativos/Temporales (Inyectados)**: Se permite la inclusión de propiedades adicionales en el JSON (como metadatos de auditoría `Encuestador`, `Fecha`, datos espaciales `LatLng`, o flags de UI `_isFromMap`). 
*   **Recepción en C#**: Aunque estos campos operativos no se persistan directamente en las tablas de la base de datos de destino, el código C# debe ser capaz de recibirlos dentro del BLOB JSON para tomar decisiones de flujo, validaciones de auditoría o transformaciones en caliente.
54: 
54.1: ### 3.2 Estándares de Datos Operativos (JSON)
54.2: Para asegurar la consistencia y ligereza del intercambio de datos, se aplican las siguientes reglas obligatorias:
54.3: 1. **Fechas**: Siempre en formato **ISO 8601** (`YYYY-MM-DD`). La conversión a formato local para visualización debe ocurrir solo en la capa de UI.
54.4: 2. **Encuestador**: Se deben almacenar únicamente las **iniciales** (ej: "JB").
54.5: 3. **Coordenadas Proyectadas**: El objeto `LocalProj` debe usar estrictamente las claves **`x`** e **`y`** (minúsculas).

### 3.2 Tabla de Mapeo de Clases

| Modelo JS (`Type` en Android) | Clase C# (DTO en `NI.INETER.Core`) | Propósito |
| :--- | :--- | :--- |
| `Ficha` | `Ficha.cs` | Datos núcleo del levantamiento catastral. |
| `SujetoNatural` | `SujetoNatural.cs` | Datos de la persona natural (propietaria, poseedora o con vínculo). |
| `SujetoJuridico` | `SujetoJuridico.cs` | Datos de empresas o entidades legales. |
| `Entrevistado` | `Entrevistado.cs` | Datos del informante del predio. |
| `Familiares` | `Familiar.cs` (Colección) | Listado de composición familiar. |

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

### 4.3 Diferencias y Similitudes Clave (JS vs C#)
*   **Similitud Estricta**: Campos como `NoEncuesta`, `NombreFinca`, `AreaEstimada`, `UnidadMedidaAreaEstimadaCatalog` deben ser idénticos en nombre (Case Sensitive) para el mapeo automático.
*   **Diferencia de Estructura**: 
    *   En JS, `Documentos` es un array de objetos con `_DocumentoName` (auxiliar).
    *   En C#, se espera una `List<DocumentoFicha>` donde los campos coincidan con los del objeto JS del array.
*   **Fechas**: En JS se manejan como strings (`YYYY-MM-DD`), en C# el DTO debe usar `DateTime?` para permitir nulos sin romper el mapeo.

---

## 5. Tareas Pendientes y Deuda Técnica

### 5.1 Pendiente Inmediato (Refactorización)
*   [ ] **Alineación de PropietarioNatural**: Aplicar la misma unificación de tipos (evitar discrepancias como `EncuestaCatastral/Ficha`).
*   [ ] **Campo Imágenes**: Se identificó la necesidad de añadir una lista de fotos (`Imagenes`) al DTO de C# para recibir las rutas/nombres de archivos capturados por la App.
*   [ ] **Sincronización de Catálogos**: Verificar que el ID `1` en `OrigenTierra.json` realmente represente "Otros" en todos los entornos.

### 5.2 Deuda Técnica
*   **Ortografía**: El campo `DerehoParcelaCatalog` (falta la "c") se mantiene por compatibilidad histórica entre capas.
*   **Renombramiento SujetoNatural / SujetoJuridico**: Se renombraron las clases `PropietarioNatural_Poseedor` y `PropietarioJuridico` a `SujetoNatural` y `SujetoJuridico` respectivamente. Esto refleja su rol como entidades de diagnóstico y auditoría en lugar de asumir titularidad legal definitiva, manteniendo sus `DisplayName` originales por requisitos de negocio.
*   **Alineación de Tipos (SujetoNatural)**: Existe deuda técnica en los campos obligatorios `ResidenceMunicipioCatalog` (usa `''`) y `ProfessionCatalog` (usa `0`). Deben alinearse a `null` en el futuro una vez se refuerce la validación en la interfaz para que C# no reciba valores vacíos en tipos numéricos.
*   **Saneamiento de SujetoJuridico**: Se añadió el campo `Identificacion` (RUC) y se renombró `TipoPersonaJuridica` a `TipoPersonaJuridicaCatalog` para alineación perfecta con el DTO.
*   **Migración de Datos**: Si se encuentran registros antiguos en producción con `Type: 'EncuestaCatastral'`, será necesaria una script de actualización al nuevo Type `'Ficha'`. Si existen `PropietarioNatural` o `PropietarioJuridica`, deberán migrar a `SujetoNatural` y `SujetoJuridico` respectivamente.


