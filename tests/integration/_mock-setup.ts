/**
 * Shared mock setup for integration tests.
 *
 * IMPORTANT: This file does NOT call vi.mock() — each test file must do that.
 * This file only exports helpers for configuring mock responses and test data.
 */

export const LISTING_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
export const USER_ID = 'u1u2u3u4-u5u6-7890-abcd-000000000001';
export const PRODUCT_TYPE_ID = 'pt-0001-0000-0000-000000000001';

/** Creates N mock keywords resembling listing_seo_stats rows. */
export function makeKeywords(count = 20) {
  return Array.from({ length: count }, (_, i) => ({
    id: `kw-${i}`,
    listing_id: LISTING_ID,
    tag: `test keyword ${i}`,
    keyword: `test keyword ${i}`,
    search_volume: 10000 - i * 300,
    competition: (0.2 + i * 0.03).toString(),
    cpc: 0.5 + i * 0.05,
    niche_score: 7,
    transactional_score: 7,
    volume_history: [10000 - i * 300, 9500, 9000, 8500, 8000, 7500, 7000, 6500, 6000, 5500, 5000, 4500],
    is_pinned: i === 0,
    is_user_added: i === 1,
    is_selection_ia: false,
    is_current_pool: true,
    is_current_eval: false,
    is_competition: false,
  }));
}

/** A minimal listing object matching what routes query from `listings`. */
export function makeListing(overrides: Record<string, unknown> = {}) {
  return {
    id: LISTING_ID,
    user_id: USER_ID,
    product_type_id: PRODUCT_TYPE_ID,
    theme: 'Boho',
    niche: 'Home Decor',
    sub_niche: 'Ceramics',
    visual_aesthetic: 'handmade artisan',
    visual_target_audience: 'home decor enthusiasts',
    visual_overall_vibe: 'warm and cozy',
    image_url: 'https://example.com/image.jpg',
    ...overrides,
  };
}
