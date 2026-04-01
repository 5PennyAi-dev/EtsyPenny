import { Link } from 'react-router-dom';
import { DocPage, Section, Tip, TokenTable, DefList } from '@/components/docs/DocComponents';
import { ArrowRight } from 'lucide-react';

const tokenCosts = [
  { action: 'Import Etsy listings', cost: 'Free' },
  { action: 'Analyse Design', cost: '1 token' },
  { action: 'Generate SEO Keywords', cost: '8 tokens' },
  { action: 'Re-generate SEO Keywords', cost: '4 tokens' },
  { action: 'Generate Listing Draft', cost: '1 token' },
  { action: 'Score Etsy Listing', cost: '3 tokens per listing' },
];

const quotaActions = [
  {
    term: 'Add custom keyword',
    description:
      "Adding a custom keyword to the Keyword Performance table. Each plan has a monthly limit on how many custom keywords you can add.",
  },
  {
    term: 'Add from Favorites',
    description:
      "Adding keywords from your Favorite Tags bank to a listing. Also limited by your plan's monthly quota.",
  },
];

const plans = [
  {
    term: 'Free',
    description:
      '30 tokens per month. Enough to fully optimize about 3 listings. Good for trying PennySEO and seeing results before committing.',
  },
  {
    term: 'Starter',
    description:
      'More tokens and higher quotas for sellers with a small shop. Ideal if you have 10–30 active listings.',
  },
  {
    term: 'Growth',
    description:
      'The most popular plan. Designed for active sellers who optimize regularly and have a growing catalog.',
  },
  {
    term: 'Pro',
    description:
      'Maximum tokens and quotas for high-volume sellers with large shops.',
  },
];

const tokenPacks = [
  { term: '50 tokens', description: 'Good for a quick top-up.' },
  { term: '150 tokens', description: 'Covers a batch of optimizations.' },
  { term: '500 tokens', description: 'Best value for heavy users.' },
];

const billingPageSections = [
  {
    term: 'Current Plan',
    description:
      'Your active plan with status badge. Click "Manage subscription" to open the Stripe Customer Portal, where you can upgrade, downgrade, cancel, or update payment methods.',
  },
  {
    term: 'Token Balance',
    description:
      "A progress bar showing how much of your monthly allowance you've used, plus your bonus token count. A \"Buy tokens\" button opens the token pack options.",
  },
  {
    term: 'Usage Stats',
    description:
      "How many custom keywords and favorite adds you've used this cycle versus your plan's limits.",
  },
  {
    term: 'Transaction History',
    description:
      'A paginated log of all token activity: monthly credits, pack purchases, and deductions per action. Color-coded for quick scanning.',
  },
];

const faqItems = [
  {
    question: 'When do monthly tokens reset?',
    answer:
      "At the start of each billing cycle (the day you subscribed). Unused monthly tokens don't carry over.",
  },
  {
    question: 'Do bonus tokens expire?',
    answer:
      'No. Tokens purchased through token packs stay in your account until you use them.',
  },
  {
    question: 'What happens if I downgrade?',
    answer:
      'Your new token allowance takes effect at the next billing cycle. Bonus tokens are unaffected.',
  },
  {
    question: 'Can I get a refund?',
    answer:
      'Subscription management (cancellation, refunds) is handled through the Stripe Customer Portal, accessible from the Billing page.',
  },
];

export default function DocsBillingPage() {
  return (
    <DocPage
      title="Billing & Tokens"
      subtitle="How PennySEO pricing works"
    >
      <p>
        PennySEO uses a token system. Every AI-powered action costs a set number of
        tokens. You get a monthly token allowance with your plan, and you can buy extra
        tokens whenever you need them.
      </p>

      <Section title="Understanding tokens">
        <p>
          Tokens are PennySEO's currency. Each action that uses AI processing or external
          data has a fixed token cost:
        </p>
        <TokenTable rows={tokenCosts} />
        <p>
          Your token balance is always visible in the sidebar. When it drops below 10, a
          warning indicator appears. If you run out of tokens mid-workflow, a modal explains
          your options: wait for your monthly reset or buy a token pack.
        </p>
      </Section>

      <Section title="Monthly quotas">
        <p>
          Some actions use your plan's monthly quota instead of tokens:
        </p>
        <DefList items={quotaActions} icon={ArrowRight} />
        <p>
          Quotas reset at the start of each billing cycle. You can check your current usage
          on the Billing page.
        </p>
      </Section>

      <Section title="Plans">
        <p>
          PennySEO offers four plans, available in monthly or yearly billing (save 17% with
          yearly):
        </p>
        <DefList items={plans} icon={ArrowRight} />
        <p>
          All plans include the same features — there are no feature gates. The difference
          is purely in token allowance, monthly quotas, and Etsy import limits.
        </p>
        <p>
          Visit the{' '}
          <Link
            to="/pricing"
            className="text-indigo-600 hover:text-indigo-700 font-medium underline underline-offset-2"
          >
            Pricing page
          </Link>{' '}
          for current prices and detailed plan comparisons.
        </p>
      </Section>

      <Section title="Token packs">
        <p>
          Need more tokens without changing your plan? Token packs are one-time purchases
          that never expire:
        </p>
        <DefList items={tokenPacks} icon={ArrowRight} />
        <p>
          Purchased tokens are added to your bonus balance, which is separate from your
          monthly allowance. Monthly tokens are used first — bonus tokens are only consumed
          after your monthly balance runs out.
        </p>
      </Section>

      <Section title="The Billing page">
        <p>Access the Billing page from the sidebar. It shows:</p>
        <DefList items={billingPageSections} />
      </Section>

      <Section title="Billing FAQ">
        <div className="space-y-4">
          {faqItems.map((item, i) => (
            <div
              key={i}
              className="p-4 bg-white rounded-lg border border-slate-200"
            >
              <p className="font-semibold text-slate-900 mb-1">
                {item.question}
              </p>
              <p className="text-base text-slate-600">{item.answer}</p>
            </div>
          ))}
        </div>
      </Section>
    </DocPage>
  );
}
