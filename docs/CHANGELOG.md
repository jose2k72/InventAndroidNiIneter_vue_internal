# Changelog - INETER CADIC (Encuesta Catastral)

Este es el registro central de cambios. Para consultar cambios históricos, vea la sección de [Archivos](#archivos).

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
*Última actualización: 2026-03-09*
