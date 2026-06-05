import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../lib/supabase/server.js';
import { verifyRequestUser, AuthError } from '../../lib/auth/verify-request-user.js';
import { initSentry, Sentry } from '../../lib/sentry.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  initSentry();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const caller = await verifyRequestUser(req.headers.authorization, supabaseAdmin);

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single();
    if (profile?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const [profilesResult, authResult] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('id, full_name, subscription_plan, subscription_status, tokens_monthly_balance, tokens_bonus_balance, add_custom_used, add_favorite_used, stripe_customer_id, is_blocked, tokens_reset_at, updated_at')
        .order('updated_at', { ascending: false }),
      supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
    ]);

    if (profilesResult.error) throw profilesResult.error;

    const emailMap = new Map(
      (authResult.data?.users ?? []).map(u => [u.id, u.email ?? null])
    );

    const users = (profilesResult.data ?? []).map(p => ({
      ...p,
      email: emailMap.get(p.id) ?? null,
    }));

    return res.status(200).json({ users });
  } catch (err) {
    if (err instanceof AuthError) return res.status(err.status).json({ error: err.message });
    Sentry.captureException(err);
    console.error('[admin/users] error:', err);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
}
