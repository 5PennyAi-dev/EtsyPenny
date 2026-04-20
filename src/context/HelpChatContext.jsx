import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';

const HelpChatContext = createContext(null);

const MAX_HISTORY_TO_SEND = 10;

function newId() {
  // crypto.randomUUID exists in modern browsers + Node 19+
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `tmp-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

/**
 * Parse an SSE ReadableStream from /api/help/chat and invoke onChunk for each
 * decoded JSON frame. Exported so it can be unit-tested without a DOM.
 */
export async function consumeSseStream(reader, onChunk, { signal } = {}) {
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    if (signal?.aborted) return;
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';
    for (const frame of frames) {
      const trimmed = frame.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload) continue;
      try {
        onChunk(JSON.parse(payload));
      } catch (err) {
        console.warn('[help-chat] malformed SSE frame:', payload, err);
      }
    }
  }
  // Flush any trailing frame (rare — most servers end with blank line)
  const tail = buffer.trim();
  if (tail.startsWith('data:')) {
    const payload = tail.slice(5).trim();
    if (payload) {
      try {
        onChunk(JSON.parse(payload));
      } catch (err) {
        console.warn('[help-chat] malformed final SSE frame:', payload, err);
      }
    }
  }
}

export function HelpChatProvider({ children }) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState('chat'); // 'chat' | 'history'
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);

  const abortRef = useRef(null);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => {
    setIsOpen(false);
    // Don't abort in-flight streams on close — let them persist their assistant row.
  }, []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  const showChatView = useCallback(() => setView('chat'), []);
  const showHistoryView = useCallback(() => setView('history'), []);

  const newConversation = useCallback(() => {
    setConversationId(null);
    setMessages([]);
    setView('chat');
  }, []);

  const updateMessage = useCallback((clientId, patch) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === clientId ? { ...m, ...patch } : m))
    );
  }, []);

  const appendToMessage = useCallback((clientId, delta) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === clientId ? { ...m, content: m.content + delta } : m
      )
    );
  }, []);

  const sendMessage = useCallback(
    async (rawText) => {
      const text = (rawText ?? '').trim();
      if (!text || isSending) return;
      if (!user?.id) {
        console.warn('[help-chat] cannot send — no authenticated user');
        return;
      }

      setIsSending(true);

      const userClientId = newId();
      const assistantClientId = newId();

      // History sent to server — current messages, trimmed, before the new turn.
      const historyForServer = messages
        .filter((m) => !m.error && m.content)
        .slice(-MAX_HISTORY_TO_SEND)
        .map((m) => ({ role: m.role, content: m.content }));

      setMessages((prev) => [
        ...prev,
        {
          id: userClientId,
          serverId: null,
          role: 'user',
          content: text,
          feedback: 0,
          isStreaming: false,
          error: null,
        },
        {
          id: assistantClientId,
          serverId: null,
          role: 'assistant',
          content: '',
          feedback: 0,
          isStreaming: true,
          error: null,
        },
      ]);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch('/api/help/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            message: text,
            conversationId,
            pageContext:
              typeof window !== 'undefined' ? window.location.pathname : null,
            history: historyForServer,
          }),
          signal: controller.signal,
        });

        if (res.status === 429) {
          const body = await res.json().catch(() => ({}));
          setRateLimitInfo({
            used: body.used ?? 20,
            limit: body.limit ?? 20,
            resetAt: body.resetAt ? new Date(body.resetAt) : null,
          });
          updateMessage(assistantClientId, {
            isStreaming: false,
            error:
              'You have reached the daily message limit. Please come back later.',
          });
          return;
        }

        if (!res.ok || !res.body) {
          const body = await res.json().catch(() => ({}));
          updateMessage(assistantClientId, {
            isStreaming: false,
            error: body.error || 'Something went wrong. Please try again.',
          });
          return;
        }

        const reader = res.body.getReader();
        let sawDone = false;

        await consumeSseStream(reader, (chunk) => {
          if (chunk.type === 'conversation') {
            setConversationId(chunk.conversationId);
          } else if (chunk.type === 'delta') {
            appendToMessage(assistantClientId, chunk.text);
          } else if (chunk.type === 'done') {
            sawDone = true;
            updateMessage(assistantClientId, {
              isStreaming: false,
              serverId: chunk.messageId || null,
            });
          } else if (chunk.type === 'error') {
            updateMessage(assistantClientId, {
              isStreaming: false,
              error: chunk.message || 'Something went wrong.',
            });
          }
        }, { signal: controller.signal });

        if (!sawDone) {
          // Stream ended without a done chunk — network truncation, etc.
          updateMessage(assistantClientId, {
            isStreaming: false,
            error:
              'The reply was interrupted. Try asking again.',
          });
        }
      } catch (err) {
        if (err?.name === 'AbortError') {
          updateMessage(assistantClientId, { isStreaming: false });
        } else {
          console.error('[help-chat] sendMessage failed:', err);
          updateMessage(assistantClientId, {
            isStreaming: false,
            error: 'Network error. Please check your connection and try again.',
          });
        }
      } finally {
        setIsSending(false);
        abortRef.current = null;
      }
    },
    [appendToMessage, conversationId, isSending, messages, updateMessage, user]
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const retryLastMessage = useCallback(() => {
    // Find the last user message; discard anything after it; re-send.
    const lastUserIdx = [...messages].reverse().findIndex((m) => m.role === 'user');
    if (lastUserIdx === -1) return;
    const absoluteIdx = messages.length - 1 - lastUserIdx;
    const text = messages[absoluteIdx].content;
    setMessages((prev) => prev.slice(0, absoluteIdx));
    sendMessage(text);
  }, [messages, sendMessage]);

  const loadConversationList = useCallback(async () => {
    if (!user?.id) return;
    setConversationsLoading(true);
    try {
      const { data, error } = await supabase
        .from('help_conversations')
        .select('id, title, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(20);
      if (error) {
        console.error('[help-chat] loadConversationList failed:', error.message);
        setConversations([]);
      } else {
        setConversations(data ?? []);
      }
    } finally {
      setConversationsLoading(false);
    }
  }, [user]);

  const loadConversation = useCallback(
    async (id) => {
      if (!user?.id || !id) return;
      const { data, error } = await supabase
        .from('help_messages')
        .select('id, role, content, feedback, created_at')
        .eq('conversation_id', id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      if (error) {
        console.error('[help-chat] loadConversation failed:', error.message);
        return;
      }
      const rows = data ?? [];
      setConversationId(id);
      setMessages(
        rows.map((row) => ({
          id: row.id,
          serverId: row.id,
          role: row.role,
          content: row.content,
          feedback: row.feedback ?? 0,
          isStreaming: false,
          error: null,
        }))
      );
      setView('chat');
    },
    [user]
  );

  const submitFeedback = useCallback(
    async (messageServerId, value, note) => {
      if (!user?.id || !messageServerId) return;
      if (value !== -1 && value !== 0 && value !== 1) return;

      // Optimistic local update (also covers value === 0 for toggle-off).
      setMessages((prev) =>
        prev.map((m) =>
          m.serverId === messageServerId ? { ...m, feedback: value } : m
        )
      );

      // Server only accepts -1 or 1. A "toggle to 0" has no server-side API yet —
      // we fall back to sending the previous choice's opposite, but since the
      // backend overrides to whatever we pass, sending 0 would fail. Skip the
      // network call in that case; the local toggle is still useful UX.
      if (value === 0) return;

      try {
        const res = await fetch('/api/help/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            messageId: messageServerId,
            feedback: value,
            note: note ?? null,
          }),
        });
        if (!res.ok) {
          console.warn('[help-chat] feedback POST failed:', res.status);
        }
      } catch (err) {
        console.warn('[help-chat] feedback network error:', err);
      }
    },
    [user]
  );

  const value = useMemo(
    () => ({
      isOpen,
      view,
      conversationId,
      messages,
      isSending,
      rateLimitInfo,
      conversations,
      conversationsLoading,
      open,
      close,
      toggle,
      showChatView,
      showHistoryView,
      newConversation,
      sendMessage,
      retryLastMessage,
      loadConversation,
      loadConversationList,
      submitFeedback,
      abort,
    }),
    [
      isOpen,
      view,
      conversationId,
      messages,
      isSending,
      rateLimitInfo,
      conversations,
      conversationsLoading,
      open,
      close,
      toggle,
      showChatView,
      showHistoryView,
      newConversation,
      sendMessage,
      retryLastMessage,
      loadConversation,
      loadConversationList,
      submitFeedback,
      abort,
    ]
  );

  return (
    <HelpChatContext.Provider value={value}>{children}</HelpChatContext.Provider>
  );
}

export function useHelpChat() {
  const ctx = useContext(HelpChatContext);
  if (!ctx) {
    throw new Error('useHelpChat must be used within HelpChatProvider');
  }
  return ctx;
}
