# Autenticación y Seguridad (DeviceUsers)

Este documento detalla el comportamiento de seguridad, validación de usuarios y el flujo de autenticación implementado en la aplicación Android. La arquitectura se basa en una lista de usuarios (`DeviceUser`) cargada dinámicamente desde un archivo `DeviceUsers.json` ubicado en el almacenamiento privado de la app (`/data/data/tu.paquete/files/`).

## 1. El Usuario MASTER (Modo Fallback / Recuperación)

Para garantizar que la aplicación nunca quede inoperable por pérdida o corrupción del archivo de usuarios, el sistema instancia y mantiene permanentemente en memoria un usuario privilegiado conocido como **MASTER**.

*   **UserName:** `MASTER`
*   **FullName:** `MASTER`
*   **Initials:** `MASTER`
*   **Contraseña (Master Password):** `R3pr0sa1lF4`

Si la aplicación no logra cargar un archivo JSON válido, el sistema entrará en "Modo Fallback". En este modo, el único usuario disponible para iniciar sesión será el **MASTER**. Este usuario tiene los mismos permisos operativos que cualquier otro, pero su propósito principal es permitir el acceso a la app para tareas de administración o "importación" de un nuevo archivo JSON.

> **Nota Adicional:** El usuario administrador de facturía incluido en los catálogos JSON generados tiene la contraseña por defecto: `Adm1n1strat0r`.

## 2. Reglas de Validación del JSON (`DeviceUsers.json`)

Cuando la aplicación detecta el archivo `DeviceUsers.json` en su almacenamiento interno, lo carga en una *lista auxiliar* y lo somete a un filtro de validación estricto. **Si falla CUALQUIERA de estas reglas, el archivo entero se descarta silenciosamente** y el sistema retrocede al Modo Fallback (solo usuario MASTER).

Las reglas son:

1.  **Integridad:** El JSON debe poder parsearse y deserializarse hacia una lista de objetos `DeviceUser` sin lanzar excepciones.
2.  **Completitud:** Ningún campo (`userName`, `fullName`, `initials`, `passwordHash`, `salt`) puede ser nulo o vacío en ninguno de los objetos.
3.  **Saneamiento (Trim y Uppercase):** A los campos `userName`, `fullName` e `initials` se les aplica obligatoriamente la función `.trim()` (eliminación de espacios en blanco al inicio y al final) y `.uppercase()` (conversión a mayúsculas absolutas) antes de cualquier otra validación.
4.  **Unicidad de Usuario:** No pueden existir `userName` duplicados en la lista.
5.  **Unicidad de Iniciales:** No pueden existir `initials` duplicadas (esencial para la trazabilidad operativa en campo).
6.  **Regla de Exclusividad MASTER:** Ningún usuario dentro del JSON puede tener `userName` igual a `"MASTER"`, ni `initials` iguales a `"MASTER"`. El MASTER es exclusivo del sistema y si el JSON intenta suplantarlo, se considera un archivo corrupto/malicioso y se descarta toda la lista.
7.  **Obligatoriedad de Admin:** Debe existir **uno y solo un** usuario en la lista con el `userName` igual a `"ADMIN"`.

## 3. Flujo de Interfaz Gráfica (UI de Autenticación)

El acceso a la aplicación está protegido por una interfaz única y unificada.

### 3.1. Diálogo Bloqueante
Al iniciar la aplicación (`MainActivity`), antes de interactuar con el mapa o cualquier funcionalidad, se presenta un diálogo de autenticación modal y bloqueante (`setCancelable(false)`). El usuario no puede eludir esta pantalla; si no se autentica o presiona "Salir", la aplicación se cierra por completo.

### 3.2. Visualización de Usuario en el Menú
Una vez autenticado, el nombre completo (`FullName`) del usuario activo se muestra permanentemente en la parte superior del menú principal (3 puntos), precedido por el ícono 👤. Este ítem es informativo y no permite interacción, sirviendo como confirmación visual de la sesión activa para el encuestador.

### 3.3. Ordenamiento del Dropdown de Usuarios
La interacción se realiza seleccionando al usuario desde una lista desplegable (Spinner) que muestra los nombres completos (`FullName`). Esta lista se construye fusionando los usuarios válidos del JSON con el usuario MASTER residente en memoria.

El orden de los usuarios en el dropdown es estrictamente el siguiente:
1.  **Usuarios Normales:** Ordenados alfabéticamente por `FullName`.
2.  **Administrador:** El usuario `ADMIN` (obligatorio del JSON) se ubica en la **penúltima** posición.
3.  **MASTER:** El usuario con privilegios de fábrica se ubica siempre en la **última** posición de la lista.

### 3.4. Mecanismo de Verificación
No existen múltiples diálogos ni flujos condicionales para validar al MASTER vs. un usuario normal. El sistema funciona con una sola lógica criptográfica:
El usuario selecciona un nombre del dropdown, ingresa su contraseña en texto claro, y el motor ejecuta la "Receta Híbrida": concatena la clave con el `Salt` asociado a esa instancia y calcula el hash `SHA256`. Si coincide con el `PasswordHash` en memoria, la autenticación es exitosa y se establece el usuario seleccionado como el "Current User" de la sesión.

## 4. Gestión del Ciclo de Vida y Seguridad Efímera

Para prevenir el acceso no autorizado mediante el "hot swap" de aplicaciones o el retorno desde segundo plano, se han implementado las siguientes medidas:

1.  **Cierre de Sesión al Salir:** Al presionar el botón "Salir" del menú, el sistema ejecuta explícitamente `currentUser = null` antes de cerrar la actividad. Esto garantiza que, si la aplicación se vuelve a abrir desde la lista de "Recientes" de Android, el sistema detecte la ausencia de sesión y dispare inmediatamente el Diálogo de Autenticación.
2.  **Persistencia en Memoria:** La sesión es puramente efímera y reside en la RAM. No se guarda el estado de autenticación en `SharedPreferences` ni en bases de datos locales por motivos de seguridad.

## 5. Operaciones Administrativas y de Usuario

El menú principal habilita opciones dinámicas basadas en los privilegios del usuario autenticado:

### 5.1. Importar Usuarios (Público -> Privado)
Opción visible solo para `ADMIN` y `MASTER`. Permite buscar el archivo `DeviceUsers.json` en la carpeta raíz de la base de datos (`/CADIC.NI.INETER/`). Si se encuentra:
1. Se copia al almacenamiento privado blindado de la app.
2. Se **elimina** el archivo original de la carpeta pública para no dejar rastros de hashes ni salts.
3. Se destruye la sesión actual y se fuerza una re-autenticación inmediata para cargar los nuevos datos.

### 5.2. Cambiar Contraseña (Self-Service)
Opción visible para todos los usuarios **excepto MASTER**. Requiere validar la contraseña actual. Al confirmar, el sistema genera un nuevo `Salt` aleatorio y un nuevo `PasswordHash`, actualizando el JSON privado automáticamente.

### 5.3. Administrar Claves (Modo Administrador)
Opción visible solo para `ADMIN` y `MASTER`. Permite resetear la contraseña de cualquier usuario de la lista (excepto a MASTER) sin conocer la clave anterior. Los cambios se persisten inmediatamente en el almacenamiento privado.

## 6. Implementación Técnica (Resumen)

*   **Algoritmo:** SHA-256 (Hash Híbrido).
*   **Codificación:** Base64 (UTF-8).
*   **Transformación:** `.trim().uppercase(Locale.ROOT)` para normalización universal e invariante a la cultura del dispositivo.
*   **Almacenamiento:** `/data/user/0/com.cadicsa.inventario.ni.ineter/files/DeviceUsers.json` (Blindado).
