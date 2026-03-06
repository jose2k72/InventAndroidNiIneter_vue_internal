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

## 3. Representación en Android (Interfaz de Usuario)

La aplicación Android (Vue.js) consume y produce datos basados estrictamente en el DTO de intercambio.

### La Regla del Espejo (DTO ↔ Forma)
A diferencia de la relación Modelo-DTO (que es adaptativa), la relación entre el **DTO y la Forma Web/Android** debe ser de **correspondencia exacta**:
*   **Sincronización Total:** El DTO y la interfaz de usuario son dos vistas de la misma cosa. Si el DTO cambia, la forma debe cambiar inmediatamente y viceversa. 
*   **Inconsistencias Críticas:** Cualquier diferencia entre el DTO y la representación en la app Android es un error de integridad que debe corregirse de inmediato.

### Flujo de Implementación de Nuevos Campos
1.  Identificar la característica en la **Documentación Original** (`DOCS\ANALISIS`).
2.  Estudiar su **Adaptación** al negocio y crear/modificar la propiedad en el **DTO de C#** (`NI.INETER.Core\Models`).
3.  Implementar el campo correspondiente en la **Forma Android** (Vue/JSON) asegurando el "match" perfecto con el DTO.
