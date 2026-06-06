import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../lib/supabase/server.js';
import { verifyRequestUser, AuthError } from '../../lib/auth/verify-request-user.js';
import { initSentry, Sentry } from '../../lib/sentry.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  initSentry();
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const caller = await verifyRequestUser(req.headers.authorization, supabaseAdmin);

    // Verify caller is admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single();
    if (profileError || profile?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { userId } = req.body ?? {};
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'Missing required field: userId' });
    }

    // Prevent self-deletion
    if (userId === caller.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await hardDeleteUser(userId);

    console.info(`[admin/delete-user] user ${userId} deleted by admin ${caller.id}`);
    return res.status(200).json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) return res.status(err.status).json({ error: err.message });
    Sentry.captureException(err);
    console.error('[admin/delete-user] error:', err);
    return res.status(500).json({ error: 'Failed to delete user' });
  }
}

async function hardDeleteUser(userId: string) {
  const db = supabaseAdmin;

  // Level 1: children of listings
  const { data: listingIds } = await db.from('listings').select('id').eq('user_id', userId);
  if (listingIds?.length) {
    const ids = listingIds.map((r: { id: string }) => r.id);
    await db.from('listing_mockups').delete().in('listing_id', ids);
    await db.from('listing_seo_stats').delete().in('listing_id', ids);
    await db.from('listings_global_eval').delete().in('listing_id', ids);
  }

  // Level 2: tables that reference both listings and user
  await db.from('etsy_export_logs').delete().eq('user_id', userId);
  await db.from('etsy_listings').delete().eq('user_id', userId);

  // Level 3: direct user data
  await db.from('help_messages').delete().eq('user_id', userId);
  await db.from('help_conversations').delete().eq('user_id', userId);
  await db.from('etsy_oauth_states').delete().eq('user_id', userId);
  await db.from('etsy_shop_connections').delete().eq('user_id', userId);
  await db.from('credits_usage').delete().eq('user_id', userId);
  await db.from('feedback').delete().eq('user_id', userId);
  await db.from('keyword_presets').delete().eq('user_id', userId);
  await db.from('token_transactions').delete().eq('user_id', userId);
  await db.from('user_custom_niches').delete().eq('user_id', userId);
  await db.from('user_custom_product_types').delete().eq('user_id', userId);
  await db.from('user_custom_themes').delete().eq('user_id', userId);
  await db.from('user_keyword_bank').delete().eq('user_id', userId);
  await db.from('user_settings').delete().eq('user_id', userId);

  // Level 4: parent tables
  await db.from('listings').delete().eq('user_id', userId);
  await db.from('subscriptions').delete().eq('user_id', userId);
  await db.from('customers').delete().eq('id', userId);
  await db.from('profiles').delete().eq('id', userId);

  // Final: remove from auth
  const { error } = await db.auth.admin.deleteUser(userId);
  if (error) throw new Error(`auth.admin.deleteUser failed: ${error.message}`);
}
