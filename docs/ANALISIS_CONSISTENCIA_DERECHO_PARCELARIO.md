# ANALISIS_CONSISTENCIA_DERECHO_PARCELARIO.md

*(Contenido restaurado por la IA tras reversión de Git)*

---

Este documento detalla el análisis de consistencia necesario para garantizar la integridad de los datos de derechos parcelarios en la base de datos de inventario.

### Objetivos
- Validar que cada predio tenga un titular asociado.
- Asegurar que el área declarada coincida con el área medida (tolerancia 5%).
- Verificar solapamientos espaciales entre parcelas colindantes.

### Reglas de Validación
1. **Titularidad Única**: Un ID de predio no puede tener dos propietarios divergentes.
2. **Geometría Cerrada**: Todos los WKT importados deben ser Polígonos válidos.
3. **Consistencia de Sector**: La ubicación del punto de captura debe caer dentro del polígono del sector asignado.

... (Continúa con el resto del análisis) ...
