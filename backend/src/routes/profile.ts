import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

router.get('/me', authenticate, (req: Request, res: Response) => {
  const user = (req as Request & { user?: unknown }).user;
  res.json({ user });
});

export default router;
