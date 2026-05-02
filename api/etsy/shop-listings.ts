import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../lib/supabase/server.js';
import { fetchShopListings } from '../../lib/etsy/etsy-client.js';
import { getActiveConnection, EtsyConnectionError } from '../../lib/etsy/get-connection.js';
import { initSentry, Sentry } from '../../lib/sentry.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  initSentry();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user_id = req.query.user_id as string;
    if (!user_id) {
      return res.status(400).json({ error: 'Missing required query param: user_id' });
    }

    const limit = Math.min(Number(req.query.limit) || 25, 100);
    const offset = Number(req.query.offset) || 0;
    const state = (req.query.state as string) || 'active';

    let connection;
    try {
      connection = await getActiveConnection(user_id, supabaseAdmin);
    } catch (err: unknown) {
      if (err instanceof EtsyConnectionError) {
        if (err.code === 'NO_CONNECTION') {
          return res.status(409).json({ error: 'No Etsy shop connected', code: 'NO_ETSY_CONNECTION' });
        }
        if (err.code === 'REFRESH_FAILED') {
          return res.status(401).json({
            error: 'Etsy session expired. Please reconnect your shop.',
            code: 'ETSY_REFRESH_FAILED',
          });
        }
        Sentry.captureException(err);
        return res.status(500).json({ error: 'Failed to load Etsy connection' });
      }
      throw err;
    }

    console.info(`[shop-listings] user=${user_id} limit=${limit} offset=${offset}`);

    const data = await fetchShopListings(connection, { limit, offset, state });

    const results = data.results.map((listing) => {
      const primaryImage = listing.images?.find((img) => img.rank === 1) ?? listing.images?.[0];
      return {
        etsy_listing_id: listing.listing_id,
        title: listing.title,
        description: listing.description,
        tags: listing.tags,
        tag_count: listing.tags?.length ?? 0,
        image_url: primaryImage?.url_fullxfull ?? null,
        thumbnail_url: primaryImage?.url_570xN ?? null,
        etsy_url: listing.url,
        state: listing.state,
      };
    });

    return res.json({ count: data.count, results });
  } catch (error: unknown) {
    Sentry.captureException(error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [shop-listings] Error:', message);
    return res.status(500).json({ error: 'Failed to fetch shop listings', details: message });
  }
}
