---
name: Arquitectura general del proyecto SUP Vision
description: Stack tecnológico, estructura de carpetas, flujo general y decisiones de arquitectura del proyecto
type: project
originSessionId: d6c20b42-bde3-490e-b3bf-b6645603d42f
---
## Qué es el proyecto

App móvil para la comunidad SUP (Stand Up Paddle) de Chile. Permite ver pronósticos del mar, registrar remadas con GPS, compartir historias y conectarse con otros paddlers.

**Bundle ID:** com.supvision.app | **Firebase project:** supstatus-c1ab5 | **Instagram:** @__supstatus

---

## Estructura de carpetas (raíz)

```
sup-vision/
├── mobile/                  → App React Native (Expo)
├── backend/                 → API Express.js en TypeScript
├── spots-config.json        → 9 spots chilenos configurados
├── data-{spotId}.json       → Datos de pronóstico generados diariamente
├── data.json                → Datos consolidados (legacy)
├── obtener_desde_chatgpt.py → Pipeline de datos principal
├── firestore.indexes.json   → Índices compuestos de Firestore
└── .github/workflows/       → GitHub Actions (generación diaria de data)
```

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Mobile | React Native 0.81.5 + Expo 54 + TypeScript |
| Backend | Express.js 4.19 + TypeScript → Google Cloud Run |
| Base de datos | Firestore (Firebase) |
| Auth | Firebase Authentication (email/password + Google) |
| Storage | Firebase Cloud Storage |
| Push | Firebase Cloud Messaging (FCM) |
| Data pipeline | Python 3.10 + OpenAI GPT-4o-mini + Open-Meteo |
| Mapas | Leaflet.js via WebView (CDN) |
| i18n | i18next + react-i18next (ES/EN) |

---

## Decisiones arquitectónicas clave

### Ranking
- Score = `totalKm + totalSessions * 5`
- 8 niveles: 🐔 Pollo del SUP → 🏆 Leyenda de los Mares
- Se guarda en `users/{uid}.rankKey` y `rankIcon` tras cada sesión
- Se muestra en perfil, historias y búsqueda de usuarios

### GPS tracking
- Máximo 500 puntos lat/lon por sesión con timestamp
- Permite pausar/reanudar sin cortar la ruta (`justResumed` ref)
- Analytics de velocidad: `distKm / timeDiffH`, cap a 25 km/h
- Track coloreado: azul=lento, verde=medio, naranja=rápido, rojo=sprint

### Pronóstico
- 9 spots: Arica, Iquique, Herradura, Guanaqueros, Tongoy, Viña, Pichilemu, Bahía Inglesa, Skatepark Coquimbo
- Datos horarios: 06, 09, 12, 15, 18, 21h
- Dificultad: ≤8 km/h viento = Principiante, ≤15 = Intermedio, >15 = Avanzado
- Mareas: generadas localmente en Python (semi-diurno, no OpenAI)

### Stories
- Flujo moderación: pending → published (o archived)
- Admins pueden featured stories
- Paginación con cursor
- Notificaciones FCM al crear comentario o like

### Notificaciones diarias
- Cloud Scheduler → `/v1/notify/daily-forecast`
- Solo envía si hay 2+ bloques buenos (07-12h) para el favSpot del usuario

---

## Deploys

**Backend:**
```bash
cd backend && npm run build
gcloud run deploy sup-experience-backend --source . --region us-east1 --quiet
```

**Mobile:** EAS Build (Expo Application Services)
- Development: APK internal
- Production: App Bundle (Android) + TestFlight (iOS)

**Data pipeline:** GitHub Actions automático 07:00 UTC (∼3-4 AM Chile)
