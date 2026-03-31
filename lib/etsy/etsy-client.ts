/**
 * Shared Etsy API v3 client
 *
 * Personal access phase: uses env vars (ETSY_API_KEY, ETSY_SHARED_SECRET,
 * ETSY_ACCESS_TOKEN, ETSY_REFRESH_TOKEN).
 * Full OAuth phase (later): will accept per-user tokens from etsy_shop_connections.
 */

const ETSY_BASE = 'https://api.etsy.com/v3/application';
const ETSY_TOKEN_URL = 'https://api.etsy.com/v3/public/oauth/token';
const REQUEST_TIMEOUT = 15_000;

// ─── Types ────────────────────────────────────────────

export interface EtsyListingImage {
  listing_image_id: number;
  url_570xN: string;
  url_fullxfull: string;
  rank: number;
}

export interface EtsyListingResult {
  listing_id: number;
  title: string;
  description: string;
  tags: string[];
  url: string;
  state: string;
  images?: EtsyListingImage[];
}

export interface EtsyListingsResponse {
  count: number;
  results: EtsyListingResult[];
}

// ─── Token cache (in-memory, module-level) ────────────

let _cachedAccessToken: string | null = null;

// ─── Helpers ──────────────────────────────────────────

export function getXApiKey(): string {
  const key = process.env.ETSY_API_KEY;
  const secret = process.env.ETSY_SHARED_SECRET;
  if (!key || !secret) throw new Error('Missing ETSY_API_KEY or ETSY_SHARED_SECRET');
  return `${key}:${secret}`;
}

export async function refreshAccessToken(): Promise<string> {
  const clientId = process.env.ETSY_API_KEY;
  const refreshToken = process.env.ETSY_REFRESH_TOKEN;
  if (!clientId || !refreshToken) {
    throw new Error('Missing ETSY_API_KEY or ETSY_REFRESH_TOKEN for token refresh');
  }

  console.info('[etsy-client] Refreshing access token…');

  const res = await fetch(ETSY_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      refresh_token: refreshToken,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Etsy token refresh failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  _cachedAccessToken = data.access_token;
  console.info('[etsy-client] Access token refreshed successfully');
  return data.access_token;
}

export async function getAccessToken(): Promise<string> {
  if (_cachedAccessToken) return _cachedAccessToken;
  const envToken = process.env.ETSY_ACCESS_TOKEN;
  if (!envToken) throw new Error('Missing ETSY_ACCESS_TOKEN');
  _cachedAccessToken = envToken;
  return envToken;
}

// ─── Internal fetch with 401 retry ───────────────────

interface EtsyFetchOptions {
  method?: string;
  body?: URLSearchParams;
  contentType?: string;
}

async function etsyFetch(url: string, options?: EtsyFetchOptions, retry = true): Promise<Response> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    'x-api-key': getXApiKey(),
    'Authorization': `Bearer ${token}`,
  };

  if (options?.contentType) {
    headers['Content-Type'] = options.contentType;
  }

  const res = await fetch(url, {
    method: options?.method ?? 'GET',
    headers,
    body: options?.body,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  });

  if (res.status === 401 && retry) {
    console.info('[etsy-client] Got 401, attempting token refresh…');
    await refreshAccessToken();
    return etsyFetch(url, options, false);
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Etsy API error (${res.status}): ${body}`);
  }

  return res;
}

// ─── Public API ───────────────────────────────────────

export async function fetchShopListings(
  shopId: string,
  options: { limit?: number; offset?: number; state?: string } = {},
): Promise<EtsyListingsResponse> {
  const limit = Math.min(options.limit ?? 25, 100);
  const offset = options.offset ?? 0;
  const state = options.state ?? 'active';

  const url = `${ETSY_BASE}/shops/${shopId}/listings?state=${state}&limit=${limit}&offset=${offset}&includes=Images`;
  console.info(`[etsy-client] GET shop listings shopId=${shopId} limit=${limit} offset=${offset}`);

  const res = await etsyFetch(url);
  return res.json() as Promise<EtsyListingsResponse>;
}

export async function fetchListingsByIds(
  listingIds: number[],
): Promise<EtsyListingResult[]> {
  if (listingIds.length === 0) return [];

  const results: EtsyListingResult[] = [];

  // Etsy batch endpoint max 100 IDs per call
  for (let i = 0; i < listingIds.length; i += 100) {
    const chunk = listingIds.slice(i, i + 100);
    const ids = chunk.join(',');
    const url = `${ETSY_BASE}/listings/batch?listing_ids=${ids}&includes=Images`;
    console.info(`[etsy-client] GET listings batch (${chunk.length} IDs)`);

    const res = await etsyFetch(url);
    const data = await res.json() as { results: EtsyListingResult[] };
    results.push(...data.results);
  }

  return results;
}

export async function updateEtsyListing(
  listingId: number,
  fields: {
    title?: string;
    description?: string;
    tags?: string[];
  },
): Promise<{ success: boolean; data?: any; error?: string }> {
  const shopId = process.env.ETSY_SHOP_ID;
  if (!shopId) throw new Error('Missing ETSY_SHOP_ID env var');

  // Build form-urlencoded body with only provided fields
  const body = new URLSearchParams();

  if (fields.title !== undefined) {
    if (fields.title.length > 140) {
      return { success: false, error: `Title exceeds 140 chars (${fields.title.length})` };
    }
    body.append('title', fields.title);
  }

  if (fields.description !== undefined) {
    body.append('description', fields.description);
  }

  if (fields.tags !== undefined) {
    if (fields.tags.length > 13) {
      return { success: false, error: `Max 13 tags allowed, got ${fields.tags.length}` };
    }
    const invalidTag = fields.tags.find(t => t.length > 20);
    if (invalidTag) {
      return { success: false, error: `Tag exceeds 20 chars: "${invalidTag}"` };
    }
    body.append('tags', fields.tags.join(','));
  }

  const url = `${ETSY_BASE}/shops/${shopId}/listings/${listingId}`;
  console.info(`[Etsy Export] PATCH listing shopId=${shopId} listingId=${listingId} fields=${[...body.keys()].join(',')}`);

  try {
    const res = await etsyFetch(url, {
      method: 'PATCH',
      body,
      contentType: 'application/x-www-form-urlencoded',
    });

    const data = await res.json();
    console.info(`[Etsy Export] Success for listing ${listingId}`);
    return { success: true, data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[Etsy Export] Failed for listing ${listingId}:`, message);
    return { success: false, error: message };
  }
}
