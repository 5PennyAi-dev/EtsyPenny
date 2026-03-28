import { emailLayout } from './layout.js';

export function welcomeEmail(name: string) {
  const subject = 'Welcome to PennySEO 🎉';

  const body = `
    <h1 style="font-size: 24px; font-weight: 700; color: #1e293b; margin: 0 0 16px;">
      Welcome to PennySEO${name ? `, ${name}` : ''}!
    </h1>
    <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 12px;">
      PennySEO is your AI-powered SEO assistant for Etsy. Upload your product mockups,
      and we'll generate optimized titles, descriptions, and tags to help your listings
      rank higher and sell more.
    </p>
    <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 24px;">
      You have <strong style="color: #4f46e5;">30 free tokens</strong> to get started.
      Each token lets you analyze an image or generate SEO keywords for a listing.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="https://www.pennyseo.ai/dashboard"
         style="display: inline-block; padding: 12px 32px; background: #4f46e5; color: #ffffff;
                font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 8px;">
        Start optimizing
      </a>
    </div>
  `;

  return { subject, html: emailLayout(body) };
}
