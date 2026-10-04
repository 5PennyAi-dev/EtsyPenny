import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { authenticateSecretKeyRequest } from "../_shared/server-auth.ts"
import { resolveSupabaseSecretKey } from "../_shared/supabase-secret.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Server-to-server endpoint. Gateway JWT verification is disabled in
    // supabase/config.toml, so this function validates a named secret key.
    const authError = await authenticateSecretKeyRequest(
      req,
      Deno.env.get('SUPABASE_SECRET_KEYS'),
      Deno.env.get('PENNYSEO_EDGE_CALLER_KEY_NAME') ?? 'vercel',
    );
    if (authError) return authError;

    // Parse the backend payload.
    const rawPayload = await req.json();
    
    const payload = Array.isArray(rawPayload) ? rawPayload[0] : rawPayload;
    
    const { listing_id, results, trigger_reset_pool, parameters } = payload;

    if (!listing_id || !results) {
      return new Response(JSON.stringify({ error: 'Bad Request: Missing listing_id or results' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Initialize the privileged client with a named modern Supabase secret key.
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      resolveSupabaseSecretKey(
        Deno.env.get('SUPABASE_SECRET_KEYS'),
        Deno.env.get('PENNYSEO_SUPABASE_SECRET_KEY_NAME') ?? 'edge_functions',
      ),
      { auth: { persistSession: false, autoRefreshToken: false } },
    )

    // Accept both a single result object and the legacy array-shaped payload.
    const unwrappedData = Array.isArray(results) ? results[0] : results;
    const modes = ['broad', 'balanced', 'sniper'];

    const STATUS_IDS = {
        SEO_DONE: '35660e24-94bb-4586-aa5a-a5027546b4a1'
    };

    // Keep track of extracted generated title and description if available at the top level
    let generatedTitle = unwrappedData?.title || null;
    let generatedDescription = unwrappedData?.description || null;
    let statusLabelForListing = unwrappedData?.status_label || null;
    let strategicVerdictForListing = unwrappedData?.strategic_verdict || null;
    let fallbackGlobalStrength = unwrappedData?.global_listing_strength || null;

    // 4. Loop over Modes and Upsert Data
    for (const mode of modes) {
        const modeData = unwrappedData[mode];
        if (!modeData) continue; // Skip if mode is missing in the payload

        const globalStrength = modeData.listing_strength ?? modeData.global_strength ?? fallbackGlobalStrength;
        const breakdown = modeData.breakdown || {};
        const stats = modeData.stats || {};
        const seo_parameters= modeData.seo_parameters || {};
        const keywords = modeData.keywords || [];

        // Save status data to use later for the listing update if this is 'balanced' (our default mode)
        if (mode === 'balanced') {
            if (modeData.status_label) statusLabelForListing = modeData.status_label;
            if (modeData.strategic_verdict) strategicVerdictForListing = modeData.strategic_verdict;
        }

        // --- UPSERT GLOBAL EVALUATION ---
        const globalEvalPayload = {
              listing_id,
            seo_mode: mode,
            global_strength: globalStrength,
            listing_strength: globalStrength,
            listing_visibility: breakdown.visibility,
            listing_conversion: breakdown.conversion,
            listing_relevance: breakdown.relevance,
            listing_competition: breakdown.competition,
            listing_profit: breakdown.profit,
            listing_raw_visibility_index: stats.raw_visibility_index,
            listing_avg_cpc:stats.avg_cpc,
            listing_avg_competition:stats.best_opportunity_comp,
            listing_avg_competition_all:stats.avg_competition_all,
            listing_est_market_reach:stats.est_market_reach,
            param_Volume:seo_parameters.Volume,
            param_Competition:seo_parameters.Competition,
            param_Niche:seo_parameters.Niche,
            param_Transaction:seo_parameters.Transaction,
            param_cpc:seo_parameters.CPC,
            status_label: modeData.status_label || null,
            strategic_verdict: modeData.strategic_verdict || null,
            updated_at: new Date().toISOString()
        };

        let evaluationId = null;

        // Check if row exists to perform an update or insert
        const { data: existingRows, error: selectError } = await supabaseClient
            .from('listings_global_eval')
            .select('id')
            .eq('listing_id', listing_id)
            .eq('seo_mode', mode);

        if (selectError) {
             console.error(`Select Global Eval Error (${mode}):`, selectError);
             throw selectError;
        }

        if (existingRows && existingRows.length > 0) {
            evaluationId = existingRows[0].id;
            const { error: updateEvalError } = await supabaseClient
                .from('listings_global_eval')
                .update(globalEvalPayload)
                .eq('id', evaluationId);
            if (updateEvalError) throw updateEvalError;
        } else {
            const { data: newEval, error: insertEvalError } = await supabaseClient
                .from('listings_global_eval')
                .insert(globalEvalPayload)
                .select('id')
                .single();
            if (insertEvalError) throw insertEvalError;
            evaluationId = newEval.id;
        }

        // --- PREPARE AND INSERT KEYWORDS ---
        const statsToInsert = keywords.map((item: any) => ({
        listing_id,
            tag: item.keyword,
            search_volume: item.search_volume || 0,
            competition: String(item.competition), 
            cpc: item.cpc,
            opportunity_score: item.opportunity_score,
            volume_history: (Array.isArray(item.volume_history) ? item.volume_history : []).map((m: any) => m?.search_volume ?? m ?? 0),
           // volume_history: item.monthly_searches 
               // ? item.monthly_searches.map((m: any) => m.search_volume).reverse() 
                //: (item.volumes_history || []),
            is_trending: item.status?.trending || false,
            is_evergreen: item.status?.evergreen || false,
            is_promising: item.status?.promising || false,
            insight: item.insight || null,
            is_top: item.is_top ?? null,
            transactional_score: item.transactional_score || null,
            intent_label: item.intent_label || null,
            niche_score: item.niche_score || null,
            relevance_label: item.relevance_label || null,
            is_selection_ia: item.is_selection_ia || false,
            is_competition: false,
            is_current_eval: item.is_current_eval || false,
            is_current_pool:item.is_current_pool,
            is_user_added:item.is_user_added,
            is_pinned:item.is_pinned,
            evaluation_id: evaluationId
        }));

        // Delete old primary keywords for this listing (by listing_id to catch all cases)
        const { error: delError } = await supabaseClient
            .from('listing_seo_stats')
            .delete()
            .eq('listing_id', listing_id)
            .eq('is_competition', false)
            .or('is_user_added.is.null,is_user_added.eq.false');

        if (delError) {
            console.error(`Delete Stats Error (${mode}):`, delError);
            throw delError;
        }

        if (statsToInsert.length > 0) {
            const { error: insError } = await supabaseClient
                .from('listing_seo_stats')
                .upsert(statsToInsert, { onConflict: 'listing_id,tag' });
            
            if (insError) {
                console.error(`Upsert Stats Error (${mode}):`, insError);
                throw insError;
            }
        }
    } // End modes loop

    // 5. Update The Main Listing Table Status
    // Only update title/desc if they were included
    const updatePayload: any = {
        updated_at: new Date().toISOString(),
    };
    
    // Crucial Loop Prevention: Only set SEO_DONE if we are NOT triggering resetPool
    if (!trigger_reset_pool) {
        updatePayload.status_id = STATUS_IDS.SEO_DONE;
        updatePayload.is_generating_seo = false;
    }
    
    if (generatedTitle) updatePayload.generated_title = generatedTitle;
    if (generatedDescription) updatePayload.generated_description = generatedDescription;
    // strategic_verdict and status_label now live in listings_global_eval only

    const { error: updateListingError } = await supabaseClient
        .from('listings')
        .update(updatePayload)
        .eq('id', listing_id);

    if (updateListingError) throw updateListingError;

    return new Response(JSON.stringify({ success: true, message: 'SEO Data Saved Successfully', listing_id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error("Function Error:", error)
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
