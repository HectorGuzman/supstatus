---
name: Backend Express — rutas, servicios y middleware
description: Estructura completa del backend Express.js en TypeScript: rutas, servicios, auth, deploy en Cloud Run
type: project
originSessionId: d6c20b42-bde3-490e-b3bf-b6645603d42f
---
## Entry point

- `backend/src/index.ts` — Inicia Express en PORT (default 8080)
- `backend/src/app.ts` — Setup: helmet, cors, morgan, Firebase init, montaje de rutas

---

## Configuración

| Archivo | Propósito |
|---------|-----------|
| `backend/src/config/firebase.ts` | Firebase Admin SDK (project ID, client email, private key o default credentials) |
| `backend/src/config/env.ts` | PORT, FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, ADMIN_EMAILS (comma-sep), NOTIFY_SECRET |

---

## Middleware (`backend/src/middleware/`)

- `authenticate.ts`:
  - `authenticate()` — Token Firebase válido + email verificado (para publicar historias)
  - `authenticateAny()` — Token válido sin chequear verificación

---

## Rutas

### `/v1/profile`
- `GET /me` — Perfil actual + flag isAdmin
- `POST /me` — Actualiza: displayName, avatarUrl, bio, goals, fcmToken, favSpot
- `GET /all` — Lista todos los perfiles (admin)

### `/v1/stories`
- `GET /` — Historias publicadas (paginación cursor, 20/página, auth opcional para likedByMe)
- `GET /me` — Historias del usuario (auth, requiere Firestore index)
- `POST /me` — Crear historia (min 10 chars, auto-title si no hay)
- `DELETE /me/:storyId` — Borrar propia historia
- `GET /admin` — Lista todas por status (admin)
- `POST /:storyId/status` — Cambia status/featured (admin)
- `DELETE /:storyId` — Borrar historia (admin)
- `GET /:storyId/comments` — Comentarios (público, limit 50)
- `POST /:storyId/comments` — Agregar comentario (max 500 chars, FCM al autor)
- `DELETE /:storyId/comments/:commentId` — Borrar propio comentario
- `POST /:storyId/like` — Toggle like (FCM al autor si liked)

### `/v1/sessions`
- `GET /me` — Lista sesiones (desc, limit 20)
- `POST /me` — Crear sesión → llama `updateUserStats()` fire-and-forget
- `DELETE /me/:sessionId` — Borrar sesión → llama `updateUserStats()` fire-and-forget
- Sanitiza trackPoints (max 500), soporta legacy fields (notes→conditionsNote, photoUrl→mediaUrl, track→trackPoints)

### `/v1/users`
- `GET /` — Buscar por displayName prefix (min 2 chars) o sugerencias (por followersCount)
- `GET /following` — UIDs que sigue el usuario (max 500)
- `POST /:targetUid/follow` — Seguir (incrementa followingCount/followersCount, FCM)
- `DELETE /:targetUid/follow` — Dejar de seguir
- `GET /:uid/profile` — Perfil público + stats

### `/v1/notify`
- `POST /daily-forecast` — Cloud Scheduler (header x-notify-secret). Envía push si hay 2+ bloques buenos (07-12h) en el favSpot del usuario

---

## Servicios (`backend/src/services/`)

### `firestore.ts`
- `getUserProfile(uid)` / `upsertUserProfile(uid, data)`
- `createSession(uid, payload)` — Bajo `users/{uid}/sessions`
- `listSessions(uid)` — Últimas 20 por startedAt desc
- `deleteSession(uid, sessionId)`
- `updateUserStats(uid)` — Recalcula rankKey/rankIcon/sessionsSummary de todas las sesiones del usuario
- `listAllProfiles()` — Para admin

### `rank.ts`
- Score = `totalKm + totalSessions * 5`
- 8 niveles (desc): leyendaDeLosMaress🏆(1000), maestroDelRemo🧙(550), tiburonDeBahia🦈(280), loboDeMar🐺(140), buscaolas🌊(70), remadorDeDomingo😎(30), aprendizMojado💦(10), polloDelSup🐔(0)
- `computeRank(totalKm, totalSessions) → { key, icon }`

### `notifications.ts`
- `sendPushNotification(fcmToken, title, body, data)` — Android high priority, iOS sound
- `getUserFcmToken(uid)`
- Ignora silenciosamente tokens inválidos/expirados

### `stories.ts`
- `createUserStory(uid, payload, author)` — Lee rankKey del user doc, lo guarda en story como `authorRankKey`/`authorRankIcon`
- `listPublishedStories(limit, currentUid, afterDocId)` — Cursor-based
- `toggleStoryLike(storyId, uid)` — Transacción sobre campo likedBy
- `addComment` / `deleteComment` — Incrementa/decrementa commentCount

---

## Variables de entorno (`.env`)

```
PORT=8080
FIREBASE_PROJECT_ID=supstatus-c1ab5
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
ADMIN_EMAILS=hectorguzmancortes@gmail.com,...
NOTIFY_SECRET=supstatus-notify-secret
OPENAI_API_KEY=... (solo pipeline Python)
```

---

## Deploy

```bash
cd backend && npm run build
gcloud run deploy sup-experience-backend --source . --region us-east1 --quiet
```

**Why:** Cloud Run en us-east1. Build TypeScript → dist/, luego gcloud hace el contenedor automáticamente.
