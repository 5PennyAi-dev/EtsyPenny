import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
}

serve(async (req) => {
  // 1. Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Validate Custom API Key Security (Ensure only N8N can call this)
    const apiKey = req.headers.get('x-api-key');
    const expectedApiKey = Deno.env.get('N8N_WEBHOOK_SECRET');

    // If you haven't set N8N_WEBHOOK_SECRET in Supabase secrets yet, you can hardcode a fallback temporarily for testing, but ENV is safer.
    if (!expectedApiKey || apiKey !== expectedApiKey) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid x-api-key' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Parse JSON Body from N8N
    const { listing_id, results } = await req.json()

    if (!listing_id || (!results && !Array.isArray(results))) {
      return new Response(JSON.stringify({ error: 'Bad Request: Missing listing_id or results array' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Initialize Supabase Client with SERVICE_ROLE_KEY to bypass RLS
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Unpack results. N8N might send it wrapped in an array or as a flat object.
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
            listing_raw_visibility_index: stats.raw_visibility_index,
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
            opportunity_score: item.opportunity_score,
            volume_history: item.monthly_searches 
                ? item.monthly_searches.map((m: any) => m.search_volume).reverse() 
                : (item.volumes_history || []),
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
            evaluation_id: evaluationId
        }));

        if (evaluationId) {
            // Delete old primary keywords for this mode
            const { error: delError } = await supabaseClient
                .from('listing_seo_stats')
                .delete()
                .eq('evaluation_id', evaluationId)
                .eq('is_competition', false);

            if (delError) {
                console.error(`Delete Stats Error (${mode}):`, delError);
                throw delError;
            }
        }

        if (statsToInsert.length > 0) {
            const { error: insError } = await supabaseClient
                .from('listing_seo_stats')
                .insert(statsToInsert);
            
            if (insError) {
                console.error(`Insert Stats Error (${mode}):`, insError);
                throw insError;
            }
        }
    } // End modes loop

    // 5. Update The Main Listing Table Status
    // Only update title/desc if they were included
    const updatePayload: any = {
        status_id: STATUS_IDS.SEO_DONE,
        updated_at: new Date().toISOString(),
    };
    
    if (generatedTitle) updatePayload.generated_title = generatedTitle;
    if (generatedDescription) updatePayload.generated_description = generatedDescription;
    if (statusLabelForListing) {
      updatePayload.status_label = statusLabelForListing;
      updatePayload.global_status_label = statusLabelForListing; // Keep legacy column in sync
    }
    if (strategicVerdictForListing) {
      updatePayload.strategic_verdict = strategicVerdictForListing;
      updatePayload.global_strategic_verdict = strategicVerdictForListing; // Keep legacy column in sync
    }

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
