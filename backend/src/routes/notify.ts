import { Router } from 'express';
import type { Request, Response } from 'express';
import { ensureFirebase } from '../config/firebase.js';
import { sendPushNotification } from '../services/notifications.js';
import { env } from '../config/env.js';

const router = Router();

const GOOD_LEVELS = new Set(['Principiante', 'Intermedio']);
const DATA_BASE = 'https://raw.githubusercontent.com/HectorGuzman/supstatus/main';
const MORNING_HOURS = new Set(['07:00', '08:00', '09:00', '10:00', '11:00', '12:00']);

async function fetchSpotData(spotId: string): Promise<any | null> {
  try {
    const res = await fetch(`${DATA_BASE}/data-${spotId}.json?cb=${Date.now()}`);
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

function isGoodConditions(data: any): { good: boolean; summary: string } {
  const blocks: any[] = (data?.hoy ?? []).filter((b: any) => MORNING_HOURS.has(b.hora));
  if (!blocks.length) return { good: false, summary: '' };
  const goodBlocks = blocks.filter(b => GOOD_LEVELS.has(b.nivel));
  if (goodBlocks.length < 2) return { good: false, summary: '' };
  const first = goodBlocks[0];
  const wind = first.viento ?? '';
  const wave = first.oleaje ?? '';
  const summary = `Viento ${wind}, oleaje ${wave} — ¡Buen momento para remar! 🏄`;
  return { good: true, summary };
}

// POST /v1/notify/daily-forecast
// Called by Cloud Scheduler — protected by a shared secret header
router.post('/daily-forecast', async (req: Request, res: Response) => {
  const secret = req.headers['x-notify-secret'];
  if (secret !== env.notifySecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const admin = ensureFirebase();
  const db = admin.firestore();

  try {
    // Get all users with fcmToken and favSpot
    const snapshot = await db.collection('users')
      .where('fcmToken', '!=', null)
      .get();

    const bySpot = new Map<string, { uid: string; token: string }[]>();
    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (!data.fcmToken || !data.favSpot) continue;
      if (!bySpot.has(data.favSpot)) bySpot.set(data.favSpot, []);
      bySpot.get(data.favSpot)!.push({ uid: doc.id, token: data.fcmToken });
    }

    let sent = 0;
    for (const [spotId, users] of bySpot.entries()) {
      const spotData = await fetchSpotData(spotId);
      if (!spotData) continue;
      const { good, summary } = isGoodConditions(spotData);
      if (!good) continue;

      const spotName = spotData.spot ?? spotId;
      await Promise.all(users.map(u =>
        sendPushNotification(u.token, `🌊 ${spotName} hoy`, summary, { type: 'forecast', spotId })
      ));
      sent += users.length;
    }

    res.json({ ok: true, sent });
  } catch (err) {
    console.error('[notify] daily-forecast error', err);
    res.status(500).json({ error: 'Error al enviar notificaciones.' });
  }
});

export default router;
