import { useEffect } from 'react';
import { ChevronRight, Inbox } from 'lucide-react';
import { useHelpChat } from '@/context/HelpChatContext';

function formatRelative(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function HelpConversationList() {
  const {
    conversations,
    conversationsLoading,
    loadConversationList,
    loadConversation,
  } = useHelpChat();

  useEffect(() => {
    loadConversationList();
  }, [loadConversationList]);

  if (conversationsLoading && conversations.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <p className="text-sm text-slate-400 text-center mt-8">Loading…</p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
          <Inbox size={22} strokeWidth={2} className="text-slate-400" />
        </div>
        <p className="text-sm text-slate-500">No conversations yet.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-2 py-2">
      <ul className="space-y-0.5">
        {conversations.map((convo) => (
          <li key={convo.id}>
            <button
              type="button"
              onClick={() => loadConversation(convo.id)}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-slate-50 text-left transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-900 truncate">
                  {convo.title || 'Untitled conversation'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {formatRelative(convo.updated_at)}
                </p>
              </div>
              <ChevronRight
                size={16}
                strokeWidth={2}
                className="text-slate-300 group-hover:text-slate-500 flex-shrink-0"
              />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
