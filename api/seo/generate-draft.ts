import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../lib/supabase/server.js';
import { runAI } from '../../lib/ai/provider-router.js';
import { extractJson } from '../../lib/ai/extract-json.js';
import { checkTokenBalance, deductTokens } from '../../lib/tokens/token-middleware.js';

const STATUS_COMPLETE = '28a11ca0-bcfc-42e0-971d-efc320f78424';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { listing_id, user_id, keywords, image_url, visual_analysis, categorization, product_details, shop_context } = req.body;

    if (!listing_id || !keywords?.length || !user_id) {
      return res.status(400).json({ error: 'Missing listing_id, user_id, or keywords' });
    }

    // Token check
    const tokenCheck = await checkTokenBalance(user_id, 'generate_draft');
    if (!tokenCheck.allowed) {
      return res.status(402).json({ error: tokenCheck.reason, balance: tokenCheck.balance, required: tokenCheck.required });
    }

    console.info(`[generate-draft] listing=${listing_id} keywords=${keywords.length}`);

    // Step A: Build clean SEO brief from keywords (no emoji, capped at 13)
    const statusClean = (item: { status?: { promising?: boolean; trending?: boolean; evergreen?: boolean } }) => {
      if (item.status?.promising) return 'Promising';
      if (item.status?.trending) return 'Trending';
      if (item.status?.evergreen) return 'Evergreen';
      return 'Standard';
    };

    const briefLines = keywords
      .slice(0, 13)
      .map((item: { keyword: string; status?: { promising?: boolean; trending?: boolean; evergreen?: boolean }; avg_volume?: number; competition?: number }) =>
        `- "${item.keyword}" [${statusClean(item)}] vol:${item.avg_volume || 0} comp:${item.competition || 'N/A'}`)
      .join('\n');

    // Rotate opening style server-side for variety
    const openingStyles = ['question', 'sensory', 'occasion', 'relatable'];
    const openingStyle = openingStyles[Date.now() % openingStyles.length];

    // Step B: Build the prompt
    const prompt = `You are an Etsy listing copywriter. Write a title and description for this product.

# PRODUCT CONTEXT (primary — use this for tone and audience)
- Product type: ${product_details?.product_type || 'Product'}
- Theme: ${categorization?.theme || 'N/A'}
- Niche: ${categorization?.niche || 'N/A'}
- Sub-niche: ${categorization?.sub_niche || ''}
- Seller's notes: ${product_details?.client_description || categorization?.user_description || ''}

# VISUAL DETAILS (from AI image analysis)
- Style: ${visual_analysis?.aesthetic || 'N/A'}
- Colors: ${visual_analysis?.colors || 'N/A'}
- Graphics: ${visual_analysis?.graphics || 'N/A'}
- Typography: ${visual_analysis?.typography || 'N/A'}
- Target buyers: ${visual_analysis?.target_audience || 'N/A'}
- Vibe: ${visual_analysis?.overall_vibe || 'N/A'}

# SEO KEYWORDS (ranked by priority — use as many as possible)
${briefLines}
${shop_context?.shop_name ? `
# SHOP IDENTITY (secondary — use for sign-off only, NOT for tone)
- Shop: ${shop_context.shop_name}${shop_context?.brand_tone ? `\n- Brand tone: ${shop_context.brand_tone}` : ''}${shop_context?.signature_text ? `\n- Sign-off: ${shop_context.signature_text}` : ''}` : ''}

---

# TASK 1: TITLE (max 140 characters)

Write a search-optimized Etsy title.

Rules:
- First 40 chars: product type + main theme (what a buyer sees in search results)
- Pack in as many SEO keywords as possible without sounding robotic
- Use " | " as separator between keyword groups
- Plain text only — no bold, no italics, no emoji, no markdown
- Don't repeat the exact same word more than twice
- On Etsy, word ORDER doesn't affect search ranking — focus on including the right words, not their position

Good examples:
- "Cyberpunk Gamer iPhone Case | Neon Sci-Fi Phone Cover | Gaming Gift for Him"
- "Funny Math Teacher Shirt | Pi Day T-Shirt Gift | Nerdy School Tee for Her"
- "Personalized Dog Mom Mug | Custom Pet Name Coffee Cup | Birthday Gift for Dog Lover"

Bad examples:
- "Durable Iphone Case Gamer Iphone Case Gaming Iphone Case Neon" (keyword stuffing, no flow)
- "The Ultimate Cyberpunk Gaming Experience Phone Case" (wastes chars on filler words)
- "Beautiful Handmade Premium Quality Case" (generic, no searchable terms)

# TASK 2: DESCRIPTION (150-200 words)

Write a 2-section description.

## Section 1: Product story (1 short paragraph, 3-4 sentences)
- Opening style for this listing: "${openingStyle}"
  - "question" → Start with a direct question to the buyer
  - "sensory" → Start by describing the look/feel of the design
  - "occasion" → Start with a use case or gifting scenario
  - "relatable" → Start with a relatable statement about finding the right product
- Mention at least ONE specific visual detail (a color, graphic element, or design feature)
- Weave in 4-6 SEO keywords naturally — they must read as normal English, not forced insertions
- Do NOT bold or italicize any keywords
- Do NOT use clichés: "Let's face it", "Look no further", "In a world where", "Introducing", "Say hello to", "Meet your new favorite"

## Section 2: Key features (bulleted list, 4-6 bullets)
- Use a heading like "Why you'll love it" or "The details" (vary it)
- Format: markdown bullets (- or •)
- Include product quality, material, design details, and who it's perfect for
- Weave in remaining SEO keywords here
${shop_context?.signature_text ? `
## Sign-off
End with exactly: "${shop_context.signature_text}"` : ''}

# OUTPUT FORMAT
Respond with ONLY this JSON, no other text:
{
  "title": "your title here",
  "description": "your description here with markdown bullets"
}`;

    // Log the interpolated prompt for debugging
    console.log('\n========== GENERATE-DRAFT PROMPT ==========\n');
    console.log(prompt);
    console.log('\n========== END PROMPT ==========\n');

    // Step C: Call Gemini
    const { text: rawResponse } = await runAI('draft_generation', prompt);

    // Step D: Parse response
    const parsed = JSON.parse(extractJson(rawResponse));
    const { title, description } = parsed;

    if (!title) {
      throw new Error('Gemini returned no title');
    }

    // Step E: Persist to DB
    const { error: updateError } = await supabaseAdmin
      .from('listings')
      .update({
        generated_title: title,
        generated_description: description,
        status_id: STATUS_COMPLETE,
      })
      .eq('id', listing_id);

    if (updateError) {
      console.error('[generate-draft] DB update failed:', updateError.message);
    }

    // Deduct token after successful processing
    await deductTokens(user_id, 'generate_draft', tokenCheck.required, listing_id);

    console.info(`[generate-draft] complete listing=${listing_id}`);
    return res.json({ success: true, title, description });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [generate-draft] Error:', message);
    return res.status(500).json({ error: 'Failed to generate draft.', details: message });
  }
}
