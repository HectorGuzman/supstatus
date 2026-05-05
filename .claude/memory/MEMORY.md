# Memory Index

- [Backend deploy — Cloud Run](project_backend_deploy.md) — Cloud Run deploy: `npm run build` + `gcloud run deploy sup-experience-backend --source . --region us-east1 --quiet`
- [Mobile deploy — App Store y Google Play](project_mobile_deploy.md) — App ya publicada en ambas tiendas. EAS maneja build numbers. Comandos: `eas build --platform all --profile production` + `eas submit`
- [Idioma de respuesta](feedback_idioma.md) — Responder siempre en español
- [Arquitectura general](project_architecture.md) — Stack, estructura de carpetas, decisiones de arquitectura, ranking, GPS, deploy
- [App móvil — pantallas y servicios](project_mobile.md) — Screens, navegación, servicios, tema visual, i18n, tipos, assets
- [Backend Express — rutas y servicios](project_backend.md) — Todas las rutas, servicios (firestore, rank, notifications, stories), middleware, env vars
- [Firebase — Firestore, índices, auth, FCM](project_firebase.md) — Colecciones, estructura de docs, índices compuestos, auth, push
- [Pipeline de datos — pronóstico diario](project_data_pipeline.md) — Script Python, Open-Meteo, OpenAI, GitHub Actions, estructura data-{spotId}.json
