import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendEmail } from '../../lib/email/send-email.js';
import { welcomeEmail } from '../../lib/email/templates/welcome.js';
import { initSentry, Sentry } from '../../lib/sentry.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  initSentry();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, name } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email is required' });

  console.info(`[welcome-email] Sending to ${email} (VERCEL_ENV=${process.env.VERCEL_ENV})`);
  const { subject, html } = welcomeEmail(name || '');
  await sendEmail({ to: email, subject, html });

  return res.status(200).json({ ok: true });
}
