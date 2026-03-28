import { emailLayout } from './layout.js';

export function tokenPackEmail(tokens: number) {
  const subject = 'Your tokens have been added to PennySEO ⚡';

  const body = `
    <h1 style="font-size: 24px; font-weight: 700; color: #1e293b; margin: 0 0 16px;">
      ${tokens} bonus tokens added!
    </h1>
    <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 12px;">
      Your account has been credited with <strong style="color: #4f46e5;">${tokens} bonus tokens</strong>.
      These tokens never expire and can be used alongside your monthly allocation.
    </p>
    <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 24px;">
      Use them to analyze images, generate keywords, or create optimized drafts for your Etsy listings.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="https://www.pennyseo.ai/dashboard"
         style="display: inline-block; padding: 12px 32px; background: #4f46e5; color: #ffffff;
                font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 8px;">
        Start using your tokens
      </a>
    </div>
  `;

  return { subject, html: emailLayout(body) };
}
