import { DocPage, Section, Tip, DefList, DocImage, DocLink } from '@/components/docs/DocComponents';
import { Flame, Leaf, Star, ArrowRight } from 'lucide-react';

const tableColumns = [
  {
    term: 'Score',
    description:
      'An overall opportunity score combining all factors. Higher is better.',
  },
  {
    term: 'Buy Intent',
    description:
      'How likely someone searching this term is ready to purchase (Very High, High, Moderate, Low). A keyword like "gift for mom birthday" has higher buy intent than "mug ideas".',
  },
  {
    term: 'Relevance',
    description:
      'How closely the keyword matches your specific product (Very High, High, Moderate, Low). "personalized dog portrait" is highly relevant to a custom pet portrait; "wall art" is less so.',
  },
  {
    term: 'Avg. Volume',
    description:
      'Monthly search volume on Etsy. Displayed as exact numbers for smaller volumes, or rounded labels for large ones (> 50K, > 100K, > 250K, > 500K, > 1M). Keywords below the measurement threshold show "< 10".',
  },
  {
    term: 'Trend',
    description:
      'A sparkline showing the 12-month search volume trajectory. Green trending up, red trending down.',
  },
  {
    term: 'Competition',
    description:
      'How many other sellers target this keyword (0 to 1). Green (< 0.3) means low competition, amber (0.3–0.7) is medium, red (> 0.7) is high.',
  },
  {
    term: 'CPC',
    description:
      'Cost-per-click, reflecting the keyword\'s commercial value. Green (> $1.50) signals high advertiser demand, which correlates with buyer intent.',
  },
  {
    term: 'Status',
    description: 'Smart Badges assigned automatically based on data patterns.',
  },
];

const smartBadges = [
  {
    term: 'Trending',
    description:
      'Search volume is rising significantly. These keywords represent growing demand — good to catch early before competition increases.',
    icon: Flame,
    iconClass: 'text-orange-500 flex-shrink-0 mt-1',
  },
  {
    term: 'Evergreen',
    description:
      'Stable, consistent search volume year-round. Reliable traffic sources that won\'t disappear after a season.',
    icon: Leaf,
    iconClass: 'text-emerald-500 flex-shrink-0 mt-1',
  },
  {
    term: 'Promising',
    description:
      'Low competition combined with decent volume and a good opportunity score. These are potential "hidden gems" where you can rank more easily.',
    icon: Star,
    iconClass: 'text-amber-500 flex-shrink-0 mt-1',
  },
];

const auditMetrics = [
  {
    term: 'Overall Score',
    description:
      'The big circular gauge on the left. Green (80+) is strong, amber (50–79) is a good foundation, red (below 50) needs work.',
  },
  {
    term: 'Visibility',
    description:
      'How much search traffic your keyword selection can potentially capture. Driven by search volume and reach.',
  },
  {
    term: 'Relevance',
    description:
      'How well your keywords match your specific product. Driven by niche scores.',
  },
  {
    term: 'Buy Intent',
    description:
      'How purchase-ready the searchers behind your keywords are. Driven by transactional scores.',
  },
  {
    term: 'Competition',
    description:
      'How hard it will be to rank for your keyword selection. Lower is better.',
  },
  {
    term: 'Est. Value',
    description:
      'A profitability indicator combining CPC, volume, and competition.',
  },
];

const addKeywordMethods = [
  {
    term: 'Add a custom keyword',
    description:
      'Click "+ Add Custom Keyword" at the bottom of the table. Type any keyword and press Enter or click Add. PennySEO fetches real search data and scores it against your listing context. Uses your plan\'s monthly quota.',
  },
  {
    term: 'Add from Favorites',
    description:
      'Click the star icon in the table header to open the Favorites picker. Select keywords you\'ve previously saved to your Keyword Bank. These already have cached data, so no additional API lookup is needed. Uses your plan\'s monthly quota.',
  },
  {
    term: 'Add from a Preset',
    description:
      'In the same Favorites picker, switch to the Presets tab. Select a preset to add all its keywords at once.',
  },
];

const strategySliders = [
  {
    term: 'Reach',
    description:
      'Prioritize high search volume (more eyes on your listing) vs. lower volume terms.',
  },
  {
    term: 'Ranking ease',
    description:
      'Prioritize low competition keywords (easier to rank) vs. competitive ones.',
  },
  {
    term: 'Buyer intent',
    description:
      'Prioritize keywords from people ready to buy vs. browsers.',
  },
  {
    term: 'Niche specificity',
    description:
      'Prioritize keywords that closely match your exact product vs. broader terms.',
  },
  {
    term: 'Market value',
    description:
      'Prioritize keywords with high commercial value (CPC) vs. general terms.',
  },
];

export default function KeywordResearchPage() {
  return (
    <DocPage
      title="Keyword Research"
      subtitle="Find the best keywords for your listing"
    >
      <p>
        The Keyword Research section is where PennySEO does its heavy lifting. It
        generates keywords backed by real Etsy search data, scores them across multiple
        dimensions, and helps you pick the best 13 tags for your listing.
      </p>

      <Section title="Generating keywords">
        <p>
          Once your product is <DocLink to="/docs/studio/analyzing">analyzed</DocLink> (image + product type), click{' '}
          <strong>"Generate SEO"</strong> in the Keyword Research accordion header (8
          tokens, or 4 tokens to re-generate).
        </p>
        <p>
          PennySEO generates keywords across six different angles: core product terms,
          style and aesthetic variations, buyer and occasion phrases, niche and adjacent
          categories, long-tail specifics, and broad discovery terms. Each keyword is then
          enriched with real data from Etsy search: monthly search volume, competition
          level, cost-per-click, and 12-month volume history.
        </p>
        <p>
          The AI pre-selects the best 13 keywords — Etsy's maximum tag limit. The Keyword
          Research section opens automatically when results are ready.
        </p>
        <DocImage
          src="/docs/keywords-table.png"
          alt="Keyword Performance table showing keywords with scores, badges, volume, trend sparklines, and selection checkboxes"
          caption="The Keyword Performance table — your keywords scored and ranked with real Etsy search data"
        />
      </Section>

      <Section title="Reading the Keyword Performance table">
        <p>
          Each row in the table shows one keyword with the following columns:
        </p>
        <DefList items={tableColumns} />
        <Tip>
          You can sort the table by clicking any column header. Selected keywords always
          stay pinned at the top.
        </Tip>
      </Section>

      <Section title="Smart Badges">
        <p>
          PennySEO automatically tags keywords with badges based on their data patterns:
        </p>
        <DefList items={smartBadges} />
      </Section>

      <Section title="Selecting your 13 keywords">
        <p>
          Etsy allows a maximum of 13 tags per listing. The AI pre-selects what it
          considers the best combination, but you have full control.
        </p>
        <p>
          Check or uncheck any keyword to adjust your selection. Selected keywords are
          pinned to the top of the table with an indigo highlight. After the 13th selected
          keyword, a <strong>"Suggestions &amp; Discovery"</strong> divider appears.
        </p>
        <p>
          Keywords below the divider are your discovery pool — they didn't make the AI's
          top selection, but they're still scored and available. Browse them for hidden
          opportunities: a low-competition keyword the AI overlooked, a trending term that
          fits your product, or a long-tail phrase with strong buy intent. Check any of
          them to swap them into your selection.
        </p>
        <p>
          If you select more than 13, a warning appears — you'll need to deselect some
          before generating your listing draft.
        </p>
        <p>
          After changing your selection, click <strong>"Recalculate Scores"</strong> to see
          how your new combination affects the overall listing strength. The Audit Header
          at the top updates to reflect the scores of your current selection only.
        </p>
        <Tip>
          A strong selection usually mixes high-volume keywords (for visibility) with
          low-competition keywords (for ranking) and high buy-intent keywords (for
          conversions). Don't pick all high-volume — you'll never rank for them.
        </Tip>
      </Section>

      <Section title="The Audit Header">
        <p>
          Above the keyword table, the Audit Header gives you a snapshot of your listing's
          SEO health based on your selected keywords:
        </p>
        <DefList items={auditMetrics} />
        <p>
          Hover over any metric to see a tooltip explaining what your score means and how
          to improve it.
        </p>
        <DocImage
          src="/docs/keywords-audit-header.png"
          alt="Audit Header showing the overall score gauge, visibility, relevance, buy intent, competition metrics, and estimated value"
          caption="The Audit Header gives you a snapshot of your listing's SEO health"
        />
      </Section>

      <Section title="Adding more keywords">
        <p>You can expand your keyword pool in three ways:</p>
        <DefList items={addKeywordMethods} icon={ArrowRight} />
        <p>
          Keywords you add appear in the table and are auto-selected. They're marked with
          a special icon so you can distinguish them from AI-generated keywords.
        </p>
        <DocImage
          src="/docs/keywords-add-custom.png"
          alt="Inline custom keyword input row at the bottom of the keyword table"
          caption="Add a custom keyword directly in the table"
        />
      </Section>

      <Section title="The Strategy Tuner">
        <p>
          For more control, expand the Strategy Tuner accordion between the Audit Header
          and the keyword table. It has five sliders:
        </p>
        <DefList items={strategySliders} />
        <p>
          Each slider has four levels: Low, Regular, High, and Aggressive. After
          adjusting, click <strong>"Apply strategy"</strong> to re-rank your entire keyword
          pool with the new weights. This doesn't generate new keywords — it re-evaluates
          and re-selects from your existing pool.
        </p>
        <DocImage
          src="/docs/keywords-strategy-tuner.png"
          alt="Strategy Tuner with five sliders at different positions and the Apply strategy button"
          caption="The Strategy Tuner — adjust weights to re-rank your keyword pool"
        />
        <Tip>
          The default "Regular" setting works well for most products. Try "High" on
          Ranking ease if you're a new shop with no reviews yet — it helps you target
          keywords where you can actually compete.
        </Tip>
      </Section>

      <Section title="Saving keywords to your bank">
        <p>
          Click the star icon on any keyword row to save it to your{' '}
          <DocLink to="/docs/lab/favorites">Keyword Bank</DocLink> in the SEO Lab. Saved keywords can be reused
          across multiple listings, grouped into presets, and tracked over time.
        </p>
        <p>
          You can also click <DocLink to="/docs/lab/presets">"Save as Preset"</DocLink> in the table header to save
          your current selection as a reusable keyword strategy.
        </p>
      </Section>
    </DocPage>
  );
}
