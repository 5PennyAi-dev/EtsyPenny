import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Plus, History, X, Send, MessageCircle, ArrowLeft } from 'lucide-react';
import { useHelpChat } from '@/context/HelpChatContext';
import HelpMessage from './HelpMessage';
import HelpConversationList from './HelpConversationList';

const EXAMPLE_PROMPTS = [
  'How do I generate SEO for my first listing?',
  'What are tokens and how do they work?',
  'How do I connect my Etsy shop?',
];

function formatResetTime(resetAt) {
  if (!resetAt) return '';
  const ms = new Date(resetAt).getTime() - Date.now();
  if (ms <= 0) return 'now';
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `in ${hours}h ${minutes}m`;
  return `in ${minutes}m`;
}

export default function HelpChatPanel() {
  const {
    isOpen,
    view,
    messages,
    isSending,
    rateLimitInfo,
    close,
    showChatView,
    showHistoryView,
    newConversation,
    sendMessage,
  } = useHelpChat();

  const [input, setInput] = useState('');
  const listRef = useRef(null);
  const textareaRef = useRef(null);
  const previousFocusRef = useRef(null);
  const panelRef = useRef(null);

  // User-message count this session (for the "X messages" hint under input).
  const sessionUserCount = messages.filter((m) => m.role === 'user').length;
  const isRateLimited =
    rateLimitInfo != null && rateLimitInfo.used >= rateLimitInfo.limit;
  const isWarningRate =
    rateLimitInfo != null &&
    !isRateLimited &&
    rateLimitInfo.used / rateLimitInfo.limit >= 0.8;

  // Focus management
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current =
        typeof document !== 'undefined' ? document.activeElement : null;
      // Defer so the panel is mounted before we focus.
      const t = setTimeout(() => textareaRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
    if (previousFocusRef.current instanceof HTMLElement) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [isOpen]);

  // ESC + outside click
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
      }
    };
    const onClick = (e) => {
      // Only apply on desktop viewports (md breakpoint ≈ 768px).
      if (typeof window === 'undefined' || window.innerWidth < 768) return;
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        close();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    // Listen on mousedown so we don't race with React's click handlers inside the panel.
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onClick);
    };
  }, [isOpen, close]);

  // Auto-scroll to bottom on new messages / deltas
  useLayoutEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  // Textarea auto-grow
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const max = 4 * 24; // ~4 rows at 24px line-height
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
  }, [input]);

  if (!isOpen) return null;

  const canSend =
    input.trim().length > 0 && !isSending && !isRateLimited;

  const handleSend = () => {
    if (!canSend) return;
    const text = input;
    setInput('');
    sendMessage(text);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="PennySEO help chat"
      className="fixed z-40 bg-white border border-slate-200 shadow-2xl flex flex-col
                 inset-0 md:inset-auto md:bottom-6 md:right-6 md:w-[400px] md:h-[600px]
                 md:max-h-[calc(100vh-3rem)] md:rounded-2xl"
    >
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {view === 'history' && (
            <button
              type="button"
              onClick={showChatView}
              aria-label="Back to chat"
              className="p-1 -ml-1 rounded text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            >
              <ArrowLeft size={18} strokeWidth={2} />
            </button>
          )}
          <span className="w-2 h-2 rounded-full bg-indigo-600 flex-shrink-0" />
          <span className="text-sm font-semibold text-slate-900 truncate">
            {view === 'history' ? 'Past conversations' : 'PennySEO Help'}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {view === 'chat' && (
            <>
              <button
                type="button"
                onClick={showHistoryView}
                aria-label="View past conversations"
                className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              >
                <History size={18} strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={newConversation}
                aria-label="Start a new conversation"
                className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              >
                <Plus size={18} strokeWidth={2} />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={close}
            aria-label="Close help chat"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Body */}
      {view === 'history' ? (
        <HelpConversationList />
      ) : messages.length === 0 ? (
        <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-6 py-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
            <MessageCircle size={24} strokeWidth={2} className="text-indigo-600" />
          </div>
          <p className="text-base font-semibold text-slate-900 mb-1">
            How can I help you with PennySEO today?
          </p>
          <p className="text-sm text-slate-500 mb-5">
            Ask me anything — I read the docs so you don&apos;t have to.
          </p>
          <div className="w-full flex flex-col gap-2">
            {EXAMPLE_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => {
                  setInput(prompt);
                  textareaRef.current?.focus();
                }}
                className="w-full text-left px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map((m) => (
            <HelpMessage key={m.id} message={m} />
          ))}
        </div>
      )}

      {/* Rate-limit banner */}
      {view === 'chat' && (isRateLimited || isWarningRate) && (
        <div
          className={`mx-3 mb-2 p-3 rounded-lg text-xs border ${
            isRateLimited
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}
          role="status"
        >
          {isRateLimited ? (
            <>
              You&apos;ve reached the daily limit of {rateLimitInfo.limit} messages. Resets{' '}
              {formatResetTime(rateLimitInfo.resetAt)}.
            </>
          ) : (
            <>
              {rateLimitInfo.used} of {rateLimitInfo.limit} daily messages used. Resets{' '}
              {formatResetTime(rateLimitInfo.resetAt)}.
            </>
          )}
        </div>
      )}

      {/* Input */}
      {view === 'chat' && (
        <div className="border-t border-slate-200 p-3 flex-shrink-0">
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me about PennySEO..."
              rows={1}
              disabled={isRateLimited}
              aria-label="Type your question"
              className="flex-1 resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400"
              style={{ maxHeight: '96px' }}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              aria-label="Send"
              className="p-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              <Send size={16} strokeWidth={2} />
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-1.5 px-1">
            {isRateLimited
              ? 'Daily limit reached.'
              : `${sessionUserCount} message${sessionUserCount === 1 ? '' : 's'} this session · Shift+Enter for a new line`}
          </p>
        </div>
      )}
    </div>
  );
}
