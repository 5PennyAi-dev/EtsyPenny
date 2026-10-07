import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../lib/supabase/server.js';
import { initSentry, Sentry } from '../../lib/sentry.js';
import { verifyRequestUser, AuthError } from '../../lib/auth/verify-request-user.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  initSentry();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messageId, feedback, note } = req.body ?? {};

  let user;
  try { user = await verifyRequestUser(req.headers.authorization, supabaseAdmin); }
  catch (error) { if (error instanceof AuthError) return res.status(error.status).json({ error: error.message }); throw error; }
  const user_id = user.id;
  if (!messageId || typeof messageId !== 'string') {
    return res.status(400).json({ error: 'Missing required field: messageId' });
  }
  if (feedback !== -1 && feedback !== 1) {
    return res.status(400).json({ error: 'feedback must be -1 or 1' });
  }
  if (note != null && typeof note !== 'string') {
    return res.status(400).json({ error: 'note must be a string if provided' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('help_messages')
      .update({
        feedback,
        feedback_note: typeof note === 'string' && note.trim() ? note.trim() : null,
      })
      .eq('id', messageId)
      .eq('user_id', user_id)
      .select('id')
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Message not found' });
    }

    return res.json({ ok: true });
  } catch (err) {
    Sentry.captureException(err);
    console.error('[help/feedback] error:', err);
    return res.status(500).json({ error: 'Failed to record feedback' });
  }
}
