# Google Maps API Key — INETER Android App

## Proyecto Google Cloud
- **Nombre:** CADIC-AndroidMaps
- **ID:** cadic-androidmaps
- **Consola:** https://console.cloud.google.com/apis/credentials?project=cadic-androidmaps

## API Key actual
```
AIzaSyC3UHHNbQPN5_JoKmqIv97ui8Ucow4Hj2g
```

## Configuración
- **API habilitada:** Maps SDK for Android
- **Restricciones de aplicación:** Ninguna (None) — funciona para cualquier app/certificado
- **Restricciones de API:** Maps SDK for Android únicamente
- **Creado:** 2026-05-16

## Uso en el proyecto
- **Archivo:** `app/src/main/res/values/strings.xml`
- **Nombre del recurso:** `google_maps_key`
- **Referenciado desde:** `AndroidManifest.xml` → `com.google.android.geo.API_KEY`

## Historial
| Fecha | Key | Motivo del cambio |
|---|---|---|
| (anterior) | `AIzaSyA_-tOB-mMFsNqaUUKFvgoEgSRhpMJ2n6o` | Key original (propietario salió de la org, acceso perdido) |
| 2026-05-16 | `AIzaSyC3UHHNbQPN5_JoKmqIv97ui8Ucow4Hj2g` | **Key activo** — nuevo proyecto CADIC-AndroidMaps |

## Contexto del cambio
La key original dejó de funcionar para `com.cadicsa.inventario.ni.ineter` tras una actualización
de Google Play Services (`maps_core_dynamite:260830202`) que endureció el proceso de
autenticación del Maps SDK. Al reinstalar la app se perdió el token cacheado, y la nueva
autenticación falló porque la key antigua posiblemente tenía restricciones de paquete/certificado.

La nueva key fue creada sin restricciones en el proyecto CADIC-AndroidMaps bajo una cuenta
Google accesible por el equipo CADIC.
