import { ensureFirebase } from '../config/firebase.js';
import { computeRank } from './rank.js';

const admin = ensureFirebase();
const firestore = admin.firestore();

export interface UserProfilePayload {
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  goals?: string;
  email?: string;
  fcmToken?: string;
  favSpot?: string | null;
}

export interface SessionPayload {
  title?: string;
  spot?: string;
  startedAt?: Date;
  durationMin?: number;
  distanceKm?: number;
  conditionsNote?: string;
  trackPoints?: Array<{ lat: number; lon: number; timestamp?: number }>;
  mediaUrl?: string;
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
  const trackPoints = Array.isArray(payload.trackPoints)
    ? payload.trackPoints
        .filter((point) =>
          typeof point?.lat === 'number'
          && typeof point?.lon === 'number'
          && Number.isFinite(point.lat)
          && Number.isFinite(point.lon),
        )
        .slice(0, 500)
        .map((point) => ({
          lat: point.lat,
          lon: point.lon,
          timestamp: typeof point.timestamp === 'number' ? point.timestamp : Date.now(),
        }))
    : undefined;
  const data: Record<string, unknown> = {
    startedAt: payload.startedAt ? admin.firestore.Timestamp.fromDate(payload.startedAt) : now,
    createdAt: now,
    updatedAt: now,
  };
  if (typeof payload.title === 'string') data.title = payload.title.trim();
  if (typeof payload.spot === 'string') data.spot = payload.spot.trim();
  if (typeof payload.durationMin === 'number') data.durationMin = payload.durationMin;
  if (typeof payload.distanceKm === 'number') data.distanceKm = payload.distanceKm;
  if (typeof payload.conditionsNote === 'string') data.conditionsNote = payload.conditionsNote.trim();
  if (typeof payload.mediaUrl === 'string') data.mediaUrl = payload.mediaUrl.trim();
  if (trackPoints && trackPoints.length) data.trackPoints = trackPoints;
  const docRef = await sessionsRef.add(data);
  const snapshot = await docRef.get();
  return { id: docRef.id, ...snapshot.data() };
}

export async function listSessions(uid: string) {
  const sessionsRef = firestore.collection('users').doc(uid).collection('sessions');
  const snapshot = await sessionsRef.orderBy('startedAt', 'desc').limit(20).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function deleteSession(uid: string, sessionId: string) {
  const docRef = firestore.collection('users').doc(uid).collection('sessions').doc(sessionId);
  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    return false;
  }
  await docRef.delete();
  return true;
}

export async function updateUserStats(uid: string) {
  const sessionsRef = firestore.collection('users').doc(uid).collection('sessions');
  const snap = await sessionsRef.get();
  const totalSessions = snap.size;
  let totalKm = 0;
  let totalDurationMin = 0;
  snap.docs.forEach(d => {
    totalKm += Number(d.data().distanceKm) || 0;
    totalDurationMin += Number(d.data().durationMin) || 0;
  });
  totalKm = Number(totalKm.toFixed(1));
  const rank = computeRank(totalKm, totalSessions);
  await firestore.collection('users').doc(uid).set({
    rankKey: rank.key,
    rankIcon: rank.icon,
    sessionsSummary: { totalKm, totalSessions, totalDurationMin: Number(totalDurationMin.toFixed(1)) },
  }, { merge: true });
}

export async function deleteUserAccount(uid: string) {
  const batch = firestore.batch();

  // Borrar sesiones
  const sessionsSnap = await firestore.collection('users').doc(uid).collection('sessions').get();
  sessionsSnap.docs.forEach(d => batch.delete(d.ref));

  // Borrar historias del usuario
  const storiesSnap = await firestore.collection('stories').where('authorUid', '==', uid).get();
  for (const storyDoc of storiesSnap.docs) {
    const commentsSnap = await storyDoc.ref.collection('comments').get();
    commentsSnap.docs.forEach(c => batch.delete(c.ref));
    batch.delete(storyDoc.ref);
  }

  // Borrar follows
  const followingSnap = await firestore.collection('follows').where('followerUid', '==', uid).get();
  followingSnap.docs.forEach(d => batch.delete(d.ref));
  const followersSnap = await firestore.collection('follows').where('targetUid', '==', uid).get();
  followersSnap.docs.forEach(d => batch.delete(d.ref));

  // Borrar perfil
  batch.delete(firestore.collection('users').doc(uid));

  await batch.commit();

  // Borrar cuenta de Firebase Auth
  await admin.auth().deleteUser(uid);
}

export async function blockUser(blockerUid: string, blockedUid: string) {
  const ref = firestore.collection('blocks').doc(`${blockerUid}_${blockedUid}`);
  await ref.set({
    blockerUid,
    blockedUid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

export async function unblockUser(blockerUid: string, blockedUid: string) {
  await firestore.collection('blocks').doc(`${blockerUid}_${blockedUid}`).delete();
}

export async function getBlockedUsers(blockerUid: string): Promise<string[]> {
  const snap = await firestore.collection('blocks').where('blockerUid', '==', blockerUid).limit(200).get();
  return snap.docs.map(d => d.data().blockedUid as string);
}

export async function reportStory(storyId: string, reporterUid: string, reason: string) {
  const storyDoc = await firestore.collection('stories').doc(storyId).get();
  const authorUid = storyDoc.data()?.authorUid ?? null;

  const existing = await firestore.collection('reports')
    .where('storyId', '==', storyId)
    .where('reporterUid', '==', reporterUid)
    .limit(1)
    .get();
  if (!existing.empty) return { alreadyReported: true };

  await firestore.collection('reports').add({
    storyId,
    reporterUid,
    authorUid,
    reason,
    status: 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { alreadyReported: false };
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
