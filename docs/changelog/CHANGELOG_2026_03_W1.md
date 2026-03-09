# Archivo de Cambios - Marzo 2026 (Semana 1)

---

## [2026-03-08 - Tarde] - Refactorización Estructural de Modelos y Estandarización Técnica

### 🏗️ Renombramiento de Modelos (Sujeto y Ficha)
- **Unificación Semántica**: Renombrado de todas las capas de `PropietarioNatural` a **`SujetoNatural`** y de `PropietarioJuridico` a **`SujetoJuridico`**.
- **Identidad de Ficha**: El término técnico `EncuestaCatastral` ha sido reemplazado por **`Ficha`** en archivos y lógica interna.

### 📅 Estandarización de Datos Operativos (JSON)
- **Fechas ISO 8601**: Persistencia estrictamente en formato `YYYY-MM-DD`.
- **Auditoría Minimalista**: El campo `Encuestador` almacena solo iniciales.
- **Coordenadas Cartesianas**: Estandarización de `LocalProj` con claves `x` e `y`.

---

## [2026-03-07 - Final de Sesión] - Arquitectura de Servicios Frontend (Fase 4)

### 🏗️ Reestructuración de la Capa Web (`app.js`)
- **Desacoplamiento en Servicios**: Creación de `syncService.js`, `photoService.js`, `displayService.js`, y `clonadorService.js`.
- **Optimización de Memoria**: Reducción significativa del peso de `app.js`.

### 🧬 Modelos Contextuales y Fábrica de Datos
- **Fábrica Inteligente (`modelsFactory.js`)**: Los modelos ahora aceptan un objeto de contexto (`ctx`) con datos espaciales y de auditoría automáticos.

---

## [2026-03-07 - Horario Nocturno] - Propagación de Datos Geográficos y Validación Estricta

### 🌍 Estabilización de la Localización y Geometría
- **Corrección de Propagación**: Eliminación del error `SIN_LOC` mediante inyección directa en el modelo.
- **Validación Estricta en Mapa**: Bloqueo de apertura de formularios si no hay intersección clara de Municipio/Sector/Predio.

### 🧹 Limpieza y Consistencia de Modelos
- **Eliminación de Campos Fantasma**: Remoción de `ResidenceDepartamento` del frontend.
- **Mejora en Clonación**: Corrección de copia de profesiones personalizadas.

---

## [2026-03-07] - Refactorización Estructural y Optimización de Tokens

### 🏗️ Arquitectura y Estabilidad (Core)
- **Desacoplamiento de FormActivity**: Creación de `FormImageHelper.kt`, `AndroidBridge.kt`, y `FormWebViewHelper.kt`.
- **Normalización de Locale**: Implementación de `SpatialNormalizer` para forzar el punto decimal.

---

## [2026-03-05] - Refactorización de Modelos y Nuevos Perfiles

### Nuevas Funcionalidades
- **Perfil del Propietario**: Inclusión de carnets y perfiles de desmovilizados/retirados.
- **Conflictos y Reseña**: Nueva gestión de conflictos y campo de reseña histórica.

---
