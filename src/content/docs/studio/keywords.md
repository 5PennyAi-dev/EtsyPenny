---
slug: studio/keywords
title: Keyword Research
subtitle: Find the best keywords for your listing
category: SEO Studio
order: 2
icon: Search
summary: How PennySEO generates keywords with real Etsy search data, how to read the Keyword Performance table, and how to pick the best 13 tags using Smart Badges and the Strategy Tuner.
updated: 2026-04-19
---

The Keyword Research section is where PennySEO does its heavy lifting. It generates keywords backed by real Etsy search data, scores them across multiple dimensions, and helps you pick the best 13 tags for your listing.

## Generating keywords

Once your product is [analyzed](/docs/studio/analyzing) (image + product type), click **"Generate SEO"** in the Keyword Research accordion header (3 tokens, or 2 tokens to re-generate).

PennySEO generates keywords across six different angles: core product terms, style and aesthetic variations, buyer and occasion phrases, niche and adjacent categories, long-tail specifics, and broad discovery terms. Each keyword is then enriched with real data from Etsy search: monthly search volume, competition level, cost-per-click, and 12-month volume history.

The AI pre-selects the best 13 keywords — Etsy's maximum tag limit. The Keyword Research section opens automatically when results are ready.

![Keyword Performance table showing keywords with scores, badges, volume, trend sparklines, and selection checkboxes — The Keyword Performance table — your keywords scored and ranked with real Etsy search data](/docs/keywords-table.png)

## Reading the Keyword Performance table

Each row in the table shows one keyword with the following columns:

:::deflist
- **Score** — An overall opportunity score combining all factors. Higher is better.
- **Buy Intent** — How likely someone searching this term is ready to purchase (Very High, High, Moderate, Low). A keyword like "gift for mom birthday" has higher buy intent than "mug ideas".
- **Relevance** — How closely the keyword matches your specific product (Very High, High, Moderate, Low). "personalized dog portrait" is highly relevant to a custom pet portrait; "wall art" is less so.
- **Avg. Volume** — Monthly search volume on Etsy. Displayed as exact numbers for smaller volumes, or rounded labels for large ones (> 50K, > 100K, > 250K, > 500K, > 1M). Keywords below the measurement threshold show "< 10".
- **Trend** — A sparkline showing the 12-month search volume trajectory. Green trending up, red trending down.
- **Competition** — How many other sellers target this keyword (0 to 1). Green (< 0.3) means low competition, amber (0.3–0.7) is medium, red (> 0.7) is high.
- **CPC** — Cost-per-click, reflecting the keyword's commercial value. Green (> $1.50) signals high advertiser demand, which correlates with buyer intent.
- **Status** — Smart Badges assigned automatically based on data patterns.
:::

:::tip
You can sort the table by clicking any column header. Selected keywords always stay pinned at the top.
:::

## Smart Badges

PennySEO automatically tags keywords with badges based on their data patterns:

:::deflist
- :Flame: **Trending** — Search volume is rising significantly. These keywords represent growing demand — good to catch early before competition increases.
- :Leaf: **Evergreen** — Stable, consistent search volume year-round. Reliable traffic sources that won't disappear after a season.
- :Star: **Promising** — Low competition combined with decent volume and a good opportunity score. These are potential "hidden gems" where you can rank more easily.
:::

## Selecting your 13 keywords

Etsy allows a maximum of 13 tags per listing. The AI pre-selects what it considers the best combination, but you have full control.

Check or uncheck any keyword to adjust your selection. Selected keywords are pinned to the top of the table with an indigo highlight. After the 13th selected keyword, a **"Suggestions & Discovery"** divider appears.

Keywords below the divider are your discovery pool — they didn't make the AI's top selection, but they're still scored and available. Browse them for hidden opportunities: a low-competition keyword the AI overlooked, a trending term that fits your product, or a long-tail phrase with strong buy intent. Check any of them to swap them into your selection.

If you select more than 13, a warning appears — you'll need to deselect some before generating your listing draft.

After changing your selection, click **"Recalculate Scores"** to see how your new combination affects the overall listing strength. The Audit Header at the top updates to reflect the scores of your current selection only.

:::tip
A strong selection usually mixes high-volume keywords (for visibility) with low-competition keywords (for ranking) and high buy-intent keywords (for conversions). Don't pick all high-volume — you'll never rank for them.
:::

## The Audit Header

Above the keyword table, the Audit Header gives you a snapshot of your listing's SEO health based on your selected keywords:

:::deflist
- **Overall Score** — The big circular gauge on the left. Green (80+) is strong, amber (50–79) is a good foundation, red (below 50) needs work.
- **Visibility** — How much search traffic your keyword selection can potentially capture. Driven by search volume and reach.
- **Relevance** — How well your keywords match your specific product. Driven by niche scores.
- **Buy Intent** — How purchase-ready the searchers behind your keywords are. Driven by transactional scores.
- **Competition** — How hard it will be to rank for your keyword selection. Lower is better.
- **Est. Value** — A profitability indicator combining CPC, volume, and competition.
:::

Hover over any metric to see a tooltip explaining what your score means and how to improve it.

![Audit Header showing the overall score gauge, visibility, relevance, buy intent, competition metrics, and estimated value — The Audit Header gives you a snapshot of your listing's SEO health](/docs/keywords-audit-header.png)

## Adding more keywords

You can expand your keyword pool in three ways:

:::deflist{icon="ArrowRight"}
- **Add a custom keyword** — Click "+ Add Custom Keyword" at the bottom of the table. Type any keyword and press Enter or click Add. PennySEO fetches real search data and scores it against your listing context. Uses your plan's monthly quota.
- **Add from Favorites** — Click the star icon in the table header to open the Favorites picker. Select keywords you've previously saved to your Keyword Bank. These already have cached data, so no additional API lookup is needed. Uses your plan's monthly quota.
- **Add from a Preset** — In the same Favorites picker, switch to the Presets tab. Select a preset to add all its keywords at once.
:::

Keywords you add appear in the table and are auto-selected. They're marked with a special icon so you can distinguish them from AI-generated keywords.

![Inline custom keyword input row at the bottom of the keyword table — Add a custom keyword directly in the table](/docs/keywords-add-custom.png)

## The Strategy Tuner

For more control, expand the Strategy Tuner accordion between the Audit Header and the keyword table. It has five sliders:

:::deflist
- **Reach** — Prioritize high search volume (more eyes on your listing) vs. lower volume terms.
- **Ranking ease** — Prioritize low competition keywords (easier to rank) vs. competitive ones.
- **Buyer intent** — Prioritize keywords from people ready to buy vs. browsers.
- **Niche specificity** — Prioritize keywords that closely match your exact product vs. broader terms.
- **Market value** — Prioritize keywords with high commercial value (CPC) vs. general terms.
:::

Each slider has four levels: Low, Regular, High, and Aggressive. After adjusting, click **"Apply strategy"** to re-rank your entire keyword pool with the new weights. This doesn't generate new keywords — it re-evaluates and re-selects from your existing pool.

![Strategy Tuner with five sliders at different positions and the Apply strategy button — The Strategy Tuner — adjust weights to re-rank your keyword pool](/docs/keywords-strategy-tuner.png)

:::tip
The default "Regular" setting works well for most products. Try "High" on Ranking ease if you're a new shop with no reviews yet — it helps you target keywords where you can actually compete.
:::

## Saving keywords to your bank

Click the star icon on any keyword row to save it to your [Keyword Bank](/docs/lab/favorites) in the SEO Lab. Saved keywords can be reused across multiple listings, grouped into presets, and tracked over time.

You can also click [Save as Preset](/docs/lab/presets) in the table header to save your current selection as a reusable keyword strategy.
