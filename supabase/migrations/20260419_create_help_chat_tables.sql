-- Help chatbot: conversations + messages with RLS + admin read-only override.
-- Backend-only migration for Prompt 2 of 4 in the Help Chatbot initiative.

-- ── Conversations ──────────────────────────────────────────
CREATE TABLE public.help_conversations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         TEXT,                       -- derived from first user message (<=80 chars)
  page_context  TEXT,                       -- e.g. "/studio", "/docs/dashboard"
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_help_conversations_user_updated
  ON public.help_conversations(user_id, updated_at DESC);

-- ── Messages ───────────────────────────────────────────────
CREATE TABLE public.help_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.help_conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id),   -- denormalized for rate-limit queries
  role            TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content         TEXT NOT NULL,
  feedback        SMALLINT NOT NULL DEFAULT 0 CHECK (feedback IN (-1, 0, 1)),
  feedback_note   TEXT,
  tokens_input    INT,
  tokens_output   INT,
  latency_ms      INT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_help_messages_conversation_created
  ON public.help_messages(conversation_id, created_at);

CREATE INDEX idx_help_messages_ratelimit
  ON public.help_messages(user_id, created_at)
  WHERE role = 'user';

-- ── Trigger: bump conversation.updated_at on new message ───
CREATE OR REPLACE FUNCTION public.touch_help_conversation() RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.help_conversations
     SET updated_at = now()
   WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_touch_help_conversation
  AFTER INSERT ON public.help_messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_help_conversation();

-- ── Row Level Security ─────────────────────────────────────
ALTER TABLE public.help_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_messages ENABLE ROW LEVEL SECURITY;

-- Owner CRUD (user can access their own rows)
CREATE POLICY "help_conversations_owner"
  ON public.help_conversations
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "help_messages_owner"
  ON public.help_messages
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admin read-only override (role-based EXISTS, matching project convention)
CREATE POLICY "help_conversations_admin_read"
  ON public.help_conversations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "help_messages_admin_read"
  ON public.help_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ── AI task config row for the chatbot ─────────────────────
INSERT INTO public.system_ai_config (task_key, task_label, task_description, provider, model_id, temperature, max_tokens, is_vision)
VALUES (
  'help_chat',
  'Help chatbot',
  'Grounded Q&A over the in-app help docs (streaming)',
  'gemini',
  'gemini-2.5-flash',
  0.6,
  1024,
  false
)
ON CONFLICT (task_key) DO NOTHING;
