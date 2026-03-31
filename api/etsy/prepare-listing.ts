import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../lib/supabase/server.js';
import { downloadAndUploadEtsyImage } from '../../lib/etsy/prepare-etsy-image.js';
import { matchProductType } from '../../lib/etsy/match-product-type.js';
import { initSentry, Sentry } from '../../lib/sentry.js';

const STATUS_NEW = 'ac083a90-43fa-4ff5-a62d-5cd6bb5edbcc';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  initSentry();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id, etsy_listing_id } = req.body;

    if (!user_id || !etsy_listing_id) {
      return res.status(400).json({ error: 'Missing required fields: user_id, etsy_listing_id' });
    }

    console.info(`[prepare-listing] user=${user_id} etsy_listing=${etsy_listing_id}`);

    // ── 1. Fetch and validate ownership ─────────────────
    const { data: etsyListing, error: fetchErr } = await supabaseAdmin
      .from('etsy_listings')
      .select('id, etsy_listing_id, listing_id, original_title, original_description, original_image_url, user_id, etsy_category')
      .eq('id', etsy_listing_id)
      .single();

    if (fetchErr || !etsyListing) {
      return res.status(404).json({ error: 'Etsy listing not found' });
    }

    if (etsyListing.user_id !== user_id) {
      return res.status(403).json({ error: 'Listing does not belong to this user' });
    }

    // ── 2. Idempotent: return existing if already prepared ─
    if (etsyListing.listing_id) {
      const { data: existing } = await supabaseAdmin
        .from('listings')
        .select('id, image_url')
        .eq('id', etsyListing.listing_id)
        .single();

      if (existing) {
        console.info(`[prepare-listing] Already prepared: listing_id=${existing.id}`);
        return res.json({ listing_id: existing.id, image_url: existing.image_url });
      }
    }

    // ── 3. Download + upload image ──────────────────────
    let imageUrl = '';
    if (etsyListing.original_image_url) {
      imageUrl = await downloadAndUploadEtsyImage(etsyListing.original_image_url, user_id);
      console.info('[prepare-listing] Image uploaded to storage');
    }

    // ── 4. Match product type from Etsy category ──────
    let productTypeId: string | null = null;
    try {
      productTypeId = await matchProductType(etsyListing.etsy_category, user_id);
    } catch (err) {
      console.warn('[prepare-listing] Product type matching failed, continuing:', (err as Error).message);
    }

    // ── 5. Create listings row ──────────────────────────
    const { data: listing, error: insertErr } = await supabaseAdmin
      .from('listings')
      .insert({
        user_id,
        title: etsyListing.original_title,
        user_description: null,
        image_url: imageUrl,
        status_id: STATUS_NEW,
        is_image_analysed: false,
        source: 'etsy',
        ...(productTypeId ? { product_type_id: productTypeId } : {}),
      })
      .select('id, image_url')
      .single();

    if (insertErr || !listing) {
      throw new Error(`Failed to create listing: ${insertErr?.message}`);
    }

    // ── 5. Link back to etsy_listings ───────────────────
    await supabaseAdmin
      .from('etsy_listings')
      .update({ listing_id: listing.id })
      .eq('id', etsy_listing_id);

    console.info(`[prepare-listing] Done: listing_id=${listing.id}`);

    return res.json({ listing_id: listing.id, image_url: listing.image_url });
  } catch (error: unknown) {
    Sentry.captureException(error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [prepare-listing] Error:', message);
    return res.status(500).json({ error: 'Failed to prepare listing', details: message });
  }
}
