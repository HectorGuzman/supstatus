## SUP Experience Backend

Base API server built with Node.js, TypeScript and Express. It is prepared to run on Google Cloud Run and integrate with Firebase Authentication.

### Scripts

```bash
npm install   # install dependencies
npm run dev   # start dev server with hot reload
npm run build # compile TypeScript
npm start     # run compiled server
```

### Firestore

Este backend usa Firebase Admin SDK para leer y escribir en Cloud Firestore. Estructura sugerida:

- `users/{uid}`: datos del perfil (displayName, avatarUrl, bio, timestamps).
- `users/{uid}/sessions/{sessionId}`: sesiones de remada del usuario con condiciones y métricas.

Para desarrollo local puedes ejecutar el [Firestore Emulator](https://firebase.google.com/docs/emulator-suite). Si lo usas, agrega `FIRESTORE_EMULATOR_HOST` en tu `.env`.

### Environment Variables

Copy `.env.example` to `.env` and adjust as needed.

- `PORT`: listening port (Cloud Run defaults to 8080).
- `CORS_ORIGIN`: comma-separated list of allowed origins.
- `FIREBASE_*`: credentials for Firebase Admin. En Cloud Run puedes usar Application Default Credentials.
- `ADMIN_EMAILS`: lista separada por comas de correos con permisos de administrador (por ejemplo, `hector@example.com`).

### Google Cloud Notes

1. Enable Artifact Registry, Cloud Build y Cloud Run APIs.
2. Configura `gcloud` localmente y ejecuta `gcloud auth application-default login` para usar credenciales por defecto.

### Deploy (Cloud Run)

Este repositorio ya incluye un `Dockerfile` listo para generar la imagen. Ejemplo de despliegue:

```bash
# Desde la carpeta backend/
gcloud builds submit --tag gcr.io/PROJECT_ID/sup-experience-backend
gcloud run deploy sup-experience-backend \
  --image gcr.io/PROJECT_ID/sup-experience-backend \
  --platform managed \
  --region REGION \
  --allow-unauthenticated
```

Configura las variables de entorno en Cloud Run (por ejemplo `CORS_ORIGIN=https://TU-DOMINIO` y los campos `FIREBASE_*`). 
Para mayor seguridad, usa Secret Manager o ADC para los `FIREBASE_*`.

### Notas sobre autenticación

- Las cuentas creadas con email/password deben verificar su correo; el backend responde **403** si `email_verified` es `false`.
- El modal de login permite reenviar la verificación y resetear la contraseña con Firebase Auth.
- Proveedores como Google ya entregan correos verificados y se permiten sin pasos extra.

