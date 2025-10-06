import admin from 'firebase-admin';
import { env } from './env.js';

let initialized = false;

export function ensureFirebase() {
  if (initialized) {
    return admin;
  }

  if (admin.apps.length) {
    initialized = true;
    return admin;
  }

  try {
    if (env.firebaseProjectId && env.firebaseClientEmail && env.firebasePrivateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: env.firebaseProjectId,
          clientEmail: env.firebaseClientEmail,
          privateKey: env.firebasePrivateKey,
        }),
      });
    } else {
      // Fallback to default credentials (recommended in Google Cloud)
      admin.initializeApp();
    }
    initialized = true;
  } catch (error) {
    console.error('[firebase] Failed to initialize Firebase Admin SDK', error);
    throw error;
  }

  return admin;
}
