# PATRONES DE COMPORTAMIENTO VISUAL Y TÉCNICO

Este documento establece los estándares de experiencia de usuario (UX), diseño visual y requisitos técnicos para el desarrollo de la aplicación Android/Vue.

---

## 🛠 Patrones de Formularios (Captura de Datos)

### 1. Patrón de Selección "Otro"
Para campos que terminan en la opción "Otro", se debe seguir estrictamente la siguiente lógica:

- **Visibilidad Condicional**: El campo de texto libre (ej: `ProfessionOtroText`) solo debe ser visible si el catálogo asociado (ej: `ProfessionCatalog`) tiene seleccionado el ID correspondiente a "Otro".
- **Limpieza Automática**: Al cambiar la selección del catálogo a cualquier opción distinta de "Otro", el campo de texto libre debe ser **vaciado inmediatamente** (`''`) y sus errores de validación eliminados.
- **Implementación Técnica**:
  - Usar `Vue.watch` para detectar cambios reactivos.
  - **Crítico**: Debido al ciclo de vida del WebView, la limpieza también debe ejecutarse en el callback `onSelect` si se utiliza el selector de catálogo global (`openCatalog`), ya que los watchers pueden no dispararse si el componente se desmonta.
- **Convención de Nombres**: `[Campo]Catalog` para el ID y `[Campo]OtroText` para el texto libre.

#### IDs de Referencia para "Otro":
- **Profesión**: ID `26`
- **Perfil Propietario**: ID `7`
- **Origen de la Tierra**: ID `1`
- **Clase de Conflicto**: ID `13`
- **Gestión de Conflicto**: ID `6`
- **Tipo de Persona Jurídica**: ID `4`
- **Tipo de Identificación**: ID `6`
- **Servidumbres**: ID `4`
- **Relación con la Parcela**: ID `5`

---

## 💾 Integridad de Datos y Tipos

### 2. Consistencia de Tipos (Enteros vs Strings)
Para asegurar la compatibilidad con el backend (.NET C#), los campos de catálogo deben tratarse como **Enteros**:

- **Input HTML**: Usar el modificador `.number` en `v-model` (ej: `v-model.number="formData.GenderCatalog"`).
- **Selectores Globales**: Aplicar `parseInt(val.id)` al recibir el valor del componente `CatalogoSelectorGrande`.
- **Comparaciones**: Utilizar comparaciones estrictas (`!==`, `===`) una vez asegurado que los tipos son numéricos.

---

## 🗺 Visualización en el Mapa

### 3. Marcadores y Capas
- **Puntos Capturados**:
  - Marcadores de color dinámico según el tipo de registro (Ej. Verde = Concluido, Rojo = Rechazado).
  - Etiquetas con el nombre del titular al acercar el mapa (Zoom > 18).

- **Capas Vectoriales**:
  - **Predios**: Bordes amarillos (#FFD600), relleno transparente para lectura de fondo.
  - **Sector**: Contorno azul grueso (8dp, #1565C0).

### 4. Interacciones de Usuario
1. **Clic en Parcela**: Inicia el flujo de captura si no hay datos previos (Inyecta Municipio y Sector automáticamente).
2. **Punto en Sector Incorrecto**: Mostrar advertencia visual y sonora si las coordenadas caen fuera del límite del sector asignado.
3. **Selección de Colindantes**: Menú flotante al tocar vértices compartidos para identificar propietarios vecinos.
