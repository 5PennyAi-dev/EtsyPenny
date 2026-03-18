import 'dotenv/config';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { runVisionModel, runTextModel } from '@/lib/ai/gemini';
import { PROMPT_VISUAL_ANALYST, PROMPT_TAXONOMY_MAPPING, formatTaxonomyLists, mergeAnalysisResults } from '@/lib/logic/analyse-image-logic';
import type { AnalyzeImagePayload, TaxonomyItem, VisualAnalysis, TaxonomyMapping, FinalAnalysisOutput } from '@/types/definitions';

/**
 * Safely extracts a JSON string from a Gemini response,
 * stripping any markdown code fences (```json ... ```) if present.
 */
function extractJson(raw: string): string {
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    return match ? match[1].trim() : raw.trim();
}

export async function POST(request: Request) {
    console.log("Request received in analyze-image API route");
    try {
        const body: AnalyzeImagePayload = await request.json();
        const {
            listing_id,
            user_id,
            mockup_url,
            product_type = '',
            client_description = '',
        } = body;

        // Step 1: Request Validation
        if (!listing_id || !mockup_url || !user_id) {
            return NextResponse.json({ error: 'Missing required fields: listing_id, user_id, and mockup_url' }, { status: 400 });
        }

        // Step 2: Visual DNA Extraction (AI Call #1)
        const visualPrompt = PROMPT_VISUAL_ANALYST
            .replace('{{productType}}', product_type)
            .replace('{{description}}', client_description);

        const visualAnalysisRaw = await runVisionModel(visualPrompt, mockup_url);
        const visualAnalysisData: { visual_analysis: VisualAnalysis } = JSON.parse(extractJson(visualAnalysisRaw));
        const visualAnalysis = visualAnalysisData.visual_analysis;

        // Step 3: Taxonomy Retrieval (Supabase)
        // v_combined_themes and v_combined_niches already return both system rows and user-specific rows.
        // No user_id filter is applied here — the views handle scoping internally via the 'origin' field.
        const [themesResult, nichesResult] = await Promise.all([
            supabaseAdmin.from('v_combined_themes').select('*'),
            supabaseAdmin.from('v_combined_niches').select('*'),
        ]);

        if (themesResult.error) throw new Error(`Error fetching themes: ${themesResult.error.message}`);
        if (nichesResult.error) throw new Error(`Error fetching niches: ${nichesResult.error.message}`);

        const themes: TaxonomyItem[] = themesResult.data;
        const niches: TaxonomyItem[] = nichesResult.data;

        const formattedTaxonomy = formatTaxonomyLists(themes, niches);

        // Step 4: Taxonomy Mapping (AI Call #2)
        const visualAnalysisContext = `
Aesthetic style: ${visualAnalysis.aesthetic_style}
Typography details: ${visualAnalysis.typography_details}
Graphic elements: ${visualAnalysis.graphic_elements}
Color palette: ${visualAnalysis.color_palette}
Target audience: ${visualAnalysis.target_audience}
Overall Vibe: ${visualAnalysis.overall_vibe}
`;

        const taxonomyPrompt = PROMPT_TAXONOMY_MAPPING
            .replace('{{visualAnalysis}}', visualAnalysisContext)
            .replace('{{formattedTaxonomyReport}}', formattedTaxonomy);

        console.log("Taxonomy Prompt:", taxonomyPrompt);

        const taxonomyMappingRaw = await runTextModel(taxonomyPrompt);
        const taxonomyMapping: TaxonomyMapping = JSON.parse(extractJson(taxonomyMappingRaw));

        // Step 5: Data Merging & Persistence via Supabase Edge Function
        const finalAnalysis: FinalAnalysisOutput = mergeAnalysisResults(listing_id, visualAnalysis, taxonomyMapping);

        const edgeFnUrl = `${process.env.VITE_SUPABASE_URL}/functions/v1/save-image-analysis`;
        const saveResponse = await fetch(edgeFnUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''}`,
                'x-api-key': process.env.N8N_WEBHOOK_SECRET ?? '',
            },
            body: JSON.stringify(finalAnalysis),
        });

        if (!saveResponse.ok) {
            const errText = await saveResponse.text();
            throw new Error(`Edge function save-image-analysis failed (${saveResponse.status}): ${errText}`);
        }

        return NextResponse.json(finalAnalysis, { status: 200 });

    } catch (error) {
        console.error('Error in analyze-image API route:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ error: 'Failed to analyze image.', details: errorMessage }, { status: 500 });
    }
}
