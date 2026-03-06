# Reglas de Negocio y Validaciones: INETER CADIC

Este documento detalla la lógica de negocio, validaciones y jerarquías de datos implementadas en la aplicación de Encuesta Catastral.

## 1. Flujo de Creación de Encuesta

La "Ficha" o Encuesta Catastral es el eje central de la recolección. Para garantizar la integridad de los datos sin comprometer la agilidad en campo, se aplican las siguientes reglas:

### 1.1 Requisitos de Iniciación
- **Entrevistado (Obligatorio)**: Es indispensable tener registrado al menos un Entrevistado/Informante antes de habilitar el botón de "ENCUESTA".
- **Propietario (Opcional)**: No es obligatorio registrar a un propietario para iniciar la encuesta. Esto permite capturar datos en casos donde el propietario no está presente.
- **Auto-relleno**: Si se inició la encuesta desde un predio del mapa, se hereda automáticamente el área y el catálogo de municipio interceptado.

### 1.2 Jerarquía de Datos
- **Borrado en Cascada**: Si se elimina el registro de "Familiares", no afecta a la encuesta, pero si se elimina el único "Propietario Natural", el sistema mantiene la encuesta ya que ahora la dependencia fuerte es con el "Entrevistado".
- **Relación Entrevistado-Propietario**: Si el entrevistado es el mismo propietario, el sistema permite una creación silenciosa para evitar doble entrada de datos.

---

## 2. Validaciones Específicas de Formularios

### 2.1 Formulario: Encuesta Catastral
- **Número de personas con derecho similar**: Debe ser estrictamente **mayor que 0**. Esta es una validación de bloqueo; el sistema no permitirá guardar el formulario si el valor es 0 o nulo.
- **Área Estimada**: Se valida que sea un número positivo. Si viene del mapa, el campo se bloquea para evitar discrepancias con la topografía digital.
- **Identificadores**: Se utiliza `IdPropiedad` (UUID) para la vinculación única del registro y `IdSector` para la generación del número de encuesta.

### 2.2 Formulario: Personas (Propietario / Entrevistado)
- **Edad**: Debe ser **>= 0**.
- **No. Identificación**: Campo obligatorio. Se eliminaron los placeholders de ejemplo para evitar que el usuario asuma formatos rígidos que no corresponden a todos los tipos de documentos (Cédula, RUC, Pasaporte).
- **Perfil y Carnet**: Si se selecciona un Perfil del Propietario (Desmovilizado, Retirado, etc.), el campo **Carnet del Perfil** se vuelve obligatorio. Si el perfil es "Otro", la descripción también es obligatoria.

---

## 3. Lógica Espacial y Localización

### 3.1 Localización de Predios
- Se utiliza el motor **JTS (Java Topology Suite)** para garantizar que cada registro de inventario esté vinculado correctamente a un polígono catastral.
- El sistema detecta automáticamente el código de ubicación (`LOCALIZACION`) y el ID del objeto al momento del clic.

### 3.2 Capas Operativas
- **Predios**: Capa base para la consulta y vinculación.
- **Municipios**: Capa de soporte para la integridad de catálogos geográficos.
- **Rutas (Viales)**: Capa de referencia que incluye rutas locales y nacionales. **Nota Importante**: Actualmente estas capas están deshabilitadas en la interfaz de usuario (menú de capas) y en la lógica de renderizado para simplificar la operación catastral, pero se mantienen tanto en la base de datos como en el código fuente para referencia futura y para no perder la implementación técnica ya desarrollada.

---

## 4. Gestión de Archivos y Fotos

- **Captura Transaccional**: Las fotografías tomadas durante la edición solo se confirman en el almacenamiento final si el usuario guarda el formulario. Si cancela, los archivos temporales son purgados automáticamente.
- **Nomenclatura**: [Localización]_[Ruta]_[Timestamp].jpg para facilitar la auditoría externa fuera de la base de datos.
