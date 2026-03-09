# Implementación FormCosto.js - Plan de Trabajo

## 📊 Estructura de Datos (Debe mantenerse EXACTA)

El formulario Costo maneja 6 secciones con items de costo:

### 1. Preliminares (4 items)
- Preliminares-trazado
- Demoliciones estructuras existentes
- Conformacion de terreno
- Excavaciones Maquinaria

### 2. Tuberias (10 items)
- Encamado
- Tuberia 300mm/400mm/600mm/650mm/750mm/800mm diametro
- Rellenos y compactacion
- Reposicion de base
- Diseño de espacios urbanos

### 3. Tragantes (4 items)
- Construccion de tragante H=2m/H=1
- Colocacion de loseta tactil
- Construccion de rejilla-Tragante

### 4. Acera (9 items)
- Varios tipos de aceras con/sin loseta tactil
- Con/sin refuerzo
- Rampas, pasamanos, bolardos

### 5. Cordon (4 items)
- Cordón de caño (acceso vehicular/sencillo)
- Cunetas D=300mm/D=400mm

### 6. Complementarias (7 items)
- Reubicación medidores
- Reconstrucción cajas registro
- Muros, taludes, drenajes
- Reparaciones, rampas ley 7600

## 🔧 Campos por Item

Cada item tiene:
```javascript
{
    Id: number,          // 0, 1, 2, ...
    Descr: string,       // Descripción del item
    Unidad: string,      // "ml", "m2", "m3", "unidad"
    Precio: number,      // Precio unitario fijo
    Cantidad: number,    // Cantidad ingresada por usuario
    Monto: number,       // Precio * Cantidad
    Longitud: number,    // Para cálculos
    Ancho: number,       // Para cálculos
    Area: number,        // Longitud * Ancho
    Volumen: number      // Para cálculos
}
```

## 📝 Campos Adicionales

```javascript
{
    Distrito: string,
    CodigoCamino: string,
    NumBoleta: string,
    NumProcesoCobro: string,
    
    PreliminaresObservaciones: string,
    TuberiasObservaciones: string,
    TragantesObservaciones: string,
    AceraObservaciones: string,
    CordonObservaciones: string,
    ComplementariasObservaciones: string,
    
    CondicionMeteorol: string,
    
    // Campos automáticos (igual que Acera)
    LatLng: { Lat, Lng },
    LocalProj: { x, y },
    Fecha: string,
    Encuestador: string,
    Imagenes: string (CSV),
    IdObject: number,
    Type: "Costo",
    Localizacion: string
}
```

## 🎯 Funcionalidades Necesarias

### 1. Cálculos Automáticos por Item
- `Area = Longitud * Ancho`
- `Monto = Precio * Cantidad`

### 2. Totales por Sección
- Sumar todos los `Monto` de cada sección

### 3. Total General
- Suma de todos los montos de todas las secciones

### 4. Validaciones
- Distrito (requerido)
- CodigoCamino (requerido)
- NumBoleta (requerido)
- NumProcesoCobro (requerido)
- CondicionMeteorol (requerido)

## 📂 Archivos a Crear/Modificar

### 1. `FormCosto.js` (NUEVO)
Componente Vue para el formulario Costo

### 2. `app.js` (MODIFICAR)
- Importar FormCosto
- Agregar al switch de tipos de formulario

### 3. `index.html` (VERIFICAR)
Ya debe tener la infraestructura Vue

## 🚀 Estado Actual

- ✅ Estructura JSON definida
- ✅ Lógica del legacy analizada
- ⏳ Pendiente: Crear FormCosto.js
- ⏳ Pendiente: Integrar en app.js

---

**Nota**: El formulario es EXTENSO (37 items totales). La implementación será similar a FormAcera pero con:
- Múltiples secciones (6 en total)
- Tablas dinámicas con cálculos
- Campos de observaciones por sección
- Totales parciales y general

