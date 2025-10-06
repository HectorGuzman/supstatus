import { Request, Response, NextFunction } from 'express';
import { ensureFirebase } from '../config/firebase.js';

const admin = ensureFirebase();

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  const token = header.replace('Bearer ', '').trim();

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    // Attach decoded token so downstream handlers can access user info
    (req as Request & { user?: typeof decoded }).user = decoded;
    return next();
  } catch (error) {
    console.error('[auth] Token verification failed', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
