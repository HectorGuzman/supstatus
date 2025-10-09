import { Router } from 'express';
import type { Request, Response } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { ensureFirebase } from '../config/firebase.js';
import { authenticate } from '../middleware/authenticate.js';
import { env } from '../config/env.js';
import {
  getUserStory,
  listAllStories,
  listPublishedStories,
  toggleStoryLike,
  updateStoryAdmin,
  upsertUserStory,
  type StoryPayload,
  type StoryStatus,
} from '../services/stories.js';

const router = Router();

function decodedFromReq(req: Request) {
  return (req as Request & { user?: DecodedIdToken }).user;
}

async function decodeOptionalAuth(req: Request) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return null;
  }
  const token = header.replace('Bearer ', '').trim();
  try {
    const admin = ensureFirebase();
    const decoded = await admin.auth().verifyIdToken(token);
    return decoded;
  } catch (error) {
    console.warn('[stories] optional token invalid', error);
    return null;
  }
}

function isAdmin(decoded?: DecodedIdToken | null) {
  const email = decoded?.email?.toLowerCase();
  return !!email && env.adminEmails.includes(email);
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const decoded = await decodeOptionalAuth(req);
    const stories = await listPublishedStories(20, decoded?.uid || null);
    res.json({ stories });
  } catch (error) {
    console.error('[stories] error listing published stories', error);
    res.status(500).json({ error: 'No se pudieron cargar las historias.' });
  }
});

router.get('/me', authenticate, async (req: Request, res: Response) => {
  const decoded = decodedFromReq(req);
  if (!decoded?.uid) {
    return res.status(400).json({ error: 'UID no disponible en el token.' });
  }
  try {
    const story = await getUserStory(decoded.uid);
    res.json({ story });
  } catch (error) {
    console.error('[stories] error fetching user story', error);
    res.status(500).json({ error: 'No se pudo obtener tu historia.' });
  }
});

router.post('/me', authenticate, async (req: Request, res: Response) => {
  const decoded = decodedFromReq(req);
  if (!decoded?.uid) {
    return res.status(400).json({ error: 'UID no disponible en el token.' });
  }

  const payload = req.body as StoryPayload;
  const bodyText = typeof payload?.body === 'string' ? payload.body.trim() : '';
  if (bodyText.length < 10) {
    return res.status(400).json({ error: 'Cuéntanos cómo te fue con al menos 10 caracteres.' });
  }

  const mediaUrl = typeof payload?.mediaUrl === 'string' ? payload.mediaUrl.trim() : undefined;

  try {
    const story = await upsertUserStory(
      decoded.uid,
      {
        body: bodyText,
        mediaUrl,
      },
      {
        displayName: decoded.name || decoded.displayName || null,
        email: decoded.email || null,
      },
    );
    res.json({ story });
  } catch (error) {
    console.error('[stories] error upserting story', error);
    res.status(500).json({ error: 'No se pudo guardar la historia.' });
  }
});

router.get('/admin', authenticate, async (req: Request, res: Response) => {
  const decoded = decodedFromReq(req);
  if (!isAdmin(decoded)) {
    return res.status(403).json({ error: 'No autorizado.' });
  }
  const statusParam = typeof req.query.status === 'string' ? (req.query.status.trim() as StoryStatus) : undefined;
  try {
    const stories = await listAllStories(statusParam);
    res.json({ stories });
  } catch (error) {
    console.error('[stories] error listing admin stories', error);
    res.status(500).json({ error: 'No se pudieron cargar las historias.' });
  }
});

router.post('/:storyId/status', authenticate, async (req: Request, res: Response) => {
  const decoded = decodedFromReq(req);
  if (!isAdmin(decoded)) {
    return res.status(403).json({ error: 'No autorizado.' });
  }
  const { storyId } = req.params;
  const body = req.body as { status?: StoryStatus; featured?: boolean };
  try {
    const story = await updateStoryAdmin(storyId, {
      status: body.status,
      featured: typeof body.featured === 'boolean' ? body.featured : undefined,
    });
    if (!story) {
      return res.status(404).json({ error: 'Historia no encontrada.' });
    }
    res.json({ story });
  } catch (error) {
    console.error('[stories] error updating story status', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'No se pudo actualizar la historia.' });
  }
});

router.post('/:storyId/like', authenticate, async (req: Request, res: Response) => {
  const decoded = decodedFromReq(req);
  if (!decoded?.uid) {
    return res.status(400).json({ error: 'UID no disponible en el token.' });
  }
  const { storyId } = req.params;
  try {
    const result = await toggleStoryLike(storyId, decoded.uid);
    if (!result.story) {
      return res.status(404).json({ error: 'Historia no encontrada.' });
    }
    res.json({ story: result.story, liked: result.liked, likes: result.likes });
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_FOUND') {
      return res.status(404).json({ error: 'Historia no encontrada.' });
    }
    console.error('[stories] error toggling like', error);
    res.status(500).json({ error: 'No se pudo registrar el me gusta.' });
  }
});

export default router;
