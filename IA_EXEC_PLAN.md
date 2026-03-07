# IA_EXEC_PLAN.md

Este documento detalla los pasos a seguir para realizar una refactorización segura, evitando los errores cometidos en el primer intento. El enfoque será **incremental y centrado en la funcionalidad**.

## 🛡️ Reglas de Oro para esta Sesión
1. **Compilar y Probar** después de mover CADA función o bloque lógico.
2. **Normalización de Locale**: Todo cálculo o consulta de coordenadas DEBE usar `String.format(Locale.US, ...)`.
3. **Orquestación en la Actividad**: No mover lógica que dependa fuertemente del ciclo de vida (`onCreate`, `onResume`, `onMapReady`) a clases externas si esto rompe la temporalidad de los objetos (como `mMap`).
4. **Verificación de Flujo Crítico**: Probar siempre: Login -> Clic en Mapa -> Interceptación de Parcela -> Formulario -> Guardar -> Salir.

---

## 🚀 Fase 1: Infraestructura Espacial Segura
*Antes de mover lógica, preparar el terreno para evitar el error de interceptación.*

1. **Crear `SpatialNormalizer` (Interno)**: Una utilidad interna para asegurar que todas las coordenadas pasadas a SQL usen punto decimal.
2. **Refactorizar `DatabaseHelper` (Consultas)**:
   - Mover solo las consultas de "Municipios" y "Sector" a una lógica separada.
   - **Verificación**: Clic en una parcela en el dispositivo y confirmar que no sale el mensaje de "Fuera de límites".

## 🚀 Fase 2: Reducción de `GeometryUtil.kt` (El Gigante)
*Dividir sin perder precisión.*

1. **Paso A: `ProjectionHelper`**: Mover funciones de proyección (WGS84, CRTM05, 32616).
2. **Paso B: `JtsSpatialHelper`**: Mover cálculos de área e intersección.
3. **Paso C: `GeometryConversionHelper`**: Mover lógica de WKT y Parsing.
4. **Verificación**: Realizar una medición en el mapa y guardar un registro para asegurar que el área calculada sigue siendo correcta.

## 🚀 Fase 3: Adelgazamiento de `MainActivity.kt`
*Reducir tamaño sin romper el mapa.*

1. **Paso A: `MainDialogHelper`**: 
   - Extraer diálogos (`About`, `Auth`, `Confirmations`).
   - **IMPORTANTE**: La lógica de `exitApp` debe quedar dividida: la UI en el helper, la acción de `finishAffinity()` en la Actividad.
2. **Paso B: `MapLayerManager`**: Extraer la carga de puntos capturados y rutas, pero **dejar la inicialización básica del mapa** en `MainActivity`.
3. **Verificación**: Abrir menú, cambiar contraseña, salir de la app, probar FAB de GPS.

## 🚀 Fase 4: Limpieza de `FormActivity.kt` y `AndroidBridge`
*Mejorar la comunicación con Vue.*

1. **Paso A: `AndroidBridge`**: Re-implementar la interfaz asegurando que la referencia a `FormActivity` sea estable pero segura.
2. **Paso B: `FormImageHelper`**: Mantener separada la lógica de cámara y conversión a Base64.
3. **Verificación**: Abrir formulario, tomar una foto, guardarla y verificar que se ve en la galería.

## 🚀 Fase 5: Estructuración de `app.js` (Frontend)
*Una vez estabilizada la base nativa, atacar el archivo JS principal (~53KB).*

1. **Objetivo**: Separar la lógica de validación de formularios, la gestión de eventos del DOM y la comunicación con el Bridge en módulos más pequeños.
2. **Estrategia**: Usar el sistema de componentes de Vue de manera más modular si es posible, o extraer mixins/helpers de JS.

---

## 📋 Checklist de Verificación por cada Step
- [ ] ¿Compila sin errores? ($env:JAVA_HOME = jdk-17)
- [ ] ¿El APK se instala y abre?
- [ ] ¿El login muestra los usuarios de `DeviceUsers.json`?
- [ ] ¿La interceptación de parcelas funciona (Sector/Municipio)?
- [ ] ¿El botón "Salir" cierra la app sin bucles?

---

## 🕒 Cronograma Tentativo
- **09:00 - 10:30**: Fase 1 y 2 (Base espacial y GeometryUtil).
- **10:30 - 12:00**: Fase 3 (MainActivity y Diálogos).
- **13:00 - 14:30**: Fase 4 (Formulario y AndroidBridge).
- **14:30 - 15:30**: Pruebas de regresión total y Commit final.
