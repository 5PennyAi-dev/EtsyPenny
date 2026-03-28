/**
 * Shared email layout wrapper.
 * Plain HTML with inline styles — no external CSS, no framework.
 */
export function emailLayout(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin: 0; padding: 0; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 560px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 32px;">
      <span style="font-size: 22px; font-weight: 700; color: #4f46e5; letter-spacing: -0.5px;">
        PennySEO
      </span>
    </div>

    <!-- Content Card -->
    <div style="background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0;">
      ${body}
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 32px; font-size: 12px; color: #94a3b8; line-height: 1.5;">
      <p style="margin: 0 0 4px;">The PennySEO team</p>
      <p style="margin: 0;">
        <a href="https://www.pennyseo.ai" style="color: #94a3b8; text-decoration: underline;">pennyseo.ai</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}
