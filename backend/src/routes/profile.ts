import { Router } from 'express';
import type { Request, Response } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { authenticate } from '../middleware/authenticate.js';
import { env } from '../config/env.js';
import { getUserProfile, upsertUserProfile, listAllProfiles, listSessions } from '../services/firestore.js';

interface SessionRecord {
  id?: string;
  distanceKm?: number;
  durationMin?: number;
}

const router = Router();

function isAdmin(decoded?: DecodedIdToken | null) {
  const email = decoded?.email?.toLowerCase();
  return !!email && env.adminEmails.includes(email);
}

router.get('/me', authenticate, async (req: Request, res: Response) => {
  const decoded = (req as Request & { user?: DecodedIdToken }).user;
  if (!decoded?.uid) {
    return res.status(400).json({ error: 'UID no disponible en el token.' });
  }
  try {
    const profileDoc = await getUserProfile(decoded.uid);
    const profile = { ...(profileDoc || {}), email: decoded.email || (profileDoc?.email ?? undefined) };
    res.json({ profile, isAdmin: isAdmin(decoded) });
  } catch (error) {
    console.error('[profile] error fetching profile', error);
    res.status(500).json({ error: 'No se pudo obtener el perfil.' });
  }
});

router.post('/me', authenticate, async (req: Request, res: Response) => {
  const decoded = (req as Request & { user?: DecodedIdToken }).user;
  if (!decoded?.uid) {
    return res.status(400).json({ error: 'UID no disponible en el token.' });
  }
  try {
    const payload = { ...req.body, email: decoded.email || req.body.email };
    const profileDoc = await upsertUserProfile(decoded.uid, payload);
    const profile = { ...(profileDoc || {}), email: decoded.email || (profileDoc?.email ?? undefined) };
    let sessionsSummary: { totalKm: number; totalDurationMin: number; totalSessions: number } | null = null;
    try {
      const sessions = (await listSessions(decoded.uid)) as SessionRecord[];
      const totalSessions = sessions.length;
      const totalKm = sessions.reduce((acc, session) => acc + (Number(session.distanceKm) || 0), 0);
      const totalDuration = sessions.reduce((acc, session) => acc + (Number(session.durationMin) || 0), 0);
      sessionsSummary = {
        totalKm: Number(totalKm.toFixed(3)),
        totalDurationMin: Number(totalDuration.toFixed(2)),
        totalSessions,
      };
    } catch (error) {
      console.warn('[profile] could not compute session summary', error);
    }
    res.json({ profile, isAdmin: isAdmin(decoded), sessionsSummary });
  } catch (error) {
    console.error('[profile] error updating profile', error);
    res.status(500).json({ error: 'No se pudo actualizar el perfil.' });
  }
});

router.get('/all', authenticate, async (req: Request, res: Response) => {
  const decoded = (req as Request & { user?: DecodedIdToken }).user;
  if (!isAdmin(decoded)) {
    return res.status(403).json({ error: 'No autorizado.' });
  }
  try {
    const profiles = await listAllProfiles();
    res.json({ profiles });
  } catch (error) {
    console.error('[profile] error listing profiles', error);
    res.status(500).json({ error: 'No se pudo listar los perfiles.' });
  }
});

export default router;
