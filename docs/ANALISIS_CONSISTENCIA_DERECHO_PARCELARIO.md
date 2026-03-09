# Análisis de Consistencia: Derecho Parcelario y Tenencia

Este documento detalla la lógica y reglas para garantizar la integridad de los datos de derechos sobre la tierra, tras la migración del modelo "Ficha-céntrico" al modelo **"Sujeto-céntrico"**.

---

## 1. Cambio de Paradigma: Del Predio al Sujeto

Anteriormente, la información del "Derecho sobre la Parcela" residía en la **Ficha (Encuesta Física)**. Esto generaba inconsistencias cuando múltiples personas poseían derechos parciales o diferentes sobre un mismo polígono.

### Modelo Actual (Sujeto-Céntrico)
Desde la versión **2026.03.08**, el derecho parcelario es una propiedad intrínseca del **SujetoNatural** (o Jurídico).

*   **La Ficha**: Representa el continente físico (uso del suelo, área, colindancias, infraestructura).
*   **El Sujeto**: Representa el contenido legal/social (quién es, qué derecho tiene y qué vínculo tiene con el dueño si no lo es).

---

## 2. Reglas de Consistencia Operativa

### 2.1 Inferencia de Relación
Se ha eliminado el campo booleano `TieneRelacionConPropietario`. La consistencia se valida mediante la siguiente lógica:

1.  **Si `DerehoParcelaCatalog` == 1 (Propietario)**:
    *   No se requiere Vínculo/Relación.
    *   El campo `RelacionConPropietarioCatalog` debe ser `0` o `null`.
2.  **Si `DerehoParcelaCatalog` != 1 (Poseedor, Arrendatario, etc.)**:
    *   Es **obligatorio** definir un vínculo en `RelacionConPropietarioCatalog`.
    *   Este vínculo se selecciona del catálogo `RelacionInformantePropietario.json`.

### 2.2 Cuantificación del Derecho
El campo `NoPersonasSimilarDerecho` es obligatorio para todos los sujetos con derecho sobre la parcela. 
*   Permite detectar casos de **Proindiviso** (donde N personas declaran ser dueños del 100% de la misma parcela).
*   Facilita la auditoría de ocupantes múltiples.

---

## 3. Validaciones en el Formulario (Frontend)

Para evitar errores de captura, el componente `FormSujetoNatural.js` implementa:
*   **Limpieza Automática**: Si un usuario cambia el derecho de "Inquilino" a "Propietario", el sistema borra automáticamente cualquier vínculo previamente seleccionado.
*   **Visibilidad Condicional**: El selector de relación solo se muestra si el derecho seleccionado así lo amerita.

---

## 4. Mapeo con el Backend (DTO)

El DTO `SujetoNatural.cs` ha sido actualizado para recibir estos campos, asegurando que la persistencia en SQL refleje fielmente la declaración del informante.

> [!IMPORTANT]
> La "Ficha" ha sido despojada de campos de derecho para evitar la **redundancia de datos** y asegurar que la fuente de verdad sobre la tenencia esté en los registros de sujetos asociados al predio.

