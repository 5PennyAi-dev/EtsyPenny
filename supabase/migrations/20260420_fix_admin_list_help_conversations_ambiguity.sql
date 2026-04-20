-- Fix: PL/pgSQL variable_conflict — the RETURNS TABLE columns
-- (thumbs_up, thumbs_down, etc.) implicitly create OUT parameter variables
-- that collide with same-named columns in the CTE. PG 42702 'ambiguous
-- column reference' fires when they're used unqualified inside CASE / WHERE.
--
-- Resolution: add `#variable_conflict use_column` directive so PL/pgSQL
-- prefers the SQL column, and explicitly alias all CTE column references
-- for good measure.

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
#variable_conflict use_column
BEGIN
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
      c.id              AS id,
      c.user_id         AS user_id,
      u.email::text     AS user_email,
      c.title           AS title,
      c.page_context    AS page_context,
      c.created_at      AS created_at,
      c.updated_at      AS updated_at,
      (
        SELECT m.content
        FROM public.help_messages m
        WHERE m.conversation_id = c.id AND m.role = 'user'
        ORDER BY m.created_at ASC
        LIMIT 1
      ) AS first_question,
      (SELECT COUNT(*) FROM public.help_messages m WHERE m.conversation_id = c.id) AS message_count,
      (SELECT COUNT(*) FROM public.help_messages m WHERE m.conversation_id = c.id AND m.feedback = 1)  AS thumbs_up,
      (SELECT COUNT(*) FROM public.help_messages m WHERE m.conversation_id = c.id AND m.feedback = -1) AS thumbs_down
    FROM public.help_conversations c
    LEFT JOIN auth.users u ON u.id = c.user_id
    WHERE (p_date_from IS NULL OR c.created_at >= p_date_from)
  ),
  filtered AS (
    SELECT b.* FROM base b
    WHERE
      CASE p_filter
        WHEN 'with_negative' THEN b.thumbs_down > 0
        WHEN 'with_positive' THEN b.thumbs_up > 0
        WHEN 'no_feedback'   THEN b.thumbs_up = 0 AND b.thumbs_down = 0
        ELSE TRUE
      END
      AND (
        p_search IS NULL
        OR p_search = ''
        OR b.title          ILIKE '%' || p_search || '%'
        OR b.first_question ILIKE '%' || p_search || '%'
        OR b.page_context   ILIKE '%' || p_search || '%'
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
    (COUNT(*) OVER ())::BIGINT AS total_count
  FROM filtered f
  ORDER BY
    CASE WHEN p_filter = 'with_negative' THEN f.thumbs_down END DESC NULLS LAST,
    f.updated_at DESC
  LIMIT  p_limit
  OFFSET p_offset;
END;
$$;
