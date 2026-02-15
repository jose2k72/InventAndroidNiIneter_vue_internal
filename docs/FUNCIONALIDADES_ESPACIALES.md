# Guía de Funcionalidades: Consultas Espaciales y Clonación de Datos

Este documento detalla las nuevas capacidades del sistema de inventario para la gestión de datos basada en la ubicación geográfica y la eficiencia en la captura mediante clonación.

## 1. Dashboard de Datos del Predio

Al hacer clic en un predio en el mapa, el formulario se inicializa y presenta un resumen de la información geográfica y los registros existentes vinculados a esa zona.

### 1.1 Datos dentro del predio
Esta tabla muestra todos los registros de inventario (Aceras o Costos) que se encuentran **físicamente dentro** del polígono seleccionado.
- **Lógica**: Utiliza el motor JTS para verificar que la latitud y longitud del punto caen dentro de los límites del predio.
- **Utilidad**: Permite ver qué se ha capturado en el predio actual sin necesidad de navegar por múltiples menús.

### 1.2 Datos en predios adyacentes
 Muestra registros que pertenecen a **predios vecinos** (aquellos que comparten un borde o intersecan con el predio seleccionado).
 - **Lógica**: Identifica polígonos adyacentes mediante intersección espacial precisa (JTS) y recupera sus puntos de datos asociados.
 - **Optimización**: Utiliza caché de geometrías pre-procesadas e índices espaciales en memoria para una respuesta instantánea, incluso con geometrías complejas.
 - **Utilidad**: Provee una referencia rápida de lo que hay alrededor y permite "clonar" datos de vecinos para no empezar desde cero si las condiciones son similares.
 
 ---
 
 ## 2. Acciones de Edición y Gestión
 
 Cada registro en las tablas anteriores cuenta con acciones específicas:
 
 ### 2.1 Visualización y Edición (Clic en fila)
 - Al tocar una fila de la tabla "Datos dentro del predio", el formulario se carga con la información completa de ese registro para su modificación.
 - Las fotos se cargan automáticamente desde el almacenamiento del dispositivo.
 
 ### 2.2 Borrado (Icono 🗑️)
 - Elimina el registro de la base de datos de forma permanente.
 - **Importante**: Al confirmar el borrado, también se eliminan físicamente los archivos de fotos asociados para mantener el almacenamiento optimizado.
 
 ### 2.3 Clonación / Copiar (Icono 📋)
 Esta es la funcionalidad más avanzada para agilizar el trabajo de campo.
 1. **Selección**: Se elige un registro (puede ser del predio actual o de un vecino).
 2. **Ubicación**: El sistema toma la **coordenada exacta donde el usuario hizo clic en el mapa** como nueva ubicación para la copia.
 3. **Tratamiento de Datos**:
     - Se copian todos los parámetros técnicos (anchos, estados, materiales, etc.).
     - **NO se copian las fotos** (para evitar duplicación de archivos innecesarios y asegurar que cada punto tenga su registro visual único).
     - Se genera un nuevo número de boleta y se limpia el ID para crear un registro nuevo e independiente.
 4. **Validación de Ruta**: Al clonar, el sistema vuelve a verificar las rutas disponibles en la nueva ubicación. Si hay múltiples rutas, el usuario deberá elegir a cuál asociar la copia.
 
 ---
 
 ## 3. Comportamiento de la Interfaz
 
 - **Botón Nueva Acera**: Ubicado a la izquierda del encabezado para facilitar el acceso rápido. Al presionarlo, se inicia un formulario totalmente en blanco.
 - **Consistencia Visual**: Las tablas se muestran siempre para dar estructura al formulario. Si no hay datos disponibles, se indica claramente con el mensaje "No hay datos...".
 - **Tracking de Fotos**: El sistema mantiene un control estricto de qué fotos son nuevas, cuáles venían de la base de datos y cuáles han sido marcadas para borrar, procesando los cambios físicos solo al dar clic en "GUARDAR".
 
 ---
 
 ## 4. Resumen Técnico para Soporte
 
 - **Motor Geométrico**: JTS (Java Topology Suite) v1.19.0.
 - **Formatos Soportados**: WKT (Well-Known Text) para geometrías.
 - **Sistema de Coordenadas**: WGS84 (GPS) para almacenamiento y CRTM05 (Costa Rica) para visualización en el formulario (reproyección en tiempo real con Proj4J).
 - **Rendimiento**: Caché de geometrías (JTS) y filtrado de oclusión optimizado para rutas (buffer 2m).
