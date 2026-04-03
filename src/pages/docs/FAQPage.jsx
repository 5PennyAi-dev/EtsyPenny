import { DocPage, DocLink } from '@/components/docs/DocComponents';

const faqItems = [
  {
    question: 'How many tags should I select?',
    answer: (
      <>
        Exactly 13. That's Etsy's maximum, and there's no benefit to using fewer. Every
        empty tag slot is a missed opportunity to appear in search results. PennySEO's AI
        pre-selects 13 for you — adjust the selection if you want, but always fill all 13
        slots.
      </>
    ),
  },
  {
    question: 'What does Promising mean?',
    answer: (
      <>
        A keyword with the Promising badge has a favorable combination of decent search
        volume, low competition, and a good opportunity score. These are "hidden gems" —
        keywords where you have a realistic chance of ranking well without competing
        against thousands of other sellers.
      </>
    ),
  },
  {
    question: 'Why is my score low?',
    answer: (
      <>
        Usually one of three reasons: your keywords are too generic (low relevance), too
        competitive (high competition), or too broad (low buy intent). Check the Audit
        Header breakdown to see which dimension is pulling your score down, then swap
        keywords accordingly. See the{' '}
        <DocLink to="/docs/scores">Understanding Your Scores</DocLink>{' '}
        page for specific improvement tips for each dimension.
      </>
    ),
  },
  {
    question: 'Why are some volumes showing "< 10"?',
    answer: (
      <>
        These keywords fall below DataForSEO's measurement threshold. They're typically
        very long-tail or hyper-niche phrases. Low volume doesn't mean worthless — these
        keywords often have almost zero competition, making them easy to rank for. They
        work well as supplementary tags alongside higher-volume keywords.
      </>
    ),
  },
  {
    question: 'Why are some volumes showing "> 1M"?',
    answer: (
      <>
        Extremely high-volume keywords (over 1 million monthly searches) are displayed
        with a cap. For Etsy sellers, the difference between 1M and 17M searches is
        strategically irrelevant — both are mass-market terms you're unlikely to rank for
        as a small seller. The cap avoids implying false precision.
      </>
    ),
  },
  {
    question: 'How often should I refresh my keywords?',
    answer: (
      <>
        Every 2–3 weeks is a good habit. Search trends shift seasonally and with cultural
        moments. The <DocLink to="/docs/lab/favorites">SEO Lab</DocLink> flags keywords older than 21 days as "stale." Regular
        refreshing ensures your data stays accurate and you catch new trends early.
      </>
    ),
  },
  {
    question: 'Does word order matter in Etsy titles?',
    answer: (
      <>
        No. Etsy's search algorithm matches individual words regardless of their position
        in the title. "Funny Cat Mug Personalized Gift" and "Personalized Gift Funny Cat
        Mug" perform the same way in search. Focus on including the right words, not
        arranging them in a specific order.
      </>
    ),
  },
  {
    question: "What's the difference between Theme and Niche?",
    answer: (
      <>
        Theme describes the visual aesthetic — what your product looks like (e.g.,
        "Minimalist &amp; Clean", "Boho &amp; Organic"). Niche describes the target buyer
        — who would purchase it (e.g., "Pet Lovers", "Nursing &amp; Healthcare"). A
        minimalist dog bowl and a rustic dog bowl might share the same Niche (Pet Lovers)
        but have different Themes.
      </>
    ),
  },
  {
    question: 'Can I use PennySEO for platforms other than Etsy?',
    answer: (
      <>
        PennySEO is optimized specifically for Etsy's search algorithm, tag limits, and
        marketplace dynamics. The keyword data comes from Etsy search patterns. While the
        generated titles and descriptions could work on other platforms, the scoring and
        keyword selection are tailored for Etsy.
      </>
    ),
  },
  {
    question: 'What happens to my data if I cancel?',
    answer: (
      <>
        Your listings, keywords, and presets remain in your account. You can still log in
        and view everything — you just can't perform token-consuming actions until you
        resubscribe or buy a token pack. Your data is never deleted because you stopped
        paying.
      </>
    ),
  },
  {
    question: 'How is PennySEO different from eRank or Marmalead?',
    answer: (
      <>
        PennySEO starts from your product image — not a keyword search box. It uses Vision
        AI to understand what you're selling, then generates keywords tailored to your
        specific product. It also writes your complete listing (title + description), not
        just tag suggestions. And every keyword is scored across multiple dimensions
        (volume, competition, buy intent, relevance) rather than showing raw data and
        letting you figure it out.
      </>
    ),
  },
];

export default function FAQPage() {
  return (
    <DocPage title="FAQ" subtitle="Frequently asked questions">
      <div className="space-y-4">
        {faqItems.map((item, i) => (
          <div
            key={i}
            className="p-6 bg-white rounded-lg border border-slate-200"
          >
            <p className="text-lg font-semibold text-slate-900 mb-2">
              {item.question}
            </p>
            <p className="text-base text-slate-600 leading-relaxed">
              {item.answer}
            </p>
          </div>
        ))}
      </div>
    </DocPage>
  );
}
