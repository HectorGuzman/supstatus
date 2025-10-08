import { ensureFirebase } from '../config/firebase.js';

const admin = ensureFirebase();
const firestore = admin.firestore();

export interface UserProfilePayload {
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  goals?: string;
  email?: string;
}

export interface SessionPayload {
  title?: string;
  spot?: string;
  startedAt?: Date;
  durationMin?: number;
  distanceKm?: number;
  conditionsNote?: string;
}

export async function getUserProfile(uid: string) {
  const snapshot = await firestore.collection('users').doc(uid).get();
  if (!snapshot.exists) return null;
  return snapshot.data();
}

export async function upsertUserProfile(uid: string, data: UserProfilePayload) {
  const docRef = firestore.collection('users').doc(uid);
  const sanitized: Record<string, unknown> = {};
  Object.entries(data || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      sanitized[key] = value;
    }
  });
  await docRef.set(
    {
      ...sanitized,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  const updated = await docRef.get();
  return updated.data();
}

export async function createSession(uid: string, payload: SessionPayload) {
  const sessionsRef = firestore.collection('users').doc(uid).collection('sessions');
  const now = admin.firestore.Timestamp.now();
  const docRef = await sessionsRef.add({
    ...payload,
    startedAt: payload.startedAt ? admin.firestore.Timestamp.fromDate(payload.startedAt) : now,
    createdAt: now,
    updatedAt: now,
  });
  const snapshot = await docRef.get();
  return { id: docRef.id, ...snapshot.data() };
}

export async function listSessions(uid: string) {
  const sessionsRef = firestore.collection('users').doc(uid).collection('sessions');
  const snapshot = await sessionsRef.orderBy('startedAt', 'desc').limit(20).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function listAllProfiles() {
  const snapshot = await firestore.collection('users').orderBy('displayName', 'asc').get();
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    _meta: {
      createdAt: doc.createTime?.toDate().toISOString(),
      updatedAt: doc.updateTime?.toDate().toISOString(),
    },
  }));
}
