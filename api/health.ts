import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initSentry, Sentry } from '../lib/sentry.js';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  initSentry();
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
}
