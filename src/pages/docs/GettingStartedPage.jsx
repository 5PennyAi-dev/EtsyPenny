import { DocPage, Section, Tip, TokenTable, DocLink } from '@/components/docs/DocComponents';
import { ArrowRight } from 'lucide-react';

const tokenRows = [
  { action: 'Import Etsy listings', cost: 'Free' },
  { action: 'Analyse Design', cost: '1 token' },
  { action: 'Generate SEO Keywords', cost: '3 tokens (2 to re-generate)' },
  { action: 'Generate Listing Draft', cost: '1 token' },
  { action: 'Score Etsy Listing', cost: '3 tokens per listing' },
];

const nextSteps = [
  {
    title: 'Save keywords you like',
    description:
      'Click the star icon on any keyword to save it to your Keyword Bank in the SEO Lab for reuse across listings.',
    linkTo: '/docs/lab/favorites',
    linkText: 'Keyword Bank',
  },
  {
    title: 'Try the Strategy Tuner',
    description:
      'Adjust the sliders to prioritize reach, competition, buyer intent, and more.',
    linkTo: '/docs/studio/keywords',
    linkText: 'Strategy Tuner',
  },
  {
    title: 'Check your Dashboard',
    description:
      "Track your shop's overall SEO health and see which listings need attention.",
    linkTo: '/docs/dashboard',
    linkText: 'Dashboard',
  },
];

export default function GettingStartedPage() {
  return (
    <DocPage title="Getting Started" subtitle="Your first optimized listing in minutes">
      <p>
        PennySEO turns your Etsy products into optimized listings — title, description,
        and tags backed by real search data. No SEO knowledge required.
      </p>

      <p>
        <strong>What you'll need:</strong> A free PennySEO account. You start with 30
        tokens per month.
      </p>

      <p>
        There are two ways to get started — pick whichever fits your situation.
      </p>

      {/* Path A */}
      <Section title="Import from your Etsy shop" label="Path A">
        <p>
          If you already have listings on Etsy, this is the fastest way to start.
        </p>
        <p>
          Go to <DocLink to="/docs/etsy-import">My Shop</DocLink> from the sidebar and connect your Etsy account.
          Browse your existing listings, select the ones you'd like to optimize, and
          click <strong>Import</strong>. Importing is free and doesn't cost any tokens.
        </p>
        <p>
          Once imported, you can optionally score your existing tags (3 tokens per listing)
          to see how your current SEO performs. Then <DocLink to="/docs/studio/analyzing">open any listing in the Studio</DocLink> to
          optimize it with PennySEO — your product image, title, and category are already
          filled in.
        </p>
        <Tip>
          Scoring your existing tags first gives you a Before/After comparison so you can
          see exactly how much PennySEO improves your listing.
        </Tip>
      </Section>

      {/* Path B */}
      <Section title="Start from a product photo" label="Path B">
        <p>
          If you're creating a new listing or don't have an Etsy shop yet, start here.
        </p>
        <p>
          Go to <DocLink to="/docs/studio/analyzing">SEO Studio</DocLink> from the sidebar. Upload a product photo and
          click <strong>"Analyse Design"</strong> (1 token). The AI examines your image
          and fills in visual details automatically: style, colors, target audience, and
          more. It also suggests a Theme and Niche for your product.
        </p>
        <p>
          Select your <strong>Product Type</strong> from the dropdown (or type a custom
          one). Add any details about your product in the Description field if you'd like
          — this helps the AI generate better keywords.
        </p>
        <Tip>
          A clear, well-lit product photo gives the AI more to work with. Lifestyle shots
          work too.
        </Tip>
      </Section>

      {/* Generate SEO */}
      <Section title="Generate SEO keywords">
        <p>
          Whether you came from Path A or B, this step is the same. Click{' '}
          <strong>"Generate SEO"</strong> in the Keyword Research section. PennySEO
          generates keywords backed by real Etsy search volume, competition data, and
          buyer intent scores.
        </p>
        <p>
          The AI pre-selects the best 13 keywords for your listing (Etsy's tag limit).
          You can adjust the selection — check or uncheck any keyword. Look for keywords
          with high scores, green competition badges, and Smart Badges like{' '}
          <strong>Trending</strong> or <strong>Evergreen</strong>.
        </p>
        <p>
          Use <strong>"Recalculate Scores"</strong> after changing your selection to see
          how it affects your listing strength.
        </p>
        <Tip>Hover over any badge or score to see what it means.</Tip>
      </Section>

      {/* Generate listing */}
      <Section title="Generate your listing">
        <p>
          Once you're happy with your 13 selected keywords, click{' '}
          <strong>"Optimize with AI"</strong> in the Listing Editor section. PennySEO
          writes an Etsy-optimized title and description using your selected keywords.
        </p>
        <p>
          Copy your title, description, and tags directly to your Etsy listing using the
          copy buttons.
        </p>
        <Tip>
          The Etsy Search Preview shows you exactly how your listing will appear in search
          results.
        </Tip>
      </Section>

      {/* What's next */}
      <Section title="What's next?">
        <div className="space-y-3">
          {nextSteps.map((item) => (
            <div
              key={item.title}
              className="flex items-start gap-3 p-4 bg-white rounded-lg border border-slate-200"
            >
              <ArrowRight
                size={18}
                className="text-indigo-500 flex-shrink-0 mt-1"
              />
              <div>
                <p className="font-semibold text-slate-900">
                  {item.linkTo ? <DocLink to={item.linkTo}>{item.title}</DocLink> : item.title}
                </p>
                <p className="text-base text-slate-600 mt-0.5">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Token costs */}
      <Section title="Token costs at a glance">
        <TokenTable rows={tokenRows} />
        <p>
          Some actions use your plan's monthly quota instead of tokens: adding custom
          keywords and adding keywords from your Favorites bank. Check the{' '}
          <DocLink to="/docs/billing">Billing page</DocLink> for your plan's limits.
        </p>
        <p>
          You start with 15 free tokens per month. Need more? Visit the{' '}
          <DocLink to="/docs/billing">Billing</DocLink> page to see plans and token packs.
        </p>
      </Section>
    </DocPage>
  );
}
