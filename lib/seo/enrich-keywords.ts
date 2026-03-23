/**
 * Verbatim extract from server.mjs lines 268-346.
 * Cache check + DataForSEO enrichment + Etsy volume conversion.
 */

// server.mjs lines 268-271
export function getEtsyVolume(webVol: number): number {
  if (!webVol || webVol <= 0) return 0;
  return Math.round(22 * Math.pow(webVol, 0.9));
}

interface EnrichedKeyword {
  keyword: string;
  search_volume: number;
  competition: number;
  cpc: number;
  volume_history: number[];
  fromCache: boolean;
}

export async function enrichKeywords(keywords: string[]): Promise<EnrichedKeyword[]> {
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const N8N_SECRET = process.env.N8N_WEBHOOK_SECRET || '';
  const DATAFORSEO_LOGIN = process.env.DATAFORSEO_LOGIN;
  const DATAFORSEO_PASSWORD = process.env.DATAFORSEO_PASSWORD;

  // B1: Cache check
  let cached: Array<{ tag: string; search_volume?: number; competition?: number; cpc?: number; volume_history?: number[] }> = [];
  try {
    const cacheRes = await fetch(`${SUPABASE_URL}/functions/v1/check-keyword-cache`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'x-api-key': N8N_SECRET },
      body: JSON.stringify({ keywords }),
    });
    if (cacheRes.ok) { const d = await cacheRes.json(); cached = d.cachedKeywords || []; }
  } catch (e: unknown) { console.warn('   ⚠️ Cache check failed:', (e as Error).message); }

  const cachedTags = new Set(cached.map(c => c.tag));
  const fromCache: EnrichedKeyword[] = cached.map(c => ({
    keyword: c.tag,
    search_volume: c.search_volume || 0,
    competition: c.competition ?? 0.5,
    cpc: c.cpc || 0,
    volume_history: c.volume_history || [],
    fromCache: true,
  }));

  // B2: DataForSEO for uncached
  const uncached = keywords.filter(kw => !cachedTags.has(kw));
  console.log(`   🔍 Uncached keywords to enrich: ${uncached.length}`);
  let fromAPI: EnrichedKeyword[] = [];
  if (uncached.length > 0 && DATAFORSEO_LOGIN && !DATAFORSEO_LOGIN.startsWith('your_')) {
    try {
      const dfsRes = await fetch('https://api.dataforseo.com/v3/keywords_data/google/search_volume/live', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + Buffer.from(`${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`).toString('base64'),
        },
        body: JSON.stringify([{ keywords: uncached, location_name: 'United States', language_name: 'English' }]),
      });
      if (dfsRes.ok) {
        const dfsData = await dfsRes.json();
        const items = dfsData?.tasks?.[0]?.result || [];
        console.log(`   🔍 DataForSEO status: ${dfsData?.tasks?.[0]?.status_code} ${dfsData?.tasks?.[0]?.status_message} | items: ${items.length}`);
        fromAPI = items.map((item: { keyword: string; search_volume?: number; competition?: number; cpc?: number; monthly_searches?: Array<{ search_volume?: number }> }) => ({
          keyword: item.keyword,
          search_volume: getEtsyVolume(item.search_volume || 0),
          competition: item.competition ?? 0.5,
          cpc: item.cpc || 0,
          volume_history: item.monthly_searches
            ? item.monthly_searches.map(m => getEtsyVolume(m.search_volume || 0)).reverse()
            : new Array(12).fill(0),
          fromCache: false,
        }));
      } else {
        const errBody = await dfsRes.text().catch(() => 'unable to read body');
        console.warn(`   ⚠️ DataForSEO HTTP ${dfsRes.status}: ${errBody.slice(0, 300)}`);
      }
    } catch (e: unknown) { console.warn('   ⚠️ DataForSEO failed:', (e as Error).message); }
  } else if (uncached.length > 0) {
    console.warn(`   ⚠️ DataForSEO skipped: LOGIN=${DATAFORSEO_LOGIN ? 'set' : 'MISSING'}`);
  }

  // B3: Zero-fill missing
  const known = new Set([...fromCache.map(k => k.keyword), ...fromAPI.map(k => k.keyword)]);
  const missing: EnrichedKeyword[] = keywords.filter(kw => !known.has(kw)).map(kw => ({
    keyword: kw, search_volume: 0, competition: 0.5, cpc: 0, volume_history: new Array(12).fill(0), fromCache: false,
  }));
  console.log(`   📊 Enriched: ${fromCache.length} cached + ${fromAPI.length} API + ${missing.length} zero-fill = ${fromCache.length + fromAPI.length + missing.length}`);
  return [...fromCache, ...fromAPI, ...missing];
}
