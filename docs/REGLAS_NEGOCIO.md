# Reglas de Negocio y Validaciones: INETER CADIC

Este documento detalla la lógica de negocio, validaciones y jerarquías de datos implementadas en la aplicación de Encuesta Catastral.

## 1. Flujo de Creación de Encuesta

La "Ficha" o Encuesta Catastral es el eje central de la recolección. Para garantizar la integridad de los datos sin comprometer la agilidad en campo, se aplican las siguientes reglas:

### 1.1 Orquestación de Reglas (WorkflowService)
Todas las reglas de flujo son validadas centralizadamente por el `WorkflowService.js` antes de iniciar cualquier operación en `app.js`.

### 1.2 Requisitos de Iniciación
- **Entrevistado (Obligatorio/Único)**: Es indispensable tener registrado al menos un Entrevistado/Informante antes de realizar la "ENCUESTA". Solo se permite **un uno (1)** por predio.
- **Propietario (Opcional)**: No es obligatorio para iniciar la encuesta.
- **Ficha (Única)**: Solo se permite una encuesta por objeto espacial.
- **Familiares (Dependencia)**: Solo se permite agregar integrantes si existe al menos un Propietario Natural previo.
- **Auto-relleno**: Al iniciar desde el mapa, se hereda área y municipio automáticamente vía `ModelsFactory`.

### 1.3 Jerarquía de Datos
- **Borrado en Cascada**: Si se elimina el registro de "Familiares", no afecta a la encuesta, pero si se elimina el único **"Sujeto Natural"**, el sistema ejecuta un borrado en cascada automático de su composición familiar vinculada. *(Corregido para excluir explícitamente mediante el ID el propietario en proceso de eliminación y evitar falsos positivos de tenencia al evaluar con comparaciones de tipo flexible `!=`)*.
- **Validación de Borrado**: No se permite eliminar al **Entrevistado** si ya existe una **Ficha** (Encuesta) vinculada, protegiendo la integridad referencial.
- **Relación Entrevistado-Propietario**: Si el entrevistado es el mismo propietario, el sistema permite una creación silenciosa para evitar doble entrada de datos mediante el `ConversionService`.
- **Candidatos Master (Unificación)**: Un predio solo puede ser Master si ya tiene información registrada y esta pertenece a un **único cluster** espacial (una sola acumulación de puntos a menos de 3 metros).

### 1.4 Reglas de Exclusividad de Estado (Bidireccional)
Para garantizar la integridad del inventario, los registros se dividen en dos categorías mutuamente excluyentes:

1.  **Estado Operativo (Normal)**: Predios con Ficha, Entrevistado, Propietarios, etc.
2.  **Estado de Excepción (Terminal)**: Predios marcados como **No Encuestado** o **Unión con Predio**.

**Restricciones Estrictas:**
- **Bloqueo por Información Existing**: Si un predio ya tiene *cualquier* registro operativo, el sistema **impide** que sea marcado como excepción (No Encuestado/Unión).
- **Bloqueo por Excepción**: Si un predio ya cuenta con un registro de No Encuestado o Unión, el sistema **bloquea** la inserción de cualquier otro tipo de dato normal.
- **Exclusividad de Excepción**: Un predio no puede ser simultáneamente "No Encuestado" y "Unión con Predio". Solo se admite una de estas marcas por polígono.

---

---

## 2. Gestión Transaccional de Archivos

El ciclo de vida de las fotografías está controlado exclusivamente por las acciones explícitas del usuario. La regla fundamental es: **si el formulario no se guarda, el estado de la base de datos debe quedar intacto en disco**.

- **Rollback (Cancelar)**: Las fotos nuevas capturadas/importadas en la sesión se borran físicamente del disco. Las fotos originales de la BD que el usuario marcó para borrar **se conservan** intactas. Al reabrir el registro, la BD recarga su estado previo.
- **Commit (Guardar)**: Las fotos marcadas para borrar se eliminan físicamente. Si la **Foto del Frente** fue reemplazada, el archivo anterior se elimina del disco para evitar archivos huérfanos.

---

## 3. Validaciones Específicas de Formularios

### 3.1 Formulario: Ficha (Encuesta Catastral)
- **Área Estimada**: Se valida que sea un número positivo. Si viene del mapa, el campo se bloquea para evitar discrepancias con la topografía digital.
- **Identificadores**: Se utiliza `IdPropiedad` (UUID) para la vinculación única del registro y `IdSector` para la generación del número de encuesta.
- **Contenido Físico**: Se centra en datos de uso, cultivos, instalaciones y documentación del predio. No contiene datos de tenencia.

### 2.2 Formulario: Sujeto Natural (Persona)
- **Derecho Parcelario e Identificación**:
    - **Número de personas con derecho similar**: Debe ser estrictamente **mayor que 1** (o igual si es único). Validado para evitar nulos.
    - **Edad**: Debe ser **>= 0**.
    - **No. Identificación**: Campo obligatorio.
- **Vínculo con el Propietario (Regla de Exclusión)**:
    - Si `Derecho Parcelario` != **"Propietario (Dominio Pleno)"** (ID: 1), es **obligatorio** seleccionar un vínculo en el catálogo de relaciones.
    - Si se cambia a "Propietario", cualquier vínculo previo se limpia automáticamente para mantener la integridad. El catálogo ha sido simplificado para eliminar la opción "Otros", dejando únicamente **Propietario** (1) y **Poseedor** (2).
- **Perfil y Carnet**: Si se selecciona un Perfil del Propietario (Desmovilizado, Retirado, etc.), el campo **Carnet del Perfil** se vuelve obligatorio. Si el perfil es "Otro", la descripción también es obligatoria.

---

## 3. Lógica Espacial y Localización

### 3.1 Localización de Predios
- **Motor Espacial en Memoria**: Se utiliza la librería **JTS (Java Topology Suite)** para realizar de manera síncrona en memoria todas las validaciones y consultas espaciales (como verificar que las coordenadas caigan dentro de un polígono).
- **Formato WKB**: Para optimizar el rendimiento y la memoria, las geometrías de predios se almacenan como blobs binarios (`WKB`) en la base de datos `Map.db`, reemplazando el uso anterior de texto `WKT`.
- **Posicionamiento y Consolidación**: 
  - Al presionar el mapa sobre un predio vacío, la encuesta se inicializa en el **Polo de Inaccesibilidad (PIA)** de JTS (el punto interior más lejano a los bordes) para asegurar una ubicación coherente del marcador.
  - Si el predio ya contiene datos de encuestas previas, el nuevo registro hereda de manera obligatoria la coordenada exacta del primer registro (consolidación espacial por predio), agrupando todos los marcadores del polígono en un solo punto en el mapa.

### 3.2 Capas Operativas
- **Predios**: Capa base para la consulta y vinculación.
- **Municipios**: Capa de soporte para la integridad de catálogos geográficos.
- **Rutas (Viales)**: Capa de referencia que incluye rutas locales y nacionales. **Nota Importante**: Actualmente estas capas están deshabilitadas en la interfaz de usuario (menú de capas) y en la lógica de renderizado para simplificar la operación catastral, pero se mantienen tanto en la base de datos como en el código fuente para referencia futura y para no perder la implementación técnica ya desarrollada.

---

## 4. Gestión de Archivos y Fotos

- **Captura Transaccional**: Las fotografías tomadas durante la edición solo se confirman en el almacenamiento final si el usuario guarda el formulario. Si cancela, los archivos temporales son purgados automáticamente.
- **Nomenclatura**: `{NoEncuesta}_{yyyyMMdd_HHmmss_SSS}.jpg` para garantizar unicidad y facilitar la auditoría externa fuera de la base de datos.
- **Foto del Frente (`FotoFrente`)**: Campo obligatorio con tracking independiente. Su valor original se captura como snapshot (`fotoFrenteOriginal`) al abrir el registro, permitiendo detectar reemplazos y limpiar correctamente el archivo anterior al guardar.
- **Fotos Adicionales (`Imagenes`)**: Gestionadas mediante tres arreglos de estado (`fotosOriginales`, `fotosNuevas`, `fotosMarcadasBorrar`). Los cambios se materializan en disco únicamente al confirmar con "Guardar".
- **Restricción en Importación**: El `FileBrowser` opera en modo selección única (`singleselection`) al importar la Foto del Frente, y en modo múltiple para fotos adicionales.
