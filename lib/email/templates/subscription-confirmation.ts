import { emailLayout } from './layout.js';

export function subscriptionEmail(planName: string, tokens: number) {
  const displayPlan = planName.charAt(0).toUpperCase() + planName.slice(1);
  const subject = `Your PennySEO ${displayPlan} plan is active ✅`;

  const body = `
    <h1 style="font-size: 24px; font-weight: 700; color: #1e293b; margin: 0 0 16px;">
      Your ${displayPlan} plan is now active!
    </h1>
    <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 12px;">
      Thank you for upgrading to the <strong style="color: #4f46e5;">${displayPlan}</strong> plan.
      Your account has been credited with <strong>${tokens} tokens</strong> for this billing period.
    </p>
    <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 24px;">
      Your tokens will refresh automatically at the start of each billing cycle.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="https://www.pennyseo.ai/dashboard"
         style="display: inline-block; padding: 12px 32px; background: #4f46e5; color: #ffffff;
                font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 8px;">
        Go to dashboard
      </a>
    </div>
    <p style="font-size: 13px; color: #94a3b8; text-align: center; margin: 0;">
      <a href="https://www.pennyseo.ai/billing" style="color: #6366f1; text-decoration: underline;">
        Manage your subscription
      </a>
    </p>
  `;

  return { subject, html: emailLayout(body) };
}
