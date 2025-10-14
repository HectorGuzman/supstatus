import { Router } from 'express';
import type { Request, Response } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import type { Timestamp } from 'firebase-admin/firestore';
import { authenticate } from '../middleware/authenticate.js';
import { createSession, deleteSession, listSessions, type SessionPayload } from '../services/firestore.js';

const router = Router();

function decodedFromReq(req: Request) {
  return (req as Request & { user?: DecodedIdToken }).user;
}

function sanitizeNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function sanitizeString(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function sanitizeTrackPoints(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const points = value
    .map((point) => {
      const lat = typeof point?.lat === 'number' ? point.lat : undefined;
      const lon = typeof point?.lon === 'number' ? point.lon : undefined;
      const timestamp = typeof point?.timestamp === 'number' ? point.timestamp : Date.now();
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      return { lat, lon, timestamp };
    })
    .filter((point): point is { lat: number; lon: number; timestamp: number } => point !== null);
  if (!points.length) return undefined;
  return points.slice(0, 500);
}

type FirestoreTimestamp = Timestamp & { toDate: () => Date };

function serializeSession(doc: Record<string, unknown> & { id?: string }) {
  if (!doc) return null;
  const toIso = (value: unknown) => {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (typeof (value as FirestoreTimestamp)?.toDate === 'function') {
      return (value as FirestoreTimestamp).toDate().toISOString();
    }
    return null;
  };
  return {
    id: doc.id,
    title: doc.title || null,
    spot: doc.spot || null,
    distanceKm: doc.distanceKm ?? null,
    durationMin: doc.durationMin ?? null,
    conditionsNote: doc.conditionsNote || null,
    trackPoints: Array.isArray(doc.trackPoints) ? doc.trackPoints : undefined,
    startedAt: toIso(doc.startedAt),
    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
  };
}

router.get('/me', authenticate, async (req: Request, res: Response) => {
  const decoded = decodedFromReq(req);
  if (!decoded?.uid) {
    return res.status(400).json({ error: 'UID no disponible en el token.' });
  }
  try {
    const sessions = await listSessions(decoded.uid);
    res.json({ sessions: sessions.map((session) => serializeSession(session)).filter(Boolean) });
  } catch (error) {
    console.error('[sessions] error listing sessions', error);
    res.status(500).json({ error: 'No se pudieron obtener tus remadas.' });
  }
});

router.post('/me', authenticate, async (req: Request, res: Response) => {
  const decoded = decodedFromReq(req);
  if (!decoded?.uid) {
    return res.status(400).json({ error: 'UID no disponible en el token.' });
  }
  const body = req.body ?? {};
  const distanceKm = sanitizeNumber(body.distanceKm);
  const durationMin = sanitizeNumber(body.durationMin);
  const spot = sanitizeString(body.spot);
  const notes = sanitizeString(body.conditionsNote || body.notes);
  const startedAtRaw = sanitizeString(body.startedAt);
  const trackPoints = sanitizeTrackPoints(body.trackPoints || body.track);
  if (!distanceKm && !durationMin && !trackPoints) {
    return res.status(400).json({ error: 'Registra al menos distancia, duración o un seguimiento.' });
  }
  const payload: SessionPayload = {};
  if (distanceKm && distanceKm > 0) payload.distanceKm = Number(distanceKm.toFixed(3));
  if (durationMin && durationMin > 0) payload.durationMin = Number(durationMin.toFixed(2));
  if (spot) payload.spot = spot;
  if (notes) payload.conditionsNote = notes;
  if (startedAtRaw) {
    const startDate = new Date(startedAtRaw);
    if (!Number.isNaN(startDate.getTime())) {
      payload.startedAt = startDate;
    }
  }
  if (trackPoints) {
    payload.trackPoints = trackPoints;
  }

  try {
    const session = await createSession(decoded.uid, payload);
    res.json({ session: serializeSession(session) });
  } catch (error) {
    console.error('[sessions] error creating session', error);
    res.status(500).json({ error: 'No se pudo guardar la remada.' });
  }
});

router.delete('/me/:sessionId', authenticate, async (req: Request, res: Response) => {
  const decoded = decodedFromReq(req);
  if (!decoded?.uid) {
    return res.status(400).json({ error: 'UID no disponible en el token.' });
  }
  const { sessionId } = req.params;
  try {
    const removed = await deleteSession(decoded.uid, sessionId);
    if (!removed) {
      return res.status(404).json({ error: 'Remada no encontrada.' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('[sessions] error deleting session', error);
    res.status(500).json({ error: 'No se pudo eliminar la remada.' });
  }
});

export default router;
