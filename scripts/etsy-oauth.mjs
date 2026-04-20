/**
 * Etsy OAuth 2.0 — One-time token acquisition script
 * 
 * Usage:
 *   node scripts/etsy-oauth.mjs YOUR_API_KEYSTRING YOUR_SHARED_SECRET
 * 
 * Both values are on: https://www.etsy.com/developers/your-apps
 */

import http from 'node:http';
import crypto from 'node:crypto';

const ETSY_API_KEY = process.argv[2];
const ETSY_SHARED_SECRET = process.argv[3];

if (!ETSY_API_KEY || !ETSY_SHARED_SECRET) {
  console.error('');
  console.error('  Usage: node scripts/etsy-oauth.mjs API_KEYSTRING SHARED_SECRET');
  console.error('');
  console.error('  Get both from: https://www.etsy.com/developers/your-apps');
  console.error('');
  process.exit(1);
}

// Etsy v3 requires "keystring:secret" in x-api-key header
const X_API_KEY = `${ETSY_API_KEY}:${ETSY_SHARED_SECRET}`;

const PORT = 3003;
const REDIRECT_URI = `http://localhost:${PORT}/oauth/redirect`;
const SCOPES = ['listings_r', 'listings_w', 'shops_r'];
// --- Step 1: Generate PKCE challenge ---
const codeVerifier = crypto.randomBytes(32).toString('base64url');
const codeChallenge = crypto
  .createHash('sha256')
  .update(codeVerifier)
  .digest('base64url');
const state = crypto.randomBytes(16).toString('hex');

// --- Build authorize URL ---
const authorizeUrl = new URL('https://www.etsy.com/oauth/connect');
authorizeUrl.searchParams.set('response_type', 'code');
authorizeUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authorizeUrl.searchParams.set('scope', SCOPES.join(' '));
authorizeUrl.searchParams.set('client_id', ETSY_API_KEY);
authorizeUrl.searchParams.set('state', state);
authorizeUrl.searchParams.set('code_challenge', codeChallenge);
authorizeUrl.searchParams.set('code_challenge_method', 'S256');

console.log('');
console.log('  Open this URL in your browser:');
console.log('');
console.log(`  ${authorizeUrl.toString()}`);
console.log('');
console.log('  Waiting for Etsy to redirect back...');
console.log('');

// --- Step 2: Start local server to capture the redirect ---
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  
  if (url.pathname !== '/oauth/redirect') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const code = url.searchParams.get('code');
  const returnedState = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    console.error(`  Error from Etsy: ${error}`);
    res.writeHead(400);
    res.end(`Error: ${error}`);
    server.close();
    process.exit(1);
  }

  if (returnedState !== state) {
    console.error('  State mismatch');
    res.writeHead(400);
    res.end('State mismatch');
    server.close();
    process.exit(1);
  }

  if (!code) {
    console.error('  No authorization code received');
    res.writeHead(400);
    res.end('No code received');
    server.close();
    process.exit(1);
  }

  console.log('  Authorization code received! Exchanging for tokens...');
  console.log('');

  try {
    const tokenResponse = await fetch('https://api.etsy.com/v3/public/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: ETSY_API_KEY,
        redirect_uri: REDIRECT_URI,
        code,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${tokenResponse.status} - ${errText}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;

    console.log('  Tokens received! Fetching shop info...');
    console.log('');

    // --- Step 3: Fetch shop_id ---
    const userId = accessToken.split('.')[0];

    const shopResponse = await fetch(
      `https://api.etsy.com/v3/application/users/${userId}/shops`,
      {
        headers: {
          'x-api-key': X_API_KEY,
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!shopResponse.ok) {
      const errText = await shopResponse.text();
      throw new Error(`Shop fetch failed: ${shopResponse.status} - ${errText}`);
    }

    const shopData = await shopResponse.json();
    const shop = shopData.results?.[0] || shopData;
    const shopId = shop.shop_id;
    const shopName = shop.shop_name;

    // --- Output ---
    console.log('  ===================================================');
    console.log('  SUCCESS! Add these to your .env file:');
    console.log('  ===================================================');
    console.log('');
    console.log(`  ETSY_API_KEY=${ETSY_API_KEY}`);
    console.log(`  ETSY_SHARED_SECRET=${ETSY_SHARED_SECRET}`);
    console.log(`  ETSY_ACCESS_TOKEN=${accessToken}`);
    console.log(`  ETSY_REFRESH_TOKEN=${refreshToken}`);
    console.log(`  ETSY_SHOP_ID=${shopId}`);
    console.log('');
    console.log(`  Shop name: ${shopName}`);
    console.log(`  Shop ID:   ${shopId}`);
    console.log(`  User ID:   ${userId}`);
    console.log(`  Token expires in: ${tokenData.expires_in}s (1 hour)`);
    console.log('');
    console.log('  The access_token expires in 1 hour.');
    console.log('  The refresh_token is permanent — our code will');
    console.log('  auto-refresh the access_token when needed.');
    console.log('  ===================================================');
    console.log('');

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <html>
        <body style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h1>Connected to ${shopName}!</h1>
          <p>Shop ID: <strong>${shopId}</strong></p>
          <p>You can close this tab and return to your terminal.</p>
        </body>
      </html>
    `);

  } catch (err) {
    console.error(`  Error: ${err.message}`);
    res.writeHead(500);
    res.end(`Error: ${err.message}`);
  }

  server.close();
});

server.listen(PORT, () => {
  console.log(`  Local server listening on http://localhost:${PORT}`);
  console.log('');
});
