# PATRONES_COMPORTAMIENTO_VISUAL.md

*(Contenido restaurado por la IA tras reversión de Git)*

---

Este documento establece los patrones de experiencia de usuario y visualización de datos en el mapa de la aplicación Android.

### Visualización en el Mapa
- **Puntos Capturados**:
  - Marcadores de color dinámico según el tipo de registro (Ej. Verde = Concluido, Rojo = Rechazado).
  - Etiquetas con el nombre del titular al acercar el mapa (Zoom > 18).

- **Capas Vectoriales**:
  - Predios: Bordes amarillos, relleno transparente para lectura de fondo.
  - Sector: Contorno azul grueso (8dp).

### Interacciones de Usuario
1. **Clic en Parcela**: Inicia el flujo de captura si no hay datos previos.
2. **Punto en Sector Incorrecto**: Mostrar advertencia visual y sonora.
3. **Selección de Colindantes**: Menú flotante al tocar vértices compartidos.

... (Continúa con el resto de patrones) ...
