/**
 * Orchestrates scoring a single imported Etsy listing.
 * Shared by api/etsy/score-listings.ts and server.mjs.
 *
 * Flow: download image → create listings row → image analysis →
 *       enrich tags (DataForSEO) → AI scoring → composite scores → persist
 */

import { supabaseAdmin } from '../supabase/server.js';
import { runAI } from '../ai/provider-router.js';
import { extractJson } from '../ai/extract-json.js';
import {
  PROMPT_VISUAL_ANALYST,
  formatTaxonomyLists,
  buildVisualAnalysisContext,
  buildTaxonomyPrompt,
  mergeAnalysisResults,
} from '../logic/analyse-image-logic.js';
import { enrichKeywords } from '../seo/enrich-keywords.js';
import { scoreKeywords } from '../seo/score-keywords.js';
import { selectAndScore } from '../seo/select-and-score.js';
import { persistSeo } from '../seo/persist-seo.js';

const STATUS_NEW = 'ac083a90-43fa-4ff5-a62d-5cd6bb5edbcc';

// ─── Types ────────────────────────────────────────────

export interface ScoreEtsyListingInput {
  etsyListing: {
    id: string;
    etsy_listing_id: number;
    original_title: string;
    original_description: string;
    original_tags: string[];
    original_image_url: string;
    thumbnail_url: string;
  };
  userId: string;
  userSettings: Record<string, unknown>;
}

export interface ScoreEtsyListingResult {
  listingId: string | null;
  etsyListingId: string;
  score: number | null;
  tagCount: number;
  scoredTags: number;
  error?: string;
}

// ─── Main orchestrator ────────────────────────────────

export async function scoreEtsyListing(
  input: ScoreEtsyListingInput
): Promise<ScoreEtsyListingResult> {
  const { etsyListing, userId, userSettings } = input;
  const tagCount = etsyListing.original_tags?.length ?? 0;
  let listingId: string | null = null;

  try {
    console.info(`[score-etsy] Starting: "${etsyListing.original_title?.slice(0, 60)}..." (${tagCount} tags)`);

    // ── 1. Download image and upload to Supabase storage ──

    let storageUrl = '';
    if (etsyListing.original_image_url) {
      const imgRes = await fetch(etsyListing.original_image_url);
      if (!imgRes.ok) throw new Error(`Failed to download Etsy image: ${imgRes.status}`);
      const buffer = Buffer.from(await imgRes.arrayBuffer());

      const filename = `${userId}/${crypto.randomUUID()}.jpg`;
      const { error: uploadErr } = await supabaseAdmin.storage
        .from('mockups_bucket')
        .upload(filename, buffer, { contentType: 'image/jpeg', upsert: false });
      if (uploadErr) throw new Error(`Storage upload failed: ${uploadErr.message}`);

      const { data: { publicUrl } } = supabaseAdmin.storage
        .from('mockups_bucket')
        .getPublicUrl(filename);
      storageUrl = publicUrl;
      console.info('[score-etsy] Image uploaded to storage');
    }

    // ── 2. Create listings row ────────────────────────────

    const { data: listing, error: insertErr } = await supabaseAdmin
      .from('listings')
      .insert({
        user_id: userId,
        title: etsyListing.original_title,
        user_description: etsyListing.original_description,
        image_url: storageUrl,
        status_id: STATUS_NEW,
        is_image_analysed: false,
        source: 'etsy',
      })
      .select('id')
      .single();

    if (insertErr || !listing) throw new Error(`Failed to create listing: ${insertErr?.message}`);
    listingId = listing.id;
    console.info(`[score-etsy] Created listing ${listingId}`);

    // ── 3. Image analysis (Vision + Taxonomy) ─────────────

    const visualPrompt = PROMPT_VISUAL_ANALYST
      .replace('{{productType}}', '')
      .replace('{{description}}', etsyListing.original_description || '');

    const { text: visualRaw } = await runAI('vision_analysis', visualPrompt, { imageUrl: storageUrl });
    const visualData = JSON.parse(extractJson(visualRaw));
    const visualAnalysis = visualData.visual_analysis;
    console.info('[score-etsy] Vision analysis complete');

    // Taxonomy mapping
    const [themesResult, nichesResult] = await Promise.all([
      supabaseAdmin.from('v_combined_themes').select('*'),
      supabaseAdmin.from('v_combined_niches').select('*'),
    ]);
    if (themesResult.error) throw new Error(`Themes: ${themesResult.error.message}`);
    if (nichesResult.error) throw new Error(`Niches: ${nichesResult.error.message}`);

    const { userThemes, systemThemes, userNiches, systemNiches } = formatTaxonomyLists(
      themesResult.data, nichesResult.data
    );

    const taxonomyPrompt = buildTaxonomyPrompt({
      productType: '',
      userDescription: etsyListing.original_description || '',
      visualAnalysis: buildVisualAnalysisContext(visualAnalysis),
      userThemes, systemThemes, userNiches, systemNiches,
    });

    const { text: taxonomyRaw } = await runAI('taxonomy_mapping', taxonomyPrompt);
    const taxonomyMapping = JSON.parse(extractJson(taxonomyRaw));
    console.info(`[score-etsy] Taxonomy: ${taxonomyMapping.theme} > ${taxonomyMapping.niche}`);

    // Save via edge function
    const finalAnalysis = mergeAnalysisResults(listingId, visualAnalysis, taxonomyMapping);
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const N8N_SECRET = process.env.N8N_WEBHOOK_SECRET || '';

    const saveAnalysisRes = await fetch(`${SUPABASE_URL}/functions/v1/save-image-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'x-api-key': N8N_SECRET,
      },
      body: JSON.stringify(finalAnalysis),
    });
    if (!saveAnalysisRes.ok) {
      const errText = await saveAnalysisRes.text();
      throw new Error(`save-image-analysis failed (${saveAnalysisRes.status}): ${errText}`);
    }

    // ── 4. Handle 0 tags edge case ────────────────────────

    if (tagCount === 0) {
      console.info('[score-etsy] 0 tags — setting score to 0');
      await supabaseAdmin.from('etsy_listings').update({
        listing_id: listingId,
        original_score: 0,
        scoring_status: 'scored',
        scored_at: new Date().toISOString(),
      }).eq('id', etsyListing.id);

      // Keep status as NEW — image analysis done but no keyword generation yet
      await supabaseAdmin.from('listings').update({
        is_generating_seo: false,
        updated_at: new Date().toISOString(),
      }).eq('id', listingId);

      return { listingId, etsyListingId: etsyListing.id, score: 0, tagCount: 0, scoredTags: 0 };
    }

    // ── 5. Enrich tags via DataForSEO ─────────────────────

    console.info(`[score-etsy] Enriching ${tagCount} tags...`);
    const enriched = await enrichKeywords(etsyListing.original_tags);

    // ── 6. Score tags via AI ──────────────────────────────

    const ctx = {
      product_type: taxonomyMapping.product_type || '',
      theme: taxonomyMapping.theme || '',
      niche: taxonomyMapping.niche || '',
      sub_niche: taxonomyMapping.sub_niche || '',
      client_description: etsyListing.original_description || '',
      visual_aesthetic: visualAnalysis?.aesthetic_style || '',
      visual_target_audience: visualAnalysis?.target_audience || '',
      visual_overall_vibe: visualAnalysis?.overall_vibe || '',
      visual_colors: visualAnalysis?.color_palette || '',
      visual_graphics: visualAnalysis?.graphic_elements || '',
    };

    console.info('[score-etsy] Scoring tags...');
    const scored = await scoreKeywords(enriched, ctx);

    // ── 7. Compute composite scores ───────────────────────

    const params = {
      Volume: (userSettings as any)?.param_volume ?? 0.25,
      Competition: (userSettings as any)?.param_competition ?? 0.10,
      Transaction: (userSettings as any)?.param_transaction ?? 0.25,
      Niche: (userSettings as any)?.param_niche ?? 0.20,
      CPC: (userSettings as any)?.param_cpc ?? 0.20,
      ai_selection_count: (userSettings as any)?.ai_selection_count || 13,
    };

    const { keywords: finalKeywords, strength } = selectAndScore(scored, params);
    const listingStrength = strength?.listing_strength ?? 0;
    console.info(`[score-etsy] Listing strength: ${listingStrength}`);

    // ── 8. Persist results ────────────────────────────────

    await persistSeo(listingId, finalKeywords, strength, params);

    // Keep status as NEW — scoring is evaluation only, not full SEO generation
    await supabaseAdmin.from('listings').update({
      is_generating_seo: false,
      updated_at: new Date().toISOString(),
    }).eq('id', listingId);

    await supabaseAdmin.from('etsy_listings').update({
      listing_id: listingId,
      original_score: listingStrength,
      scoring_status: 'scored',
      scored_at: new Date().toISOString(),
    }).eq('id', etsyListing.id);

    console.info(`[score-etsy] Done: score=${listingStrength}, tags=${tagCount}`);

    return {
      listingId,
      etsyListingId: etsyListing.id,
      score: listingStrength,
      tagCount,
      scoredTags: finalKeywords.filter((k: any) => k.niche_score != null).length,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[score-etsy] Error for ${etsyListing.id}:`, message);

    // Mark as error
    await supabaseAdmin.from('etsy_listings').update({
      scoring_status: 'error',
      ...(listingId ? { listing_id: listingId } : {}),
    }).eq('id', etsyListing.id);

    return {
      listingId,
      etsyListingId: etsyListing.id,
      score: null,
      tagCount,
      scoredTags: 0,
      error: message,
    };
  }
}
