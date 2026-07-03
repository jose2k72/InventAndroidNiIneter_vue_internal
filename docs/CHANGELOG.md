# Changelog - INETER CADIC (Encuesta Catastral)

Este es el registro central de cambios. Para consultar cambios históricos, vea la sección de [Archivos](#archivos).

---

## [2026-07-02] - Consolidación del Sistema Transaccional de Fotos y Corrección de Race Condition

### 📸 Race Condition en Importación de Foto del Frente (`app.js`, `photoService.js`, `FileBrowser.js`)
- **Corrección de Race Condition crítico**: Al importar la Foto del Frente obligatoria, el `FileBrowser` ya no se cerraba antes de que Kotlin terminara de copiar el archivo. El cierre del browser se delegó a `PhotoService.handleAndroidPhoto`, que se ejecuta *después* de recibir la confirmación de Android vía `window.addPhoto`. Esto garantiza que el campo `formData.FotoFrente` tenga el valor correcto cuando el watcher de `FormFicha` se dispara al remontarse el componente.
- **Modo de selección única en FileBrowser**: Se corrigió la sensibilidad de mayúsculas del prop (`singleselection` en minúsculas) en `FileBrowser.js` para que Vue/DOM lo interprete correctamente. Al importar Foto del Frente, el browser se abre en modo single-select; al importar fotos adicionales, en modo multi-select.
- **Reset de estado `tomandoFotoFrente`**: `cancelFileBrowser()` en `app.js` ahora resetea `tomandoFotoFrente.value = false` para evitar que el flag quede atascado en `true` si el usuario cancela el explorador de archivos sin seleccionar nada.

### 🗂️ Tracking Independiente de `FotoFrente` (`app.js`, `photoService.js`)
- **Nueva ref `fotoFrenteOriginal`**: Se agregó un snapshot reactivo del nombre del archivo de FotoFrente al momento de abrir el registro (`updateData()`). Se limpia en `resetForm()` para registros nuevos y se expone en `vueAppContext`.
- **Eliminación de archivos huérfanos en Guardar**: `commit()` en `photoService.js` detecta si la FotoFrente fue reemplazada comparando `formData.FotoFrente` contra `fotoFrenteOriginal`. Si difieren, el archivo anterior se borra del disco al confirmar con "Guardar", evitando la acumulación de archivos sin referencia.
- **Eliminación de FotoFrente original reconocida**: `handleAndroidDelete` ahora identifica si el archivo eliminado es la FotoFrente original (antes no era detectado por ninguna rama, ya que vive en un campo separado de `Imagenes`). Al reconocerla, la marca en `fotosMarcadasBorrar` para borrado diferido — el archivo permanece seguro hasta que el usuario confirme con "Guardar". Si el usuario cancela, la FotoFrente original no se borra.

### ✅ Validación de RUC (`FormSujetoJuridico.js`, `FormSujetoNatural.js`, `FormEntrevistado.js`)
- Regla corregida de 1 letra + 12 dígitos a **1 letra + 13 dígitos** (`/^[A-Z]\d{13}$/`) según el formato real del RUC nicaragüense.

---

## [2026-07-02] - File Importer y Explorador Nativo de Imágenes

### 📁 Explorador de Archivos In-App y Renombrado Matemático
- **Navegador de Archivos (FileBrowser.js)**: Se diseñó e integró un explorador de archivos global dentro de la aplicación Vue (con `position: fixed` para sobreponerse a las vistas), permitiendo la exploración de directorios locales mediante `Android.listDirectory(path)`.
- **Selección Múltiple y Copia Segura**: El sistema permite marcar múltiples imágenes en una carpeta e importarlas. Un proceso en segundo plano en Kotlin (`Android.processSelectedFiles`) se encarga de crear copias físicas de los archivos seleccionados hacia el directorio privado de la aplicación sin alterar ni mover los originales.
- **Nomenclatura Geométrica (Timestamp Secuencial)**: Se eliminó el nombrado basado en índices simples (ej. `_0`, `_1`). Ahora el sistema instancia un calendario único e incrementa +1 segundo matemático a cada copia generada en un lote de importación. Esto garantiza que cada foto mantenga nombres únicos, estructurados de manera idéntica a las capturadas con la cámara (ej. `{PREFIJO}_20240510_142030.jpg`, `{PREFIJO}_20240510_142031.jpg`).
- **Restauración de Estado (UI)**: Corrección crítica en la máquina de estados de Vue (`app.js`) para garantizar que al cerrar o finalizar la importación mediante el `FileBrowser`, la aplicación restaure correctamente el estado activo anterior (`Edit` o `Create`) en el `FormFicha.js` evitando la pantalla blanca, y renderizando las nuevas imágenes reactivamente a través de las notificaciones Base64.

---

## [2026-06-30] - Localización Directa de Predios y Resolución de Fallos Espaciales

### 📍 Localización Alfanumérica y Búsqueda Radial de Lote
- **Nueva Herramienta "Localizar Predio y Abrir Ficha"**: Se agregó una nueva opción en el menú principal para buscar predios directamente por su código de localización (ej. `T-5987231323534`), permitiendo abrir la ficha catastral instantáneamente saltándose el flujo clásico de tocar el mapa.
- **Bypass de Bounding Box (`MainActivity.kt` & `SpatialHelper.kt`)**: Se modificó la arquitectura de la consulta espacial para solventar fallos en polígonos delgados o anomalías geométricas. Ahora, en lugar de usar un Bounding Box estricto que fallaba cuando el texto del lote quedaba muy alejado del predio, el sistema recupera la geometría de la base de datos por ID, calcula el **Polo de Inaccesibilidad**, interseca el Municipio, Sector y Manzana, y usa una búsqueda radial generosa (~160 metros) para atrapar el identificador de Lote más cercano al polo.

---

## [2026-06-08] - Simplificación de Uniones Catastrales, Foto de Frente Obligatoria y Autoscroll

### 📸 Validación de Foto de Frente y Autoscroll en Ficha (`FormFicha.js`)
- **Validación Robusta de Foto del Frente**: Se blindó la validación del campo `FotoFrente` para impedir el guardado de la ficha si este campo contiene valores vacíos, nulos (`null`), indefinidos (`undefined`) o cadenas compuestas de puros espacios, solucionando el bug que permitía guardar fichas incompletas.
- **Limpieza Reactiva de Errores**: Se incorporó un observador (`Vue.watch`) para remover en tiempo real el indicador de error visual en rojo tan pronto como el encuestador asigne una foto de frente válida.
- **Desplazamiento Suave al Primer Campo Inválido (Autoscroll & Focus)**: Se añadieron descriptores `id="..."` a todos los inputs y selectores validados del formulario. Al pulsar "Guardar" y detectarse errores de validación, la página ejecuta un scroll suave (`scrollIntoView` centrado) directamente hacia el primer control fallido (en orden de aparición visual) y le otorga foco inmediato al input.

### 🔗 Simplificación de Unión con Predio Master (`SpatialHelper.kt`)
- **Filtro Espacial de Colindancia**: Se eliminó la compleja lógica de bearings de manzana y callejones de calle recta. Ahora la adyacencia de predios candidatos en una manzana se define de manera más directa si pertenecen a la misma manzana (`geomC.intersects(manzanaGeom)`) y son colindantes físicos con el predio actual (`geomC.distance(geomOrigen) < tolerance`, tolerancia de ~2 metros).

### 🔄 Uniones Transitivas y Restricción de Borrado (`workflowService.js`, `SpatialHelper.kt`)
- **Soporte de Uniones Encadenadas**: Se permite registrar un predio como Master de unificación si este cuenta con una Ficha catastral activa (`"Ficha"`) o si es a su vez un predio de unión (`"UnionConPredio"`), lo que habilita la transitividad de unificaciones catastrales.
- **Validación al Eliminar**: Se modificó `validateDeletion` para bloquear la eliminación tanto del registro de Ficha (`Ficha`) como del registro de Unión (`UnionConPredio`) de un predio si existen otros predios unificados dependientes que lo referencian como su Master.

### 📅 Rediseño de Fechas, Eliminación del Botón Hoy y Validación OCR Inmediata
- **Eliminación del Botón 📅 HOY**: Se eliminó el botón de autocompletado de fecha actual de todos los campos de fecha (`FechaAdquisicion`, `FechaRegistro` y `Fecha de Documento` en los adjuntos) en `FormFicha.js` y `FormSujetoJuridico.js`.
- **Alineación Vertical de Campos OCR**:
  - Reorganización visual de todos los campos que utilizan lectura de cámara/OCR en `FormSujetoJuridico.js` y `FormFicha.js` (incluyendo `NoFinca_NAP`, `Tomo`, `Folio`, `Asiento` e `Identificacion`/RUC).
  - Ahora siguen la estructura vertical: Etiqueta arriba, Caja de texto en medio, Botón OCR abajo (con margen superior de `6px` y ancho completo).
- **Validación Automática Inmediata post-OCR**:
  - Se modificó `window.onOcrResult` en `app.js` para interceptar la escritura en el campo `Identificacion` e invocar el método reactivo de validación correspondiente de forma automática a través del contexto de aplicación (`vueAppContext`).
  - Se agregaron ganchos de ciclo de vida (`onMounted` / `onUnmounted`) en `FormSujetoNatural.js`, `FormEntrevistado.js` y `FormSujetoJuridico.js` para registrar/remover dinámicamente sus validadores en `vueAppContext`.
  - Esto fuerza la validación y formateo (como la adición automática de guiones en Cédulas y conversión a mayúsculas) inmediatamente después de leer con la cámara sin requerir perder el foco (`blur`).
- **Nueva Validación de RUC en Persona Jurídica**:
  - Se incorporó la regla de validación de RUC en `FormSujetoJuridico.js` para exigir el formato de una letra seguida de doce números (`^[A-Z]\d{12}$`).
  - La validación se activa al desenfocar (`@blur`), en caliente al editar con OCR, y de forma restrictiva al presionar "Guardar".

---

## [2026-06-05] - Reglas de Perfil y Autodetección Avanzada de Dirección por Manzana

### 📍 Autodetección Avanzada por Frente de Calle Recto (`SpatialHelper.kt`)
- **Filtrado por Manzana (`Sectores`)**: Se sustituyó el análisis espacial por buffer simple para predios colindantes por un análisis de manzana completa. El sistema identifica la manzana correspondiente al predio de origen y procesa todos sus puntos de encuesta.
- **Identificación de Calle y Propagación**: Se extrae el contorno exterior de la manzana y se divide en segmentos JTS. El sistema localiza los segmentos que toca el predio de origen (o el más cercano si es un predio interior) y se propaga en ambos rumbos.
- **Detención en Esquinas**: La propagación se interrumpe si hay un cambio brusco de bearing ($>35^\circ$ entre segmentos contiguos) o una curva prolongada ($>50^\circ$ acumulada respecto al inicial), lo que delimita el frente de calle recto del predio.
- **Filtrado de Fichas**: Solo se listan y devuelven las fichas catastrales asociadas a predios que intersecan físicamente este tramo de calle recto, ordenadas cronológicamente por cercanía euclidiana.

### 👤 Reglas del Perfil de Propietario / Poseedor (`FormSujetoNatural.js`)
- **Restricción de Carnet**: Se eliminó la obligatoriedad general del campo `"Carnet del Perfil"`. Ahora el campo solo es visible y requerido en el formulario si el perfil seleccionado es **Desmovilizado (ID 1)** o **Retirado (ID 2)**; para cualquier otro perfil, el campo se oculta y limpia automáticamente.
- **Título de Sección**: Se actualizó el título de la tarjeta en el formulario a `"Perfil del Propietario / Poseedor"`.

---

## [2026-06-04] - Firma Digital, Prefijo de Encuesta, Foto de Frente y Ajustes de Ficha

### 📸 Prefijos de Fotos y Foto de Frente del Predio Obligatoria
- **Prefijo con ID de Encuesta**: Modificación del motor de captura centralizado (`app.js` y `openCamera`) para que al lanzar la cámara nativa se envíe el ID de la encuesta (`NoEncuesta`) como prefijo. Los archivos de imagen resultantes se almacenan como `{NoEncuesta}_{timestamp}.jpg`.
- **Foto del Frente Obligatoria**: Incorporación del campo `FotoFrente` al modelo de Ficha (`modelsFactory.js`). Se agregó una sección visual interactiva y obligatoria en el formulario de Ficha (`FormFicha.js`) para capturar específicamente esta fotografía.
- **Aislamiento y Sincronización**: La foto del frente se previsualiza mediante su propia tarjeta dedicada en el formulario (cargada dinámicamente con `Android.loadPhotoAsBase64`), quedando excluida de la galería de fotos adicionales para evitar duplicación. A nivel de base de datos se guarda en su propio campo de texto.
- **Validación Restrictiva**: Se incorporó a la validación de guardado (`validate()`) el requisito obligatorio de capturar la foto de frente del predio antes de permitir guardar la encuesta.

### 🔍 Selector de Catálogo Rápido (CatalogoSelectorGrande.js)
- **Selección Instantánea**: Modificación del comportamiento táctil de la lista. Al hacer clic sobre cualquier ítem, se selecciona y confirma automáticamente, retornando al formulario de edición y eliminando la necesidad de presionar el botón Aceptar.
- **Botón Limpiar**: Se reemplazó el botón Aceptar por el botón **LIMPIAR** (en color rojo `#d32f2f`) en el footer. Al pulsarse, emite `{ id: null, name: '' }` para reiniciar la propiedad del formulario a su estado original (vacío) y vuelve automáticamente al formulario.
- **Copia de Respaldo**: Creación de `CatalogoSelectorGrandeOld.js` para resguardar la versión previa con flujo de confirmación explícita (selección y aceptación por separado).

### 🔗 Restricciones y Reglas de Integridad en Unión con Predio (workflowService.js, app.js)
- **Filtro de No Encuestados**: Modificación de la función `getMasterCandidates` en `workflowService.js` para limpiar y descartar de la lista de candidatos Master a todos los predios colindantes que posean un registro de tipo `NoEncuestado`. Esto evita que se unifique un predio a uno que no cuenta con información de campo levantada.
- **Protección de Datos del Predio Master**: Modificación del método `validateDeletion` en `workflowService.js` y de `deleteItem` en `app.js` para prevenir la eliminación del último registro de datos en un predio que sirve como Master.
- **Alerta de Dependencias**: Al intentar borrar el último dato de un predio Master, la acción se bloquea e informa al usuario mediante un modal detallando la lista de las localizaciones de los predios colindantes que se encuentran unificados a él.

### 📋 Ajustes de Flujo y Valores por Defecto en Fichas
- **Flujo Espacial Unificado**: Refactorización de la lógica táctil de `MainActivity.kt` para unificar el comportamiento de clics sobre el polígono cartográfico y clics sobre marcadores preexistentes. Ambos resuelven e inyectan de forma idéntica los datos espaciales (municipio, sector, manzana, lote).
- **Valores por Defecto**: Configuración inicial automática en `modelsFactory.js` para que toda nueva ficha inicie con Tipo de Encuesta = **Parcela Unificada** y Uso del Predio = **Privado**.
- **Flexibilización de Obligatoriedad**: Remoción del requisito obligatorio para los campos **Reseña Histórica** y **Origen de la Tierra** en `FormFicha.js`, eliminando alertas visuales y permitiendo guardar sin rellenarlos.
- **Formato del ID de Encuesta (`NoEncuesta`)**: Modificación del patrón de autogeneración en `FormFicha.js`. Ahora el ID visible ubica el número de lote en la posición final (`${muni}_${sector}_${loc}_${lote}`), mientras que el consecutivo se mantiene de forma interna para ordenamiento en base de datos.
- **Visualización en el Index Principal**: Modificación de `displayService.js` para que el listado de encuestas muestre el ID de la encuesta (`NoEncuesta`) en lugar del nombre de finca o localización predeterminados.

### ✍️ Firma Digital del Entrevistado
- **Captura Táctil de Firma**: Integración de un lienzo `<canvas>` HTML5 interactivo al final del formulario del Entrevistado (`FormEntrevistado.js`) para capturar la firma física del encuestado en el dispositivo.
- **Soporte Táctil y Ratón**: Control de trazos optimizado mediante eventos táctiles (`touchstart`, `touchmove`, `touchend`) y eventos de ratón de respaldo (fallback).
- **Almacenamiento Base64**: La firma se convierte a formato de imagen PNG Base64 y se almacena directamente en la propiedad `FirmaBase64` del JSON de la encuesta, persistiendo en la base de datos SQLite sin requerir alteraciones al esquema ni al backend nativo.
- **Validación Obligatoria**: Marcado del título de la sección en rojo y validación restrictiva en el botón Guardar para exigir obligatoriamente la firma antes de guardar la ficha de entrevistado.
- **Gestión de Firma**: Botones interactivos para **Limpiar** el lienzo, **Confirmar Firma**, **Volver a firmar** (verificación de firma previa) o **Cancelar** edición.

### 🛰️ Optimización del Ciclo de Vida y Geolocalización
- **Precarga Silenciosa al Inicio**: Creación de `preloadLocationSilently()` en `MainActivity.kt` para inicializar el GPS en segundo plano durante `onCreate` y `onResume`, evitando arranques fríos de coordenadas en `0.0`.
- **Actualizaciones Continuas de Ubicación**: Integración de un `LocationCallback` que actualiza la posición cada **15 segundos** (intervalo mínimo de 5 segundos) con alta precisión (`Priority.PRIORITY_HIGH_ACCURACY`). La consulta continua se activa en `onResume` y se apaga en `onPause` para optimizar la duración de la batería del dispositivo.
- **Posicionamiento Instantáneo**: Modificación de `getCurrentLocation()` para centrar la cámara del mapa sin esperas (0 segundos de delay) cuando la app ya posee coordenadas del flujo de actualización en memoria, refrescando la señal de forma paralela.
- ⚠️ **Nota de Verificación de Campo (Cambio de Locación)**: Para comprobar la precisión del GPS y la correcta ejecución del callback de 15 segundos en segundo plano, se requiere realizar pruebas desplazándose físicamente de locación para observar la fluidez de refresco y la propagación de coordenadas en el mapa y formularios.

### 📋 Reglas de Negocio en Formularios (FormEntrevistado.js, FormSujetoNatural.js, FormFicha.js)
- **Flujo de Conversión de Registros en Memoria**: Refactorización de las funciones de conversión en `conversionService.js` y `app.js` para que la creación bidireccional (Propietario a Entrevistado y Entrevistado a Propietario) se realice enteramente en memoria temporal (`pendingCopyData`) en vez de persistir de forma prematura a SQLite. Esto garantiza que si el usuario cancela con "VOLVER", no se registre ningún dato no deseado en la base de datos.
- **Habilitación de Residencia para Poseedores**: Se expandió la visibilidad y validación obligatoria de la sección de **Residencia** (Municipio, Caserío, Barrio/Comarca y Dirección) para que aplique tanto a **Propietarios (ID 1)** como a **Poseedores (ID 2)**.
- **Watcher y Limpieza en Caliente**: Modificación del Watcher de la relación con la parcela para evitar limpiar los datos residenciales si el informante es Poseedor, manteniéndose activo el borrado automático únicamente para otras categorías de terceros.
- **Remoción de Obligatoriedad de Caserío y Barrio/Comarca**: Se eliminó la regla de validación colectiva que exigía rellenar obligatoriamente al menos uno de estos dos campos en Fichas, Sujetos Naturales y Entrevistados, quedando ambos campos como completamente opcionales.

### 🗺️ Búsqueda Espacial e Integración de Propietarios Catastrales
- **Consulta Espacial por WKB (JTS)**: Implementación de `getPropietariosDelPredio(predioId)` en `SpatialHelper.kt` y `DatabaseHelper.kt`. Resuelve la intersección de la geometría del predio con las geometrías tipo punto de la capa `Propietarios` utilizando JTS y el campo `wkb` SQLite.
- **Puente JavaScript**: Exposición de la consulta a través de `@JavascriptInterface` en `AndroidBridge.kt`.
- **Detección e Identificación de Empresas**: Creación de una expresión regular basada en prefijos/sufijos jurídicos comunes de Nicaragua para clasificar propietarios como naturales o empresas/entidades.
- **Filtrado Inteligente por Formulario**:
  - En `FormEntrevistado.js` y `FormSujetoNatural.js` (personas naturales) se filtran y muestran únicamente los propietarios de tipo **Persona Natural**, ocultando por completo las empresas.
  - En `FormSujetoJuridico.js` (personas jurídicas) se muestran únicamente los propietarios de tipo **Empresa/Entidad**.
- **Previsualización y Rotación Inteligente de Nombres**:
  - Presentación de tarjetas interactivas de propietarios con vista previa en tiempo real de cómo se rellenarán los campos `FirstName`, `SecondName`, `FirstSurName` y `SecondSurName`.
  - Soporte para nombres con apellidos primero (ej: `MARTINEZ JUANA`) mediante el botón `🔄 Apellidos primero` que invierte el orden del parseo en tiempo real.
  - Inclusión de un botón para **Descartar/Limpiar** la selección sin alterar los campos en caso de cancelación.

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
