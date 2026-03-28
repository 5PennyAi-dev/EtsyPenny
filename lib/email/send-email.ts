/**
 * Shared email sender using Resend HTTP API.
 * Non-blocking — never throws, logs errors silently.
 * Skips sending in local dev (only sends when VERCEL_ENV=production).
 */
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;

  // Only send in production (Vercel)
  if (process.env.VERCEL_ENV !== 'production') return;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'PennySEO <hello@pennyseo.ai>',
        to,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[email] Resend API error ${res.status}: ${body}`);
    }
  } catch (err) {
    console.error('[email] Failed to send:', err);
  }
}
