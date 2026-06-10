# Propuesta Técnica: Sincronización Web, Plataforma Centralizada Multi-App y Migración a SQL Server (MSSQL)

Este documento detalla la arquitectura, tecnologías y el mapa de ruta propuesto para la futura migración del almacenamiento central del sistema a **Microsoft SQL Server (MSSQL)**, la implementación de un mecanismo de sincronización seguro desde la aplicación **Android**, y el desarrollo de un portal web administrativo dinámico y configurable que centralice múltiples aplicaciones de captura de datos bajo un mismo principio arquitectónico.

---

## 1. Arquitectura General del Sistema

El sistema pasará de un flujo basado en copia manual de archivos de base de datos a una arquitectura distribuida **Offline-First**, centralizada en una plataforma web configurable.

```
[ App Android (Offline) ]  <───>  [ SQLite local (map.db) ]
        │
        │ (Peticiones HTTPS con JWT Bearer + App-Identifier)
        ▼
[ API Web ASP.NET Core ]   <───>  [ Servidor OIDC (Identity Server 3) ]
        │
        ├───(Capa Dapper Dinámica / SqlBulkCopy)───> [ SQL Server (MSSQL) ]
        │
        ├───(Guardado físico de imágenes)──────────> [ Servidor de Archivos (Disco / CDN) ]
        │
        └─(Consumo de API de Datos / Exportación)─> [ Portal Web Administrativo (Escritorio) ]
```

---

## 2. Tecnologías Propuestas y Justificación

### A. Capa de Datos en Servidor (SQL Server + Dapper)
* **Motor Central:** **Microsoft SQL Server (MSSQL)** como base de datos relacional transaccional única.
* **Acceso a Datos en C#:** **Dapper (Micro-ORM)**.
  * *Por qué:* Permite conservar el control absoluto del código SQL (similar a las sentencias nativas usadas en Android). Ofrece el rendimiento más alto en .NET, ideal para procesar peticiones masivas.
* **Carga Masiva (Bulk Load):** **`SqlBulkCopy`** (Clase nativa de .NET) para volcar lotes enteros de miles de registros directamente en las tablas en pocos milisegundos.

### B. Servicio de Backend (ASP.NET Core Web API)
* **Plataforma:** .NET Core / .NET 8 o superior, alojado en **IIS (Internet Information Services)** sobre HTTP/1.1 de forma tradicional para evitar problemas de compatibilidad de gRPC/HTTP2 en servidores IIS antiguos.
* **Autenticación:** Middleware nativo de tokens portadores (`Microsoft.AspNetCore.Authentication.JwtBearer`). Consumirá y validará los tokens emitidos por el **Identity Server 3** actual que ya se encuentra desplegado y funcional en la organización.

### C. Cliente Móvil (Android / Kotlin)
* **Autenticación OIDC:** **AppAuth para Android** con flujo *Authorization Code con PKCE*.
* **Gestión de Sincronización en Segundo Plano:** **Android WorkManager** para el manejo de colas persistentes y reintentos ante caídas de red.

---

## 3. Estrategia de Sincronización en 2 Fases (Offline-to-Online)

Para garantizar la estabilidad en redes móviles inestables y evitar errores de memoria (`OutOfMemoryException`), la sincronización se dividirá en dos fases independientes:

* **Fase 1: Sincronización de Datos Tabulares:** La app Android identifica todos los registros pendientes de sincronizar en SQLite, los comprime (JSON con GZip o Protobuf) y los envía por POST al backend. El backend los vuelca a través de `SqlBulkCopy` en una tabla de staging de MSSQL y ejecuta una consulta de consolidación (`MERGE`) resolviendo conflictos.
* **Fase 2: Sincronización de Fotos en Cola:** Una vez confirmados los datos tabulares, la app Android sube las fotos asociadas **una a una** mediante peticiones **HTTP Multipart/form-data** asíncronas controladas por el `WorkManager`. El servidor las almacena en disco y guarda únicamente la ruta en la base de datos central.

---

## 4. Plataforma Web Centralizada y Configurable (Multi-Aplicación)

Con el fin de evitar construir un backend y una base de datos diferente para cada aplicación nueva, se propone un enfoque **Multi-App configurable**. Todas las aplicaciones compartirán el mismo motor físico pero cambiarán los datos subyacentes.

### A. Acceso Web para Personal de Oficina (Restringido)
* Se desarrollará un **Portal Web Administrativo** (SPA en Vue.js / React) optimizado para pantallas de escritorio.
* **Seguridad y Roles:** Autenticado a través del mismo Identity Server 3 (OIDC). Se definirán políticas de acceso restringido:
  * **Administradores:** Configuran los proyectos, mapeos y usuarios.
  * **Validadores/Analistas de Oficina:** Visualizan, editan, aprueban o rechazan registros capturados en campo por los dispositivos móviles.
  * **Visualizadores:** Solo lectura y consulta de mapas.

### B. Detección Dinámica de Conjuntos de Datos (Datasets)
El servidor detectará qué tipo de datos está procesando sin necesidad de recompilar el código para cada aplicación:

1. **Cabecera de Identidad del Proyecto (`X-App-Identifier`):**
   Cada aplicación móvil o proyecto web enviará en sus cabeceras HTTP un identificador único (por ejemplo: `X-App-Identifier: catastro_ineter` o `X-App-Identifier: inventario_servicios`).
2. **Tabla de Configuración Meta-Data:**
   El backend consultará una tabla maestra en SQL Server que define las propiedades del proyecto:
   * Esquema de destino en base de datos.
   * Campos y reglas de validación obligatorios.
   * Configuración de la estructura del formulario (guardada en formato **JSON Schema** en columnas tipo `JSON` de MSSQL).
3. **Mapeo Dinámico con Dapper:**
   Dapper mapeará las columnas dinámicamente o guardará los formularios flexibles en campos de tipo `NVARCHAR(MAX)` de SQL Server con soporte de consultas JSON nativas (`JSON_VALUE`, `JSON_QUERY`). Esto permite almacenar variaciones de formularios sin alterar el diseño de tablas físicas constantemente.

### C. Portal de Descargas y Exportación Centralizado
* El portal web tendrá una sección unificada para la exportación de datos.
* El administrador seleccionará la aplicación específica (ej. Catastro, Fincas, etc.) y podrá filtrar por fecha, encuestador o región.
* **Formatos de Exportación:** El servidor C# compilará y generará dinámicamente descargas en formatos de oficina comunes:
  * **Microsoft Excel (`.xlsx`):** A través de librerías como *EPPlus* o *ClosedXML*.
  * **CSV:** Para procesamiento y análisis ágil.
  * **GeoJSON / Shapefile:** Para integración inmediata con sistemas de información geográfica (SIG/GIS) de la institución en caso de que existan datos de geolocalización.
