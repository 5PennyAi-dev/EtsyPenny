import { DocPage, Section, Tip, DefList } from '@/components/docs/DocComponents';
import { ArrowRight } from 'lucide-react';

const strategyWeights = [
  {
    term: 'Volume',
    description:
      'How much weight to give search volume. Higher means the algorithm favors popular keywords.',
  },
  {
    term: 'Competition',
    description:
      'How much weight to give competition level. Higher means the algorithm favors keywords that are easier to rank for.',
  },
  {
    term: 'Transactional',
    description:
      'How much weight to give buyer intent. Higher means the algorithm favors keywords from people ready to purchase.',
  },
  {
    term: 'Niche',
    description:
      'How much weight to give product relevance. Higher means the algorithm favors keywords that closely match your specific product.',
  },
  {
    term: 'CPC',
    description:
      'How much weight to give cost-per-click. Higher means the algorithm favors keywords with high commercial value.',
  },
];

const badgeSensitivity = [
  {
    term: 'Evergreen',
    description:
      "How stable a keyword's volume must be over 12 months to earn the Evergreen badge. Higher sensitivity means fewer keywords qualify.",
  },
  {
    term: 'Trending',
    description:
      'How much growth is required to earn the Trending badge. Higher sensitivity means only strongly rising keywords qualify.',
  },
  {
    term: 'Promising',
    description:
      'How favorable the competition-to-opportunity ratio must be to earn the Promising badge. Higher sensitivity means fewer keywords qualify.',
  },
];

const analysisConstraints = [
  {
    term: 'AI Selection Count',
    description:
      "How many keywords the AI auto-selects after generation. Default is 13 (Etsy's tag limit). You rarely need to change this.",
  },
  {
    term: 'Working Pool Size',
    description:
      'How many keywords are kept in the active pool after filtering. A larger pool gives you more options to browse in the Suggestions & Discovery section.',
  },
  {
    term: 'Concept Diversity Limit',
    description:
      'How many times the same root concept can appear in your keyword pool. Default is 2. Lower values force more variety; higher values allow more variations of the same term.',
  },
];

const shopIdentity = [
  {
    term: 'My Themes',
    description:
      'Create, edit, and delete custom visual aesthetic categories. Mark favorites with the star icon for quick access in the Studio dropdowns.',
  },
  {
    term: 'My Niches',
    description:
      'Create, edit, and delete custom buyer audience categories. Same favorite-star system.',
  },
];

export default function DocsSettingsPage() {
  return (
    <DocPage
      title="Settings"
      subtitle="Customize how PennySEO works for you"
    >
      <p>
        The Settings page lets you fine-tune PennySEO's algorithms and manage your
        personal taxonomy. Most sellers never need to change these — the defaults work
        well. But if you want more control, it's all here.
      </p>

      <Section title="SEO Strategy Weights">
        <p>
          Five sliders that control how PennySEO ranks and selects keywords across all your
          listings:
        </p>
        <DefList items={strategyWeights} />
        <p>
          Each slider has multiple levels. Changes apply to all future keyword generations
          and strategy applications. Your existing listings are not affected until you
          re-generate or apply a new strategy.
        </p>
        <Tip>
          If you're unsure, leave everything at the default. The defaults are calibrated
          for a balanced approach that works for most Etsy products.
        </Tip>
      </Section>

      <Section title="Smart Badge Sensitivity">
        <p>
          Three controls that determine how strictly PennySEO assigns Smart Badges:
        </p>
        <DefList items={badgeSensitivity} />
        <p>
          Adjusting these doesn't change the underlying data — it only changes which
          keywords get badged. If you're seeing too many (or too few) badges, tweak these
          thresholds.
        </p>
      </Section>

      <Section title="Analysis Constraints">
        <p>Three numeric settings for advanced users:</p>
        <DefList items={analysisConstraints} />
      </Section>

      <Section title="My Shop Identity">
        <p>Manage your custom themes and niches. Two tabs:</p>
        <DefList items={shopIdentity} icon={ArrowRight} />
        <p>
          Custom themes and niches appear alongside PennySEO's built-in taxonomy in all
          dropdown menus throughout the app. They're scoped to your account — other users
          don't see them.
        </p>
      </Section>
    </DocPage>
  );
}
