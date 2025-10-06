## SUP Experience Backend

Base API server built with Node.js, TypeScript and Express. It is prepared to run on Google Cloud Run and integrate with Firebase Authentication.

### Scripts

```bash
npm install     # install dependencies
npm run dev     # start dev server with hot reload
npm run build   # compile TypeScript
npm start       # run compiled server
```

### Environment Variables

Copy `.env.example` to `.env` and adjust as needed.

- `PORT`: listening port (Cloud Run defaults to 8080).
- `CORS_ORIGIN`: comma-separated list of allowed origins.
- `FIREBASE_*`: credentials for Firebase Admin. On Google Cloud you can omit them and rely on Application Default Credentials.
- `DATABASE_URL` / `CLOUD_SQL_CONNECTION_NAME`: placeholders for future database connectivity.

### Google Cloud Notes

1. Enable Artifact Registry, Cloud Build and Cloud Run APIs.
2. Configure `gcloud` locally and run `gcloud auth application-default login` for local development.
3. For deployment, create a Docker image and deploy with Cloud Run. Example command:

```bash
gcloud builds submit --tag gcr.io/PROJECT_ID/sup-experience-backend
gcloud run deploy sup-experience-backend \
  --image gcr.io/PROJECT_ID/sup-experience-backend \
  --platform managed \
  --region REGION \
  --allow-unauthenticated
```

Replace `PROJECT_ID` and `REGION` with your values. Set environment variables in Cloud Run console or via `gcloud run services update`.
