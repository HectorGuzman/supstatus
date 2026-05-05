---
name: App móvil — estructura, pantallas y servicios
description: Screens, navegación, servicios, tema visual y componentes de la app React Native
type: project
originSessionId: d6c20b42-bde3-490e-b3bf-b6645603d42f
---
## Navegación (Bottom Tabs)

| Tab | Pantalla | Descripción |
|-----|----------|-------------|
| Condiciones | ForecastScreen | Pronóstico horario del spot seleccionado: viento, oleaje, temperatura, mareas, mapa Leaflet |
| Remadas | SessionsScreen | Lista de sesiones + tracking GPS en vivo con pausa/reanuda + detalle de sesión |
| Historias | StoriesScreen | Feed social: crear/ver/comentar/likear historias, buscar/seguir usuarios |
| Perfil | ProfileScreen | Perfil del usuario, ranking, stats de sesiones, edición de info |

**WelcomeScreen:** pantalla de auth (email/pass + Google Sign-In + recuperar contraseña)

---

## Screens en detalle

### ForecastScreen (`mobile/src/screens/ForecastScreen.tsx`)
- SpotSelector en modal con lista de 9 spots
- Tabs hoy/mañana con bloques horarios
- Cada bloque: viento, oleaje, dirección, temperatura, condiciones (OpenAI), nivel dificultad
- Sección de mareas con 4 momentos (alta/baja)
- Mapa Leaflet via WebView mostrando ubicación del spot

### SessionsScreen (`mobile/src/screens/SessionsScreen.tsx`)
- Lista de sesiones con minimap SVG del track coloreado por velocidad
- Botón GPS (verde, 52×52) para iniciar tracking
- Tracker en vivo: distancia, duración, botones Pausa/Reanudar/Finalizar
- Pausa: para el timer y locationSub pero mantiene el track
- `justResumed` ref: evita contar distancia del salto entre pre-pausa y post-resume
- Al finalizar: guarda sesión via `api.createSession()`
- SummaryShareCard: tarjeta compartible con track coloreado, stats y velocidad máxima

### SessionDetailScreen (`mobile/src/screens/SessionDetailScreen.tsx`)
- Hero: mapa Leaflet full-width (360px) con header flotante transparente (LinearGradient)
- Spot + fecha superpuestos sobre gradiente inferior del mapa
- Stats principales: 3 pills (km, duración, vel. media) con borde superior de color
- Fila secundaria: vel. máxima ⚡ y puntos GPS 📍
- Gráfico de velocidad (SpeedChart): barras coloreadas, inicio→fin
- Notas con ícono
- ShareCard: tarjeta invisible capturada con captureRef para compartir como imagen

### StoriesScreen (`mobile/src/screens/StoriesScreen.tsx`)
- Feed paginado con cursor (20 por página)
- StoryCard: avatar + nombre + rank del autor + spot + foto + texto + likes + comentarios
- Modal de comentarios como bottom sheet con KeyboardAvoidingView envolviendo la overlay
- Búsqueda de usuarios: muestra rankIcon + rankKey traducido
- Carga cuando auth es conocido (`onAuthStateChanged`) para que `likedByMe` sea correcto

### ProfileScreen (`mobile/src/screens/ProfileScreen.tsx`)
- Header con avatar (borde del color del rank), nombre, rank badge, barra de progreso
- Progreso: `score = km + sessions*5`, muestra `X pts → Y pts para 🌊 Buscaolas`
- Stats: km totales, sesiones, horas en el agua
- Edición: displayName, bio, nivel, disciplinas, tabla/equipo, spot favorito
- Share card: captura con captureRef, muestra toda la info en formato IG-friendly
- ProfileShareCard es componente separado renderizado invisible (position: absolute, opacity: 0)

---

## Servicios (`mobile/src/services/`)

| Archivo | Función |
|---------|---------|
| `firebase.ts` | Init Firebase (auth, firestore, storage). AsyncStorage persistence. |
| `api.ts` | Cliente HTTP al backend. Auto-adjunta Bearer token de Firebase Auth. |
| `googleAuth.ts` | Google Sign-In con @react-native-google-signin |
| `notifications.ts` | Registra FCM token tras login |
| `permissions.ts` | GPS (Location.requestForegroundPermissionsAsync), cámara, galería |
| `spots.ts` | Carga spots-config.json dinámicamente |

**URL backend:** hardcodeada en `api.ts` (prod: Cloud Run, dev: localhost:8080)

---

## Tema visual (`mobile/src/theme.ts`)

```ts
colors.bg          = '#040e1e'   // fondo principal
colors.surface1    = '#081c2e'
colors.surface2    = '#0e2640'
colors.surface3    = '#142e4e'
colors.border      = '#1e3f5c'
colors.borderLight = '#24507a'
colors.primary     = '#0ea5e9'   // cyan
colors.textPrimary = '#ffffff'
colors.textSecondary = '#bfdbfe'
colors.textMuted   = '#93c5fd'
colors.textDim     = '#60a5b8'
```

`difficultyStyle`: verde (Principiante), amarillo (Intermedio), rojo (Avanzado)

**Gradient helper:** `<Gradient as LinearGradient>` en `mobile/src/components/Gradient.tsx`

---

## i18n (`mobile/src/i18n/`)

- `index.ts`: `initI18n()` async (lee AsyncStorage). Debe llamarse en `App.tsx` antes de renderizar.
- `es.json` / `en.json`: traducciones organizadas por pantalla
- Secciones: common, welcome, forecast, sessions, stories, profile, ranks, social, spotSelector, tabs
- Ranks en `ranks.*` — claves como `polloDelSup`, `buscaolas`, etc.
- `useTranslation()` disponible en todos los screens

**App.tsx:** Llama `initI18n()` en useEffect, bloquea render con `if (!i18nReady) return null`

---

## Tipos (`mobile/src/types/index.ts`)

- `Session`: id, distanceKm, durationMin, spot, date, notes, mediaUrl, trackPoints
- `Story`: id, body, authorUid, authorName, authorAvatar, authorRankKey, authorRankIcon, spot, mediaUrl, likeCount, likedByMe, featured, commentCount, createdAt
- `UserProfile`: uid, displayName, avatarUrl, nivel, disciplinas, bio, equipo, sessionsSummary
- `ForecastData`: hoy[], mañana[], mareas[], generado

---

## Assets

- `mobile/assets/icon.png` — Ícono app (1024×1024, fondo transparente, logo bajado 70px desde top)
- `mobile/assets/adaptive-icon.png` — Android adaptive icon
- `mobile/assets/logo.svg` — Fuente del logo (brújula + remo)
- `mobile/assets/splash-icon.png` — Splash screen
