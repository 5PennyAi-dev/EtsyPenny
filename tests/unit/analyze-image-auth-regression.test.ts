import { describe, expect, it, vi } from 'vitest';

const CLIENT_KEY = '__analyze_image_client__';

vi.mock('../../lib/supabase/server.js', () => ({
  supabaseAdmin: new Proxy({}, { get: (_target, property) => (globalThis as any)[CLIENT_KEY][property] }),
}));
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => (globalThis as any).taxonomyClient) }));
vi.mock('../../lib/ai/provider-router.js', () => ({
  runAI: vi.fn()
    .mockResolvedValueOnce({ text: JSON.stringify({ visual_analysis: validVisualAnalysis() }) })
    .mockResolvedValueOnce({ text: JSON.stringify({ theme: 'Theme', niche: 'Niche', sub_niche: 'Sub' }) }),
}));
vi.mock('../../lib/ai/extract-json.js', () => ({ extractJson: (value: string) => value }));
vi.mock('../../lib/tokens/token-middleware.js', () => ({
  checkTokenBalance: vi.fn(async () => ({ allowed: true, required: 1 })),
  deductTokens: vi.fn(async () => ({ success: true })),
}));
vi.mock('../../lib/supabase/config.js', () => ({
  getSupabaseServerConfig: () => ({ url: 'https://example.supabase.co', secretKey: 'test-key' }),
  getSupabaseEdgeHeaders: () => ({ 'Content-Type': 'application/json', apikey: 'test-key' }),
}));
vi.mock('../../lib/sentry.js', () => ({ initSentry: vi.fn(), Sentry: { captureException: vi.fn() } }));

import handler from '../../api/seo/analyze-image.js';

function validVisualAnalysis() {
  return {
    aesthetic_style: 'minimal',
    typography_details: 'No visible text',
    graphic_elements: 'clean lines',
    color_palette: 'cream — calm',
    target_audience: 'Minimalist Decor Lover',
    overall_vibe: 'A calm minimalist product for modern homes',
  };
}

function response() {
  return { statusCode: 200, body: undefined as any, status(code: number) { this.statusCode = code; return this; }, json(body: any) { this.body = body; return this; } };
}

it('reaches taxonomy lookup for an authenticated owner without a temporal-dead-zone error', async () => {
  const listingChain: any = { select: vi.fn(() => listingChain), eq: vi.fn(() => listingChain), maybeSingle: vi.fn(async () => ({ data: { id: 'owned-listing' }, error: null })) };
  (globalThis as any)[CLIENT_KEY] = {
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'owner' } }, error: null })) },
    from: vi.fn(() => listingChain),
  };
  const taxonomyChain = (rows: any[]) => ({ select: vi.fn(async () => ({ data: rows, error: null })) });
  (globalThis as any).taxonomyClient = { from: vi.fn((table: string) => taxonomyChain(table === 'v_combined_themes'
    ? [{ id: 'theme', name: 'Theme', description: null, origin: 'pennyseo' }]
    : [{ id: 'niche', name: 'Niche', description: null, origin: 'pennyseo' }])) };
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => '' })));
  const res = response();

  await handler({ method: 'POST', headers: { authorization: 'Bearer test-token' }, body: { listing_id: 'owned-listing', mockup_url: 'https://image.example/test.png' } } as any, res as any);

  expect(res.statusCode).toBe(200);
  expect((globalThis as any).taxonomyClient.from).toHaveBeenCalledWith('v_combined_themes');
});

it('rejects an incomplete visual response before taxonomy lookup or persistence', async () => {
  const listingChain: any = { select: vi.fn(() => listingChain), eq: vi.fn(() => listingChain), maybeSingle: vi.fn(async () => ({ data: { id: 'owned-listing' }, error: null })) };
  (globalThis as any)[CLIENT_KEY] = {
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'owner' } }, error: null })) },
    from: vi.fn(() => listingChain),
  };
  (globalThis as any).taxonomyClient = { from: vi.fn() };
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);

  const { runAI } = await import('../../lib/ai/provider-router.js');
  vi.mocked(runAI).mockReset().mockResolvedValueOnce({
    text: JSON.stringify({ visual_analysis: { aesthetic_style: 'minimal' } }),
  } as any);

  const res = response();
  await handler({ method: 'POST', headers: { authorization: 'Bearer test-token' }, body: { listing_id: 'owned-listing', mockup_url: 'https://image.example/test.png' } } as any, res as any);

  expect(res.statusCode).toBe(500);
  expect((globalThis as any).taxonomyClient.from).not.toHaveBeenCalled();
  expect(fetchMock).not.toHaveBeenCalled();
});

it('rejects an invalid taxonomy response before persistence or token deduction', async () => {
  const listingChain: any = { select: vi.fn(() => listingChain), eq: vi.fn(() => listingChain), maybeSingle: vi.fn(async () => ({ data: { id: 'owned-listing' }, error: null })) };
  (globalThis as any)[CLIENT_KEY] = {
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'owner' } }, error: null })) },
    from: vi.fn(() => listingChain),
  };
  const taxonomyRows = (table: string) => table === 'v_combined_themes'
    ? [{ id: 'theme', name: 'Allowed Theme', description: null, origin: 'pennyseo' }]
    : [{ id: 'niche', name: 'Allowed Niche', description: null, origin: 'pennyseo' }];
  (globalThis as any).taxonomyClient = { from: vi.fn((table: string) => ({ select: vi.fn(async () => ({ data: taxonomyRows(table), error: null })) })) };
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);

  const { runAI } = await import('../../lib/ai/provider-router.js');
  const { deductTokens } = await import('../../lib/tokens/token-middleware.js');
  vi.mocked(deductTokens).mockClear();
  vi.mocked(runAI).mockReset()
    .mockResolvedValueOnce({ text: JSON.stringify({ visual_analysis: validVisualAnalysis() }) } as any)
    .mockResolvedValueOnce({ text: JSON.stringify({ theme: 'Unknown Theme', niche: 'Allowed Niche', sub_niche: 'Buyer Phrase' }) } as any);

  const res = response();
  await handler({ method: 'POST', headers: { authorization: 'Bearer test-token' }, body: { listing_id: 'owned-listing', mockup_url: 'https://image.example/test.png' } } as any, res as any);

  expect(res.statusCode).toBe(500);
  expect(fetchMock).not.toHaveBeenCalled();
  expect(deductTokens).not.toHaveBeenCalled();
});
