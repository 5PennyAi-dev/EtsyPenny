-- ============================================================
-- Dashboard Mock Data Seeder
-- Run in Supabase SQL Editor
-- ============================================================

DO $$
DECLARE
  uid UUID := '5f21e63b-318f-4848-bb52-754bed5cb554';
  status_new UUID := 'ac083a90-43fa-4ff5-a62d-5cd6bb5edbcc';
  status_seo UUID := '35660e24-94bb-4586-aa5a-a5027546b4a1';
  status_complete UUID := '28a11ca0-bcfc-42e0-971d-efc320f78424';
  lid UUID;
BEGIN

  -- ── NEW listings (image uploaded, nothing else) ──
  INSERT INTO listings (user_id, title, image_url, status_id, is_image_analysed, created_at)
  VALUES
    (uid, 'Leather Journal Cover', 'https://placehold.co/400x400/f1f5f9/64748b?text=Journal', status_new, false, NOW() - INTERVAL '2 days'),
    (uid, 'Ceramic Coffee Mug', 'https://placehold.co/400x400/f1f5f9/64748b?text=Mug', status_new, false, NOW() - INTERVAL '1 day'),
    (uid, 'Macrame Wall Hanging', 'https://placehold.co/400x400/f1f5f9/64748b?text=Macrame', status_new, false, NOW() - INTERVAL '3 hours'),
    (uid, 'Wooden Cutting Board', 'https://placehold.co/400x400/f1f5f9/64748b?text=Board', status_new, false, NOW() - INTERVAL '1 hour');

  -- ── ANALYZED listings (image analyzed, no SEO yet) ──
  INSERT INTO listings (user_id, title, image_url, status_id, is_image_analysed, theme, niche, visual_aesthetic, visual_overall_vibe, created_at)
  VALUES
    (uid, 'Boho Earrings Set', 'https://placehold.co/400x400/e0e7ff/4f46e5?text=Earrings', status_new, true, 'Bohemian', 'Jewelry', 'Warm and earthy', 'Handmade artisan feel', NOW() - INTERVAL '5 days'),
    (uid, 'Abstract Canvas Print', 'https://placehold.co/400x400/e0e7ff/4f46e5?text=Canvas', status_new, true, 'Modern Art', 'Wall Art', 'Bold and contemporary', 'Gallery-worthy statement piece', NOW() - INTERVAL '4 days'),
    (uid, 'Knitted Baby Blanket', 'https://placehold.co/400x400/e0e7ff/4f46e5?text=Blanket', status_new, true, 'Baby & Kids', 'Nursery', 'Soft pastels', 'Cozy and comforting', NOW() - INTERVAL '3 days'),
    (uid, 'Personalized Pet Portrait', 'https://placehold.co/400x400/e0e7ff/4f46e5?text=Pet', status_new, true, 'Pet Lovers', 'Pet Owners', 'Watercolor illustration', 'Heartwarming and personal', NOW() - INTERVAL '4 days'),
    (uid, 'Vintage Map Poster', 'https://placehold.co/400x400/e0e7ff/4f46e5?text=Map', status_new, true, 'Vintage', 'Travel', 'Aged parchment aesthetic', 'Nostalgic wanderlust', NOW() - INTERVAL '6 days'),
    (uid, 'Embroidered Tote Bag', 'https://placehold.co/400x400/e0e7ff/4f46e5?text=Tote', status_new, true, 'Eco Fashion', 'Accessories', 'Natural cotton texture', 'Sustainable and stylish', NOW() - INTERVAL '2 days');

  -- ── SEO_READY listings (have keywords but user hasn't selected 13 yet) ──
  FOR i IN 1..6 LOOP
    INSERT INTO listings (user_id, title, image_url, status_id, is_image_analysed, theme, niche, created_at)
    VALUES (
      uid,
      (ARRAY['Gothic Cat T-shirt', 'Minimalist Phone Case', 'Boho Dream Catcher', 'Retro Vinyl Sticker Pack', 'Watercolor Flower Print', 'Handmade Soap Set'])[i],
      'https://placehold.co/400x400/dbeafe/1e40af?text=SEO' || i,
      status_seo, true,
      (ARRAY['Dark Academia', 'Minimalist', 'Bohemian', 'Retro', 'Botanical', 'Natural Beauty'])[i],
      (ARRAY['Pet Owners', 'Tech Accessories', 'Home Decor', 'Stationery', 'Wall Art', 'Bath & Body'])[i],
      NOW() - (i || ' days')::INTERVAL
    ) RETURNING id INTO lid;

    -- Add 20-30 keywords with only 6-10 selected (not yet 13)
    INSERT INTO listing_seo_stats (listing_id, tag, search_volume, competition, cpc, is_current_pool, is_current_eval, is_selection_ia, opportunity_score, niche_score, transactional_score)
    SELECT
      lid,
      tag,
      (RANDOM() * 15000 + 100)::INTEGER,
      ROUND((RANDOM() * 0.9 + 0.05)::NUMERIC, 2)::REAL,
      ROUND((RANDOM() * 3 + 0.1)::NUMERIC, 2)::REAL,
      true,
      ROW_NUMBER() OVER () <= (6 + (RANDOM() * 4)::INTEGER),
      ROW_NUMBER() OVER () <= (6 + (RANDOM() * 4)::INTEGER),
      (RANDOM() * 100)::INTEGER,
      (RANDOM() * 4 + 1)::SMALLINT,
      (RANDOM() * 4 + 1)::SMALLINT
    FROM unnest(ARRAY[
      'cat lover gift', 'gothic aesthetic', 'dark academia shirt', 'vintage cat tee',
      'pet owner shirt', 'alternative fashion', 'witchy clothing', 'cat mom gift',
      'spooky cute shirt', 'halloween cat', 'goth cat lover', 'black cat shirt',
      'cat dad gift', 'quirky pet shirt', 'aesthetic dark tee', 'grunge cat top',
      'feline lover gift', 'occult cat design', 'mystic cat shirt', 'indie cat apparel',
      'cat illustration tee', 'dark cottagecore', 'edgy pet fashion', 'cat portrait shirt',
      'alternative pet gift'
    ]) AS tag;

    INSERT INTO listings_global_eval (listing_id, listing_strength, listing_visibility, listing_relevance, listing_conversion, listing_competition)
    VALUES (lid, 35 + (RANDOM() * 30)::INTEGER, 40 + (RANDOM() * 40)::INTEGER, 30 + (RANDOM() * 40)::INTEGER, 40 + (RANDOM() * 35)::INTEGER, 40 + (RANDOM() * 40)::INTEGER);
  END LOOP;

  -- ── DRAFT_READY listings (13 keywords selected, no title/desc yet) ──
  FOR i IN 1..5 LOOP
    INSERT INTO listings (user_id, title, image_url, status_id, is_image_analysed, theme, niche, created_at)
    VALUES (
      uid,
      (ARRAY['Cottagecore Mushroom Art', 'Geometric Plant Pot', 'Vintage Travel Poster', 'Custom Name Necklace', 'Linen Table Runner'])[i],
      'https://placehold.co/400x400/d1fae5/065f46?text=Draft' || i,
      status_seo, true,
      (ARRAY['Cottagecore', 'Modern Home', 'Vintage', 'Personalized', 'Farmhouse'])[i],
      (ARRAY['Wall Art', 'Planters', 'Posters', 'Jewelry', 'Kitchen'])[i],
      NOW() - ((i + 7) || ' days')::INTERVAL
    ) RETURNING id INTO lid;

    INSERT INTO listing_seo_stats (listing_id, tag, search_volume, competition, cpc, is_current_pool, is_current_eval, is_selection_ia, opportunity_score, niche_score, transactional_score)
    SELECT
      lid,
      'keyword_' || lid || '_' || n,
      (RANDOM() * 20000 + 200)::INTEGER,
      ROUND((RANDOM() * 0.8 + 0.1)::NUMERIC, 2)::REAL,
      ROUND((RANDOM() * 4 + 0.2)::NUMERIC, 2)::REAL,
      true,
      n <= 13,
      n <= 13,
      (RANDOM() * 100)::INTEGER,
      (RANDOM() * 4 + 1)::SMALLINT,
      (RANDOM() * 4 + 1)::SMALLINT
    FROM generate_series(1, 25) AS n;

    INSERT INTO listings_global_eval (listing_id, listing_strength, listing_visibility, listing_relevance, listing_conversion, listing_competition)
    VALUES (lid, 50 + (RANDOM() * 25)::INTEGER, 55 + (RANDOM() * 30)::INTEGER, 50 + (RANDOM() * 30)::INTEGER, 50 + (RANDOM() * 30)::INTEGER, 40 + (RANDOM() * 35)::INTEGER);
  END LOOP;

  -- ── OPTIMIZED listings (title + description generated) ──
  FOR i IN 1..12 LOOP
    INSERT INTO listings (user_id, title, image_url, status_id, is_image_analysed, theme, niche,
      generated_title, generated_description, created_at)
    VALUES (
      uid,
      (ARRAY['Dark Academia Wall Poster', 'Botanical Illustration Print', 'Handmade Ceramic Vase', 'Custom Dog Portrait',
             'Minimalist Gold Ring', 'Vintage Floral Dress', 'Rustic Wood Sign', 'Yoga Mat Bag',
             'Pressed Flower Bookmark', 'Crochet Plant Hanger', 'Watercolor Galaxy Art', 'Personalized Star Map'])[i],
      'https://placehold.co/400x400/dcfce7/166534?text=Done' || i,
      status_complete, true,
      (ARRAY['Dark Academia', 'Botanical', 'Handmade', 'Pet Lovers', 'Minimalist', 'Vintage',
             'Farmhouse', 'Wellness', 'Botanical', 'Boho', 'Cosmic', 'Personalized'])[i],
      (ARRAY['Wall Art', 'Prints', 'Ceramics', 'Pet Owners', 'Jewelry', 'Fashion',
             'Home Decor', 'Fitness', 'Stationery', 'Planters', 'Wall Art', 'Custom Gifts'])[i],
      'Optimized Title for Listing ' || i,
      'Optimized SEO description with compelling copy for listing ' || i,
      NOW() - ((i + 12) || ' days')::INTERVAL
    ) RETURNING id INTO lid;

    INSERT INTO listing_seo_stats (listing_id, tag, search_volume, competition, cpc, is_current_pool, is_current_eval, is_selection_ia, opportunity_score, niche_score, transactional_score, is_trending, is_evergreen, is_promising)
    SELECT
      lid,
      'kw_opt_' || lid || '_' || n,
      (RANDOM() * 25000 + 300)::INTEGER,
      ROUND((RANDOM() * 0.7 + 0.1)::NUMERIC, 2)::REAL,
      ROUND((RANDOM() * 5 + 0.3)::NUMERIC, 2)::REAL,
      true,
      n <= 13,
      n <= 13,
      (RANDOM() * 100)::INTEGER,
      (RANDOM() * 4 + 1)::SMALLINT,
      (RANDOM() * 4 + 1)::SMALLINT,
      RANDOM() > 0.7,
      RANDOM() > 0.5,
      RANDOM() > 0.8
    FROM generate_series(1, 20) AS n;

    INSERT INTO listings_global_eval (listing_id, listing_strength, listing_visibility, listing_relevance, listing_conversion, listing_competition)
    VALUES (lid, 65 + (RANDOM() * 30)::INTEGER, 70 + (RANDOM() * 25)::INTEGER, 60 + (RANDOM() * 30)::INTEGER, 65 + (RANDOM() * 30)::INTEGER, 35 + (RANDOM() * 40)::INTEGER);
  END LOOP;

  RAISE NOTICE 'Mock data seeded: 4 NEW, 6 ANALYZED, 6 SEO_READY, 5 DRAFT_READY, 12 OPTIMIZED = 33 total listings';
END $$;
