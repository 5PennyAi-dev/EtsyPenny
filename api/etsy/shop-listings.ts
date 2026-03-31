import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchShopListings } from '../../lib/etsy/etsy-client.js';
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

    // Personal access phase: use env var shop ID
    const shopId = process.env.ETSY_SHOP_ID;
    if (!shopId) {
      return res.status(500).json({ error: 'ETSY_SHOP_ID not configured' });
    }

    console.info(`[shop-listings] user=${user_id} limit=${limit} offset=${offset}`);

    const data = await fetchShopListings(shopId, { limit, offset, state });

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
