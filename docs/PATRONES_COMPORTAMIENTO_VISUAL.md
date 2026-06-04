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

## 🎨 Patrones de Visualización y Feedback

### 2. Feedback de Campos Obligatorios
Para mejorar la tasa de éxito en el guardado y reducir la frustración del usuario:
- **Label Dinámico**: Si un campo obligatorio está vacío durante la validación, su `<label>` debe cambiar a **Color Rojo** y **Negrita**.
- **Watchers de Limpieza**: Se deben implementar `watchers` en Vue para que, en cuanto el usuario comience a escribir en un campo con error, el estilo regrese a la normalidad (Color inherit, Normal weight).
- **Indicador Visual**: Los campos obligatorios deben llevar un asterisco `*` en el texto del label.

---

## 💾 Integridad de Datos y Tipos

### 3. Consistencia de Tipos (Enteros vs Strings)
Para asegurar la compatibilidad con el backend (.NET C#), los campos de catálogo deben tratarse como **Enteros**:

- **Input HTML**: Usar el modificador `.number` en `v-model` (ej: `v-model.number="formData.GenderCatalog"`).
- **Selectores Globales**: Aplicar `parseInt(val.id)` al recibir el valor del componente `CatalogoSelectorGrande`.
- **Comparaciones**: Utilizar comparaciones estrictas (`!==`, `===`) una vez asegurado que los tipos son numéricos.

---

## 🗺 Visualización en el Mapa y Barra de Título

### 4. Marcadores y Reglas de Agrupamiento
- **Agrupamiento por Proximidad (Snapping)**: Los registros individuales no se muestran si están a menos de **3 metros** de otro. Se agrupan bajo un único marcador que representa la "Unidad de Propiedad de Hecho".
- **Semáforo de Estado (Pines 3D)**:
  - **Rojo (Hue 0°)**: Predio marcado como **No Encuestado** (Indica una incidencia técnica o social que impidió la encuesta).
  - **Cian (Hue 180°)**: Predio con **Unión con Master** (Indica que este objeto es dependiente y hereda la información de un polígono colindante).
  - **Verde (Hue 120°)**: El predio está completo (Ciclo operativo estándar: Tiene al menos 1 Ficha, 1 Entrevistado y 1 Dueño).
  - **Amarillo (Hue 60°)**: El predio tiene datos pero el ciclo operativo está incompleto.
- **Resaltado del Último Registro Guardado**: Se restaura el pin nativo según su estado operativo de color, pero se superpone dinámicamente un **punto negro de 6dp** (ojo del marcador) en el centro de la cabeza del pin (anclaje `0.5f, 5.0f`), permitiendo una identificación inmediata del último cambio sin alterar la simbología de colores base.

- **Capas Vectoriales**:
  - **Predios**: Bordes amarillos (#FFD600), relleno transparente para lectura de fondo.
  - **Sector**: Contorno azul grueso (8dp, #1565C0).

### 5. Barra de Título Dinámica (Action Bar)
- **Indicador de Avance**: La barra superior de la aplicación muestra el título de la aplicación y un subtítulo que indica el avance de encuestas del día en tiempo real (`Hoy: X`), obtenidas tras aplicar el filtro espacial de 3 metros.

### 6. Interacciones de Usuario
1. **Clic en Parcela**: Inicia el flujo de captura si no hay datos previos (Inyecta Municipio y Sector automáticamente).
2. **Punto en Sector Incorrecto**: Mostrar advertencia visual y sonora si las coordenadas caen fuera del límite del sector asignado.
3. **Selección de Colindantes**: Menú flotante al tocar vértices compartidos para identificar propietarios vecinos.
