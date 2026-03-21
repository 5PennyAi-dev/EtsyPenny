import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../lib/supabase/server.js';
import { generateKeywordPool } from '../../lib/seo/generate-keyword-pool.js';
import { enrichKeywords } from '../../lib/seo/enrich-keywords.js';
import { scoreKeywords } from '../../lib/seo/score-keywords.js';
import { selectAndScore } from '../../lib/seo/select-and-score.js';
import { persistSeo } from '../../lib/seo/persist-seo.js';

const STATUS_SEO_DONE = '35660e24-94bb-4586-aa5a-a5027546b4a1';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const t0 = Date.now();
  try {
    const {
      listing_id, user_id, product_type = '', theme = '', niche = '', sub_niche = '',
      client_description = '', visual_aesthetic = '', visual_target_audience = '', visual_overall_vibe = '',
      parameters = {},
    } = req.body;

    if (!listing_id || !user_id) {
      return res.status(400).json({ error: 'Missing required fields: listing_id and user_id' });
    }

    const ctx = { product_type, theme, niche, sub_niche, client_description, visual_aesthetic, visual_target_audience, visual_overall_vibe };
    const params = { Volume: 5, Competition: 5, Transaction: 5, Niche: 5, CPC: 5, ai_selection_count: 13, ...parameters };

    console.log(`\n🔍 [generate-keywords] Starting for listing ${listing_id}`);
    console.log(`   Product: ${product_type} | ${theme} > ${niche} > ${sub_niche}`);

    // Step A: Generate keyword pool
    console.log('   Step A: Generating keyword pool...');
    const uniqueKeywords = await generateKeywordPool(ctx);
    console.log(`   ✅ ${uniqueKeywords.length} unique keywords (${Date.now() - t0}ms)`);
    if (uniqueKeywords.length === 0) return res.status(500).json({ error: 'No keywords generated' });

    // Step B: Enrich with cache + DataForSEO
    console.log('   Step B: Enriching keywords...');
    const enriched = await enrichKeywords(uniqueKeywords);

    // Step C: Score keywords (niche + transactional)
    console.log('   Step C: Scoring keywords...');
    const scored = await scoreKeywords(enriched, ctx);
    console.log(`   ✅ Scored ${scored.length} keywords (${Date.now() - t0}ms)`);

    // Step D: Select + calculate LSI
    console.log('   Step D: Selecting + calculating LSI...');
    const { keywords: finalKeywords, strength } = selectAndScore(scored as any, params);
    const selected = finalKeywords.filter(kw => kw.is_selection_ia);
    console.log(`   ✅ Selected ${selected.length} / ${finalKeywords.length} | LSI = ${strength?.listing_strength ?? 'N/A'}`);

    // Step E: Persist via edge function
    console.log('   Step E: Saving via save-seo...');
    await persistSeo(listing_id, finalKeywords as any, strength, params);
    console.log('   ✅ Saved!');

    // Update listing flags
    await supabaseAdmin.from('listings').update({
      is_generating_seo: false,
      status_id: STATUS_SEO_DONE,
      updated_at: new Date().toISOString(),
    }).eq('id', listing_id);

    console.log(`   🎉 Pipeline complete in ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);

    return res.json({
      success: true,
      listing_id,
      pool_size: finalKeywords.length,
      selected_count: selected.length,
      listing_strength: strength?.listing_strength ?? null,
      breakdown: strength?.breakdown ?? null,
      stats: strength?.stats ?? null,
      elapsed_ms: Date.now() - t0,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [generate-keywords] Error:', message);
    try {
      const { listing_id } = req.body || {};
      if (listing_id) {
        await supabaseAdmin.from('listings').update({ is_generating_seo: false }).eq('id', listing_id);
      }
    } catch (_) { /* best effort */ }
    return res.status(500).json({ error: 'Failed to generate keywords.', details: message });
  }
}
