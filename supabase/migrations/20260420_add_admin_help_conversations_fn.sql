-- Admin RPCs for the Help Conversations review UI (Prompt 4).
-- SECURITY DEFINER so we can JOIN auth.users for email.
-- Admin check is inside the function body so non-admins get nothing even if
-- EXECUTE is granted broadly.

-- ── List conversations with aggregate + pagination ─────────
CREATE OR REPLACE FUNCTION public.admin_list_help_conversations(
  p_date_from  TIMESTAMPTZ DEFAULT NULL,
  p_filter     TEXT        DEFAULT 'all',
  p_search     TEXT        DEFAULT NULL,
  p_limit      INT         DEFAULT 25,
  p_offset     INT         DEFAULT 0
)
RETURNS TABLE (
  id             UUID,
  user_id        UUID,
  user_email     TEXT,
  title          TEXT,
  page_context   TEXT,
  created_at     TIMESTAMPTZ,
  updated_at     TIMESTAMPTZ,
  first_question TEXT,
  message_count  BIGINT,
  thumbs_up      BIGINT,
  thumbs_down    BIGINT,
  total_count    BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Admin gate: role-based EXISTS (matches project convention).
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'insufficient_privilege: admin role required'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      c.id,
      c.user_id,
      u.email::text AS user_email,
      c.title,
      c.page_context,
      c.created_at,
      c.updated_at,
      (
        SELECT m.content
        FROM public.help_messages m
        WHERE m.conversation_id = c.id AND m.role = 'user'
        ORDER BY m.created_at ASC
        LIMIT 1
      ) AS first_question,
      (
        SELECT COUNT(*) FROM public.help_messages m
        WHERE m.conversation_id = c.id
      ) AS message_count,
      (
        SELECT COUNT(*) FROM public.help_messages m
        WHERE m.conversation_id = c.id AND m.feedback = 1
      ) AS thumbs_up,
      (
        SELECT COUNT(*) FROM public.help_messages m
        WHERE m.conversation_id = c.id AND m.feedback = -1
      ) AS thumbs_down
    FROM public.help_conversations c
    LEFT JOIN auth.users u ON u.id = c.user_id
    WHERE (p_date_from IS NULL OR c.created_at >= p_date_from)
  ),
  filtered AS (
    SELECT * FROM base
    WHERE
      CASE p_filter
        WHEN 'with_negative' THEN thumbs_down > 0
        WHEN 'with_positive' THEN thumbs_up > 0
        WHEN 'no_feedback'   THEN thumbs_up = 0 AND thumbs_down = 0
        ELSE TRUE
      END
      AND (
        p_search IS NULL
        OR p_search = ''
        OR title          ILIKE '%' || p_search || '%'
        OR first_question ILIKE '%' || p_search || '%'
        OR page_context   ILIKE '%' || p_search || '%'
      )
  )
  SELECT
    f.id,
    f.user_id,
    f.user_email,
    f.title,
    f.page_context,
    f.created_at,
    f.updated_at,
    f.first_question,
    f.message_count,
    f.thumbs_up,
    f.thumbs_down,
    COUNT(*) OVER ()::BIGINT AS total_count
  FROM filtered f
  ORDER BY
    CASE WHEN p_filter = 'with_negative' THEN f.thumbs_down END DESC NULLS LAST,
    f.updated_at DESC
  LIMIT  p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_help_conversations(TIMESTAMPTZ, TEXT, TEXT, INT, INT) TO authenticated;

-- ── KPI strip stats ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_get_help_conversation_stats(
  p_date_from TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  conversations      BIGINT,
  messages           BIGINT,
  avg_msgs_per_convo NUMERIC,
  thumbs_up          BIGINT,
  thumbs_down        BIGINT,
  satisfaction_rate  NUMERIC  -- 0.0–1.0, NULL when no feedback
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_convos BIGINT;
  v_msgs   BIGINT;
  v_up     BIGINT;
  v_down   BIGINT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'insufficient_privilege: admin role required'
      USING ERRCODE = '42501';
  END IF;

  SELECT COUNT(*) INTO v_convos
    FROM public.help_conversations c
   WHERE p_date_from IS NULL OR c.created_at >= p_date_from;

  SELECT
    COUNT(*) FILTER (WHERE m.role IS NOT NULL),
    COUNT(*) FILTER (WHERE m.feedback = 1),
    COUNT(*) FILTER (WHERE m.feedback = -1)
  INTO v_msgs, v_up, v_down
  FROM public.help_messages m
  JOIN public.help_conversations c ON c.id = m.conversation_id
  WHERE p_date_from IS NULL OR c.created_at >= p_date_from;

  RETURN QUERY
  SELECT
    v_convos,
    v_msgs,
    CASE WHEN v_convos = 0 THEN NULL::NUMERIC
         ELSE ROUND(v_msgs::NUMERIC / v_convos::NUMERIC, 2) END,
    v_up,
    v_down,
    CASE WHEN (v_up + v_down) = 0 THEN NULL::NUMERIC
         ELSE ROUND(v_up::NUMERIC / (v_up + v_down)::NUMERIC, 4) END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_help_conversation_stats(TIMESTAMPTZ) TO authenticated;
