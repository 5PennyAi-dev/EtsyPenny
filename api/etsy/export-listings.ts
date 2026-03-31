import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../lib/supabase/server.js';
import { updateEtsyListing } from '../../lib/etsy/etsy-client.js';
import { initSentry, Sentry } from '../../lib/sentry.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  initSentry();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id, listings } = req.body;

    // ── 1. Validate input ───────────────────────────────
    if (!user_id) {
      return res.status(401).json({ error: 'Missing user_id' });
    }

    if (!Array.isArray(listings) || listings.length === 0) {
      return res.status(400).json({ error: 'Missing or empty listings array' });
    }

    if (listings.length > 5) {
      return res.status(400).json({ error: 'Maximum 5 listings per export request' });
    }

    console.info(`[export-listings] user=${user_id} requested=${listings.length}`);

    // ── 2. Process each listing sequentially ────────────
    const results: Array<{
      etsy_listing_id: number;
      status: 'success' | 'error';
      fields_exported: string[];
      error?: string;
    }> = [];

    for (const item of listings) {
      const { etsy_listing_id, listing_id, fields } = item;

      try {
        // ── 2a. Validate request fields ─────────────────
        if (!etsy_listing_id || !listing_id || !Array.isArray(fields) || fields.length === 0) {
          throw new Error('Invalid listing entry: requires etsy_listing_id, listing_id, and non-empty fields array');
        }

        const validFields = ['tags', 'title', 'description'];
        const invalidField = fields.find((f: string) => !validFields.includes(f));
        if (invalidField) {
          throw new Error(`Invalid field: "${invalidField}". Allowed: tags, title, description`);
        }

        // ── 2b. Validate ownership ──────────────────────
        const { data: etsyListing, error: elErr } = await supabaseAdmin
          .from('etsy_listings')
          .select('id, etsy_listing_id, listing_id, original_title, original_description, original_tags')
          .eq('etsy_listing_id', etsy_listing_id)
          .eq('user_id', user_id)
          .single();

        if (elErr || !etsyListing) {
          throw new Error('Etsy listing not found or not owned by this user');
        }

        // ── 2c. Fetch PennySEO listing data ─────────────
        const { data: pennyListing, error: plErr } = await supabaseAdmin
          .from('listings')
          .select('generated_title, generated_description')
          .eq('id', listing_id)
          .single();

        if (plErr || !pennyListing) {
          throw new Error('PennySEO listing not found');
        }

        // ── 2d. Validate optimization + build payload ───
        const exportPayload: { title?: string; description?: string; tags?: string[] } = {};
        const snapshotBefore: Record<string, any> = {};
        const snapshotAfter: Record<string, any> = {};

        if (fields.includes('title')) {
          if (!pennyListing.generated_title) {
            throw new Error('No generated title — run Magic Draft first');
          }
          exportPayload.title = pennyListing.generated_title.slice(0, 140);
          snapshotBefore.title = etsyListing.original_title;
          snapshotAfter.title = exportPayload.title;
        }

        if (fields.includes('description')) {
          if (!pennyListing.generated_description) {
            throw new Error('No generated description — run Magic Draft first');
          }
          exportPayload.description = pennyListing.generated_description;
          snapshotBefore.description = etsyListing.original_description;
          snapshotAfter.description = exportPayload.description;
        }

        if (fields.includes('tags')) {
          const { data: tagRows, error: tagErr } = await supabaseAdmin
            .from('listing_seo_stats')
            .select('tag')
            .eq('listing_id', listing_id)
            .eq('is_current_eval', true)
            .order('opportunity_score', { ascending: false })
            .limit(13);

          if (tagErr) throw tagErr;

          const tags = (tagRows || [])
            .map((r: any) => r.tag.trim())
            .filter((t: string) => t.length > 0 && t.length <= 20)
            .slice(0, 13);

          if (tags.length === 0) {
            throw new Error('No selected tags found — select tags in SEO Studio first');
          }

          exportPayload.tags = tags;
          snapshotBefore.tags = etsyListing.original_tags || [];
          snapshotAfter.tags = tags;
        }

        // ── 2e. Call Etsy API ───────────────────────────
        const etsyResult = await updateEtsyListing(etsy_listing_id, exportPayload);

        if (!etsyResult.success) {
          throw new Error(etsyResult.error || 'Etsy API call failed');
        }

        // ── 2f. Log success ─────────────────────────────
        await supabaseAdmin.from('etsy_export_logs').insert({
          user_id,
          etsy_listing_id,
          listing_id,
          fields_exported: fields,
          snapshot_before: snapshotBefore,
          snapshot_after: snapshotAfter,
          status: 'success',
        });

        // ── 2g. Update etsy_listings status ─────────────
        await supabaseAdmin
          .from('etsy_listings')
          .update({
            export_status: 'exported',
            last_exported_at: new Date().toISOString(),
          })
          .eq('id', etsyListing.id);

        results.push({
          etsy_listing_id,
          status: 'success',
          fields_exported: fields,
        });

      } catch (itemError: unknown) {
        const message = itemError instanceof Error ? itemError.message : 'Unknown error';
        console.error(`[export-listings] Failed for ${etsy_listing_id}:`, message);

        // Always log export attempt (even on error)
        await supabaseAdmin.from('etsy_export_logs').insert({
          user_id,
          etsy_listing_id: etsy_listing_id || 0,
          listing_id: listing_id || null,
          fields_exported: fields || [],
          snapshot_before: {},
          snapshot_after: {},
          status: 'error',
          error_message: message,
        }).catch(() => {}); // Don't let log failure mask the real error

        // Update etsy_listings status if we have the listing
        if (etsy_listing_id) {
          await supabaseAdmin
            .from('etsy_listings')
            .update({ export_status: 'error' })
            .eq('etsy_listing_id', etsy_listing_id)
            .eq('user_id', user_id)
            .catch(() => {});
        }

        results.push({
          etsy_listing_id,
          status: 'error',
          fields_exported: fields || [],
          error: message,
        });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    console.info(`[export-listings] Done: exported=${successCount} failed=${results.length - successCount}`);

    return res.json({
      results,
      summary: {
        total: results.length,
        success: successCount,
        errors: results.length - successCount,
      },
    });
  } catch (error: unknown) {
    Sentry.captureException(error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [export-listings] Error:', message);
    return res.status(500).json({ error: 'Failed to export listings', details: message });
  }
}
