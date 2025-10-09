import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { ensureFirebase } from './config/firebase.js';
import profileRouter from './routes/profile.js';
import storiesRouter from './routes/stories.js';

ensureFirebase();

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
  }),
);
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/v1/ping', (_req, res) => {
  res.json({ message: 'pong', timestamp: Date.now() });
});

app.use('/v1/profile', profileRouter);
app.use('/v1/stories', storiesRouter);

export default app;
