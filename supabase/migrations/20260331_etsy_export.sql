-- Etsy Export Phase 1: export audit logs + export status tracking
-- Allows users to push optimized SEO data back to Etsy via updateListing API

-- ============================================================
-- Table: etsy_export_logs
-- Audit trail for every export attempt (before/after snapshots)
-- ============================================================
CREATE TABLE public.etsy_export_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  etsy_listing_id bigint NOT NULL,
  listing_id uuid,
  fields_exported text[] NOT NULL,
  snapshot_before jsonb NOT NULL,
  snapshot_after jsonb NOT NULL,
  status text NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'error')),
  error_message text,
  exported_at timestamptz DEFAULT now(),

  CONSTRAINT etsy_export_logs_pkey PRIMARY KEY (id),
  CONSTRAINT fk_eel_user FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT fk_eel_listing FOREIGN KEY (listing_id) REFERENCES public.listings(id)
);

CREATE INDEX idx_etsy_export_logs_user ON public.etsy_export_logs (user_id);
CREATE INDEX idx_etsy_export_logs_etsy_listing ON public.etsy_export_logs (etsy_listing_id);

ALTER TABLE public.etsy_export_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own export logs"
  ON public.etsy_export_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own export logs"
  ON public.etsy_export_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- ALTER etsy_listings: add export tracking columns
-- ============================================================
ALTER TABLE public.etsy_listings
  ADD COLUMN IF NOT EXISTS export_status text DEFAULT 'pending'
    CHECK (export_status IN ('pending', 'exported', 'partial', 'error')),
  ADD COLUMN IF NOT EXISTS last_exported_at timestamptz;
