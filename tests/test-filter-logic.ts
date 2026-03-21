import { applySEOFilter, KeywordInput, FilterParameters } from '../lib/seo/filter-logic';
import fs from 'fs';

function main() {
    console.log('Loading mock data from docs/Filter SEO 2.json...');
    const rawData = fs.readFileSync('../docs/Filter SEO 2.json', 'utf-8');
    const data = JSON.parse(rawData);

    // Extract the mock data from the n8n JSON
    const mockInput = data.pinData["When Executed by Another Workflow"][0].json;
    const keywords = mockInput.result as KeywordInput[];

    const params: FilterParameters = {
        Volume: mockInput.Parameters.Volume,
        Competition: mockInput.Parameters.Competition,
        Transaction: mockInput.Parameters.Transaction,
        Niche: mockInput.Parameters.Niche,
        CPC: mockInput.Parameters.CPC,
        evergreen_stability_ratio: mockInput.Parameters.evergreen_stability_ratio,
        evergreen_minimum_volume: mockInput.Parameters.evergreen_minimum_volume,
        evergreen_avg_volume: mockInput.Parameters.evergreen_avg_volume,
        trending_dropping_threshold: mockInput.Parameters.trending_dropping_threshold,
        trending_current_month_min_volume: mockInput.Parameters.trending_current_month_min_volume,
        trending_growth_factor: mockInput.Parameters.trending_growth_factor,
        promising_min_score: mockInput.Parameters.promising_min_score,
        promising_competition: mockInput.Parameters.promising_competition,
        ai_selection_count: mockInput.Parameters.ai_selection_count,
        working_pool_count: mockInput.Parameters.working_pool_count,
        concept_diversity_limit: mockInput.Parameters.concept_diversity_limit,
    };

    console.log('--- Input parameters ---');
    console.log(params);
    console.log(`\nProcessing ${keywords.length} keywords...\n`);

    const results = applySEOFilter(keywords, params);

    console.log('--- Top 15 Results (Diversity/Pool Check) ---');
    results.slice(0, 15).forEach((r, idx) => {
        console.log(`${String(idx + 1).padStart(2)}. [Score: ${r.opportunity_score}] [Pinned: ${r.is_pinned ? 'Y' : 'N'}] ${r.keyword}`);
        console.log(`    Status: Trend=${r.status.trending} Ever=${r.status.evergreen} Prom=${r.status.promising}`);
        console.log(`    Flags: AI Selection=${r.is_selection_ia}, Eval=${r.is_current_eval}, Pool=${r.is_current_pool}`);
    });

    console.log(`\nTotal tags returned after filtering: ${results.length}`);
}

main();
