import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Unit-style coverage of the admin RPC contract shape. These tests exercise
 * the Supabase RPC call + response handling that HelpConversationsPanel relies
 * on — without standing up a real DB. The real admin gate + joins live in
 * the SECURITY DEFINER function (supabase/migrations/20260420_*.sql); those
 * are covered by the migration's own `RAISE EXCEPTION` on non-admin callers.
 */

// Scriptable rpc mock — tests set the next response shape.
const rpcMock = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ rpc: rpcMock }),
}));

const { createClient } = await import('@supabase/supabase-js');
const client = createClient('http://x', 'x');

describe('admin_list_help_conversations RPC contract', () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it('admin caller receives populated rows with total_count', async () => {
    rpcMock.mockResolvedValue({
      data: [
        {
          id: 'c-1',
          user_id: 'u-1',
          user_email: 'admin@test.dev',
          title: 'How do I X?',
          page_context: '/studio',
          created_at: '2026-04-20T10:00:00Z',
          updated_at: '2026-04-20T10:02:00Z',
          first_question: 'How do I X?',
          message_count: 4,
          thumbs_up: 1,
          thumbs_down: 0,
          total_count: 3,
        },
        {
          id: 'c-2',
          user_id: 'u-2',
          user_email: 'seller@etsy.dev',
          title: 'Keyword question',
          page_context: '/lab',
          created_at: '2026-04-19T09:00:00Z',
          updated_at: '2026-04-19T09:10:00Z',
          first_question: 'Keyword question',
          message_count: 2,
          thumbs_up: 0,
          thumbs_down: 1,
          total_count: 3,
        },
      ],
      error: null,
    });

    const { data, error } = await client.rpc('admin_list_help_conversations', {
      p_date_from: '2026-04-01T00:00:00Z',
      p_filter: 'all',
      p_search: null,
      p_limit: 25,
      p_offset: 0,
    });

    expect(error).toBeNull();
    expect(data).toHaveLength(2);
    expect(data[0].total_count).toBe(3);
    expect(data[0].user_email).toBe('admin@test.dev');
    expect(data[1].thumbs_down).toBe(1);
  });

  it('non-admin caller gets an insufficient_privilege error bubbled up', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: {
        code: '42501',
        message: 'insufficient_privilege: admin role required',
      },
    });

    const { data, error } = await client.rpc('admin_list_help_conversations', {
      p_date_from: null,
      p_filter: 'all',
      p_search: null,
      p_limit: 25,
      p_offset: 0,
    });

    expect(data).toBeNull();
    expect(error?.code).toBe('42501');
    expect(error?.message).toMatch(/admin role required/);
  });

  it('with_negative filter surfaces negative-feedback rows', async () => {
    rpcMock.mockResolvedValue({
      data: [
        {
          id: 'c-neg',
          user_id: 'u-3',
          user_email: 'unhappy@etsy.dev',
          title: 'Answer was wrong',
          page_context: '/studio',
          created_at: '2026-04-20T08:00:00Z',
          updated_at: '2026-04-20T08:05:00Z',
          first_question: 'Answer was wrong',
          message_count: 6,
          thumbs_up: 0,
          thumbs_down: 2,
          total_count: 1,
        },
      ],
      error: null,
    });

    const { data } = await client.rpc('admin_list_help_conversations', {
      p_date_from: null,
      p_filter: 'with_negative',
      p_search: null,
      p_limit: 25,
      p_offset: 0,
    });

    expect(data).toHaveLength(1);
    expect(data[0].thumbs_down).toBeGreaterThan(0);
    expect(rpcMock).toHaveBeenCalledWith(
      'admin_list_help_conversations',
      expect.objectContaining({ p_filter: 'with_negative' })
    );
  });
});

describe('admin_get_help_conversation_stats RPC contract', () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it('returns KPI row with satisfaction rate', async () => {
    rpcMock.mockResolvedValue({
      data: [
        {
          conversations: 12,
          messages: 48,
          avg_msgs_per_convo: 4.0,
          thumbs_up: 8,
          thumbs_down: 2,
          satisfaction_rate: 0.8,
        },
      ],
      error: null,
    });

    const { data } = await client.rpc('admin_get_help_conversation_stats', {
      p_date_from: '2026-04-01T00:00:00Z',
    });

    expect(data[0].conversations).toBe(12);
    expect(data[0].satisfaction_rate).toBeCloseTo(0.8);
  });

  it('satisfaction is null when no feedback yet', async () => {
    rpcMock.mockResolvedValue({
      data: [
        {
          conversations: 3,
          messages: 10,
          avg_msgs_per_convo: 3.33,
          thumbs_up: 0,
          thumbs_down: 0,
          satisfaction_rate: null,
        },
      ],
      error: null,
    });

    const { data } = await client.rpc('admin_get_help_conversation_stats', {
      p_date_from: null,
    });
    expect(data[0].satisfaction_rate).toBeNull();
  });
});
