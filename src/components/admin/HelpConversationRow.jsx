import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Check,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-CA');
  const time = d.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' });
  return `${date} ${time}`;
}

function FeedbackPill({ up, down }) {
  if (!up && !down) {
    return <span className="text-xs text-slate-400">—</span>;
  }
  return (
    <div className="flex items-center gap-1.5">
      {up > 0 && (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">
          <ThumbsUp size={10} strokeWidth={2.5} />
          {up}
        </span>
      )}
      {down > 0 && (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700">
          <ThumbsDown size={10} strokeWidth={2.5} />
          {down}
        </span>
      )}
    </div>
  );
}

const markdownComponents = {
  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-indigo-600 hover:text-indigo-700 underline"
    >
      {children}
    </a>
  ),
  code: ({ inline, children, ...props }) => {
    if (inline) {
      return (
        <code className="px-1 py-0.5 bg-slate-200 text-indigo-700 rounded text-[0.9em] font-mono" {...props}>
          {children}
        </code>
      );
    }
    return (
      <pre className="rounded-md bg-slate-900 text-slate-100 p-3 my-2 overflow-x-auto text-xs">
        <code {...props}>{children}</code>
      </pre>
    );
  },
  strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
};

function ExpandedDetail({ conversation }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('help_messages')
        .select('id, role, content, feedback, feedback_note, tokens_input, tokens_output, created_at')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true });
      if (!mounted) return;
      if (error) {
        console.error('Failed to load messages:', error);
        toast.error('Failed to load conversation');
        setMessages([]);
      } else {
        setMessages(data ?? []);
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [conversation.id]);

  const totalTokensIn = messages.reduce((sum, m) => sum + (m.tokens_input ?? 0), 0);
  const totalTokensOut = messages.reduce((sum, m) => sum + (m.tokens_output ?? 0), 0);

  const copyAsPlainText = async () => {
    const lines = [
      `Conversation with ${conversation.user_email || conversation.user_id}`,
      `Started: ${formatDateTime(conversation.created_at)}`,
      `Page: ${conversation.page_context || '—'}`,
      '',
    ];
    for (const m of messages) {
      const who = m.role === 'user' ? 'User' : 'Assistant';
      lines.push(`--- ${who} (${formatDateTime(m.created_at)}) ---`);
      lines.push(m.content);
      if (m.feedback === 1) lines.push('[Feedback: 👍 Helpful]');
      if (m.feedback === -1) lines.push('[Feedback: 👎 Not helpful]');
      if (m.feedback_note) lines.push(`[Note: ${m.feedback_note}]`);
      lines.push('');
    }
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Conversation copied to clipboard');
    } catch (err) {
      console.error('clipboard failed:', err);
      toast.error('Could not copy to clipboard');
    }
  };

  return (
    <div className="bg-slate-50 border-t border-slate-200 px-6 py-5">
      {/* Metadata strip */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-slate-500 mb-4">
        <span>
          <span className="font-medium text-slate-700">User:</span>{' '}
          {conversation.user_email || conversation.user_id}
        </span>
        <span>
          <span className="font-medium text-slate-700">Started:</span>{' '}
          {formatDateTime(conversation.created_at)}
        </span>
        <span>
          <span className="font-medium text-slate-700">Page:</span>{' '}
          <span className="font-mono">{conversation.page_context || '—'}</span>
        </span>
        <span>
          <span className="font-medium text-slate-700">Tokens:</span>{' '}
          {totalTokensIn.toLocaleString()} in / {totalTokensOut.toLocaleString()} out
        </span>
      </div>

      {/* Message thread */}
      {loading ? (
        <div className="text-sm text-slate-400 py-4">Loading messages…</div>
      ) : messages.length === 0 ? (
        <div className="text-sm text-slate-400 py-4">No messages in this conversation.</div>
      ) : (
        <div className="space-y-3">
          {messages.map((m) => {
            const isUser = m.role === 'user';
            return (
              <div key={m.id} className={isUser ? 'flex justify-end' : 'flex flex-col items-start'}>
                <div
                  className={
                    isUser
                      ? 'bg-slate-200 text-slate-900 rounded-2xl rounded-tr-md px-3.5 py-2 max-w-[80%] text-sm whitespace-pre-wrap break-words'
                      : 'bg-white border border-slate-200 rounded-2xl rounded-tl-md px-4 py-3 max-w-[90%] text-sm'
                  }
                >
                  {isUser ? (
                    m.content
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                      {m.content}
                    </ReactMarkdown>
                  )}
                </div>
                {!isUser && m.feedback !== 0 && (
                  <div className="mt-1 ml-1 text-xs flex items-center gap-2">
                    {m.feedback === 1 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                        <ThumbsUp size={11} strokeWidth={2} /> Helpful
                      </span>
                    )}
                    {m.feedback === -1 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-medium">
                        <ThumbsDown size={11} strokeWidth={2} /> Not helpful
                      </span>
                    )}
                  </div>
                )}
                {!isUser && m.feedback_note && (
                  <div className="mt-1 ml-1 max-w-[90%] text-xs italic text-slate-600 border-l-2 border-slate-300 pl-2">
                    <span className="not-italic font-medium text-slate-500">User note: </span>
                    {m.feedback_note}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Action bar */}
      <div className="mt-5 pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={copyAsPlainText}
          disabled={loading || messages.length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {copied ? <Check size={14} strokeWidth={2} /> : <Copy size={14} strokeWidth={2} />}
          {copied ? 'Copied' : 'Copy conversation as plain text'}
        </button>
      </div>
    </div>
  );
}

export default function HelpConversationRow({ conversation, expanded, onToggle }) {
  return (
    <>
      <tr
        onClick={onToggle}
        className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
      >
        <td className="py-2 px-3 text-xs text-slate-600 whitespace-nowrap">
          {formatDateTime(conversation.updated_at)}
        </td>
        <td className="py-2 px-3 text-xs text-slate-700 max-w-[180px] truncate" title={conversation.user_email}>
          {conversation.user_email || '—'}
        </td>
        <td
          className="py-2 px-3 text-sm text-slate-800 max-w-[340px] truncate"
          title={conversation.first_question}
        >
          {conversation.first_question || conversation.title || '(empty)'}
        </td>
        <td className="py-2 px-3 text-xs text-slate-600 text-center">
          {conversation.message_count}
        </td>
        <td className="py-2 px-3">
          <FeedbackPill up={conversation.thumbs_up} down={conversation.thumbs_down} />
        </td>
        <td className="py-2 px-3 text-xs text-slate-500 font-mono max-w-[140px] truncate" title={conversation.page_context}>
          {conversation.page_context || '—'}
        </td>
        <td className="py-2 px-3 text-right">
          {expanded ? (
            <ChevronDown size={16} strokeWidth={2} className="text-slate-400 inline" />
          ) : (
            <ChevronRight size={16} strokeWidth={2} className="text-slate-400 inline" />
          )}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={7} className="p-0">
            <ExpandedDetail conversation={conversation} />
          </td>
        </tr>
      )}
    </>
  );
}
