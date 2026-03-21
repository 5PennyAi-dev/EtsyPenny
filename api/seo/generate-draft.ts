import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../lib/supabase/server.js';
import { runTextModel } from '../../lib/ai/gemini.js';
import { extractJson } from '../../lib/ai/extract-json.js';

const STATUS_COMPLETE = '28a11ca0-bcfc-42e0-971d-efc320f78424';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { listing_id, keywords, image_url, visual_analysis, categorization, product_details, shop_context } = req.body;

    if (!listing_id || !keywords?.length) {
      return res.status(400).json({ error: 'Missing listing_id or keywords' });
    }

    console.info(`[generate-draft] listing=${listing_id} keywords=${keywords.length}`);

    // Step A: Build SEO brief from keywords
    const seoBrief = keywords.map((item: { keyword: string; status?: { promising?: boolean; trending?: boolean; evergreen?: boolean }; avg_volume?: number; competition?: number }) => {
      const badges: string[] = [];
      if (item.status?.promising) badges.push('Promising 💎');
      if (item.status?.trending) badges.push('Trending 🔥');
      if (item.status?.evergreen) badges.push('Evergreen 🌲');
      const badgeText = badges.length > 0 ? badges.join(' + ') : 'Standard';
      return `- Keyword: "${item.keyword}" | Status: ${badgeText} | Volume: ${item.avg_volume} | Comp: ${item.competition}`;
    }).join('\n');

    const nicheInfo = [categorization?.theme, categorization?.niche, categorization?.sub_niche].filter(Boolean).join(' > ');

    // Step B: Build the full prompt (ported from n8n workflow)
    const prompt = `# Role
You are an expert Etsy Copywriter acting as the voice of **${shop_context?.shop_name || 'the shop'}**.
Your goal is to write a product listing that feels authentic to the brand's identity, speaks directly to its target audience, and maintains high SEO performance.

# Brand Identity (Context)
- **Shop Bio/Mission:** ${shop_context?.shop_bio || 'N/A'}
- **Brand Tone:** ${shop_context?.brand_tone || 'Engaging'}
- **Target Audience:** ${shop_context?.target_audience || 'General'}
- **Brand Keywords:** ${Array.isArray(shop_context?.brand_keywords) ? shop_context.brand_keywords.join(', ') : (shop_context?.brand_keywords || 'N/A')}

# Input Data
- **Strategic SEO Brief:**
${seoBrief}

- **Product Details:**
- **Product Type:** ${product_details?.product_type || 'Product'}
- **Theme:** ${categorization?.theme || 'N/A'}
- **Niche:** ${categorization?.niche || 'N/A'}
- **Sub-Niche:** ${categorization?.sub_niche || 'N/A'}
- **Product Description:** ${product_details?.client_description || categorization?.user_description || 'N/A'}

# 2. Visual & Marketing Data (Input from Image Analysis)
- **Aesthetic/Style:** ${visual_analysis?.aesthetic || 'N/A'}
- **Typography:** ${visual_analysis?.typography || 'N/A'}
- **Graphic Elements:** ${visual_analysis?.graphics || 'N/A'}
- **Color Palette:** ${visual_analysis?.colors || 'N/A'}
- **Target Audience:** ${visual_analysis?.target_audience || 'N/A'}
- **Overall_vibe:** ${visual_analysis?.overall_vibe || 'N/A'}

# Task 1: Strategic Etsy Title (140 chars max)
- **Structure Logic:** 1. **Primary Hook:** Start immediately with the [Product Type] + [Main Subject] (e.g., "Funny Math T-Shirt" or "Grumpy Cat Teacher Shirt").
    2. **High-Value Keywords:** Follow with the most "Promising" keywords provided.
    3. **Target Audience/Occasion:** Include who it's for or the event (e.g., "Gift for Math Teacher", "Back to School").
    4. **Specific Details:** End with "Trending" keywords or specific visual elements (e.g., "Cat with Pencil").

- **Content Rules:**
    - The first 40 characters MUST clearly define the product type and main theme.
    - Avoid "artistic" descriptions (like "Playful Academic") unless they are proven high-volume search terms.
    - Use variations of the product type (e.g., use both "T-Shirt" and "Shirt" if space permits).
    - Avoid repeating the exact same word more than twice.

- **Formatting (CRITICAL):** - Use ONLY plain text.
    - NO bolding, NO italics, NO Markdown in the output string.
    - NO emojis.
    - Use " | " as separators with a space before and after the bar.

- **Goal:** A high-conversion title where the most searchable terms are in the first 60 characters.

# Task 2: Natural "Story & Specs" Description
Write a description tailored for **${shop_context?.target_audience || 'the target audience'}** using a **${shop_context?.brand_tone || 'Engaging'}** tone.

1. **The Emotional Hook (The Story):**
   - **ANTI-AI RULE:** Do NOT use clichés like "Let's face it," "Look no further," "In a world where," or "Introducing...".
   - **OPENING VARIETY:** Randomly select ONE of these styles for your first sentence:
     - *The Direct Question:* (e.g., "Searching for a [Sub-niche] that actually feels like you?")
     - *The Sensory Approach:* (e.g., "There's a certain [Brand Tone] charm in the way this [Visual Aesthetic] design comes together.")
     - *The Occasion Hook:* (e.g., "Whether you're gearing up for [Target Audience Occasion] or just treating yourself...")
     - *The Relatable Vibe:* (e.g., "Finding a [Product Type] that matches your exact style shouldn't be a struggle.")
   - Write 2-3 fluid sentences describing the product.
   - **VISUAL PROOF:** Mention at least one specific detail from the 'Visual & Marketing Data' (specific color, texture, or font vibe).
   - **SEO INTEGRATION:** Naturally weave in 4-6 tags (prioritize Trending and Promising).
   - **NO FORMATTING:** Under NO circumstances use bold (**keyword**) or italics for keywords in this narrative section.
   - **NATURAL FLOW:** Keywords must fit so perfectly into the grammar that a reader wouldn't know they are SEO tags.

2. **The "Why You'll Love It" Section (The Specs):**
   - **DYNAMIC HEADING:** Vary the title of this section (e.g., "Why It's a Must-Have," "The Details You'll Adore," "Fresh Finds & Features").
   - Use a bulleted list to highlight quality.
   - Integrate "Evergreen 🌲" tags here.
   - Use all parameters to explain why the person will love it.

3. **Brand Signature (Call to Action):**
   - Strictly end the listing with this exact text: "${shop_context?.signature_text || ''}"

# Constraints
- **Tone Consistency:** Strictly adhere to the **${shop_context?.brand_tone || 'Engaging'}** brand voice.
- **Format:** Strictly JSON output.
- **Formatting:** Use Markdown only for the description (headings/bullets), but NEVER for keywords in the story.

IMPORTANT: **DO NOT** use bold text (keyword) for SEO tags.

Self-validation: Review the output against the instructions. If it fails any condition, correct it before responding.

# Output Format
{
  "title": "...",
  "description": "..."
}`;

    // Step C: Call Gemini
    const rawResponse = await runTextModel(prompt);

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

    console.info(`[generate-draft] complete listing=${listing_id}`);
    return res.json({ success: true, title, description });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [generate-draft] Error:', message);
    return res.status(500).json({ error: 'Failed to generate draft.', details: message });
  }
}
