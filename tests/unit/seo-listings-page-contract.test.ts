import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const pageSource = readFileSync(new URL('../../src/pages/ListingsByStatusPage.jsx', import.meta.url), 'utf8');

describe('SEO Listings page contract', () => {
  it('keeps the five-status consultation view and individual Studio navigation', () => {
    expect(pageSource).toContain("const STATUS_KEYS = ['new', 'analyzed', 'seo-ready', 'draft-ready', 'complete'];");
    expect(pageSource).toContain("navigate('/studio', { state: { listingId: listing.id } })");
    expect(pageSource).toContain("['all', 'All'], ['etsy', 'Etsy'], ['manual', 'Manual']");
    expect(pageSource).toContain('placeholder="Search listings..."');
  });

  it('does not retain SEO Listings bulk-selection or bulk-action UI', () => {
    expect(pageSource).not.toContain('useBulkProgress');
    expect(pageSource).not.toContain('handleBulkAction');
    expect(pageSource).not.toContain('Confirm bulk action');
    expect(pageSource).not.toContain('Analyze Images');
    expect(pageSource).not.toContain('Generate Keywords');
    expect(pageSource).not.toContain('Generate Drafts');
    expect(pageSource).not.toContain('type="checkbox"');
  });
});
