-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.credit_packs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  token_amount integer NOT NULL,
  price_usd numeric NOT NULL,
  stripe_price_id text,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT credit_packs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.credits_usage (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  listing_id uuid,
  action_type text NOT NULL,
  amount integer NOT NULL,
  image_ref text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  balance_after integer,
  credit_source text CHECK (credit_source = ANY (ARRAY['subscription'::text, 'bonus'::text, 'mixed'::text])),
  CONSTRAINT credits_usage_pkey PRIMARY KEY (id),
  CONSTRAINT credits_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT credits_usage_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id)
);
CREATE TABLE public.customers (
  id uuid NOT NULL,
  stripe_customer_id text,
  CONSTRAINT customers_pkey PRIMARY KEY (id),
  CONSTRAINT customers_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.keyword_cache (
  tag text NOT NULL,
  search_volume integer,
  competition real,
  cpc real,
  volume_history ARRAY DEFAULT '{}'::integer[],
  last_sync_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT keyword_cache_pkey PRIMARY KEY (tag)
);
CREATE TABLE public.keyword_presets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title character varying NOT NULL,
  theme character varying,
  niche character varying,
  sub_niche character varying,
  keyword_ids ARRAY DEFAULT ARRAY[]::uuid[],
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT keyword_presets_pkey PRIMARY KEY (id),
  CONSTRAINT keyword_presets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.listing_mockups (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  listing_id uuid NOT NULL,
  storage_url text NOT NULL,
  is_primary boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT listing_mockups_pkey PRIMARY KEY (id),
  CONSTRAINT listing_mockups_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id)
);
CREATE TABLE public.listing_seo_stats (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  listing_id uuid NOT NULL,
  tag text NOT NULL,
  search_volume integer,
  competition text,
  opportunity_score integer,
  created_at timestamp with time zone DEFAULT now(),
  volume_history ARRAY DEFAULT '{}'::integer[],
  is_trending boolean DEFAULT false,
  is_evergreen boolean DEFAULT false,
  is_promising boolean DEFAULT false,
  is_selected boolean DEFAULT true,
  insight text DEFAULT ''::text,
  is_top boolean,
  is_sniper_seo boolean,
  is_competition boolean,
  transactional_score smallint,
  intent_label text,
  niche_score smallint,
  relevance_label text,
  evaluation_id uuid,
  is_selection_ia boolean DEFAULT false,
  is_current_eval boolean,
  is_user_added boolean,
  cpc real,
  is_current_pool boolean,
  is_pinned boolean DEFAULT false,
  CONSTRAINT listing_seo_stats_pkey PRIMARY KEY (id),
  CONSTRAINT listing_seo_stats_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id),
  CONSTRAINT listing_seo_stats_evaluation_id_fkey FOREIGN KEY (evaluation_id) REFERENCES public.listings_global_eval(id)
);
CREATE TABLE public.listing_statuses (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT listing_statuses_pkey PRIMARY KEY (id)
);
CREATE TABLE public.listings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  theme_id uuid,
  niche_id uuid,
  sub_niche_id uuid,
  product_type_id uuid,
  user_description text,
  generated_title text,
  generated_description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  tone_id uuid,
  custom_listing text,
  image_url text,
  title text,
  status_id uuid,
  visual_aesthetic text,
  visual_typography text,
  visual_graphics text,
  visual_colors text,
  visual_target_audience text,
  visual_overall_vibe text,
  global_strength integer,
  status_label text,
  strategic_verdict text,
  improvement_priority text,
  score_explanation text,
  competitor_seed text,
  product_type_text text,
  is_image_analysed boolean,
  theme text,
  niche text,
  sub_niche text,
  listing_strength smallint,
  listing_visibility smallint,
  listing_conversion smallint,
  listing_relevance smallint,
  listing_raw_visibility_index smallint,
  is_generating_seo boolean DEFAULT false,
  CONSTRAINT listings_pkey PRIMARY KEY (id),
  CONSTRAINT listings_niche_id_fkey FOREIGN KEY (niche_id) REFERENCES public.niches(id),
  CONSTRAINT listings_sub_niche_id_fkey FOREIGN KEY (sub_niche_id) REFERENCES public.sub_niches(id),
  CONSTRAINT listings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT listings_theme_id_fkey FOREIGN KEY (theme_id) REFERENCES public.themes(id),
  CONSTRAINT listings_tone_id_fkey FOREIGN KEY (tone_id) REFERENCES public.tones(id),
  CONSTRAINT listings_status_id_fkey FOREIGN KEY (status_id) REFERENCES public.listing_statuses(id)
);
CREATE TABLE public.listings_global_eval (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL,
  global_status_label text,
  global_strategic_verdict text,
  score_justification_visibility text,
  score_justification_relevance text,
  score_justification_conversion text,
  score_justification_strength text,
  improvement_plan_remove ARRAY DEFAULT '{}'::text[],
  improvement_plan_add ARRAY DEFAULT '{}'::text[],
  improvement_plan_primary_action text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  seo_mode text DEFAULT 'balanced'::text,
  global_strength integer,
  improvement_priority text,
  score_explanation text,
  listing_strength smallint,
  listing_visibility smallint,
  listing_relevance smallint,
  listing_conversion smallint,
  status_label text,
  strategic_verdict text,
  listing_raw_visibility_index integer,
  listing_competition smallint,
  listing_avg_cpc real,
  listing_avg_competition real,
  listing_profit smallint,
  param_Volume real,
  param_Transaction real,
  param_Competition real,
  param_Niche real,
  param_cpc real,
  listing_avg_competition_all real,
  listing_est_market_reach bigint,
  CONSTRAINT listings_global_eval_pkey PRIMARY KEY (id),
  CONSTRAINT listings_global_eval_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id)
);
CREATE TABLE public.niches (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  theme_id uuid NOT NULL,
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  description text,
  CONSTRAINT niches_pkey PRIMARY KEY (id),
  CONSTRAINT niches_theme_id_fkey FOREIGN KEY (theme_id) REFERENCES public.themes(id)
);
CREATE TABLE public.prices (
  id text NOT NULL,
  product_id text,
  active boolean,
  unit_amount bigint,
  currency text CHECK (char_length(currency) = 3),
  type USER-DEFINED,
  interval USER-DEFINED,
  interval_count integer,
  metadata jsonb,
  CONSTRAINT prices_pkey PRIMARY KEY (id),
  CONSTRAINT prices_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.product_categories (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT product_categories_pkey PRIMARY KEY (id)
);
CREATE TABLE public.product_types (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  category_id uuid,
  CONSTRAINT product_types_pkey PRIMARY KEY (id),
  CONSTRAINT product_types_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.product_categories(id)
);
CREATE TABLE public.products (
  id text NOT NULL,
  active boolean,
  name text,
  description text,
  image text,
  metadata jsonb,
  CONSTRAINT products_pkey PRIMARY KEY (id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  full_name text,
  avatar_url text,
  billing_address jsonb,
  payment_method jsonb,
  credits_balance integer DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now(),
  shop_name text,
  shop_bio text,
  target_audience text,
  brand_tone text,
  brand_keywords ARRAY,
  signature_text text,
  subscription_credits_balance integer DEFAULT 0,
  bonus_credits_balance integer DEFAULT 0,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.sub_niches (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  niche_id uuid NOT NULL,
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sub_niches_pkey PRIMARY KEY (id),
  CONSTRAINT sub_niches_niche_id_fkey FOREIGN KEY (niche_id) REFERENCES public.niches(id)
);
CREATE TABLE public.subscriptions (
  id text NOT NULL,
  user_id uuid NOT NULL,
  status USER-DEFINED,
  metadata jsonb,
  price_id text,
  quantity integer,
  cancel_at_period_end boolean,
  created timestamp with time zone NOT NULL DEFAULT now(),
  current_period_start timestamp with time zone NOT NULL DEFAULT now(),
  current_period_end timestamp with time zone NOT NULL DEFAULT now(),
  ended_at timestamp with time zone,
  cancel_at timestamp with time zone,
  canceled_at timestamp with time zone,
  trial_start timestamp with time zone,
  trial_end timestamp with time zone,
  plan_type text,
  credits_included integer DEFAULT 0,
  CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT subscriptions_price_id_fkey FOREIGN KEY (price_id) REFERENCES public.prices(id)
);
CREATE TABLE public.system_niches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  description text,
  CONSTRAINT system_niches_pkey PRIMARY KEY (id)
);
CREATE TABLE public.system_seo_constants (
  id integer NOT NULL DEFAULT nextval('system_seo_constants_id_seq'::regclass),
  category text NOT NULL,
  param_key text NOT NULL,
  label text NOT NULL,
  value real NOT NULL,
  description text,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT system_seo_constants_pkey PRIMARY KEY (id)
);
CREATE TABLE public.system_themes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  description text,
  CONSTRAINT system_themes_pkey PRIMARY KEY (id)
);
CREATE TABLE public.themes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  description text,
  CONSTRAINT themes_pkey PRIMARY KEY (id)
);
CREATE TABLE public.token_costs (
  action_type text NOT NULL,
  amount integer NOT NULL,
  CONSTRAINT token_costs_pkey PRIMARY KEY (action_type)
);
CREATE TABLE public.token_prices (
  action_type text NOT NULL,
  amount integer NOT NULL,
  description text,
  CONSTRAINT token_prices_pkey PRIMARY KEY (action_type)
);
CREATE TABLE public.tones (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tones_pkey PRIMARY KEY (id)
);
CREATE TABLE public.user_custom_niches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  user_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  ai_category_prediction text,
  is_favorite boolean DEFAULT true,
  description text,
  CONSTRAINT user_custom_niches_pkey PRIMARY KEY (id),
  CONSTRAINT user_custom_niches_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_custom_product_types (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  user_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  is_favorite boolean DEFAULT true,
  description text,
  CONSTRAINT user_custom_product_types_pkey PRIMARY KEY (id),
  CONSTRAINT user_custom_product_types_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_custom_themes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  is_favorite boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  description text,
  CONSTRAINT user_custom_themes_pkey PRIMARY KEY (id),
  CONSTRAINT user_custom_themes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_keyword_bank (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tag text NOT NULL,
  product_type text,
  theme text,
  niche text,
  sub_niche text,
  last_volume integer,
  volume_history ARRAY DEFAULT '{}'::integer[],
  last_competition real,
  last_cpc real,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  last_sync_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_keyword_bank_pkey PRIMARY KEY (id),
  CONSTRAINT user_keyword_bank_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_settings (
  user_id uuid NOT NULL,
  gem_min_volume integer DEFAULT 1000,
  gem_max_competition real DEFAULT 0.4,
  gem_min_cpc real DEFAULT 1.0,
  updated_at timestamp with time zone DEFAULT now(),
  weight_volume_id integer NOT NULL,
  weight_competition_id integer NOT NULL,
  weight_transactional_id integer NOT NULL,
  weight_niche_id integer NOT NULL,
  weight_cpc_id integer NOT NULL,
  threshold_evergreen_id integer NOT NULL,
  threshold_trending_id integer NOT NULL,
  threshold_promising_id integer NOT NULL,
  ui_currency text DEFAULT 'USD'::text,
  ui_default_tags_count integer DEFAULT 150,
  ai_selection_count integer DEFAULT 13,
  working_pool_count integer DEFAULT 25,
  concept_diversity_limit integer DEFAULT 2,
  ui_language text DEFAULT 'en'::text,
  ui_default_tags_display integer DEFAULT 150,
  evergreen_avg_volume_id integer NOT NULL DEFAULT 8,
  evergreen_min_id integer NOT NULL DEFAULT 8,
  evergreen_stability_ratio_id integer NOT NULL DEFAULT 8,
  trending_current_month_min_id integer NOT NULL DEFAULT 8,
  trending_dropping_id integer NOT NULL DEFAULT 8,
  promising_competition_id integer NOT NULL DEFAULT 8,
  promising_min_score_id integer NOT NULL DEFAULT 8,
  trending_growth_factor_id integer DEFAULT 8,
  CONSTRAINT user_settings_pkey PRIMARY KEY (user_id),
  CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT user_settings_weight_volume_id_fkey FOREIGN KEY (weight_volume_id) REFERENCES public.system_seo_constants(id),
  CONSTRAINT user_settings_weight_competition_id_fkey FOREIGN KEY (weight_competition_id) REFERENCES public.system_seo_constants(id),
  CONSTRAINT user_settings_weight_transactional_id_fkey FOREIGN KEY (weight_transactional_id) REFERENCES public.system_seo_constants(id),
  CONSTRAINT user_settings_weight_niche_id_fkey FOREIGN KEY (weight_niche_id) REFERENCES public.system_seo_constants(id),
  CONSTRAINT user_settings_weight_cpc_id_fkey FOREIGN KEY (weight_cpc_id) REFERENCES public.system_seo_constants(id),
  CONSTRAINT user_settings_threshold_evergreen_id_fkey FOREIGN KEY (threshold_evergreen_id) REFERENCES public.system_seo_constants(id),
  CONSTRAINT user_settings_threshold_trending_id_fkey FOREIGN KEY (threshold_trending_id) REFERENCES public.system_seo_constants(id),
  CONSTRAINT user_settings_threshold_promising_id_fkey FOREIGN KEY (threshold_promising_id) REFERENCES public.system_seo_constants(id),
  CONSTRAINT user_settings_evergreen_avg_volume_id_fkey FOREIGN KEY (evergreen_avg_volume_id) REFERENCES public.system_seo_constants(id),
  CONSTRAINT user_settings_evergreen_min_id_fkey FOREIGN KEY (evergreen_min_id) REFERENCES public.system_seo_constants(id),
  CONSTRAINT user_settings_evergreen_stability_ratio_id_fkey FOREIGN KEY (evergreen_stability_ratio_id) REFERENCES public.system_seo_constants(id),
  CONSTRAINT user_settings_trending_current_month_min_id_fkey FOREIGN KEY (trending_current_month_min_id) REFERENCES public.system_seo_constants(id),
  CONSTRAINT user_settings_trending_dropping_id_fkey FOREIGN KEY (trending_dropping_id) REFERENCES public.system_seo_constants(id),
  CONSTRAINT user_settings_promising_competition_id_fkey FOREIGN KEY (promising_competition_id) REFERENCES public.system_seo_constants(id),
  CONSTRAINT user_settings_promising_min_score_id_fkey FOREIGN KEY (promising_min_score_id) REFERENCES public.system_seo_constants(id)
);