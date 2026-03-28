import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../lib/supabase/server.js';
import { initSentry, Sentry } from '../lib/sentry.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  initSentry();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user_id, name, email, type, message, page } = req.body;

  if (!type || !message) {
    return res.status(400).json({ error: 'Missing required fields: type and message' });
  }

  const validTypes = ['bug', 'suggestion', 'question', 'other'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
  }

  try {
    console.info(`[feedback] type=${type} user=${user_id || 'anonymous'}`);

    const { error: dbError } = await supabaseAdmin
      .from('feedback')
      .insert({
        user_id: user_id || null,
        name: name || null,
        email: email || null,
        type,
        message,
        page: page || null,
      });

    if (dbError) throw dbError;

    // Send notification email via Resend (non-blocking — don't fail if email fails)
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'PennySEO <hello@pennyseo.ai>',
            to: ['christian.couillard@5pennyai.com'],
            subject: `[PennySEO Feedback] ${type} — from ${email || 'anonymous'}`,
            text: `Type: ${type}\nPage: ${page || 'N/A'}\nMessage: ${message}\nUser: ${email || 'anonymous'}`,
          }),
        });
      } catch (emailErr) {
        console.error('[feedback] Email notification failed:', emailErr);
      }
    }

    return res.json({ success: true });
  } catch (error: unknown) {
    Sentry.captureException(error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[feedback] Error:', msg);
    return res.status(500).json({ error: 'Failed to submit feedback', details: msg });
  }
}
