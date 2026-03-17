import 'dotenv/config';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { runTextModel } from '@/lib/ai/gemini';
import { scoreNiche } from '@/lib/seo/niche-scoring';
import { scoreTransactional } from '@/lib/seo/transactional-scoring';
import { calculateListingStrength } from '@/docs/generate-seo-logic';
import type { GenerateKeywordsPayload, EnrichedKeyword, SEOParameters } from '@/types/definitions';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function extractJson(raw: string): string {
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    return match ? match[1].trim() : raw.trim();
}

/** Power-law Etsy volume estimation (source: n8n Global_Logic) */
function getEtsyVolume(webVol: number): number {
    if (!webVol || webVol <= 0) return 0;
    return Math.round(22 * Math.pow(webVol, 0.9));
}

// ─── Segment Definitions ───────────────────────────────────────────────────────

const SEGMENTS = [
    {
        name: 'Broad & High Volume',
        description: 'High-level niche terms and general gift categories. Focus on high search volume.',
    },
    {
        name: 'Balanced & Descriptive',
        description: 'Mid-range keywords combining the niche with specific themes and graphics from the visual analysis.',
    },
    {
        name: 'Audience & Gift Scenarios',
        description: "Target specific buyers (e.g., 'Gift for Coworker') and occasions (Birthday, Christmas, etc.).",
    },
    {
        name: 'Sniper & Long-Tail',
        description: 'Ultra-specific, low-competition terms and cultural sub-niches related to the design.',
    },
    {
        name: 'Aesthetic & Vibe',
        description: "Focus on the look, mood, and specific art style (e.g., 'Kawaii Aesthetic', 'Cyberpunk Vibe').",
    },
];

// ─── Step A: Parallel Keyword Generation ───────────────────────────────────────

function buildSegmentPrompt(
    segment: { name: string; description: string },
    payload: GenerateKeywordsPayload
): string {
    return `# Role
You are an expert Etsy SEO Specialist and E-commerce Copywriter. Your goal is to generate a pool of highly relevant keywords.

# Task
Analyze the provided product data and visual characteristics to brainstorm diverse SEO keywords/phrases for an Etsy listing.
Generate 50 high-intent keywords for the category: ${segment.name}
${segment.name}: ${segment.description}

# Context
- Product Type: ${payload.product_type}
- Theme: ${payload.theme}
- Niche: ${payload.niche}
- Sub-niche: ${payload.sub_niche || ''}
- Product Description: ${payload.client_description || ''}

# Visual & Marketing Data
- Aesthetic/Style: ${payload.visual_aesthetic || ''}
- Target Audience: ${payload.visual_target_audience || ''}
- Overall Vibe: ${payload.visual_overall_vibe || ''}

# Rules
- Max 20 characters per keyword (CRITICAL for Etsy tags).
- Max 3 words per phrase.
- No duplicates.
- No trademarks.
- Lowercase only.
- Include product type in keywords at least 75% of the time.
- Format: JSON object {"keywords": ["keyword1", "keyword2", ...]}`;
}

async function generateKeywordsForSegment(
    segment: { name: string; description: string },
    payload: GenerateKeywordsPayload
): Promise<string[]> {
    const prompt = buildSegmentPrompt(segment, payload);
    const raw = await runTextModel(prompt);
    const parsed = JSON.parse(extractJson(raw));
    const keywords: string[] = parsed.keywords ?? parsed.output?.keywords ?? [];
    return keywords
        .filter((kw: string) => typeof kw === 'string' && kw.length > 0)
        .map((kw: string) => kw.toLowerCase().trim())
        .filter((kw: string) => kw.length <= 20);
}

async function stepA_generatePool(payload: GenerateKeywordsPayload): Promise<string[]> {
    const results = await Promise.allSettled(
        SEGMENTS.map((seg) => generateKeywordsForSegment(seg, payload))
    );

    const masterList: string[] = [];
    for (const result of results) {
        if (result.status === 'fulfilled') {
            masterList.push(...result.value);
        } else {
            console.warn('[generate-keywords] Segment failed:', result.reason?.message || result.reason);
        }
    }

    // Deduplicate
    return [...new Set(masterList)];
}

// ─── Step B: Data Enrichment & Cache ───────────────────────────────────────────

interface CachedKeyword {
    tag: string;
    search_volume: number;
    competition: number;
    cpc: number;
    volume_history: number[];
}

async function checkKeywordCache(keywords: string[]): Promise<CachedKeyword[]> {
    const edgeFnUrl = `${process.env.VITE_SUPABASE_URL}/functions/v1/check-keyword-cache`;
    const response = await fetch(edgeFnUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''}`,
            'x-api-key': process.env.N8N_WEBHOOK_SECRET ?? '',
        },
        body: JSON.stringify({ keywords }),
    });

    if (!response.ok) {
        console.warn('[generate-keywords] Cache check failed:', response.status);
        return [];
    }

    const data = await response.json();
    return data.cachedKeywords || [];
}

async function fetchDataForSEO(keywords: string[]): Promise<any[]> {
    if (keywords.length === 0) return [];

    const login = process.env.DATAFORSEO_LOGIN;
    const password = process.env.DATAFORSEO_PASSWORD;

    if (!login || !password) {
        console.warn('[generate-keywords] Missing DATAFORSEO_LOGIN or DATAFORSEO_PASSWORD. Returning empty stats.');
        return [];
    }

    const response = await fetch('https://api.dataforseo.com/v3/keywords_data/google/search_volume/live', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + Buffer.from(`${login}:${password}`).toString('base64'),
        },
        body: JSON.stringify([
            {
                keywords,
                location_name: 'United States',
                language_name: 'English',
            },
        ]),
    });

    if (!response.ok) {
        console.warn('[generate-keywords] DataForSEO request failed:', response.status);
        return [];
    }

    const data = await response.json();
    return data?.tasks?.[0]?.result || [];
}

interface KeywordStats {
    keyword: string;
    search_volume: number;
    competition: number;
    cpc: number;
    volume_history: number[];
    fromCache: boolean;
}

async function stepB_enrichKeywords(uniqueKeywords: string[]): Promise<KeywordStats[]> {
    // 1. Check cache
    const cached = await checkKeywordCache(uniqueKeywords);
    const cachedTags = new Set(cached.map((c) => c.tag));

    // 2. Keywords from cache (volumes already Etsy-converted)
    const listFromCache: KeywordStats[] = cached.map((c) => ({
        keyword: c.tag,
        search_volume: c.search_volume || 0,
        competition: c.competition ?? 0.5,
        cpc: c.cpc || 0,
        volume_history: c.volume_history || [],
        fromCache: true,
    }));

    // 3. Uncached keywords → DataForSEO
    const uncachedKeywords = uniqueKeywords.filter((kw) => !cachedTags.has(kw));
    const apiResults = await fetchDataForSEO(uncachedKeywords);

    // 4. Transform API results + apply Etsy volume conversion
    const listFromAPI: KeywordStats[] = apiResults.map((item: any) => {
        const history = item.monthly_searches
            ? item.monthly_searches.map((m: any) => getEtsyVolume(m.search_volume || 0)).reverse()
            : new Array(12).fill(0);

        return {
            keyword: item.keyword,
            search_volume: getEtsyVolume(item.search_volume || 0),
            competition: item.competition ?? 0.5,
            cpc: item.cpc || 0,
            volume_history: history,
            fromCache: false,
        };
    });

    // 5. Add keywords that weren't in cache AND weren't returned by DataForSEO (zero data)
    const allKnownKeywords = new Set([
        ...listFromCache.map((k) => k.keyword),
        ...listFromAPI.map((k) => k.keyword),
    ]);
    const missingKeywords: KeywordStats[] = uniqueKeywords
        .filter((kw) => !allKnownKeywords.has(kw))
        .map((kw) => ({
            keyword: kw,
            search_volume: 0,
            competition: 0.5,
            cpc: 0,
            volume_history: new Array(12).fill(0),
            fromCache: false,
        }));

    return [...listFromCache, ...listFromAPI, ...missingKeywords];
}

// ─── Step C: Scoring ───────────────────────────────────────────────────────────

async function stepC_scoreKeywords(
    stats: KeywordStats[],
    payload: GenerateKeywordsPayload
): Promise<EnrichedKeyword[]> {
    const keywordStrings = stats.map((s) => s.keyword);

    // Fire scoring in parallel
    const [nicheResults, transResults] = await Promise.all([
        scoreNiche({
            keywords: keywordStrings,
            theme: payload.theme,
            niche: payload.niche,
            subNiche: payload.sub_niche,
            productType: payload.product_type,
            aesthetic: payload.visual_aesthetic,
            targetAudience: payload.visual_target_audience,
            vibe: payload.visual_overall_vibe,
        }),
        scoreTransactional({
            keywords: keywordStrings,
            productType: payload.product_type,
            theme: payload.theme,
            niche: payload.niche,
        }),
    ]);

    // Build lookup maps
    const nicheMap = new Map<string, number>(nicheResults.map((r: { keyword: string; niche_score: number }) => [r.keyword.toLowerCase(), r.niche_score]));
    const transMap = new Map<string, number>(transResults.map((r: { keyword: string; transactional_score: number }) => [r.keyword.toLowerCase(), r.transactional_score]));

    // Merge everything
    return stats.map((s) => ({
        keyword: s.keyword,
        search_volume: s.search_volume,
        competition: s.competition,
        cpc: s.cpc,
        volume_history: s.volume_history,
        niche_score: nicheMap.get(s.keyword) ?? null,
        transactional_score: transMap.get(s.keyword) ?? null,
        is_selection_ia: false, // Will be set in Step D
        is_user_added: false,
        is_pinned: false,
        fromCache: s.fromCache,
    }));
}

// ─── Step D: AI Selection + Final Math ─────────────────────────────────────────

function stepD_selectAndCalculate(
    keywords: EnrichedKeyword[],
    params: SEOParameters
): {
    keywords: EnrichedKeyword[];
    strength: ReturnType<typeof calculateListingStrength>;
} {
    const volW = (params.Volume ?? 5) / 5;
    const compW = (params.Competition ?? 5) / 5;
    const transW = (params.Transaction ?? 5) / 5;
    const nicheW = (params.Niche ?? 5) / 5;
    const cpcW = (params.CPC ?? 5) / 5;

    // Compute composite scores
    const scored = keywords.map((kw) => {
        const nS = (kw.niche_score ?? 5) / 10;
        const tS = (kw.transactional_score ?? 5) / 10;
        const volNorm = Math.log10(Math.max(1, kw.search_volume + 1)) / 7; // 0-1 range
        const compPenalty = kw.competition ?? 0.5;
        const cpcNorm = Math.min(1, (kw.cpc || 0) / 2.5);

        const composite =
            nS * nicheW +
            tS * transW +
            volNorm * volW -
            compPenalty * compW +
            cpcNorm * cpcW;

        return { kw, composite };
    });

    // Sort descending and select top N
    scored.sort((a, b) => b.composite - a.composite);
    const selectionCount = params.ai_selection_count ?? 13;

    scored.forEach((item, idx) => {
        item.kw.is_selection_ia = idx < selectionCount;
    });

    const finalKeywords = scored.map((s) => s.kw);

    // Calculate listing strength (uses is_selection_ia === true internally)
    const strength = calculateListingStrength(finalKeywords);

    return { keywords: finalKeywords, strength };
}

// ─── Step E: Persistence ───────────────────────────────────────────────────────

async function stepE_persist(
    listing_id: string,
    keywords: EnrichedKeyword[],
    strength: ReturnType<typeof calculateListingStrength>,
    params: SEOParameters
): Promise<void> {
    // Build payload matching save-seo edge function expected format
    const keywordsForSave = keywords.map((kw) => ({
        keyword: kw.keyword,
        search_volume: kw.search_volume,
        competition: kw.competition,
        cpc: kw.cpc,
        volume_history: kw.volume_history,
        niche_score: kw.niche_score,
        transactional_score: kw.transactional_score,
        is_selection_ia: kw.is_selection_ia,
        is_user_added: kw.is_user_added,
        is_pinned: kw.is_pinned,
        is_current_pool: true,
        is_current_eval: false,
    }));

    const saveSeoPayload = {
        listing_id,
        results: {
            balanced: {
                listing_strength: strength?.listing_strength ?? 0,
                breakdown: strength?.breakdown ?? {},
                stats: strength?.stats ?? {},
                seo_parameters: params,
                keywords: keywordsForSave,
            },
        },
        trigger_reset_pool: true,
    };

    const edgeFnUrl = `${process.env.VITE_SUPABASE_URL}/functions/v1/save-seo`;
    const response = await fetch(edgeFnUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''}`,
            'x-api-key': process.env.N8N_WEBHOOK_SECRET ?? '',
        },
        body: JSON.stringify(saveSeoPayload),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`save-seo edge function failed (${response.status}): ${errText}`);
    }
}

// ─── POST Handler ──────────────────────────────────────────────────────────────

export async function POST(request: Request) {
    try {
        const body: GenerateKeywordsPayload = await request.json();
        const { listing_id, user_id, product_type, theme, niche } = body;

        // Validation
        if (!listing_id || !user_id || !product_type || !theme || !niche) {
            return NextResponse.json(
                { error: 'Missing required fields: listing_id, user_id, product_type, theme, niche' },
                { status: 400 }
            );
        }

        const params: SEOParameters = body.parameters ?? {};

        // Mark listing as generating
        await supabaseAdmin
            .from('listings')
            .update({ is_generating_seo: true, updated_at: new Date().toISOString() })
            .eq('id', listing_id);

        console.log(`[generate-keywords] Starting for listing ${listing_id}`);

        // Step A: Generate keyword pool (5 parallel segments)
        console.log('[generate-keywords] Step A: Generating keyword pool...');
        const uniqueKeywords = await stepA_generatePool(body);
        console.log(`[generate-keywords] Step A complete: ${uniqueKeywords.length} unique keywords`);

        // Step B: Enrich with search data (cache + DataForSEO + Etsy volume conversion)
        console.log('[generate-keywords] Step B: Enriching with search data...');
        const enrichedStats = await stepB_enrichKeywords(uniqueKeywords);
        console.log(`[generate-keywords] Step B complete: ${enrichedStats.length} keywords enriched`);

        // Step C: Score keywords (niche + transactional in parallel)
        console.log('[generate-keywords] Step C: Scoring keywords...');
        const scoredKeywords = await stepC_scoreKeywords(enrichedStats, body);
        console.log(`[generate-keywords] Step C complete: ${scoredKeywords.length} keywords scored`);

        // Step D: AI selection + listing strength calculation
        console.log('[generate-keywords] Step D: Selecting and calculating strength...');
        const { keywords: finalKeywords, strength } = stepD_selectAndCalculate(scoredKeywords, params);
        console.log(`[generate-keywords] Step D complete: LSI = ${strength?.listing_strength ?? 'N/A'}`);

        // Step E: Persist results via save-seo edge function
        console.log('[generate-keywords] Step E: Persisting results...');
        await stepE_persist(listing_id, finalKeywords, strength, params);
        console.log('[generate-keywords] Step E complete: Results saved');

        // Return response
        const selectedKeywords = finalKeywords.filter((kw) => kw.is_selection_ia);

        return NextResponse.json(
            {
                listing_strength: strength?.listing_strength ?? 0,
                breakdown: strength?.breakdown ?? {},
                stats: strength?.stats ?? {},
                total_pool_size: finalKeywords.length,
                selected_count: selectedKeywords.length,
                keywords: finalKeywords,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('[generate-keywords] Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json(
            { error: 'Failed to generate keywords.', details: errorMessage },
            { status: 500 }
        );
    }
}
