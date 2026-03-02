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

    if (!expectedApiKey || apiKey !== expectedApiKey) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid x-api-key' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Parse JSON Body from N8N
    const body = await req.json()
    
    // Extractor variables
    let listing_id = null;
    let visual_analysis = null;

    // Flexible parsing based on possible N8N JSON permutations
    if (Array.isArray(body) && body.length > 0) {
      const item = body[0];
      listing_id = item.listing_id || item.id;
      if (item.output && item.output.visual_analysis) {
        visual_analysis = item.output.visual_analysis;
      } else if (item.visual_analysis) {
        visual_analysis = item.visual_analysis;
      }
    } else if (typeof body === 'object' && body !== null) {
      listing_id = body.listing_id || body.id;
      if (body.results && Array.isArray(body.results) && body.results.length > 0) {
        const item = body.results[0];
        listing_id = listing_id || item.listing_id || item.id;
        if (item.output && item.output.visual_analysis) {
          visual_analysis = item.output.visual_analysis;
        } else if (item.visual_analysis) {
          visual_analysis = item.visual_analysis;
        }
      } else if (body.output && body.output.visual_analysis) {
        visual_analysis = body.output.visual_analysis;
      } else if (body.visual_analysis) {
        visual_analysis = body.visual_analysis;
      }
    }

    if (!listing_id) {
      return new Response(JSON.stringify({ error: 'Bad Request: Missing listing_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!visual_analysis) {
      return new Response(JSON.stringify({ error: 'Bad Request: Missing visual_analysis object in payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Initialize Supabase Client with SERVICE_ROLE_KEY to bypass RLS
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 4. Map the received JSON data to the public.listings columns
    const updatePayload: Record<string, any> = {
      is_image_analysed: true,
      visual_aesthetic: visual_analysis.aesthetic_style || null,
      visual_typography: visual_analysis.typography_details || null,
      visual_graphics: visual_analysis.graphic_elements || null,
      visual_colors: visual_analysis.color_palette || null,
      visual_target_audience: visual_analysis.target_audience || null,
      visual_overall_vibe: visual_analysis.overall_vibe || null,
      theme: visual_analysis.theme || null,
      niche: visual_analysis.niche || null,
      sub_niche: visual_analysis["sub-niche"] || null,
      updated_at: new Date().toISOString()
    };

    // Remove keys that are null if you only want to update provided fields,
    // though the requirement implies we should write null if it's missing just for clean data
    Object.keys(updatePayload).forEach(key => {
      if (updatePayload[key] === undefined) {
        updatePayload[key] = null;
      }
    });

    // 5. Perform the update query against the listing row
    const { error: updateListingError } = await supabaseClient
      .from('listings')
      .update(updatePayload)
      .eq('id', listing_id);

    if (updateListingError) throw updateListingError;

    return new Response(JSON.stringify({ success: true, message: 'Image analysis data saved successfully', listing_id }), {
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
