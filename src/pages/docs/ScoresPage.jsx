import { DocPage, Section, DefList } from '@/components/docs/DocComponents';

const colorCoding = [
  {
    term: 'Green',
    description:
      'Strong performance (80+ for scores, < 0.3 for competition, > $1.50 for CPC).',
  },
  {
    term: 'Amber',
    description:
      'Moderate performance (50–79 for scores, 0.3–0.7 for competition, $0.60–$1.49 for CPC).',
  },
  {
    term: 'Red / Rose',
    description:
      'Needs improvement (below 50 for scores, > 0.7 for competition, < $0.60 for CPC).',
  },
];

function HowToImprove({ children }) {
  return (
    <div className="border-l-4 border-indigo-300 pl-4 py-1 bg-indigo-50/50 rounded-r-lg">
      <p className="text-base text-slate-700">
        <span className="font-semibold text-indigo-700">How to improve: </span>
        {children}
      </p>
    </div>
  );
}

export default function ScoresPage() {
  return (
    <DocPage
      title="Understanding Your Scores"
      subtitle="What the numbers mean and how to improve them"
    >
      <p>
        PennySEO scores your listings across multiple dimensions. This page explains what
        each score measures, how it's calculated at a high level, and what you can do to
        improve it.
      </p>

      <Section title="Overall Listing Strength (0–100)">
        <p>
          This is the big number — your listing's composite SEO score. It combines all the
          dimensions below into a single measure of how well-positioned your listing is to
          be found and purchased on Etsy.
        </p>
        <p>
          Green (80+) means your listing is strong — well-targeted keywords with good
          volume and manageable competition. Amber (50–79) means you have a solid
          foundation but room for improvement. Red (below 50) means your listing needs work
          — likely too many generic or highly competitive keywords.
        </p>
      </Section>

      <Section title="Visibility (0–100)">
        <p>
          Measures how much search traffic your keyword selection can potentially capture.
          Driven primarily by the combined search volume of your selected keywords, weighted
          by relevance and buy intent.
        </p>
        <HowToImprove>
          Add keywords with higher search volume. But don't chase volume alone — a
          high-volume keyword you'll never rank for doesn't help. Balance volume with
          competition.
        </HowToImprove>
      </Section>

      <Section title="Relevance (0–100)">
        <p>
          Measures how closely your selected keywords match your specific product. A
          "personalized dog portrait" keyword is highly relevant to a custom pet portrait
          listing; a generic "wall art" keyword is less so.
        </p>
        <HowToImprove>
          Make sure your Theme, Niche, and Product Type are accurate. The AI uses these to
          judge relevance. If they're wrong, relevance scores across all keywords will
          suffer. Also prefer specific, descriptive keywords over broad generic ones.
        </HowToImprove>
      </Section>

      <Section title="Buy Intent (0–100)">
        <p>
          Measures how purchase-ready the people searching your keywords are. Keywords with
          occasion triggers ("birthday gift for mom"), specific attributes ("sterling silver
          adjustable ring"), or urgency signals tend to score higher than browsing terms
          ("jewelry ideas").
        </p>
        <HowToImprove>
          Include keywords that describe who it's for, when they'd buy it, or why it's
          special. Gift-related and occasion-specific keywords naturally have higher buy
          intent.
        </HowToImprove>
      </Section>

      <Section title="Competition (0–100)">
        <p>
          Measures how hard it will be to rank for your keyword selection. This is an
          inverted score — lower competition is better. A low score (green) means your
          keywords have manageable competition; a high score (red) means many other sellers
          target the same terms.
        </p>
        <HowToImprove>
          Swap some high-competition keywords for lower-competition alternatives. Long-tail
          keywords (3+ words) typically have lower competition. Use the Strategy Tuner with
          "Ranking ease" set to High to find these automatically.
        </HowToImprove>
      </Section>

      <Section title="Est. Value">
        <p>
          A profitability indicator combining CPC, volume, and competition into a business
          potential score. Displayed as dollar signs (1–5) rather than a numeric score. More
          dollar signs means the keyword selection has higher commercial value — advertisers
          pay more for those search terms, which correlates with buyer willingness to spend.
        </p>
        <HowToImprove>
          Include keywords with higher CPC values (green in the CPC column). These
          typically align with purchase-intent terms, so improving Buy Intent often improves
          Est. Value too.
        </HowToImprove>
      </Section>

      <Section title="Reach Index">
        <p>
          A raw visibility number shown as an indigo badge next to Visibility. It represents
          the AI-weighted probability of your listing being seen, factoring in niche
          relevance and buyer intent alongside raw volume.
        </p>
        <p>
          Unlike Visibility (which is a 0–100 score), the Reach Index is an absolute number
          — useful for comparing different keyword strategies on the same listing.
        </p>
      </Section>

      <Section title="Score color coding">
        <p>
          Throughout PennySEO, scores follow a consistent color scheme:
        </p>
        <DefList items={colorCoding} />
        <p>
          This applies to the Audit Header gauges, keyword table badges, and everywhere
          else scores appear.
        </p>
      </Section>
    </DocPage>
  );
}
