# Changelog - INETER CADIC (Encuesta Catastral)

Este es el registro central de cambios. Para consultar cambios históricos, vea la sección de [Archivos](#archivos).

---

## [2026-06-04] - Precarga y Actualizaciones Continuas de GPS

### 🛰️ Optimización del Ciclo de Vida y Geolocalización
- **Precarga Silenciosa al Inicio**: Creación de `preloadLocationSilently()` en `MainActivity.kt` para inicializar el GPS en segundo plano durante `onCreate` y `onResume`, evitando arranques fríos de coordenadas en `0.0`.
- **Actualizaciones Continuas de Ubicación**: Integración de un `LocationCallback` que actualiza la posición cada **15 segundos** (intervalo mínimo de 5 segundos) con alta precisión (`Priority.PRIORITY_HIGH_ACCURACY`). La consulta continua se activa en `onResume` y se apaga en `onPause` para optimizar la duración de la batería del dispositivo.
- **Posicionamiento Instantáneo**: Modificación de `getCurrentLocation()` para centrar la cámara del mapa sin esperas (0 segundos de delay) cuando la app ya posee coordenadas del flujo de actualización en memoria, refrescando la señal de forma paralela.

---

## [2026-06-03] - Estadísticas Diarias, Polo de Inaccesibilidad y Autocompletado de Direcciones

### 🛰️ Optimización de Captura GPS y Fallback de Cobertura
- **Petición Activa del Botón**: Refactorización de la lógica del botón `fabGps` (`getCurrentLocation()`) en `MainActivity.kt` para forzar una consulta activa de GPS en tiempo real (`getCurrentLocation`), resolviendo los fallos silenciosos por caché vacía (`lastLocation == null`) en dispositivos nuevos o recién inicializados.
- **Fallback Resiliente**: Ante falta de cobertura satelital (retorno de valor nulo o fallo de petición activa), el sistema hace fallback automático a la ubicación en caché (`lastLocation`), mostrando notificaciones Toast informativas al usuario sobre el estado de la señal.
- **Calentamiento Silencioso de Inicio**: Inicialización de una petición de GPS en segundo plano al cargar el mapa (`enableMyLocation`) para actualizar de forma temprana las variables de coordenadas globales e iniciar la caché de posicionamiento del sistema de forma transparente.

### 📊 Estadísticas Diarias y Resumen de Avance
- **Cálculo con Filtrado Espacial**: Implementación en `DatabaseHelper.kt` de un conteo de datos agrupados por día con filtrado de proximidad espacial de 3 metros, previniendo duplicados por ediciones o múltiples registros en un mismo predio.
- **Visualización en Action Bar**: Reducción del tamaño del título e incorporación de un subtítulo dinámico (`Hoy: X`) en la barra superior (`activity_main.xml` y `MainActivity.kt`) para mostrar el avance diario en tiempo real.
- **Historial Completo**: Creación de una opción "Estadísticas Diarias" en el menú principal (`main_menu.xml` y `MainDialogHelper.kt`) para desplegar en un modal el historial cronológico descendente de encuestas.

### 📍 Consolidación Espacial y Centrado por Polo de Inaccesibilidad (PIA)
- **Centrado Inteligente**: El sistema calcula y posiciona el marcador inicial en el **Polo de Inaccesibilidad (PIA)** de JTS para predios nuevos sin datos, garantizando una ubicación óptima (punto interior más lejano a los bordes).
- **Consolidación Catastral**: Si un predio ya contiene registros previos, la coordenada del nuevo punto se consolida heredando de forma obligatoria la posición del primer elemento, agrupando los marcadores en un único punto en el mapa.
- **Eliminación de Snapping de Toque**: Remoción de la prioridad de proximidad de 3m en toques del mapa, reemplazándola por la detección e interceptación geométrica del polígono predial.

### ⚡ Motor Espacial Binario (WKB + JTS)
- **Migración a Well-Known Binary**: Sustitución del formato de texto `WKT` por formato binario `WKB` (almacenado como `BLOB` en la base de datos sqlite) para las geometrías de predios.
- **Consultas Espaciales en Memoria**: Ejecución de las operaciones geométricas y validación de adyacencias mediante el procesamiento directo en memoria de objetos nativos JTS deserializados de WKB.

### 📍 Autocompletado de Dirección Residencial por Colindancia
- **Detección de Vecinos**: Incorporación del botón de autodetección en el formulario de `FormSujetoNatural.js`.
- **Copiado Inteligente**: Consulta predios colindantes mediante `Android.getDataInAdjacentPolygons`, muestra su dirección relativa (N, S, E, O) y copia automáticamente los datos de dirección (`Direccion`, `Caserio`, `BarrioComarca` y `MunicipioCatalog`) al seleccionar la encuesta colindante.

### 🎨 Simbología de Mapa y Marcador del Último Registro
- **Restauración de Pines 3D**: Retorno al uso de pines 3D nativos coloreados según su estado operativo (Verde = Completo, Amarillo = Incompleto, Rojo = No Encuestado, Cian = Unión).
- **Indicador del Último Guardado**: Superposición dinámica de un punto negro de 6dp ("ojito") en el centro de la cabeza del marcador correspondiente al último registro guardado de la sesión, eliminando la variante de color violeta.

### 👥 Gestión de Roles y Pantalla de Login
- **Roles en Listados y Formularios**: Agregado el rol de usuario ("Administrador" o "Usuario Normal") en la lista de gestión de usuarios y en el formulario de edición de cuentas.
- **Orden Jerárquico**: Agrupamiento en el login de la aplicación para mostrar primero usuarios normales, seguidos de administradores, y la cuenta "master" al final.

### 🛡️ Usabilidad de Formularios y Reglas de Negocio
- **Bloqueo del Botón Atrás Nativo**: Desactivación del botón físico "Atrás" de Android en formularios para evitar pérdida accidental de cambios, duplicando los botones de acción para guardar/cancelar explícitos.
- **Fix en Borrado en Cascada de Familiares**: Solución de un error en `workflowService.js` al eliminar el último propietario de un predio; ahora se excluye formalmente el `deletedId` usando comparaciones flexibles de tipo (`!=`) para limpiar la composición familiar vinculada.

---

## [2026-03-29] - Control de Excepciones y Unificación Espacial

### 🔗 Unión con Predio Master (Englobamiento)
- **Funcionalidad Técnica**: Implementación de la unificación de predios dependientes ("Esclavos") con un predio de referencia ("Master").
- **Validación Espacial Nativa**: El sistema ahora consulta dinámicamente (`SpatialHelper.kt`) los predios colindantes inmediatos para proponer candidatos a Master.
- **Unicidad por Clusters**: Algoritmo corregido en `WorkflowService.js` que agrupa registros vecinos por proximidad (3 metros). Solo permite designar como Master a predios con una **única agrupación de datos**, garantizando que no haya ambigüedad en la herencia de información.
- **Dirección Relativa**: Integración con `RoutingHelper` para mostrar visualmente la orientación (N, S, E, O) de los predios candidatos en el formulario.

### 🚫 Gestión de Predios No Encuestados
- **Nuevo Modelo de Incidencia**: Creación del DTO `NoEncuestado.cs` y formulario asociado para documentar formalmente por qué no se pudo realizar la encuesta en un polígono (ej. rechazo, ausencia, etc.).
- **Sincronización de Auditoría**: Captura automática de fecha, encuestador y ubicación al momento de la creación.

### 🛡️ Reglas de Exclusividad Bidireccional (Integridad)
- **Integridad de Estado**: Implementación de reglas estrictas en el `WorkflowService.js`:
    - Si un predio tiene datos (Ficha, Dueño, etc.) **no puede** ser marcado como No Encuestado ni Unión.
    - Si ya existe una excepción (No Encuestado/Unión), se **bloquea** la inserción de cualquier otro tipo de dato en ese polígono.
    - **Exclusividad Mutua**: Un predio solo puede ser No Encuestado *o* Unión, nunca ambos.

### 🎨 simbología de Mapa Personalizada
- **Nueva Paleta de Colores en `MapHelper.kt`**:
    - 🟣 **Violeta (270f)**: Último registro guardado (mejor visibilidad que el rojo).
    - 🔴 **Rojo (0f)**: Predios **No Encuestados** (Atención inmediata/Incidencia).
    - 🔵 **Cian (180f)**: Predios con **Unión con Master** (Estado de dependencia técnica).
    - 🟢 **Verde / 🟡 Amarillo**: Mantienen su lógica de "Completo" e "Incompleto" respectivamente.

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
*Última actualización: 2026-06-03*
