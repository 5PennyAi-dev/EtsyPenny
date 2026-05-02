import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../lib/supabase/server.js';
import { fetchListingsByIds, getSellerTaxonomyNodes } from '../../lib/etsy/etsy-client.js';
import { getActiveConnection, EtsyConnectionError } from '../../lib/etsy/get-connection.js';
import { initSentry, Sentry } from '../../lib/sentry.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  initSentry();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id, etsy_listing_ids } = req.body;

    if (!user_id || !Array.isArray(etsy_listing_ids) || etsy_listing_ids.length === 0) {
      return res.status(400).json({ error: 'Missing required fields: user_id, etsy_listing_ids (non-empty array)' });
    }

    console.info(`[import-listings] user=${user_id} requested=${etsy_listing_ids.length}`);

    let etsyConnection;
    try {
      etsyConnection = await getActiveConnection(user_id, supabaseAdmin);
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

    // ── 1. Check import limit ──────────────────────────
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('subscription_plan')
      .eq('id', user_id)
      .single();

    const { data: plan } = await supabaseAdmin
      .from('plans')
      .select('etsy_import_limit')
      .eq('id', profile?.subscription_plan ?? 'free')
      .single();

    const importLimit = plan?.etsy_import_limit ?? 10;

    const { count: existingCount } = await supabaseAdmin
      .from('etsy_listings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user_id);

    const currentCount = existingCount ?? 0;
    const remaining = Math.max(0, importLimit - currentCount);

    console.info(`[import-listings] Plan: ${profile?.subscription_plan ?? 'null'}, Limit: ${importLimit}, Used: ${currentCount}, Remaining: ${remaining}, Requesting: ${etsy_listing_ids.length}`);

    if (remaining === 0) {
      return res.status(402).json({
        error: 'Etsy import limit reached for your plan',
        limit: importLimit,
        used: currentCount,
      });
    }

    // ── 2. Filter out already-imported listings ────────
    const { data: existing } = await supabaseAdmin
      .from('etsy_listings')
      .select('etsy_listing_id')
      .eq('user_id', user_id)
      .in('etsy_listing_id', etsy_listing_ids);

    const existingIds = new Set((existing ?? []).map((r) => r.etsy_listing_id));
    const newIds = etsy_listing_ids.filter((id: number) => !existingIds.has(id));
    const skipped = etsy_listing_ids.length - newIds.length;

    // Enforce remaining limit
    const idsToImport = newIds.slice(0, remaining);

    if (idsToImport.length === 0) {
      return res.json({ imported: 0, skipped, limit_remaining: remaining, listings: [] });
    }

    // ── 3. Fetch full details from Etsy ────────────────
    const etsyListings = await fetchListingsByIds(etsyConnection, idsToImport);

    // ── 4. Touch connection's last_synced_at (row already exists, owned by oauth/exchange) ──
    await supabaseAdmin
      .from('etsy_shop_connections')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', etsyConnection.id);

    // ── 5. Resolve Etsy taxonomy for category mapping ───
    let taxonomyMap: Map<number, string> = new Map();
    try {
      taxonomyMap = await getSellerTaxonomyNodes(etsyConnection);
    } catch (err) {
      console.warn('[import-listings] Failed to fetch taxonomy nodes, continuing without:', (err as Error).message);
    }

    // ── 6. Insert etsy_listings rows ───────────────────
    const rows = etsyListings.map((listing) => {
      const primaryImage = listing.images?.find((img) => img.rank === 1) ?? listing.images?.[0];
      return {
        user_id,
        connection_id: etsyConnection.id,
        etsy_listing_id: listing.listing_id,
        original_title: listing.title,
        original_description: listing.description,
        original_tags: listing.tags ?? [],
        original_image_url: primaryImage?.url_fullxfull ?? null,
        thumbnail_url: primaryImage?.url_570xN ?? null,
        etsy_url: listing.url,
        etsy_state: listing.state,
        tag_count: listing.tags?.length ?? 0,
        taxonomy_id: listing.taxonomy_id ?? null,
        etsy_category: listing.taxonomy_id ? (taxonomyMap.get(listing.taxonomy_id) ?? null) : null,
      };
    });

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('etsy_listings')
      .insert(rows)
      .select();

    if (insertError) throw insertError;

    const imported = inserted?.length ?? 0;
    console.info(`[import-listings] ✅ imported=${imported} skipped=${skipped}`);

    return res.json({
      imported,
      skipped,
      limit_remaining: remaining - imported,
      listings: inserted,
    });
  } catch (error: unknown) {
    Sentry.captureException(error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [import-listings] Error:', message);
    return res.status(500).json({ error: 'Failed to import listings', details: message });
  }
}
