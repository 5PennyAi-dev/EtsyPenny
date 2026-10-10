import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runAI } from '../../lib/ai/provider-router.js';
import { extractJson } from '../../lib/ai/extract-json.js';
import { parseVisualAnalysisResponse } from '../../lib/ai/vision-analysis.js';
import { parseTaxonomyMappingResponse } from '../../lib/ai/taxonomy-mapping.js';
import {
  PROMPT_VISUAL_ANALYST,
  formatTaxonomyLists,
  buildVisualAnalysisContext,
  buildTaxonomyPrompt,
  mergeAnalysisResults,
} from '../../lib/logic/analyse-image-logic.js';
import { checkTokenBalance, deductTokens } from '../../lib/tokens/token-middleware.js';
import { initSentry, Sentry } from '../../lib/sentry.js';
import { getSupabaseEdgeHeaders, getSupabaseServerConfig } from '../../lib/supabase/config.js';
import { supabaseAdmin } from '../../lib/supabase/server.js';
import { verifyRequestUser, AuthError } from '../../lib/auth/verify-request-user.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  initSentry();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      listing_id,
      mockup_url,
      product_type = '',
      client_description = '',
    } = req.body;

    const user = await verifyRequestUser(req.headers.authorization, supabaseAdmin);
    const user_id = user.id;
    if (!listing_id || !mockup_url) return res.status(400).json({ error: 'Missing required fields: listing_id and mockup_url' });
    const { data: listing } = await supabaseAdmin.from('listings').select('id').eq('id', listing_id).eq('user_id', user_id).maybeSingle();
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    console.info(`[analyze-image] listing=${listing_id}`);

    // Token check
    const tokenCheck = await checkTokenBalance(user_id, 'analyze_image');
    if (!tokenCheck.allowed) {
      return res.status(402).json({ error: tokenCheck.reason, balance: tokenCheck.balance, required: tokenCheck.required });
    }

    // Step 2: Visual DNA Extraction (Gemini Vision)
    const visualPrompt = PROMPT_VISUAL_ANALYST
      .replace('{{productType}}', product_type)
      .replace('{{description}}', client_description);

    const { text: visualRaw } = await runAI('vision_analysis', visualPrompt, { imageUrl: mockup_url });
    const visualAnalysis = parseVisualAnalysisResponse(extractJson(visualRaw));
    // TEMPORARY — remove after validating new prompt outputs
    console.info('[analyze-image] Visual analysis result:', JSON.stringify(visualAnalysis, null, 2));

    // Step 3: Taxonomy Retrieval (Supabase)
    const { createClient } = await import('@supabase/supabase-js');
    const { url: supabaseUrl, secretKey: supabaseKey } = getSupabaseServerConfig();
    const taxonomySupabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const [themesResult, nichesResult] = await Promise.all([
      taxonomySupabase.from('v_combined_themes').select('*'),
      taxonomySupabase.from('v_combined_niches').select('*'),
    ]);

    if (themesResult.error) throw new Error(`Themes: ${themesResult.error.message}`);
    if (nichesResult.error) throw new Error(`Niches: ${nichesResult.error.message}`);

    // Step 4: Taxonomy Mapping (AI Text)
    const { userThemes, systemThemes, userNiches, systemNiches } = formatTaxonomyLists(themesResult.data, nichesResult.data);

    const taxonomyPrompt = buildTaxonomyPrompt({
      productType: product_type,
      userDescription: client_description,
      visualAnalysis: buildVisualAnalysisContext(visualAnalysis),
      userThemes,
      systemThemes,
      userNiches,
      systemNiches,
    });

    const { text: taxonomyRaw } = await runAI('taxonomy_mapping', taxonomyPrompt);
    const taxonomyMapping = parseTaxonomyMappingResponse(
      extractJson(taxonomyRaw),
      themesResult.data,
      nichesResult.data,
    );
    console.info(`[analyze-image] theme=${taxonomyMapping.theme} niche=${taxonomyMapping.niche}`);

    // Step 5: Merge & Save via Edge Function
    const finalAnalysis = mergeAnalysisResults(listing_id, visualAnalysis, taxonomyMapping);

    const edgeFnUrl = `${supabaseUrl}/functions/v1/save-image-analysis`;
    const saveResponse = await fetch(edgeFnUrl, {
      method: 'POST',
      headers: getSupabaseEdgeHeaders(),
      body: JSON.stringify(finalAnalysis),
    });

    if (!saveResponse.ok) {
      const errText = await saveResponse.text();
      throw new Error(`Edge function failed (${saveResponse.status}): ${errText}`);
    }

    // Deduct token after successful processing
    await deductTokens(user_id, 'analyze_image', tokenCheck.required, listing_id);

    console.info(`[analyze-image] complete listing=${listing_id}`);
    return res.json(finalAnalysis);

  } catch (error: unknown) {
    if (error instanceof AuthError) return res.status(error.status).json({ error: error.message });
    Sentry.captureException(error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [analyze-image] Error:', message);
    return res.status(500).json({ error: 'Failed to analyze image.', details: message });
  }
}
