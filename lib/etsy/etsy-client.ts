/**
 * Etsy API v3 client.
 *
 * Contract:
 *   - Every Etsy-calling function takes an `EtsyConnection` as its first arg.
 *     The connection supplies `accessToken`, `etsyShopId`, etc.
 *   - This module never reads user-specific tokens from `process.env`. The
 *     app keystring (`ETSY_API_KEY` + `ETSY_SHARED_SECRET`) is still env —
 *     that's the application's identity, not a user's credential.
 *   - On a 401 response this module throws (with the Etsy body included). It
 *     does NOT attempt to refresh — token refresh lives upstream in
 *     `lib/etsy/get-connection.ts`.
 */

import type { EtsyConnection } from './get-connection.js';

const ETSY_BASE = 'https://api.etsy.com/v3/application';
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
  taxonomy_id?: number;
  images?: EtsyListingImage[];
}

export interface EtsyListingsResponse {
  count: number;
  results: EtsyListingResult[];
}

// ─── Taxonomy cache (in-memory, 1h TTL) ──────────────
// Seller-taxonomy is global Etsy data, not user-specific — safe to cache
// process-wide.

let _taxonomyCache: Map<number, string> | null = null;
let _taxonomyCacheTime = 0;
const TAXONOMY_CACHE_TTL = 60 * 60 * 1000;

// ─── Helpers ──────────────────────────────────────────

export function getXApiKey(): string {
  const key = process.env.ETSY_API_KEY;
  const secret = process.env.ETSY_SHARED_SECRET;
  if (!key || !secret) throw new Error('Missing ETSY_API_KEY or ETSY_SHARED_SECRET');
  return `${key}:${secret}`;
}

interface EtsyFetchOptions {
  method?: string;
  body?: URLSearchParams;
  contentType?: string;
}

async function etsyFetch(
  connection: EtsyConnection,
  url: string,
  options?: EtsyFetchOptions,
): Promise<Response> {
  const headers: Record<string, string> = {
    'x-api-key': getXApiKey(),
    'Authorization': `Bearer ${connection.accessToken}`,
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

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 401) {
      throw new Error(`Etsy API 401 Unauthorized: ${body}`);
    }
    throw new Error(`Etsy API error (${res.status}): ${body}`);
  }

  return res;
}

// ─── Public API ───────────────────────────────────────

export async function fetchShopListings(
  connection: EtsyConnection,
  options: { limit?: number; offset?: number; state?: string } = {},
): Promise<EtsyListingsResponse> {
  const limit = Math.min(options.limit ?? 25, 100);
  const offset = options.offset ?? 0;
  const state = options.state ?? 'active';
  const shopId = connection.etsyShopId;

  const url = `${ETSY_BASE}/shops/${shopId}/listings?state=${state}&limit=${limit}&offset=${offset}&includes=Images`;
  console.info(`[etsy-client] GET shop listings shopId=${shopId} limit=${limit} offset=${offset}`);

  const res = await etsyFetch(connection, url);
  return res.json() as Promise<EtsyListingsResponse>;
}

export async function fetchListingsByIds(
  connection: EtsyConnection,
  listingIds: number[],
): Promise<EtsyListingResult[]> {
  if (listingIds.length === 0) return [];

  const results: EtsyListingResult[] = [];

  for (let i = 0; i < listingIds.length; i += 100) {
    const chunk = listingIds.slice(i, i + 100);
    const ids = chunk.join(',');
    const url = `${ETSY_BASE}/listings/batch?listing_ids=${ids}&includes=Images`;
    console.info(`[etsy-client] GET listings batch (${chunk.length} IDs)`);

    const res = await etsyFetch(connection, url);
    const data = await res.json() as { results: EtsyListingResult[] };
    results.push(...data.results);
  }

  return results;
}

export async function updateEtsyListing(
  connection: EtsyConnection,
  listingId: number,
  fields: {
    title?: string;
    description?: string;
    tags?: string[];
  },
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const shopId = connection.etsyShopId;

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

    const res = await etsyFetch(connection, url, {
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

export async function getSellerTaxonomyNodes(
  connection: EtsyConnection,
): Promise<Map<number, string>> {
  if (_taxonomyCache && Date.now() - _taxonomyCacheTime < TAXONOMY_CACHE_TTL) {
    return _taxonomyCache;
  }

  const url = `${ETSY_BASE}/seller-taxonomy/nodes`;
  console.info('[etsy-client] Fetching seller taxonomy nodes...');

  const res = await etsyFetch(connection, url);
  const data = await res.json() as { count: number; results: any[] };

  const map = new Map<number, string>();
  function walk(nodes: any[], path: string[]) {
    for (const node of nodes) {
      const fullPath = [...path, node.name];
      map.set(node.id, fullPath.join(' > '));
      if (node.children?.length) walk(node.children, fullPath);
    }
  }
  walk(data.results || [], []);

  _taxonomyCache = map;
  _taxonomyCacheTime = Date.now();
  console.info(`[etsy-client] Taxonomy cached: ${map.size} nodes`);
  return map;
}
