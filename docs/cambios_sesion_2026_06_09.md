# Registro de Cambios - Sesión de Desarrollo (09-Junio-2026)

Este documento registra las modificaciones realizadas en el proyecto para corregir problemas en la importación de datos, la visibilidad de diálogos, el diseño de la interfaz y la robustez de la limpieza de la base de datos.

---

## 1. Preservación de Fotos Originales en la Importación

* **Archivo Afectado:** `app/src/main/java/utils/ImportManager.kt`
* **Problema:** Durante el proceso de migración y copia de archivos de fotos desde el origen (directorio de salva `/SAVE/`), la app realizaba un movimiento que eliminaba los archivos originales del origen.
* **Solución:** Se reemplazó el proceso de movimiento (`src.delete()`) por una operación puramente de copiado. Ahora las fotos permanecen intactas en su directorio de origen (`SAVE/`) para actuar como respaldo, y únicamente se copian en el almacenamiento local de la aplicación.

---

## 2. Visibilidad de Checkboxes en el Diálogo de Conflictos

* **Archivo Afectado:** `app/src/main/java/ineter/cadic/MainActivity.kt` (Alrededor de línea 860-880)
* **Problema:** En el AlertDialog de resolución de conflictos, la lista de selección múltiple (checkboxes para elegir qué registros importar) no aparecía. Esto ocurría porque se llamaba a `setMessage()` junto con `setMultiChoiceItems()`. En Android, `setMessage` tiene precedencia y oculta el contenido del layout de opciones.
* **Solución:** Se removió la llamada a `setMessage()`. El contexto descriptivo o aclaratorio se movió al título del diálogo, asegurando así que los elementos de selección múltiple se rendericen e interactúen de forma correcta.

---

## 3. Rediseño de Botones en FormNoEncuestado

* **Archivo Afectado:** [FormNoEncuestado.js](file:///D:/SRC.PROJECTS/NI.INETER.CADIC/SRC.ANDROID/src.android.ineter.vue.internal/app/src/main/assets/web/js/components/FormNoEncuestado.js)
* **Problema:** Los botones con chip resultaban difíciles de presionar en pantallas táctiles y no se adaptaban bien a listas de opciones amplias o pantallas de tamaño limitado.
* **Solución:**
  * Se reestructuró la cuadrícula a un formato de **2 filas y 2 columnas** (`gridTemplateColumns: '1fr 1fr'`).
  * Los botones se definieron con el mismo tamaño y una altura mínima consistente (`minHeight: '72px'`).
  * Se colocó el emoji arriba (con tamaño de fuente aumentado a `22px` para mayor claridad visual) y la etiqueta de texto debajo.

---

## 4. Reset del Autoincremento y Reporte de Fotos Fallidas

* **Archivos Afectados:**
  * `app/src/main/java/utils/DataCleaner.kt`
  * `app/src/main/java/database/DatabaseHelper.kt`
  * `app/src/main/java/ineter/cadic/MainActivity.kt`
* **Problema:** Al vaciar la base de datos para pruebas, el campo `ID` autoincremental de la tabla `DATOS` no se reiniciaba a 1, lo cual causaba inconsistencias. Además, no se informaba de manera clara si el borrado de fotos físicas fallaba.
* **Solución:**
  * **Reset de Autoincremento:** En `DatabaseHelper.kt` se encapsuló la limpieza de registros en una transacción que ejecuta:
    ```sql
    DELETE FROM DATOS;
    DELETE FROM sqlite_sequence WHERE name='DATOS';
    ```
    Esto garantiza de manera segura que el siguiente registro insertado comience con el `ID = 1`.
  * **Reporte de Fotos:** `DataCleaner.kt` ahora retorna un resultado detallado (`CleanResult`) que lleva un contador de fotos cuya eliminación falló. Distingue entre archivos que no existían (se omiten silenciosamente) y archivos existentes que no pudieron eliminarse (se agregan a `failedPhotos`).
  * **Interfaz de Usuario:** `MainActivity.kt` ahora muestra un aviso de advertencia detallado en caso de que existan archivos de imagen que no hayan podido borrarse de forma física, e informa al usuario del reset exitoso de los IDs en el Toast de confirmación si no hay fallos.
