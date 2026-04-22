import { Router } from 'express';
import type { Request, Response } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { authenticateAny } from '../middleware/authenticate.js';
import { ensureFirebase } from '../config/firebase.js';
import { getUserProfile, listSessions } from '../services/firestore.js';
import { sendPushNotification, getUserFcmToken } from '../services/notifications.js';

const router = Router();

function uid(req: Request): string | undefined {
  return (req as Request & { user?: DecodedIdToken }).user?.uid;
}

// GET /v1/users/following — list UIDs the current user follows
router.get('/following', authenticateAny, async (req: Request, res: Response) => {
  const me = uid(req);
  if (!me) return res.status(400).json({ error: 'UID no disponible.' });
  try {
    const admin = ensureFirebase();
    const snap = await admin.firestore()
      .collection('follows')
      .where('followerUid', '==', me)
      .limit(500)
      .get();
    const following = snap.docs.map(d => d.data().targetUid as string);
    res.json({ following });
  } catch (err) {
    console.error('[users] error listing following', err);
    res.status(500).json({ error: 'No se pudo obtener la lista.' });
  }
});

// GET /v1/users?q=term — search users by displayName prefix, or return suggestions if no query
router.get('/', authenticateAny, async (req: Request, res: Response) => {
  const me = uid(req);
  const q = (typeof req.query.q === 'string' ? req.query.q : '').trim();
  try {
    const admin = ensureFirebase();
    const db = admin.firestore();

    let snap;
    if (q.length >= 2) {
      snap = await db.collection('users')
        .where('displayName', '>=', q)
        .where('displayName', '<=', q + '\uf8ff')
        .limit(20)
        .get();
    } else {
      // Return suggested users — try orderBy followersCount, fallback to plain limit
      try {
        snap = await db.collection('users')
          .orderBy('followersCount', 'desc')
          .limit(10)
          .get();
      } catch {
        snap = await db.collection('users').limit(10).get();
      }
    }

    const followSnap = me
      ? await db.collection('follows').where('followerUid', '==', me).get()
      : null;
    const followingSet = new Set(followSnap?.docs.map(d => d.data().targetUid as string) ?? []);

    const users = snap.docs
      .filter(doc => doc.id !== me)
      .map(doc => {
        const data = doc.data();
        return {
          uid: doc.id,
          displayName: data.displayName ?? '',
          avatarUrl: data.avatarUrl ?? null,
          nivel: data.nivel ?? null,
          isFollowing: followingSet.has(doc.id),
        };
      });

    res.json({ users });
  } catch (err) {
    console.error('[users] search error', err);
    res.status(500).json({ error: 'Error al buscar usuarios.' });
  }
});

// POST /v1/users/:targetUid/follow
router.post('/:targetUid/follow', authenticateAny, async (req: Request, res: Response) => {
  const me = uid(req);
  const { targetUid } = req.params;
  if (!me) return res.status(400).json({ error: 'UID no disponible.' });
  if (me === targetUid) return res.status(400).json({ error: 'No puedes seguirte a ti mismo.' });

  try {
    const admin = ensureFirebase();
    const db = admin.firestore();
    const followRef = db.collection('follows').doc(`${me}_${targetUid}`);
    const existing = await followRef.get();
    if (existing.exists) return res.json({ following: true });

    const batch = db.batch();
    batch.set(followRef, {
      followerUid: me,
      targetUid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    batch.set(db.collection('users').doc(me), { followingCount: admin.firestore.FieldValue.increment(1) }, { merge: true });
    batch.set(db.collection('users').doc(targetUid), { followersCount: admin.firestore.FieldValue.increment(1) }, { merge: true });
    await batch.commit();
    res.json({ following: true });
    // Notify target user
    const token = await getUserFcmToken(targetUid);
    if (token) {
      const follower = await getUserProfile(me);
      const name = follower?.displayName || 'Alguien';
      sendPushNotification(token, '👤 Nuevo seguidor', `${name} comenzó a seguirte`, { type: 'follow', uid: me });
    }
  } catch (err) {
    console.error('[users] follow error', err);
    res.status(500).json({ error: 'No se pudo seguir al usuario.' });
  }
});

// DELETE /v1/users/:targetUid/follow
router.delete('/:targetUid/follow', authenticateAny, async (req: Request, res: Response) => {
  const me = uid(req);
  const { targetUid } = req.params;
  if (!me) return res.status(400).json({ error: 'UID no disponible.' });

  try {
    const admin = ensureFirebase();
    const db = admin.firestore();
    const followRef = db.collection('follows').doc(`${me}_${targetUid}`);
    const existing = await followRef.get();
    if (!existing.exists) return res.json({ following: false });

    const batch = db.batch();
    batch.delete(followRef);
    batch.set(db.collection('users').doc(me), { followingCount: admin.firestore.FieldValue.increment(-1) }, { merge: true });
    batch.set(db.collection('users').doc(targetUid), { followersCount: admin.firestore.FieldValue.increment(-1) }, { merge: true });
    await batch.commit();
    res.json({ following: false });
  } catch (err) {
    console.error('[users] unfollow error', err);
    res.status(500).json({ error: 'No se pudo dejar de seguir al usuario.' });
  }
});

// GET /v1/users/:uid/profile — public profile + session stats
router.get('/:uid/profile', authenticateAny, async (req: Request, res: Response) => {
  const { uid } = req.params;
  try {
    const profile = await getUserProfile(uid);
    if (!profile) return res.status(404).json({ error: 'Usuario no encontrado.' });

    const sessions = await listSessions(uid) as any[];
    const totalSessions = sessions.length;
    const totalKm = sessions.reduce((acc, s) => acc + (Number(s.distanceKm) || 0), 0);
    const totalDurationMin = sessions.reduce((acc, s) => acc + (Number(s.durationMin) || 0), 0);

    res.json({
      profile: {
        uid,
        displayName: profile.displayName ?? '',
        avatarUrl: profile.avatarUrl ?? null,
        bio: profile.bio ?? null,
        nivel: profile.nivel ?? null,
        disciplinas: profile.disciplinas ?? (profile.disciplina ? [profile.disciplina] : []),
        boardSetup: profile.boardSetup ?? null,
        goals: profile.goals ?? null,
        followersCount: profile.followersCount ?? 0,
        followingCount: profile.followingCount ?? 0,
      },
      stats: {
        totalSessions,
        totalKm: Number(totalKm.toFixed(1)),
        totalDurationMin: Number(totalDurationMin.toFixed(0)),
        totalHours: Number((totalDurationMin / 60).toFixed(1)),
      },
    });
  } catch (err) {
    console.error('[users] profile error', err);
    res.status(500).json({ error: 'No se pudo obtener el perfil.' });
  }
});

export default router;
