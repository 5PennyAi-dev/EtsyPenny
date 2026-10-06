import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../lib/supabase/server.js';
import { enrichKeywords } from '../../lib/seo/enrich-keywords.js';
import { initSentry, Sentry } from '../../lib/sentry.js';
import { verifyRequestUser, AuthError } from '../../lib/auth/verify-request-user.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  initSentry();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { keyword_bank_ids, tags } = req.body;
    const user = await verifyRequestUser(req.headers.authorization, supabaseAdmin);

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({ error: 'tags array required' });
    }
    if (tags.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 keywords per refresh' });
    }
    if (!Array.isArray(keyword_bank_ids) || keyword_bank_ids.length !== tags.length) {
      return res.status(400).json({ error: 'keyword_bank_ids must match tags' });
    }
    const { data: ownedRows } = await supabaseAdmin
      .from('user_keyword_bank')
      .select('id')
      .eq('user_id', user.id)
      .in('id', keyword_bank_ids);
    if (!ownedRows || ownedRows.length !== keyword_bank_ids.length) {
      return res.status(403).json({ error: 'One or more keywords do not belong to this user' });
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
          .eq('id', bankId)
          .eq('user_id', user.id);

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
    if (err instanceof AuthError) return res.status(err.status).json({ error: err.message });
    Sentry.captureException(err);
    console.error('[refresh-keyword-bank] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
