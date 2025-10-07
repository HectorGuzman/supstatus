import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { getUserProfile, upsertUserProfile } from '../services/firestore.js';

const router = Router();

router.get('/me', authenticate, async (req: Request, res: Response) => {
  const decoded = (req as Request & { user?: { uid: string } }).user;
  if (!decoded?.uid) {
    return res.status(400).json({ error: 'UID no disponible en el token.' });
  }
  try {
    const profile = await getUserProfile(decoded.uid);
    res.json({ profile });
  } catch (error) {
    console.error('[profile] error fetching profile', error);
    res.status(500).json({ error: 'No se pudo obtener el perfil.' });
  }
});

router.post('/me', authenticate, async (req: Request, res: Response) => {
  const decoded = (req as Request & { user?: { uid: string } }).user;
  if (!decoded?.uid) {
    return res.status(400).json({ error: 'UID no disponible en el token.' });
  }
  try {
    const profile = await upsertUserProfile(decoded.uid, req.body);
    res.json({ profile });
  } catch (error) {
    console.error('[profile] error updating profile', error);
    res.status(500).json({ error: 'No se pudo actualizar el perfil.' });
  }
});

export default router;
