# Changelog - INETER CADIC (Encuesta Catastral)

Este es el registro central de cambios. Para consultar cambios históricos, vea la sección de [Archivos](#archivos).

---

## [2026-03-10] - Unificación de Ubicación y Rigor en Captura

### 📍 Estandarización de Geografía y Residencia
- **Terminología Unificada**: Sincronización semántica entre la Ficha y la Persona. Se renombraron campos técnicos en DTOs y JS para usar **Barrio/Comarca** (nivel administrativo) y **Caserío** (asentamiento).
- **Obligatoriedad de Ubicación**: Tanto en la Ficha como en los Sujetos (Natural/Entrevistado), los campos de Barrio/Comarca y Caserío ahora son **mandatarios** para guardar el registro.

### 🛡️ Refuerzo de Integridad en Ficha (Encuesta)
- **Nuevos Campos Mandatarios**: Se elevó la exigencia de captura. Ahora son obligatorios:
    - `Dirección de la Parcela *`
    - `Descripción del Uso *`
    - `Origen de la Tierra *`
    - `Reseña Histórica *`
- **Feedback Visual Inmediato**: Implementación de labels dinámicos (rojo/negrita) que reaccionan en tiempo real mientras el encuestador escribe, guiando la corrección de errores antes del guardado.

### 🎨 Optimización de la Experiencia de Entrada (UI/UX)
- **Expansión de Áreas de Texto**: Incremento de altura (+5 líneas) en los campos detallados de la Ficha:
    - `Descripción del Uso`: Aumentado a **7 filas**.
    - `Reseña Histórica`: Aumentado a **9 filas**.
- **Catálogo de Documentos Modificado**: Creación de un "Proxy Catalog" (`Documento-Mod.json`) que muestra la lista de documentos en formato **`[codigo] / nombre`** para agilizar la identificación visual, sin alterar la integridad del catálogo base original.

### 🌐 Internacionalización y Caracteres Especiales
- **Corrección de Acentos**: Forzado de codificación **UTF-8** en el `AndroidBridge.kt`. Se garantiza que los acentos y la "ñ" se visualicen correctamente en todos los dispositivos, eliminando errores de decodificación al cargar catálogos desde los Assets de Android.

### 🗺️ Inteligencia Espacial y Semáforo de Avance
- **Agrupamiento Proximity Snapping (3m)**: Optimización masiva del mapa. Los registros que coexisten en un radio de 3 metros se consolidan en un **único marcador**, reduciendo el ruido visual y mejorando el rendimiento del WebView.
- **Sistema de Semáforo Dinámico**: Marcadores con lógica de estados en `MapHelper.kt`:
    - 🔴 **Rojo**: Registro activo/último guardado en la sesión.
    - 🟢 **Verde**: Unidad Completa (Combo [Ficha] + [Entrevistado] + [Dueño]).
    - 🟡 **Amarillo**: Avance parcial (faltan componentes del combo).

### 🏢 Refuerzo de Reglas en Sujeto Jurídico
- **Validación de Registro Público**: Los campos de ubicación y fecha del registro ahora son estrictamente obligatorios.
- **Lógica de Composición Grupal**: 
    - El campo `NroMiembros` es ahora de **solo lectura** y se autocalcula sumando Socios + Socias.
    - Se impone la regla de negocio: `(Socios + Socias) > 0` para permitir la salva.

---

## [2026-03-09] - Refactorización Estructural y Modularización (Fase Final)

### 🏗️ Arquitectura Vue.js "Slim"
- **Reducción de Complejidad**: El archivo principal `app.js` fue aligerado masivamente (reducido a **~550 líneas**), delegando responsabilidades a servicios especializados (`WorkflowService`, `PhotoService`, `ConversionService`).
- **Estandarización de Tokens**: Optimización para procesamiento por IA, manteniendo el archivo dentro de límites seguros.

### 🧠 Mantenimiento de Reglas y Ciclo de Vida
- **WorkflowService**: Centralización de validaciones de flujo (ej. no Ficha sin Entrevistado) y borrado en cascada (Familiares).
- **Protección Referencial**: Impedimento de borrado de entrevistados con encuestas activas.
- **ConversionService**: Automatización de la transformación entre Propietario Natural y Entrevistado.

### 📷 Gestión Multimedia Transaccional
- **PhotoService**: Implementación de lógica de **Commit** y **Rollback**. Las fotos se borran físicamente del disco si se cancela el formulario.
- **Corrección de Reactividad**: Solucionado el bug que impedía ver las fotos en la lista activa tras la modularización.

### 🧹 Limpieza y Estabilidad
- **Modelo Jurídico**: Restauración de la fábrica de modelos para Propietarios Jurídicos.
- **Contexto Global**: Asegurada la integridad de `vueAppContext` para acceso síncrono desde los puentes de Android.
- **Simplificación de Derechos**: Eliminada la opción "Otros" del catálogo de derechos y el campo `DerehoParcelaOtroText` en todos los niveles (DTO, JS, UI).
- **Lista Dinámica**: Implementación de visualización y pesos de ordenamiento diferenciados para **PROP. NATURAL** y **POSEEDOR**.
- **Clonación Higiénica**: Nueva lógica en `ConversionService` que automatiza la limpieza de vínculos al clonar dueños plenos entre identidades.

---

## [2026-03-08 - Noche] - Modelo de Derecho Parcelario en el Sujeto

### ⚖️ Migración de Tenencia y Derechos
- **Desacoplamiento Predial**: Traslado de la lógica de tenencia desde la "Ficha" hacia el "Sujeto Natural".
- **SujetoNatural Empoderado**: El modelo ahora porta el derecho legal y la relación con el dueño.

### 🎨 Mejoras en la Interfaz (UI/UX)
- **Visualización de Roles**: Actualización de etiquetas en listas para mostrar roles (PROP., Hijo, etc.).
- **Lógica Condicional**: Selectores dinámicos en el formulario de Sujeto Natural según el tipo de derecho.

---

## Archivos

Consulte aquí el historial detallado del proyecto:

- [Marzo 2026 (Semana 1)](changelog/CHANGELOG_2026_03_W1.md) - Reestructuración de servicios y estandarización DTO.
- [Febrero 2026](changelog/CHANGELOG_2026_02.md) - Composición familiar, selectores globales y lógica espacial.

---
*Última actualización: 2026-03-10*
