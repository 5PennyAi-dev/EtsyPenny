import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../lib/supabase/server.js';
import { enrichKeywords } from '../../lib/seo/enrich-keywords.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { keyword_bank_ids, tags } = req.body;

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({ error: 'tags array required' });
    }
    if (tags.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 keywords per refresh' });
    }

    // Call DataForSEO enrichment
    const enriched = await enrichKeywords(tags);

    // Update user_keyword_bank with fresh data
    const results = [];
    for (let i = 0; i < tags.length; i++) {
      const tag = tags[i];
      const bankId = keyword_bank_ids?.[i];
      const data = enriched.find((e: any) => e.tag === tag || e.keyword === tag);

      if (data && bankId) {
        const payload = {
          last_volume: data.search_volume || 0,
          last_competition: data.competition || 0,
          last_cpc: data.cpc || 0,
          volume_history: data.volume_history || [],
          last_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        await supabaseAdmin
          .from('user_keyword_bank')
          .update(payload)
          .eq('id', bankId);

        results.push({ tag, ...payload });
      } else {
        results.push({ tag, error: 'No data found' });
      }
    }

    return res.status(200).json({
      success: true,
      results,
      refreshed_count: results.filter(r => !(r as any).error).length,
    });
  } catch (err: any) {
    console.error('[refresh-keyword-bank] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
