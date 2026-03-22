-- Multi-provider AI model configuration
-- Allows admin to assign any AI model (Gemini, Anthropic, OpenAI) to any task at runtime

-- Catalog of available AI models
CREATE TABLE system_ai_models (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  display_name TEXT NOT NULL,
  supports_vision BOOLEAN DEFAULT false,
  cost_tier TEXT DEFAULT 'standard',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0
);

INSERT INTO system_ai_models (id, provider, display_name, supports_vision, cost_tier, sort_order) VALUES
  ('gemini-2.5-flash',             'gemini',    'Gemini 2.5 Flash',       true,  'budget',   1),
  ('gemini-2.5-flash-lite',        'gemini',    'Gemini 2.5 Flash-Lite',  false, 'budget',   2),
  ('gemini-2.5-pro',               'gemini',    'Gemini 2.5 Pro',         true,  'premium',  3),
  ('claude-sonnet-4-20250514',     'anthropic', 'Claude Sonnet 4',        true,  'standard', 10),
  ('claude-haiku-4-5-20251001',    'anthropic', 'Claude Haiku 4.5',       false, 'budget',   11),
  ('gpt-4o',                       'openai',    'GPT-4o',                 true,  'standard', 20),
  ('gpt-4o-mini',                  'openai',    'GPT-4o Mini',            false, 'budget',   21);

-- Task-to-model assignments
CREATE TABLE system_ai_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_key TEXT UNIQUE NOT NULL,
  task_label TEXT NOT NULL,
  task_description TEXT,
  provider TEXT NOT NULL DEFAULT 'gemini',
  model_id TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
  temperature REAL DEFAULT 1.0,
  max_tokens INTEGER DEFAULT 8192,
  is_vision BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT fk_model FOREIGN KEY (model_id) REFERENCES system_ai_models(id)
);

INSERT INTO system_ai_config (task_key, task_label, task_description, provider, model_id, temperature, is_vision) VALUES
  ('vision_analysis',       'Visual analysis',       'Analyze product mockup images via vision model',           'gemini', 'gemini-2.5-flash', 0.4, true),
  ('taxonomy_mapping',      'Taxonomy mapping',      'Map visual analysis to theme/niche taxonomy',              'gemini', 'gemini-2.5-flash', 0.3, false),
  ('keyword_generation',    'Keyword generation',    'Generate SEO keyword ideas (5 parallel calls)',            'gemini', 'gemini-2.5-flash', 0.8, false),
  ('niche_scoring',         'Niche scoring',         'Score keyword relevance to product niche (batch)',         'gemini', 'gemini-2.5-flash', 0.2, false),
  ('transactional_scoring', 'Transactional scoring', 'Score buyer intent / transactional value (batch)',         'gemini', 'gemini-2.5-flash', 0.2, false),
  ('draft_generation',      'Draft generation',      'Write optimized Etsy listing title and description',      'gemini', 'gemini-2.5-flash', 0.9, false);
