---
name: Firebase — colecciones Firestore, índices y servicios
description: Estructura completa de Firestore (colecciones, campos, índices) y configuración Firebase del proyecto
type: project
originSessionId: d6c20b42-bde3-490e-b3bf-b6645603d42f
---
## Proyecto Firebase

- **Project ID:** `supstatus-c1ab5`
- **Servicios usados:** Firestore, Authentication (email+Google), Cloud Storage, FCM (push)

---

## Colecciones Firestore

### `users/{uid}`
Perfil del usuario. Campos:
```
displayName, avatarUrl, bio, goals, email
fcmToken            → token FCM para push
favSpot             → id del spot favorito (ej: "herradura")
rankKey             → clave del rank (ej: "polloDelSup")
rankIcon            → emoji del rank (ej: "🐔")
followersCount, followingCount
sessionsSummary: { totalKm, totalSessions, totalDurationMin }
createdAt, updatedAt
```

### `users/{uid}/sessions/{sessionId}`
Sesiones de paddling. Campos:
```
spot, startedAt (ISO8601)
durationMin, distanceKm
conditionsNote       → notas del usuario
trackPoints: [{ lat, lon, timestamp }]  → max 500 puntos
mediaUrl             → foto de la sesión
```

### `stories/{storyId}`
Historias del feed social. Campos:
```
authorUid, authorName, authorAvatar
authorRankKey, authorRankIcon   → guardados al crear la historia
body, spot, mediaUrl, title
status: "pending" | "published" | "archived"
featured: boolean
likes: number
likedBy: { [uid]: true }        → para toggle eficiente
commentCount: number
publishedAt, createdAt
```

### `stories/{storyId}/comments/{commentId}`
```
authorUid, authorName, authorAvatar
text (max 500 chars)
createdAt
```

### `follows/{followerUid}_{targetUid}`
Grafo social. Doc ID = `{followerUid}_{targetUid}`. Campos:
```
followerUid, targetUid, createdAt
```

---

## Índices compuestos (`firestore.indexes.json`)

| Colección | Campo 1 | Campo 2 | Propósito |
|-----------|---------|---------|-----------|
| stories | authorUid ASC | createdAt DESC | GET /v1/stories/me |
| stories | status ASC | publishedAt DESC | GET /v1/stories (feed público) |

---

## Authentication

- Email/password + Google Sign-In
- **Admin detection:** vía `ADMIN_EMAILS` env var en backend (no custom claims)
- Middleware `authenticate()` exige `emailVerified` para crear historias
- Middleware `authenticateAny()` acepta token sin verificación

---

## Cloud Storage

- Usado para avatares y fotos de historias
- La URL se guarda como `avatarUrl` / `mediaUrl` en los docs correspondientes

---

## FCM (Push Notifications)

- Token guardado en `users/{uid}.fcmToken` tras login
- Se envía push en estos eventos:
  - Nuevo comentario en una historia (al autor)
  - Like en una historia (al autor)
  - Nuevo follower (al target)
  - Pronóstico diario bueno (a usuarios con favSpot con condiciones ok)
- `backend/src/services/notifications.ts` maneja el envío
- Tokens inválidos se ignoran silenciosamente

---

## Reglas de seguridad

Las reglas están gestionadas desde el backend (Firebase Admin SDK), no con Firestore Security Rules directamente. El backend valida auth y permisos antes de operar.
