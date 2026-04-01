import { DocPage, Section, Tip, DefList } from '@/components/docs/DocComponents';

const tableColumns = [
  {
    term: 'Tag',
    description:
      'The keyword itself, displayed as a styled pill. Trending and Evergreen indicators appear as small icons next to the tag when applicable.',
  },
  {
    term: 'Volume',
    description: 'Latest monthly search volume from DataForSEO.',
  },
  {
    term: 'Trend',
    description: 'A 12-month sparkline showing the volume trajectory.',
  },
  {
    term: 'Competition',
    description: 'Color-coded score (green, amber, red).',
  },
  {
    term: 'CPC',
    description: 'Cost-per-click value.',
  },
  {
    term: 'Niche',
    description:
      'Breadcrumb showing Theme \u203A Niche \u203A Sub-niche context from the original listing.',
  },
  {
    term: 'Used In',
    description:
      'How many of your active listings currently use this keyword. An indigo badge for 1\u20132 listings, green for 3+.',
  },
  {
    term: 'Freshness',
    description:
      'When the data was last updated. Keywords older than 21 days are flagged as stale.',
  },
];

const filterPills = [
  { term: 'All', description: 'No filter, show everything.' },
  {
    term: 'Gems',
    description:
      'Keywords with high volume, low competition, and good CPC \u2014 the best opportunities.',
  },
  { term: 'Trending', description: 'Keywords with rising search volume.' },
  {
    term: 'High Volume',
    description: 'Keywords above a volume threshold.',
  },
  {
    term: 'Low Competition',
    description: 'Keywords with competition below 0.3.',
  },
  {
    term: 'Unused',
    description: 'Keywords not currently used in any of your listings.',
  },
  {
    term: 'Stale',
    description:
      'Keywords with data older than 21 days that need refreshing.',
  },
];

const bulkActions = [
  {
    term: 'Add to Preset',
    description:
      'Bundle the selected keywords into a new or existing preset.',
  },
  {
    term: 'Export CSV',
    description: 'Download your selected keywords as a CSV file.',
  },
  {
    term: 'Refresh Stale',
    description: 'Refresh data for all selected stale keywords at once.',
  },
  {
    term: 'Delete',
    description: 'Remove the selected keywords from your bank.',
  },
];

const individualActions = [
  {
    term: 'Copy keyword',
    description: 'Copy the tag text to your clipboard.',
  },
  {
    term: 'Add to preset',
    description: 'Add this keyword to an existing preset.',
  },
  {
    term: 'Refresh data',
    description:
      'Pull fresh data for this keyword (only available when stale).',
  },
  {
    term: 'Remove from bank',
    description: 'Delete this keyword from your Favorites.',
  },
];

export default function FavoriteTagsPage() {
  return (
    <DocPage
      title="Favorite Tags"
      subtitle="Build your personal keyword library"
    >
      <p>
        The Favorite Tags tab in the SEO Lab is your personal keyword bank — a growing
        library of keywords you've saved across all your listings. Over time, it becomes
        your most valuable SEO asset: a curated collection of proven keywords you can
        reuse, track, and organize.
      </p>

      <Section title="Saving keywords to your bank">
        <p>There are two ways to add keywords to your Favorite Tags:</p>
        <p>
          From the <strong>Keyword Performance table</strong> in the SEO Studio, click the
          star icon on any keyword row. It turns gold and the keyword is saved to your bank
          with all its data (volume, competition, CPC, trend history).
        </p>
        <p>
          You can also <strong>add keywords manually</strong> directly in the SEO Lab using
          the inline add row at the top of the table.
        </p>
        <p>
          Each keyword is stored with its origin context — the theme, niche, and sub-niche
          from the listing where you first saved it. This helps you filter and organize
          later.
        </p>
      </Section>

      <Section title="Reading the table">
        <p>The Favorite Tags table shows each keyword with:</p>
        <DefList items={tableColumns} />
        <p>
          You can sort by any column by clicking the header. The table is paginated —
          choose 10, 25, or 50 rows per page.
        </p>
      </Section>

      <Section title="Filtering your keywords">
        <p>Use the search bar to find specific keywords by name.</p>
        <p>
          Below the search bar, filter pills let you narrow down your library. Multiple
          pills can be active at once — they stack with AND logic:
        </p>
        <DefList items={filterPills} />
        <p>
          For deeper filtering, click the <strong>Filter</strong> button next to the search
          bar. This opens dropdown filters for Theme, Niche, and Sub-niche. The dropdowns
          cascade — selecting a Theme narrows the available Niches to only those associated
          with it.
        </p>
      </Section>

      <Section title="Grouped view">
        <p>
          Toggle between List view and Grouped view using the segmented control next to
          the search bar.
        </p>
        <p>
          Grouped view organizes your keywords into collapsible sections by Theme › Niche,
          with aggregate stats per group: average volume, average competition, gem count,
          and usage ratio. This gives you a bird's-eye view of where your keyword strength
          is concentrated.
        </p>
      </Section>

      <Section title="Refreshing stale keywords">
        <p>
          Keyword data gets stale over time — search volumes shift, competition changes.
          Keywords older than 21 days are flagged with a "Stale" indicator.
        </p>
        <p>
          You can refresh data three ways: individually from the action menu on any stale
          keyword, in bulk by selecting keywords and using the bulk action bar, or all at
          once by clicking <strong>"Refresh all stale"</strong> when the Stale filter pill
          is active.
        </p>
        <p>
          Refreshing pulls fresh data from DataForSEO — updated volume, competition, CPC,
          and trend history.
        </p>
        <Tip>
          Make it a habit to refresh your stale keywords every few weeks. Search trends
          change, and a keyword that was a gem last month might be saturated now — or vice
          versa.
        </Tip>
      </Section>

      <Section title="Bulk actions">
        <p>
          Select multiple keywords using the checkboxes (the header checkbox selects all on
          the current page). A sticky action bar appears at the bottom with:
        </p>
        <DefList items={bulkActions} />
      </Section>

      <Section title="Individual actions">
        <p>Click the three-dot menu on any keyword row for:</p>
        <DefList items={individualActions} />
      </Section>
    </DocPage>
  );
}
