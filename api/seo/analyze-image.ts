import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runAI } from '../../lib/ai/provider-router.js';
import { extractJson } from '../../lib/ai/extract-json.js';
import {
  PROMPT_VISUAL_ANALYST,
  formatTaxonomyLists,
  buildVisualAnalysisContext,
  buildTaxonomyPrompt,
  mergeAnalysisResults,
} from '../../lib/logic/analyse-image-logic.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      listing_id,
      user_id,
      mockup_url,
      product_type = '',
      client_description = '',
    } = req.body;

    if (!listing_id || !mockup_url || !user_id) {
      return res.status(400).json({ error: 'Missing required fields: listing_id, user_id, and mockup_url' });
    }

    console.info(`[analyze-image] listing=${listing_id}`);

    // Step 2: Visual DNA Extraction (Gemini Vision)
    const visualPrompt = PROMPT_VISUAL_ANALYST
      .replace('{{productType}}', product_type)
      .replace('{{description}}', client_description);

    const { text: visualRaw } = await runAI('vision_analysis', visualPrompt, { imageUrl: mockup_url });
    const visualData = JSON.parse(extractJson(visualRaw));
    const visualAnalysis = visualData.visual_analysis;
    // TEMPORARY — remove after validating new prompt outputs
    console.info('[analyze-image] Visual analysis result:', JSON.stringify(visualAnalysis, null, 2));

    // Step 3: Taxonomy Retrieval (Supabase)
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.VITE_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    const [themesResult, nichesResult] = await Promise.all([
      supabaseAdmin.from('v_combined_themes').select('*'),
      supabaseAdmin.from('v_combined_niches').select('*'),
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
    const taxonomyMapping = JSON.parse(extractJson(taxonomyRaw));
    console.info(`[analyze-image] theme=${taxonomyMapping.theme} niche=${taxonomyMapping.niche}`);

    // Step 5: Merge & Save via Edge Function
    const finalAnalysis = mergeAnalysisResults(listing_id, visualAnalysis, taxonomyMapping);

    const edgeFnUrl = `${supabaseUrl}/functions/v1/save-image-analysis`;
    const n8nSecret = process.env.N8N_WEBHOOK_SECRET;
    const saveResponse = await fetch(edgeFnUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'x-api-key': n8nSecret || '',
      },
      body: JSON.stringify(finalAnalysis),
    });

    if (!saveResponse.ok) {
      const errText = await saveResponse.text();
      throw new Error(`Edge function failed (${saveResponse.status}): ${errText}`);
    }

    console.info(`[analyze-image] complete listing=${listing_id}`);
    return res.json(finalAnalysis);

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [analyze-image] Error:', message);
    return res.status(500).json({ error: 'Failed to analyze image.', details: message });
  }
}
