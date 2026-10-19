import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../lib/supabase/server.js';
import { downloadAndUploadEtsyImage } from '../../lib/etsy/prepare-etsy-image.js';
import { matchProductType } from '../../lib/etsy/match-product-type.js';
import { getOrCreateCanonicalEtsyListing } from '../../lib/etsy/get-or-create-canonical-listing.js';
import { initSentry, Sentry } from '../../lib/sentry.js';
import { verifyRequestUser, AuthError } from '../../lib/auth/verify-request-user.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  initSentry();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { etsy_listing_id } = req.body;
    const user = await verifyRequestUser(req.headers.authorization, supabaseAdmin);
    const user_id = user.id;

    if (!etsy_listing_id) {
      return res.status(400).json({ error: 'Missing required field: etsy_listing_id' });
    }

    console.info(`[prepare-listing] user=${user_id} etsy_listing=${etsy_listing_id}`);

    // ── 1. Fetch and validate ownership ─────────────────
    const { data: etsyListing, error: fetchErr } = await supabaseAdmin
      .from('etsy_listings')
      .select('id, etsy_listing_id, listing_id, original_title, original_description, original_image_url, user_id, etsy_category')
      .eq('id', etsy_listing_id)
      .eq('user_id', user_id)
      .single();

    if (fetchErr || !etsyListing) {
      return res.status(404).json({ error: 'Etsy listing not found' });
    }

    // ── 2. Idempotent: return existing if already prepared ─
    if (etsyListing.listing_id) {
      const { data: existing } = await supabaseAdmin
        .from('listings')
        .select('id, image_url')
        .eq('id', etsyListing.listing_id)
        .eq('user_id', user_id)
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

    // ── 5. Resolve the canonical PennySEO listing atomically ─
    // External image/type work stays outside the short SQL row lock. A racing
    // scorer/preparer can therefore reuse the winner instead of creating a
    // second listings row.
    const listing = await getOrCreateCanonicalEtsyListing({
      etsyListingRowId: etsyListing.id,
      userId: user_id,
      title: etsyListing.original_title,
      imageUrl,
      productTypeId,
    });

    console.info(`[prepare-listing] ${listing.created ? 'Created' : 'Reused'} canonical listing_id=${listing.listingId}`);

    return res.json({ listing_id: listing.listingId, image_url: listing.imageUrl });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return res.status(error.status).json({ error: error.message });
    }
    Sentry.captureException(error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [prepare-listing] Error:', message);
    return res.status(500).json({ error: 'Failed to prepare listing', details: message });
  }
}
