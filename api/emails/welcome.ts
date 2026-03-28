import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendEmail } from '../../lib/email/send-email.js';
import { welcomeEmail } from '../../lib/email/templates/welcome.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, name } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const { subject, html } = welcomeEmail(name || '');
  sendEmail({ to: email, subject, html }); // fire-and-forget

  return res.status(200).json({ ok: true });
}
