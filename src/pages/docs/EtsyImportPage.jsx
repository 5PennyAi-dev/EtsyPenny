import { DocPage, Section, Tip, DefList } from '@/components/docs/DocComponents';

const statusFilters = [
  { term: 'All', description: 'Every imported listing.' },
  {
    term: 'Imported',
    description:
      'Listings that have been imported but not yet scored or optimized.',
  },
  {
    term: 'Scored',
    description: 'Listings whose original tags have been scored.',
  },
  {
    term: 'Optimized',
    description:
      'Listings that have been fully optimized with PennySEO-generated keywords.',
  },
];

export default function EtsyImportPage() {
  return (
    <DocPage
      title="Etsy Import"
      subtitle="Optimize your existing Etsy listings"
    >
      <p>
        If you already sell on Etsy, you don't have to start from scratch. PennySEO
        connects to your Etsy shop, imports your existing listings, and shows you exactly
        how your current SEO performs — so you can see the improvement when you optimize.
      </p>

      <Section title="Connecting your Etsy shop">
        <p>
          Go to <strong>My Shop</strong> from the sidebar. Click{' '}
          <strong>"Connect your Etsy shop"</strong> to authorize PennySEO to access your
          listings via Etsy's official API. You'll be redirected to Etsy to grant
          permission, then sent back to PennySEO automatically.
        </p>
        <p>
          PennySEO only reads your listing data (titles, descriptions, tags, images, and
          categories). It never modifies anything on Etsy without your explicit action.
        </p>
      </Section>

      <Section title="Browsing and importing">
        <p>
          Once connected, your Etsy listings appear in a visual grid with thumbnails.
          Browse through them, select the ones you'd like to work with, and click{' '}
          <strong>Import</strong>.
        </p>
        <p>
          Importing is free — it doesn't cost any tokens. Each imported listing is saved as
          an immutable snapshot of your original Etsy data (title, description, tags,
          image).
        </p>
        <p>
          Your plan determines how many listings you can import: Free (10), Starter (50),
          Growth (150), Pro (300).
        </p>
        <Tip>
          Start by importing your best-selling or most-viewed listings. Optimizing what
          already gets traffic gives you the fastest ROI.
        </Tip>
      </Section>

      <Section title="Scoring your existing tags">
        <p>
          After importing, you can optionally score your existing Etsy tags to see how your
          current SEO stacks up (3 tokens per listing, up to 5 at a time).
        </p>
        <p>
          Scoring runs your original tags through PennySEO's full analysis pipeline: image
          analysis, DataForSEO enrichment, AI scoring for relevance and buy intent, and
          composite strength calculation. The result is a score from 0 to 100 representing
          your current listing's SEO health.
        </p>
        <p>
          This step is optional — you can skip straight to the Studio to optimize. But
          scoring first gives you the Before score you'll need for comparison.
        </p>
      </Section>

      <Section title="Before / After comparison">
        <p>
          Once you've scored your original tags and then optimized with PennySEO, the
          Before/After comparison appears. You'll see your original score alongside your
          new PennySEO score, with a delta showing the improvement.
        </p>
        <p>
          This comparison is visible in several places: the My Shop page (as a compact
          table with all your imported listings), and the Keyword Performance header in the
          SEO Studio when working on an Etsy listing.
        </p>
        <p>
          The shop stats bar also shows your average improvement across all optimized
          listings — a useful metric to track your overall progress.
        </p>
      </Section>

      <Section title="Opening in the Studio">
        <p>
          From any imported listing, click <strong>"Open in Studio"</strong> to start
          optimizing. PennySEO pre-fills everything for you: your product image is
          downloaded and uploaded, your Etsy category is mapped to a PennySEO product type,
          and your listing is ready for the full SEO workflow.
        </p>
        <p>
          From there, the process is the same as any other listing: analyze the design,
          generate keywords, select your 13 tags, and generate an optimized title and
          description.
        </p>
        <Tip>
          When you open an Etsy listing in the Studio, leave the Description field empty
          rather than pasting your existing Etsy description. The AI works better with
          context notes than with marketing copy it might echo back.
        </Tip>
      </Section>

      <Section title="Filtering imported listings">
        <p>
          The My Shop page has status filter pills to help you track progress:
        </p>
        <DefList items={statusFilters} />
        <p>
          Each listing card shows a colored bottom border matching its status — slate for
          imported, amber for scored, green for optimized — so you can see your progress at
          a glance.
        </p>
      </Section>

      <Section title="Exporting back to Etsy">
        <p>
          After optimizing a listing, you can push your new title, description, and tags
          back to Etsy directly from PennySEO. Select the listings you want to update and
          click <strong>Export</strong>. PennySEO updates your Etsy listings via the API —
          no manual copy-pasting needed.
        </p>
        <p>Export is free and limited to 5 listings at a time.</p>
        <Tip>
          Before exporting, double-check your generated title and description in the Etsy
          Search Preview. Once exported, the changes go live on Etsy immediately.
        </Tip>
      </Section>
    </DocPage>
  );
}
