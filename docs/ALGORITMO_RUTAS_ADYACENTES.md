# Especificación: Búsqueda de Rutas Adyacentes al Predio

## 1. Objetivo

Cuando el usuario hace clic en el mapa y selecciona un predio, además de obtener la **Localización del Predio** (dato principal), el sistema debe buscar las **rutas viales adyacentes** al predio y retornar sus Localizaciones como dato secundario.

---

## 2. Tipos de Geometría en la Base de Datos

| Capa               | Tipo WKT          | Campo Localización | Ejemplo        |
|--------------------|-------------------|-------------------|----------------|
| `Predios`          | `Polygon`         | Código catastral  | `025300200466` |
| `rutas_locales`    | `LINESTRING`      | Código de ruta    | `1080167`      |
| `rutas_nacionales` | `MULTILINESTRING` | Número de ruta    | `201`, `218`   |

Todas las geometrías están en coordenadas **WGS84 (Lat/Lng)**.

---

## 3. Constantes del Algoritmo

| Parámetro                   | Valor     | Descripción                                                      |
|-----------------------------|-----------|------------------------------------------------------------------|
| `UMBRAL_DISTANCIA_LOCAL`    | 15 metros | Distancia máxima para considerar una ruta local como adyacente  |
| `UMBRAL_DISTANCIA_NACIONAL` | 25 metros | Distancia máxima para considerar una ruta nacional como adyacente|
| `BUFFER_COINCIDENCIA`       | 3 metros  | Distancia máxima entre rutas para considerarlas "la misma vía"  |
| `ANGULO_MINIMO_DIFERENCIA`  | 30°       | Ángulo mín. entre rutas para considerarlas diferentes           |

---

## 4. Algoritmo Completo

### 4.1 Entrada

- `punto_clic`: Coordenadas (latitud, longitud) donde el usuario hizo clic.

### 4.2 Proceso

```
1. ENCONTRAR PREDIO
   predio_seleccionado = buscar polígono de capa "Predios" que contenga punto_clic
   Si no existe → Terminar (no hay predio)

2. BUSCAR RUTAS CANDIDATAS
   2.1 Buscar rutas en "rutas_locales" cuyo bounding box esté cerca del predio
   2.2 Buscar rutas en "rutas_nacionales" cuyo bounding box esté cerca del predio
   → rutas_candidatas = unión de ambas búsquedas

3. VALIDAR CADA RUTA CANDIDATA
   Para cada ruta en rutas_candidatas:
   
   3.1 Calcular distancia_mínima entre:
       - Cualquier punto del borde del polígono del predio_seleccionado
       - Cualquier punto del LINESTRING de la ruta
   
   3.2 Verificar umbral de distancia:
       - Si ruta es local Y distancia > 15m → DESCARTAR
       - Si ruta es nacional Y distancia > 25m → DESCARTAR
   
   3.3 Identificar puntos de conexión:
       - P1 = punto del borde del predio más cercano a la ruta
       - P2 = punto de la ruta más cercano al predio
   
   3.4 Verificar obstrucción por otro predio:
       - Trazar línea imaginaria de P1 a P2
       - Buscar si algún otro predio (≠ predio_seleccionado) intersecta esta línea
       - Si hay intersección → DESCARTAR la ruta
   
   3.5 Si pasa todas las validaciones:
       → Agregar ruta a lista_rutas_válidas

4. ELIMINAR DUPLICADOS (Local vs Nacional)
   Para cada ruta_local en lista_rutas_válidas:
     Para cada ruta_nacional en lista_rutas_válidas:
       
       4.1 Calcular distancia entre los segmentos que afectan al predio
       4.2 Calcular ángulo entre las direcciones de ambos segmentos
       
       4.3 Si distancia ≤ 3 metros Y ángulo < 30°:
           → Son "la misma vía"
           → DESCARTAR la ruta_nacional de la lista
       
       4.4 Si distancia ≤ 3 metros Y ángulo ≥ 30°:
           → Son rutas diferentes que se cruzan
           → MANTENER ambas

6. UNIFICACIÓN DE FRAGMENTOS
   Agrupar rutas por (localización + dirección):
     - Si hay múltiples segmentos para una misma vía:
     - Si distancias similares (< 5m) → Unificar (tomar la más cercana)
     - Si distancias dispares → Mantener separadas

7. FILTRO DE OCLUSIÓN ENTRE RUTAS (Nuevo)
   Para cada ruta_R en lista_rutas_validas:
     Para cada ruta_Bloqueadora en lista_rutas_validas (≠ ruta_R):
       
       7.1 Si ruta_Bloqueadora está más cerca que ruta_R (margen 0.1m)
       7.2 Trazar línea de visión desde Predio a ruta_R
       7.3 Aplicar Buffer de 2.0 metros a ruta_Bloqueadora (simular ancho calle)
       
       7.4 Si línea de visión intersecta el Buffer de ruta_Bloqueadora:
           → Detectada Oclusión
           → DESCARTAR ruta_R

8. ORDENAR RESULTADO
   Ordenar lista_rutas_válidas: rutas_locales primero, luego rutas_nacionales, luego por distancia
```

### 4.3 Salida

- Lista de `Localización` de las rutas adyacentes al predio.
- Puede ser vacía `[]` si no hay rutas directamente adyacentes.

---

## 5. Casos de Uso

### Caso 1: Predio Simple (Una Calle)

```
┌─────────────────┐
│    PREDIO A     │  ← Clic aquí
└─────────────────┘
═══════════════════  Calle Local 1080167

Resultado: ["1080167"]
```

### Caso 2: Predio en Esquina (Dos Calles)

```
        ║
        ║  Calle Local 1080081
        ║
┌───────╬─────────┐
│       ║PREDIO B │  ← Clic aquí
└───────╬─────────┘
════════╬══════════  Calle Local 1080167

Resultado: ["1080167", "1080081"]
```

### Caso 3: Predio en Ruta Nacional

```
┌─────────────────┐
│    PREDIO C     │  ← Clic aquí
└─────────────────┘
═══════════════════  Ruta Nacional 201 (sin local paralela)

Resultado: ["201"]
```

### Caso 4: Local y Nacional Paralelas (Duplicado)

```
┌─────────────────┐
│    PREDIO D     │  ← Clic aquí
└─────────────────┘
═══════════════════  Calle Local 1080167
───────────────────  Ruta Nacional 201 (paralela, < 3m)

Resultado: ["1080167"]  ← Nacional descartada por duplicado
```

### Caso 5: Local y Nacional se Cruzan (Diferentes)

```
        ║
        ║  Ruta Nacional 201
        ║
┌───────╬─────────┐
│       ║PREDIO E │  ← Clic aquí
└───────╬─────────┘
════════╬══════════  Calle Local 1080167

Resultado: ["1080167", "201"]  ← Ambas incluidas (ángulo ≥ 30°)
```

### Caso 6: Predio Rodeado (Sin Rutas Directas)

```
┌─────────┬─────────┬─────────┐
│Predio X │Predio Y │Predio Z │
├─────────┼─────────┼─────────┤
│Predio W │PREDIO F │Predio V │  ← Clic aquí
├─────────┼─────────┼─────────┤
│Predio U │Predio T │Predio S │
└─────────┴─────────┴─────────┘

Resultado: []  ← No hay rutas directamente adyacentes
```

---

## 6. Consideraciones de Implementación

### 6.1 Rendimiento

- Usar bounding box como filtro inicial para reducir candidatos.
- El cálculo de distancia punto-a-segmento debe ser eficiente.
- Considerar cachear resultados si el cálculo es costoso.

### 6.2 Coordenadas

- Todas las geometrías están en WGS84 (grados).
- Para cálculos de distancia en metros, convertir a proyección local (CRTM05) o usar fórmula Haversine.

### 6.3 MULTILINESTRING

- Las rutas nacionales pueden tener múltiples segmentos.
- Evaluar cada segmento individualmente y tomar la distancia mínima.

---

## 7. Estado de Implementación
 
| Tarea                                                  | Estado      | Notas |
|--------------------------------------------------------|-------------|-------|
| Crear método `getAdjacentRoutes()` en `DatabaseHelper` | ✅ Completado | Base inicial |
| Implementar cálculo distancia polígono-a-línea         | ✅ Completado | Usando JTS CRTM05 |
| Implementar comparación de ángulos                     | ✅ Completado | Detecta paralelas |
| Eliminar duplicados Nacional/Local                     | ✅ Completado | Umbral 30° |
| **Unificación de Fragmentos (MultiLineString)**        | ✅ Completado | Agrupa por ID+Dirección |
| **Filtro de Oclusión entre Rutas**                     | ✅ Completado | Usando Buffer 2m y Margen 0.1m |
| **Optimización Rendimiento (CachedRoute)**             | ✅ Completado | Parseo único WKT/Proyección |
| Integración Frontend (Vue + Android Bridge)            | ✅ Completado | JSON Bridge |
| Visualización Avanzada (Etiquetas múltiples, estilos)  | ✅ Completado | Labels rotativos y espaciados |

---

## 8. Visualización en Mapa
 
 Se ha implementado un sistema de visualización para las capas de rutas, con las siguientes características:
 
 ### 8.1 Visualización y Estilo
 - **Polilíneas**:
     - Ancho reducido a **5px** (antes 10px) para un aspecto más limpio y no invasivo.
     - Color diferenciado: **Rojo** (Nacionales) y **Azul** (Locales).
     - **RoundCap**: Terminaciones redondeadas en segmentos.
 - **Marcadores de Extremo**:
     - Círculos sólidos al inicio y final de cada *segmento visible* para identificar nodos.
     - Escalados según densidad de pantalla.
 - **Etiquetas de Texto (Rótulos)**:
     - **Tamaño**: 20px (legible y claro).
     - **Posicionamiento Inteligente**:
         - Si la ruta mide **< 150m**: Una sola etiqueta centrada geométricamente.
         - Si la ruta mide **> 150m**: Múltiples etiquetas distribuidas equidistantemente cada **100 metros**.
     - **Orientación**: Rotadas según el rumbo exacto del tramo donde caen.
     - **Legibilidad**: Corrección automática para evitar texto invertido ("cabeza abajo").
 
 ### 8.2 Capas y Rendimiento
 - **Carga por Viewport**: Solo se renderiza lo que está en pantalla.
 - **Auto-refresco**: Recarga dinámica al mover el mapa.
 - **Z-Index**: Prioridad de visualización:
     1. Etiquetas (Z=10002) - Tope
     2. Marcadores (Z=10001)
     3. Líneas de Ruta (Z=10000)
     4. Ortofoto/Base (Z=0)
 
 ---
 
 ## 9. Optimización y Filtrado Avanzado
 
 Para garantizar precisión y rendimiento en dispositivos móviles, se han implementado técnicas avanzadas en `DatabaseHelper`:
 
 ### 9.1 Geometría Pre-Procesada (`CachedRoute`)
 - **Problema**: Parsear WKT (texto) y proyectar coordenadas (WGS84 → CRTM05) es costoso si se repite N veces.
 - **Solución**: Se convierte cada objeto geométrico **una sola vez** al inicio del cálculo.
 - **Beneficio**: Las comparaciones espaciales subsecuentes (distancia, intersección) se hacen sobre objetos en memoria listos para operar, acelerando drásticamente el proceso.
 
 ### 9.2 Filtrado de Oclusión entre Rutas (Buffer Métrico)
 - **Objetivo**: Evitar que aparezcan rutas "falsas" que están geométricamente detrás de otras rutas reales.
 - **Lógica**:
     1. Se traza una línea visual desde el predio hasta la ruta candidata lejana.
     2. Se verifica si esta línea cruza alguna otra ruta candidata más cercana.
     3. **Mejora Clave**: Se aplica un **buffer de 2.0 metros** (ancho virtual de 4m) a la ruta bloqueadora.
     4. Se usa un umbral de proximidad de **0.1 metros**.
     - *Resultado*: Si una ruta está 10cm detrás de otra y su visión está bloqueada por el "muro" de 4m de la ruta delantera, se descarta automáticamente.
 
 ### 9.3 Unificación de Fragmentos
 - **Caso**: Las rutas nacionales a veces vienen fragmentadas en múltiples `MULTILINESTRING` o segmentos separados en la BD con el mismo código `LOCALIZACION`.
 - **Solución**:
     - Se agrupan los segmentos por `Código` + `Dirección Cardinal`.
     - Si los fragmentos están cerca entre sí (< 5m), se unifican devolviendo solo el más cercano al predio como representante único.
 
 ---
 
 *Documento creado: 2026-02-07*  
 *Última actualización: 2026-02-08*
