# Algoritmo: Posición Relativa entre Predios Adyacentes

## 1. Objetivo

Determinar la **dirección cardinal** (N, NE, E, SE, S, SO, O, NO) en la que se encuentra un predio adyacente B con respecto al predio actual A. Esta información permite al usuario orientarse geográficamente al revisar registros de predios vecinos.

---

## 2. Problema a Resolver

Dado dos polígonos adyacentes (que comparten un borde o se tocan en un punto), calcular de forma robusta la dirección relativa de B respecto a A.

### Desafíos:
- Los polígonos pueden tener **formas irregulares** (no son rectángulos simples).
- El borde compartido puede ser **complejo** (polilínea con múltiples vértices).
- Los polígonos pueden **tocarse solo en un punto** (vértice común).
- El tamaño de los polígonos puede ser **muy diferente**.

### ¿Por qué no usar solo centroides?

Usar únicamente el vector entre centroides (`CentroideA → CentroideB`) puede dar resultados confusos cuando:
- Un polígono es mucho más grande que el otro.
- El polígono tiene forma alargada o irregular.
- El centroide no representa bien la "posición visual" del predio.

---

## 3. Solución: Normal del Borde Compartido con Árbitro

### 3.1 Concepto

Usamos la **normal perpendicular** al borde compartido entre los polígonos, corregida por un **vector árbitro** (el vector entre centroides) para garantizar que apunte hacia el polígono B.

```
        Predio B
   ┌─────────────────┐
   │                 │
   │     CB ●        │  ← Centroide B
   │                 │
   ├─────────────────┤  ← Borde compartido (simplificado a P1→P2)
   │                 │      ↑
   │     CA ●        │      │ Normal (perpendicular al borde)
   │                 │
   └─────────────────┘
        Predio A
```

### 3.2 Algoritmo Detallado

```
ENTRADA: wktA (WKT del polígono A), wktB (WKT del polígono B)
SALIDA: Dirección cardinal (N, NE, E, SE, S, SO, O, NO) o vacío si no hay intersección

1. PARSEAR GEOMETRÍAS
   geomA = parsear WKT de A
   geomB = parsear WKT de B
   Si alguno es nulo → retornar ""

2. CALCULAR CENTROIDES
   CA = centroide de geomA (coordenadas X, Y)
   CB = centroide de geomB (coordenadas X, Y)

3. OBTENER INTERSECCIÓN
   intersection = geomA ∩ geomB
   Si intersection está vacía → retornar ""

4. DETERMINAR TIPO DE INTERSECCIÓN
   
   4.1 Si intersection.length == 0 (es un PUNTO):
       // Los polígonos solo se tocan en un vértice
       normalX = CB.x - CA.x
       normalY = CB.y - CA.y
       Ir al paso 6
   
   4.2 Si intersection.length > 0 (es una LÍNEA):
       // Hay un borde compartido
       Continuar al paso 5

5. CALCULAR NORMAL DEL BORDE COMPARTIDO
   
   5.1 Simplificar el borde a una línea recta:
       P1 = primer punto del borde
       P2 = último punto del borde
   
   5.2 Verificar línea degenerada:
       Si distancia(P1, P2) < 0.0000001:
           // El borde es efectivamente un punto
           normalX = CB.x - CA.x
           normalY = CB.y - CA.y
           Ir al paso 6
   
   5.3 Calcular vector dirección de la línea:
       dx = P2.x - P1.x
       dy = P2.y - P1.y
   
   5.4 Calcular vector normal (perpendicular):
       normalX = -dy
       normalY = dx
   
   5.5 Corregir dirección con el árbitro:
       arbitroX = CB.x - CA.x
       arbitroY = CB.y - CA.y
       
       // Producto escalar para ver si apuntan en la misma dirección
       dotProduct = normalX * arbitroX + normalY * arbitroY
       
       Si dotProduct < 0:
           // La normal apunta en sentido contrario, invertirla
           normalX = -normalX
           normalY = -normalY

6. CALCULAR ÁNGULO
   angulo = atan2(normalY, normalX)
   anguloDegrees = convertir a grados

7. CONVERTIR A DIRECCIÓN CARDINAL
   Normalizar ángulo a rango [-180, 180]
   
   Según el ángulo:
   - [-22.5, 22.5)    → "E"  (Este)
   - [22.5, 67.5)     → "NE" (Noreste)
   - [67.5, 112.5)    → "N"  (Norte)
   - [112.5, 157.5)   → "NO" (Noroeste)
   - [157.5, 180] o [-180, -157.5) → "O" (Oeste)
   - [-157.5, -112.5) → "SO" (Suroeste)
   - [-112.5, -67.5)  → "S"  (Sur)
   - [-67.5, -22.5)   → "SE" (Sureste)

8. RETORNAR dirección cardinal
```

---

## 4. Casos de Uso

### Caso 1: Borde Compartido Horizontal

```
    ┌─────────────────┐
    │    Predio B     │  N
    │       ●CB       │  ↑
    └─────────────────┘  │
    ══════════════════   │ Normal apunta hacia arriba
    ┌─────────────────┐  
    │       ●CA       │
    │    Predio A     │
    └─────────────────┘

Resultado: "N" (B está al Norte de A)
```

### Caso 2: Borde Compartido Vertical

```
    ┌─────────┬─────────┐
    │         │         │
    │ Predio  │ Predio  │
    │    A    │    B    │
    │   ●CA   │   ●CB   │
    │         │         │
    └─────────┴─────────┘
              ║
              ║ Normal apunta → E

Resultado: "E" (B está al Este de A)
```

### Caso 3: Borde Compartido Diagonal

```
         ╱╲
        ╱  ╲  Predio B
       ╱ ●CB╲
      ╱──────╲
     ╱        ╲  Borde diagonal
    ╲──────────╱
     ╲  ●CA   ╱
      ╲      ╱  Predio A
       ╲    ╱
        ╲  ╱
         ╲╱

Resultado: "NE" (B está al Noreste de A)
```

### Caso 4: Solo se Tocan en un Punto

```
    ┌─────────┐
    │ Predio  │
    │    B    │
    │   ●CB   │
    └────┬────┘
         │  ← Único punto de contacto
    ┌────┴────┐
    │   ●CA   │
    │ Predio  │
    │    A    │
    └─────────┘

Resultado: "N" (usa vector CA→CB directamente)
```

### Caso 5: Predios de Tamaños Muy Diferentes

```
    ┌─────────────────────────────────┐
    │                                 │
    │          Predio B               │
    │             ●CB                 │
    │                                 │
    └────────────┬────────────────────┘
           ┌─────┴─────┐
           │  Predio   │
           │     A     │
           │    ●CA    │
           └───────────┘

Resultado: "N" (el algoritmo maneja correctamente 
               la diferencia de tamaños)
```

---

## 5. Implementación

### Archivo: `GeometryUtil.kt`

```kotlin
/**
 * Calcula la dirección cardinal relativa de un polígono B respecto a A
 * usando la normal del borde compartido corregida por el árbitro (centroides).
 *
 * @param wktA WKT del polígono de referencia
 * @param wktB WKT del polígono adyacente
 * @return Dirección cardinal (N, NE, E, SE, S, SO, O, NO) o "" si no hay intersección
 */
fun getRelativeDirectionBetweenPolygons(wktA: String, wktB: String): String
```

### Archivo: `DatabaseHelper.kt`

La función `getDataInAdjacentPolygons()` ahora incluye el campo `DireccionRelativa` en el JSON de respuesta.

### Archivo: `index.html`

La tabla de predios adyacentes muestra la dirección al inicio de cada fila:
```
[E] [025300200466]/[5-01-001]
```

---

## 6. Funciones Auxiliares

### `angleToCardinal8(degrees: Double): String`

Convierte un ángulo en grados a una de las 8 direcciones cardinales.

```kotlin
private fun angleToCardinal8(degrees: Double): String {
    var normalized = degrees % 360
    if (normalized > 180) normalized -= 360
    if (normalized < -180) normalized += 360
    
    return when {
        normalized >= -22.5 && normalized < 22.5   -> "E"
        normalized >= 22.5 && normalized < 67.5    -> "NE"
        normalized >= 67.5 && normalized < 112.5   -> "N"
        normalized >= 112.5 && normalized < 157.5  -> "NO"
        normalized >= 157.5 || normalized < -157.5 -> "O"
        normalized >= -157.5 && normalized < -112.5 -> "SO"
        normalized >= -112.5 && normalized < -67.5  -> "S"
        else                                        -> "SE"
    }
}
```

---

## 7. Consideraciones Técnicas

### 7.1 Sistema de Coordenadas

- Las coordenadas están en **WGS84 (EPSG:4326)**.
- El eje X representa la **longitud** (Este-Oeste).
- El eje Y representa la **latitud** (Norte-Sur).
- `atan2(Y, X)` da el ángulo respecto al eje Este (X positivo).

### 7.2 Precisión

- Se usa un umbral de `0.0000001` para detectar líneas degeneradas.
- Esto equivale aproximadamente a **1 cm** en coordenadas geográficas.

### 7.3 Rendimiento (Optimizado)
 
 - **Pre-Procesamiento**: Se parsean las geometrías WKT a objetos JTS `Geometry` **una sola vez** al inicio del cálculo.
 - **Reutilización**: Las operaciones subsecuentes (intersección, dirección relativa, verificación de puntos) utilizan estos objetos en memoria, eliminando la sobrecarga de parseo repetitivo.
 - **Eficiencia**: El cálculo es extremadamente rápido incluso con docenas de predios candidatos y cientos de puntos de datos.
 
 ---
 
 ## 8. Visualización en la Interfaz

La tabla de "Registros en predios adyacentes" muestra:

| PREDIO/CAMINO | TIPO | ACCIONES |
|---------------|------|----------|
| **[E]** [025300200466]/[5-01-001] | Acera | 📋 |
| **[N]** [025300200467]/[5-01-002] | Costo | 📋 |
| **[-]** [025300200468]/[-] | Acera | 📋 |

- La dirección aparece en **negrita** entre corchetes.
- Si no se puede calcular la dirección, se muestra **[-]**.

---

## 9. Casos Especiales

| Situación | Comportamiento |
|-----------|----------------|
| Polígonos no se intersectan | Retorna "" |
| Intersección es un punto | Usa vector centroide-a-centroide |
| Borde compartido es muy corto | Funciona igual (simplifica a P1→P2) |
| Borde compartido es complejo | Se simplifica a línea recta P1→P2 |
| Geometría inválida | Retorna "" con log de error |

---

*Documento creado: 2026-02-08*  
*Última actualización: 2026-02-08*
