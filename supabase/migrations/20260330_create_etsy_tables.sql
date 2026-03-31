-- Etsy Import Phase 1: shop connections + imported listings tables
-- Allows users to connect their Etsy shop and import listings for SEO analysis

-- ============================================================
-- Table: etsy_shop_connections
-- Links a PennySEO user to their Etsy shop (OAuth tokens, sync status)
-- ============================================================
CREATE TABLE public.etsy_shop_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  etsy_shop_id BIGINT NOT NULL,
  shop_name TEXT,
  shop_url TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  connected_at TIMESTAMPTZ DEFAULT now(),
  last_synced_at TIMESTAMPTZ,

  CONSTRAINT fk_esc_user FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT uq_user_shop UNIQUE (user_id, etsy_shop_id)
);

ALTER TABLE public.etsy_shop_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own shop connections"
  ON public.etsy_shop_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own shop connections"
  ON public.etsy_shop_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shop connections"
  ON public.etsy_shop_connections FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================
-- Table: etsy_listings
-- Snapshot of imported Etsy listing data (immutable after import)
-- ============================================================
CREATE TABLE public.etsy_listings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  connection_id UUID NOT NULL,
  listing_id UUID,
  etsy_listing_id BIGINT NOT NULL,
  original_title TEXT,
  original_description TEXT,
  original_tags TEXT[] DEFAULT '{}',
  original_image_url TEXT,
  thumbnail_url TEXT,
  etsy_url TEXT,
  etsy_state TEXT,
  tag_count SMALLINT DEFAULT 0,
  original_score SMALLINT,
  scoring_status TEXT DEFAULT 'pending'
    CHECK (scoring_status IN ('pending', 'scoring', 'scored', 'error')),
  scored_at TIMESTAMPTZ,
  imported_at TIMESTAMPTZ DEFAULT now(),
  last_synced_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT fk_el_user FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT fk_el_connection FOREIGN KEY (connection_id) REFERENCES public.etsy_shop_connections(id),
  CONSTRAINT fk_el_listing FOREIGN KEY (listing_id) REFERENCES public.listings(id),
  CONSTRAINT uq_user_etsy_listing UNIQUE (user_id, etsy_listing_id)
);

CREATE INDEX idx_etsy_listings_user ON public.etsy_listings (user_id);
CREATE INDEX idx_etsy_listings_user_status ON public.etsy_listings (user_id, scoring_status);

ALTER TABLE public.etsy_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own etsy listings"
  ON public.etsy_listings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own etsy listings"
  ON public.etsy_listings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own etsy listings"
  ON public.etsy_listings FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================
-- ALTER plans: add etsy_import_limit column
-- ============================================================
ALTER TABLE public.plans
ADD COLUMN IF NOT EXISTS etsy_import_limit INTEGER DEFAULT 10;

UPDATE public.plans SET etsy_import_limit = 10  WHERE id = 'free';
UPDATE public.plans SET etsy_import_limit = 50  WHERE id = 'starter';
UPDATE public.plans SET etsy_import_limit = 150 WHERE id = 'growth';
UPDATE public.plans SET etsy_import_limit = 300 WHERE id = 'pro';
