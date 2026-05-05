---
name: Mobile deploy — EAS Build y App Stores
description: Proceso de compilación y publicación en App Store (iOS) y Google Play (Android) via EAS
type: project
originSessionId: d6c20b42-bde3-490e-b3bf-b6645603d42f
---
## Estado

La app **ya está publicada** en ambas tiendas y ha pasado por el proceso de testing. Los builds siguientes son actualizaciones, no primeras publicaciones.

- **Bundle ID iOS:** com.supvision.app
- **Package Android:** com.supvision.app
- **EAS Project ID:** 56126d1c-c127-4db5-bae1-273607526e02
- **EAS Owner:** supstatus
- **Versión actual en app.json:** 1.0.0 (EAS maneja buildNumber/versionCode automáticamente)

---

## Comandos para actualizar

```bash
cd mobile

# 1. Compilar ambas plataformas
eas build --platform all --profile production

# 2. Subir a las tiendas (una vez terminados los builds)
eas submit --platform android --profile production
eas submit --platform ios --profile production
```

Builds tardan ~15-20 min en los servidores de EAS.

---

## Configuración eas.json

- **development:** APK interno con devClient
- **preview:** APK/IPA interno sin devClient
- **production:** Android = AAB (app-bundle), iOS = IPA para App Store

---

## Notas

- EAS maneja certificados iOS y provisioning profiles automáticamente
- El primer AAB de Google Play se sube manualmente; los siguientes via `eas submit`
- Ya se hizo el proceso completo de testing y publicación en ambas tiendas previamente
- No hace falta tocar buildNumber ni versionCode en app.json

**Why:** Se dejó que EAS maneje los build numbers para simplificar el proceso y evitar conflictos manuales.
