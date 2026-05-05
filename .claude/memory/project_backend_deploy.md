---
name: Backend deploy process
description: How to deploy the Node.js backend to Google Cloud Run
type: project
originSessionId: d6c20b42-bde3-490e-b3bf-b6645603d42f
---
El backend es un servidor Express/TypeScript desplegado en **Google Cloud Run**.

**Proyecto GCP:** `supstatus-c1ab5`
**Servicio:** `sup-experience-backend`
**Región:** `us-east1`
**URL producción:** `https://sup-experience-backend-858880938649.us-east1.run.app`

## Pasos para deployar

```bash
cd /Users/hector/Documents/GITHUB/sup-vision/backend
npm run build
gcloud run deploy sup-experience-backend \
  --source . \
  --region us-east1 \
  --quiet
```

`--source .` usa el `Dockerfile` del directorio para construir y desplegar en un solo comando. No se necesita hacer push a Docker Hub ni a ningún registry manualmente.

**Why:** El build de TypeScript debe correr antes del deploy para que `dist/` esté actualizado. Si no, Cloud Run usa el código compilado anterior.

**How to apply:** Cada vez que se modifiquen archivos en `backend/src/`, hay que correr estos comandos después del `git push`.
