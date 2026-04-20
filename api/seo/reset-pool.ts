import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runResetPool } from '../../lib/seo/run-reset-pool.js';
import { initSentry, Sentry } from '../../lib/sentry.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  initSentry();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { listing_id } = req.body;
    if (!listing_id) {
      return res.status(400).json({ error: 'Missing listing_id' });
    }

    console.info(`[reset-pool] listing=${listing_id}`);

    const result = await runResetPool(listing_id, req.body.parameters || {});

    console.info(`[reset-pool] complete listing=${listing_id} processed=${result.processed}`);
    return res.json({ success: true, ...result });

  } catch (error: unknown) {
    Sentry.captureException(error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [reset-pool] Error:', message);
    if (message === 'No keywords found for this listing') {
      return res.status(404).json({ error: message });
    }
    return res.status(500).json({ error: 'Failed to reset pool.', details: message });
  }
}
