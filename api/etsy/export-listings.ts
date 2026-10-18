import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../lib/supabase/server.js';
import { getActiveConnection, EtsyConnectionError } from '../../lib/etsy/get-connection.js';
import { processEtsyExportItem, toErrorMessage, type ExportMode, type ExportRequestItem } from '../../lib/etsy/process-etsy-export.js';
import { initSentry, Sentry } from '../../lib/sentry.js';
import { verifyRequestUser, AuthError } from '../../lib/auth/verify-request-user.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  initSentry();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { listings, mode = 'preflight', allow_partial = false, confirmed = false } = req.body;
    const user = await verifyRequestUser(req.headers.authorization, supabaseAdmin);
    if (!Array.isArray(listings) || listings.length === 0) {
      return res.status(400).json({ error: 'Missing or empty listings array' });
    }
    if (listings.length > 5) return res.status(400).json({ error: 'Maximum 5 listings per export request' });
    if (mode !== 'preflight' && mode !== 'execute') return res.status(400).json({ error: 'Invalid export mode' });

    let connection;
    try {
      connection = await getActiveConnection(user.id, supabaseAdmin);
    } catch (error: unknown) {
      if (error instanceof EtsyConnectionError) {
        if (error.code === 'NO_CONNECTION') return res.status(409).json({ error: 'No Etsy shop connected', code: 'NO_ETSY_CONNECTION' });
        if (error.code === 'REFRESH_FAILED') return res.status(401).json({ error: 'Etsy session expired. Please reconnect your shop.', code: 'ETSY_REFRESH_FAILED' });
        Sentry.captureException(error);
        return res.status(500).json({ error: 'Failed to load Etsy connection' });
      }
      throw error;
    }

    const results = [];
    for (const item of listings as ExportRequestItem[]) {
      try {
        results.push(await processEtsyExportItem({
          db: supabaseAdmin, connection, userId: user.id, item,
          mode: mode as ExportMode, allowPartial: Boolean(allow_partial), confirmed: Boolean(confirmed),
        }));
      } catch (error: unknown) {
        const message = toErrorMessage(error);
        console.error(`[export-listings] Failed for ${item?.etsy_listing_id}:`, message);
        results.push({ etsy_listing_id: item?.etsy_listing_id, status: 'error', fields: {}, fields_to_publish: [], error: message });
      }
    }
    const successful = results.filter((result: any) => ['success', 'partial'].includes(result.status)).length;
    return res.json({ results, summary: { total: results.length, success: successful, errors: results.length - successful } });
  } catch (error: unknown) {
    if (error instanceof AuthError) return res.status(error.status).json({ error: error.message });
    Sentry.captureException(error);
    const message = toErrorMessage(error);
    console.error('[export-listings] Error:', message);
    return res.status(500).json({ error: 'Failed to export listings', details: message });
  }
}
