// Native fetch is available in Node 22+ — no import needed

/**
 * Test script for /api/seo/add-from-favorite
 * Pre-filled with real listing_id and keywords from your DB.
 * 
 * Usage: node test-add-from-favorite.mjs
 * Requires: npm run dev (server must be running on port 3001)
 */
async function testAddFromFavorite() {
  // "Phone case" listing — product_type = iphone case, theme = Retro-Futurism, niche = Gaming & Esports
  // iphone keywords should now score 7-10 (not 1) after the product type context fix
  const listingId = '4c5e15db-4ff7-424e-9c34-e3bf6d8a7273';

  // Real keywords from your user_keyword_bank (top 3 by volume)
  const keywords = [
    {
      tag: 'mens leather belt',
      last_volume: 1739820,
      last_competition: 1,
      last_cpc: 2.48,
      volume_history: [1739820,5395500,5395500,1207680,2522220,3685500,1739820,1739820,836220,836220,836220,836220],
    },
    {
      tag: 'framed art print',
      last_volume: 1389600,
      last_competition: 1,
      last_cpc: 2.69,
      volume_history: [1389600,948602,1389600,948602,3005356,4527035,2016758,1389600,1389600,1389600,2016758,1389600],
    },
    {
      tag: 'iphone case',
      last_volume: 635926,
      last_competition: 1,
      last_cpc: 1.86,
      volume_history: [530556,530556,530556,530556,530556,530556,758012,635926,635926,758012,530556,635926],
    },
  ];

  console.log(`\n⭐ Testing POST /api/seo/add-from-favorite`);
  console.log(`   listing_id: ${listingId}`);
  console.log(`   keywords:   ${keywords.length} items (${keywords.map(k => k.tag).join(', ')})\n`);

  try {
    const response = await fetch('http://localhost:3001/api/seo/add-from-favorite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_id: listingId, keywords }),
    });

    const data = await response.json();
    console.log('Status:', response.status);

    if (response.status === 200 && data.success) {
      console.log('\n✅ Test PASSED');
      console.log(`   added_count:      ${data.added_count}`);
      console.log(`   listing_strength: ${data.listing_strength}`);
      console.log('\n   Keywords returned:');
      data.keywords?.forEach(kw => {
        console.log(`   - "${kw.tag}"`);
        console.log(`       score=${kw.opportunity_score}  niche=${kw.niche_score}  tx=${kw.transactional_score}`);
        console.log(`       pinned=${kw.is_pinned}  selected=${kw.is_selection_ia}  trending=${kw.is_trending}  evergreen=${kw.is_evergreen}`);
      });
    } else {
      console.log('\n❌ Test FAILED');
      console.log('Response:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

testAddFromFavorite();
