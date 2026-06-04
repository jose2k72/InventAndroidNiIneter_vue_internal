# Servidor de Depuración SQLite (En Caliente)

Este documento detalla el funcionamiento, los requisitos, las condiciones de activación y los comandos necesarios para utilizar el servidor de depuración de base de datos embebido en la aplicación.

---

## 1. Propósito y Funcionamiento

Para evitar la transferencia lenta y manual del archivo de base de datos `Map.db` (que contiene tiles offline pesados y puede superar los 350 MB) desde el dispositivo móvil a la PC de desarrollo, se implementó un **servidor HTTP de depuración en segundo plano** dentro de la aplicación móvil.

Este servidor:
1. Escucha en el puerto local `8080` del dispositivo Android usando sockets nativos de Java (`ServerSocket`).
2. Expone el endpoint `/query` que acepta sentencias SQL mediante peticiones HTTP `POST` y `GET`.
3. Ejecuta la consulta SQL directamente sobre la instancia activa de `DatabaseHelper` y retorna el resultado estructurado como un arreglo JSON de objetos.

---

## 2. Requisitos Previos

Para interactuar con el servidor desde la PC de desarrollo se necesita:
1. **Dispositivo conectado por USB** con las *Opciones de Desarrollador* y *Depuración USB* activadas.
2. **Android Debug Bridge (ADB)** instalado en la PC y disponible en el PATH del sistema.
3. **Python 3** instalado en la PC de desarrollo.

---

## 3. Condiciones de Activación

El servidor es estrictamente para uso de desarrollo y diagnóstico. Su activación está condicionada por una constante centralizada:

* **Ubicación**: `app/src/main/java/com/cadicsa/inventario/AppConfig.kt`
* **Variable**: `DEBUG_DB_SERVER_ENABLED`

```kotlin
/**
 * Habilita el servidor de depuración HTTP para consultas SQLite en caliente.
 * IMPORTANTE: Cambiar a 'false' en compilaciones de producción.
 */
const val DEBUG_DB_SERVER_ENABLED = true
```

* **Comportamiento**:
  * Si es `true`, el servidor se inicia automáticamente al abrirse `MainActivity` (`onCreate`) y se destruye al cerrarse la actividad (`onDestroy`).
  * Si es `false` (producción), el servidor nunca se inicia y no se enlazan sockets, protegiendo la integridad y privacidad de la base de datos de los predios.

---

## 4. Cómo Invocar el Servidor desde la PC

Se ha creado un script utilitario en Python para simplificar el flujo:

* **Ruta**: `py-utils/query_device.py`
* **Sintaxis**:
  ```bash
  python py-utils/query_device.py "CONSULTA_SQL"
  ```

### Flujo automático del Script:
1. Ejecuta `adb forward tcp:8080 tcp:8080` para redirigir el puerto `8080` del localhost de la PC hacia el puerto `8080` del dispositivo Android.
2. Envía la sentencia SQL en el cuerpo de una petición POST hacia `http://localhost:8080/query`.
3. Recibe la respuesta, parsea el JSON y formatea el resultado en la consola como una tabla limpia en formato Markdown.

---

## 5. Instrucciones para la IA (Antigravity) durante el Desarrollo

Como agente de codificación AI, debes utilizar esta herramienta de forma proactiva cuando el usuario solicite analizar, validar o inspeccionar datos capturados en el dispositivo:

### Protocolo de Actuación para la IA:
1. **Comprobación**: Antes de realizar cualquier query, verifica que el dispositivo esté conectado corriendo `adb devices` vía `run_command`.
2. **Uso de la Herramienta**: Propon y ejecuta el comando de terminal llamando al script de la siguiente manera:
   ```powershell
   python py-utils/query_device.py "SELECT * FROM DATOS ORDER BY ID DESC LIMIT 5"
   ```
3. **Inspecciones Comunes**:
   * Para ver estadísticas de encuestas: `SELECT * FROM config;`
   * Para auditar las últimas encuestas guardadas: `SELECT ID, IDOBJECT, FECHA, CREADO_POR, LATITUD, LONGITUD FROM DATOS ORDER BY ID DESC LIMIT 10;`
   * Para analizar la estructura física de la base de datos: `SELECT name FROM sqlite_master WHERE type='table';`
4. **Validaciones**: Si el usuario reporta un error al guardar o recuperar fichas, haz un query a la tabla `DATOS` filtrando por el `IDOBJECT` (ID del predio) para revisar el JSON crudo almacenado en el campo `DATOS`.
