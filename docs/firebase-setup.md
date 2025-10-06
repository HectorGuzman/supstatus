# Firebase Setup (Paso 1)

Guía para asociar el proyecto existente en Google Cloud con Firebase y habilitar las credenciales necesarias para el backend.

## 1. Habilitar Firebase en el Proyecto

1. Ve a [console.firebase.google.com](https://console.firebase.google.com/).
2. Pulsa **Add project** → **Use an existing Google Cloud project**.
3. Selecciona el `PROJECT_ID` que ya tienes en Google Cloud y finaliza el asistente.  
   > Esto habilita Firebase Auth, Firestore y Storage dentro del mismo proyecto GCP.

## 2. Instalar Firebase CLI (opcional pero recomendado)

```bash
npm install -g firebase-tools
firebase login
firebase use PROJECT_ID
```

El CLI facilita la gestión de reglas, hosting y funciones si luego las ocupamos.

## 3. Credenciales para el Backend

El backend necesita validar tokens de Firebase. Hay dos opciones:

### Opción A: Application Default Credentials (recomendada en Google Cloud)

En tu máquina local:

```bash
gcloud auth application-default login
```

Esto crea las credenciales en `~/.config/gcloud/application_default_credentials.json`.  
En Cloud Run no hace falta nada adicional; el servicio usa la identidad de la cuenta de servicio asignada.

### Opción B: Service Account manual

1. En la Console GCP: **IAM & Admin → Service Accounts**.
2. Crea una cuenta específica (ej. `firebase-admin`) con el rol **Firebase Admin SDK Administrator Service Agent** o **Editor**.
3. Genera una key JSON y guárdala (no la subas al repo).
4. Exporta los datos en `.env`:

```
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...@....gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

En Cloud Run carga estos valores como variables de entorno o usa Secret Manager.

## 4. Configurar Autenticación

En la consola de Firebase:

1. **Authentication → Sign-in method**: activa Email/Password y los proveedores (Google, Apple) que quieras.
2. Opcional: configura dominios autorizados (para dev agrega `localhost` y el dominio de producción).

## 5. Crear App Firebase para el Front

1. En la consola, **Project Overview → Add app** (elige Web).
2. Obtén el snippet `firebaseConfig` y guárdalo; más adelante lo usaremos en el frontend.

## 6. Verificación Rápida

En local, con el backend en marcha (`npm run dev` dentro de `backend/`), ejecuta:

```bash
curl http://localhost:8080/healthz
```

Luego, desde un cliente autenticado (p. ej. app web usando Firebase Auth), solicita un `idToken` y prueba:

```bash
curl http://localhost:8080/v1/profile/me \
  -H "Authorization: Bearer ID_TOKEN"
```

Deberías recibir los claims decodificados de Firebase.

---

Con esto el proyecto queda enlazado a Firebase y listo para continuar con la base de datos y el flujo de autenticación en el frontend.
