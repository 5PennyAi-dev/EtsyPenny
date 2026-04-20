---
slug: lab/favorites
title: Favorite Tags
subtitle: Build your personal keyword library
category: SEO Lab
order: 1
icon: Star
summary: How the Favorite Tags tab in the SEO Lab works — saving keywords across listings, filtering, grouped views, refreshing stale data, and bulk actions.
updated: 2026-04-19
---

The Favorite Tags tab in the SEO Lab is your personal keyword bank — a growing library of keywords you've saved across all your listings. Over time, it becomes your most valuable SEO asset: a curated collection of proven keywords you can reuse, track, and organize into [presets](/docs/lab/presets).

## Saving keywords to your bank

There are two ways to add keywords to your Favorite Tags:

From the [Keyword Performance table](/docs/studio/keywords) in the SEO Studio, click the star icon on any keyword row. It turns gold and the keyword is saved to your bank with all its data (volume, competition, CPC, trend history).

You can also **add keywords manually** directly in the SEO Lab using the inline add row at the top of the table.

Each keyword is stored with its origin context — the theme, niche, and sub-niche from the listing where you first saved it. This helps you filter and organize later.

## Reading the table

The Favorite Tags table shows each keyword with:

:::deflist
- **Tag** — The keyword itself, displayed as a styled pill. Trending and Evergreen indicators appear as small icons next to the tag when applicable.
- **Volume** — Latest monthly search volume from DataForSEO.
- **Trend** — A 12-month sparkline showing the volume trajectory.
- **Competition** — Color-coded score (green, amber, red).
- **CPC** — Cost-per-click value.
- **Niche** — Breadcrumb showing Theme › Niche › Sub-niche context from the original listing.
- **Used In** — How many of your active listings currently use this keyword. An indigo badge for 1–2 listings, green for 3+.
- **Freshness** — When the data was last updated. Keywords older than 21 days are flagged as stale.
:::

You can sort by any column by clicking the header. The table is paginated — choose 10, 25, or 50 rows per page.

![SEO Lab Favorite Tags table with filter pills, keyword tags with trending indicators, and volume data — Your Favorite Tags library with filter pills and keyword data](/docs/seolab-favorites-table.png)

## Filtering your keywords

Use the search bar to find specific keywords by name.

Below the search bar, filter pills let you narrow down your library. Multiple pills can be active at once — they stack with AND logic:

:::deflist
- **All** — No filter, show everything.
- **Gems** — Keywords with high volume, low competition, and good CPC — the best opportunities.
- **Trending** — Keywords with rising search volume.
- **High Volume** — Keywords above a volume threshold.
- **Low Competition** — Keywords with competition below 0.3.
- **Unused** — Keywords not currently used in any of your listings.
- **Stale** — Keywords with data older than 21 days that need refreshing.
:::

For deeper filtering, click the **Filter** button next to the search bar. This opens dropdown filters for Theme, Niche, and Sub-niche. The dropdowns cascade — selecting a Theme narrows the available Niches to only those associated with it.

## Grouped view

Toggle between List view and Grouped view using the segmented control next to the search bar.

Grouped view organizes your keywords into collapsible sections by Theme › Niche, with aggregate stats per group: average volume, average competition, gem count, and usage ratio. This gives you a bird's-eye view of where your keyword strength is concentrated.

![Grouped view showing keywords organized by Theme and Niche with aggregate stats per group — Grouped view organizes your keywords by Theme and Niche](/docs/seolab-grouped-view.png)

## Refreshing stale keywords

Keyword data gets stale over time — search volumes shift, competition changes. Keywords older than 21 days are flagged with a "Stale" indicator.

You can refresh data three ways: individually from the action menu on any stale keyword, in bulk by selecting keywords and using the bulk action bar, or all at once by clicking **"Refresh all stale"** when the Stale filter pill is active.

Refreshing pulls fresh data from DataForSEO — updated volume, competition, CPC, and trend history.

:::tip
Make it a habit to refresh your stale keywords every few weeks. Search trends change, and a keyword that was a gem last month might be saturated now — or vice versa.
:::

## Bulk actions

Select multiple keywords using the checkboxes (the header checkbox selects all on the current page). A sticky action bar appears at the bottom with:

:::deflist
- **Add to Preset** — Bundle the selected keywords into a new or existing preset.
- **Export CSV** — Download your selected keywords as a CSV file.
- **Refresh Stale** — Refresh data for all selected stale keywords at once.
- **Delete** — Remove the selected keywords from your bank.
:::

## Individual actions

Click the three-dot menu on any keyword row for:

:::deflist
- **Copy keyword** — Copy the tag text to your clipboard.
- **Add to preset** — Add this keyword to an existing preset.
- **Refresh data** — Pull fresh data for this keyword (only available when stale).
- **Remove from bank** — Delete this keyword from your Favorites.
:::
