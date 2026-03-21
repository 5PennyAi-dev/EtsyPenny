import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../lib/supabase/server.js';
import { selectAndScore } from '../../lib/seo/select-and-score.js';
import { persistStrength } from '../../lib/seo/persist-strength.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { listing_id, selected_keywords } = req.body;
    if (!listing_id || !selected_keywords?.length) {
      return res.status(400).json({ error: 'Missing listing_id or selected_keywords' });
    }

    console.log(`\n📊 [recalculate-scores] Starting for listing ${listing_id} (${selected_keywords.length} keywords)`);

    // 1. Fetch listing owner
    const { data: listing, error: listingError } = await supabaseAdmin
      .from('listings')
      .select('user_id')
      .eq('id', listing_id)
      .single();

    if (listingError || !listing) throw listingError || new Error('Listing not found');

    // 2. Fetch user settings
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('v_user_seo_active_settings')
      .select('*')
      .eq('user_id', listing.user_id)
      .single();

    if (settingsError || !settings) throw settingsError || new Error('Settings not found');

    const params = {
      Volume: settings.param_volume ?? 0.25,
      Competition: settings.param_competition ?? 0.15,
      Transaction: settings.param_transaction ?? 0.35,
      Niche: settings.param_niche ?? 0.25,
      CPC: settings.param_cpc ?? 0,
      ai_selection_count: selected_keywords.length,
    };

    // 3. Calculate strength from user-selected keywords
    const { strength } = selectAndScore(selected_keywords, params);

    if (!strength) {
      return res.status(400).json({ error: 'Could not calculate strength from provided keywords' });
    }

    // 4. Persist to DB
    const selectedTags = selected_keywords.map((k: { keyword?: string }) => k.keyword);
    await persistStrength(listing_id, strength, selectedTags, params);

    console.log(`   ✅ Recalculate complete for ${listing_id} — LSI: ${strength.listing_strength}`);
    return res.json({ success: true, strength });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [recalculate-scores] Error:', message);
    return res.status(500).json({ error: 'Failed to recalculate scores.', details: message });
  }
}
