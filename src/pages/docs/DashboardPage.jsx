import { DocPage, Section, Tip, DefList, DocImage, DocLink } from '@/components/docs/DocComponents';

const quickStats = [
  {
    term: 'Total Listings',
    description:
      "How many listings you've created or imported in PennySEO.",
  },
  {
    term: 'Avg. SEO Score',
    description:
      'The average listing strength across all your scored listings. This is your shop-wide SEO health indicator.',
  },
  {
    term: 'Fully Optimized',
    description:
      'How many listings have completed the full pipeline (analyzed, keywords generated, draft created).',
  },
  {
    term: 'Tokens Remaining',
    description: 'Your current token balance (monthly + bonus).',
  },
];

export default function DashboardPage() {
  return (
    <DocPage
      title="Dashboard"
      subtitle="Your shop's SEO command center"
    >
      <p>
        The Dashboard gives you a bird's-eye view of your SEO progress across all your
        listings. It shows what's working, what needs attention, and what to do next.
      </p>

      <DocImage
        src="/docs/dashboard-full.png"
        alt="Full PennySEO Dashboard showing Quick Stats, Pipeline Bar, Shop Health gauges, Recent Listings, and Trending Keywords"
        caption="Your Dashboard — the SEO command center for your shop"
      />

      <Section title="Quick Stats">
        <p>The top row displays four key metrics at a glance:</p>
        <DefList items={quickStats} />
      </Section>

      <Section title="Pipeline Bar">
        <p>
          Below the stats, a horizontal stacked bar shows how your listings are distributed
          across the five pipeline stages: <strong>New</strong>, <strong>Analyzed</strong>,{' '}
          <strong>SEO Ready</strong>, <strong>Draft Ready</strong>, and{' '}
          <strong>Complete</strong>. Each segment is proportional — so you can immediately
          see where most of your listings sit and where the bottleneck is.
        </p>
      </Section>

      <Section title="Next Actions">
        <p>
          The Next Actions section tells you exactly what to do next, prioritized by
          impact. Each row shows the action, how many listings it applies to, and the token
          cost.
        </p>
        <p>
          For example: "5 listings ready for keyword generation — 40 tokens" or "3 listings
          ready for draft generation — 3 tokens". If the token cost exceeds your current
          balance, it's highlighted in amber as a heads-up.
        </p>
        <p>
          Click any action to go directly to the SEO Listings page, filtered to the
          relevant status.
        </p>
      </Section>

      <Section title="Shop Health">
        <p>
          The Shop Health card shows your overall SEO performance through gauges:
        </p>
        <p>
          <strong>Global Strength</strong> — A large radial gauge showing your shop's
          average listing strength.
        </p>
        <p>
          Four secondary gauges show the breakdown: <strong>Visibility</strong>,{' '}
          <strong>Relevance</strong>, <strong>Conversion</strong>, and{' '}
          <strong>Competition</strong>. These are averaged across all your scored listings.
        </p>
        <p>
          Below the gauges, a 30-day score evolution chart tracks how your shop's average
          strength has changed over time. A trend badge shows whether you're improving or
          declining, and by how many points.
        </p>
        <p>
          If any listings need immediate attention (very low scores), a warning banner
          appears with the count.
        </p>
      </Section>

      <Section title="Recent Listings">
        <p>
          A table showing your most recently updated listings with thumbnail, product name,
          keyword count, SEO score, status, date, and an action button to open the listing
          in the <DocLink to="/docs/studio/analyzing">Studio</DocLink>.
        </p>
        <p>
          Etsy-imported listings show an orange <strong>"Etsy"</strong> badge on their
          thumbnail.
        </p>
      </Section>

      <Section title="Trending Keywords">
        <p>
          A compact section showing keywords from your listings that are currently trending
          (rising search volume). Each card displays the keyword, volume, and competition —
          helping you spot opportunities across your shop.
        </p>
      </Section>

      <Section title="First-run onboarding">
        <p>
          If you're new to PennySEO, the Dashboard shows a welcome screen instead of the
          regular view. It collects your name (optional), then walks you through the
          four-step workflow: Upload &amp; Analyze → Generate SEO → Generate Draft → Copy
          to Etsy.
        </p>
        <p>
          The onboarding disappears automatically once you create your first listing.
        </p>
      </Section>
    </DocPage>
  );
}
