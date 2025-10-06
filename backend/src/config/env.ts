import dotenv from 'dotenv';

dotenv.config();

const requiredEnv = ['PORT'];

requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    console.warn(`[env] ${key} is not defined. Using default or runtime value where applicable.`);
  }
});

export const env = {
  port: Number.parseInt(process.env.PORT || '8080', 10),
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};
