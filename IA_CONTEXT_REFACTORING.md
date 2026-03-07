# IA_CONTEXT_REFACTORING.md

## 📅 Sesión: Refactorización (Intento 1 - Fallido)
**Fecha:** 2026-03-06
**Objetivo:** Reducir el conteo de tokens de archivos críticos dividiéndolos en clases auxiliares.

---

## 📂 Archivos Refactorizados (A revertir/analizar)

### 1. `GeometryUtil.kt` (Original: ~720 líneas)
- **Qué se hizo:** Se convirtió en una `Facade`. La lógica de JTS se movió a `JtsSpatialHelper`, las proyecciones a `ProjectionHelper`, y las conversiones a `GeometryConversionHelper`.
- **Problemas:**
    - Pérdida de contexto sobre los tipos de datos (Type Aliases vs imports directos).
    - Errores de visibilidad en métodos que se necesitan entre los nuevos helpers.
- **Estrategia para mañana:** No dividir tanto. Mantener las utilidades de conversión junto a las de proyección si se usan juntas a menudo.

### 2. `MainActivity.kt` (Original: ~400 líneas)
- **Qué se hizo:** Se extrajo `MapHelper`, `MainDialogHelper`, `PermissionHelper` y `FormLauncherHelper`.
- **Problemas:**
    - El ciclo de vida (`onResume`, `onCreate`) se rompió al delegar la inicialización de mapas y diálogos.
    - El objeto `GoogleMap` no se compartía correctamente o se accedía antes de estar listo.
    - La lógica de salida (`exitApp`) entró en un bucle infinito al delegar a `MainDialogHelper`.
- **Estrategia para mañana:** Mantener la lógica de orquestación en la Actividad y solo mover lógica "pesada" de cálculo a los helpers. Probar cada botón del menú después de mover una función.

### 3. `FormActivity.kt`
- **Qué se hizo:** Se extrajo `AndroidBridge.kt`.
- **Problemas:**
    - Comunicación `WebView` <-> `Native` inconsistente después del movimiento.
    - Pérdida de referencias a la Actividad padre desde el Bridge.
- **Estrategia para mañana:** Asegurar que `AndroidBridge` tenga una referencia débil o sólida bien definida a la Actividad y que el objeto `Android` se inyecte en el momento justo del ciclo de vida del WebView.

### 4. `SpatialHelper.kt` / `DatabaseHelper.kt`
- **Qué se hizo:** Se movieron las consultas espaciales a `SpatialHelper`.
- **Problemas:**
    - **CRÍTICO:** Error de Locale (Coma vs Punto decimal). Al refactorizar se perdió la normalización de coordenadas, lo que causó que las parcelas dejaran de ser interceptadas.
    - Desajuste de nombres de campos en la base de datos tras las refactorizaciones.
- **Estrategia para mañana:** Crear una clase base de acceso a datos que maneje el `Locale.US` automáticamente para todas las consultas.

---

## 💡 Lecciones Aprendidas y Estrategia de Refactorización "Mañana"

1.  **Entender antes de Cortar:** Leer el flujo completo de una funcionalidad (ej. Presionar parcela -> Buscar Municipio -> Abrir Formulario) antes de separar los métodos involucrados.
2.  **Pruebas Unitarias Atómicas:** Después de cada cambio pequeño, compilar y probar la funcionalidad específica en el dispositivo. No esperar a terminar toda la refactorización para probar.
3.  **Preservación de Tipos:** No exagerar con la creación de nuevas clases de datos si las existentes (`DataItem`, `Geometry`) funcionan. Usar `typealias` solo si es estrictamente necesario para compatibilidad legacy.
4.  **Cuidado con el Contexto:** Muchas funciones de ayuda (`Toast`, `getString`) dependen del Contexto de Android. Asegurarse de pasarlo correctamente sin causar fugas de memoria.
5.  **Menos es Más:** Si un archivo de 400 líneas funciona bien, quizás no necesita ser dividido en 5 archivos pequeños. El objetivo es bajar de los límites de tokens sin destruir la arquitectura.

---

## 📝 Notas de Estado
- La aplicación se dejó en el commit: `0dfec0aacd67c8d8f2286d29e6d9603a43f83457`.
- Los archivos de documentación generados hoy se preservaron manualmente.
- Mañana iniciaremos con una limpieza profunda del código pero con un enfoque incremental.
