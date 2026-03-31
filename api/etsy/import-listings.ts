import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../lib/supabase/server.js';
import { fetchListingsByIds } from '../../lib/etsy/etsy-client.js';
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
    const etsyListings = await fetchListingsByIds(idsToImport);

    // ── 4. Get or create shop connection ───────────────
    const shopId = process.env.ETSY_SHOP_ID;
    if (!shopId) {
      return res.status(500).json({ error: 'ETSY_SHOP_ID not configured' });
    }

    const { data: connection } = await supabaseAdmin
      .from('etsy_shop_connections')
      .upsert(
        {
          user_id,
          etsy_shop_id: Number(shopId),
          shop_name: 'My Etsy Shop',
          is_active: true,
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,etsy_shop_id' },
      )
      .select('id')
      .single();

    if (!connection) {
      return res.status(500).json({ error: 'Failed to create shop connection' });
    }

    // ── 5. Insert etsy_listings rows ───────────────────
    const rows = etsyListings.map((listing) => {
      const primaryImage = listing.images?.find((img) => img.rank === 1) ?? listing.images?.[0];
      return {
        user_id,
        connection_id: connection.id,
        etsy_listing_id: listing.listing_id,
        original_title: listing.title,
        original_description: listing.description,
        original_tags: listing.tags ?? [],
        original_image_url: primaryImage?.url_fullxfull ?? null,
        thumbnail_url: primaryImage?.url_570xN ?? null,
        etsy_url: listing.url,
        etsy_state: listing.state,
        tag_count: listing.tags?.length ?? 0,
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
