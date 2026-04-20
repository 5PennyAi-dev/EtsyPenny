import { useState } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AlertCircle, ThumbsUp, ThumbsDown, RotateCw } from 'lucide-react';
import { useHelpChat } from '@/context/HelpChatContext';

const markdownComponents = {
  a: ({ href, children, ...props }) => {
    if (href && href.startsWith('/')) {
      return (
        <Link to={href} className="text-indigo-600 hover:text-indigo-700 underline" {...props}>
          {children}
        </Link>
      );
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-indigo-600 hover:text-indigo-700 underline"
        {...props}
      >
        {children}
      </a>
    );
  },
  p: ({ children, ...props }) => (
    <p className="mb-2 last:mb-0 leading-relaxed" {...props}>
      {children}
    </p>
  ),
  ul: ({ children, ...props }) => (
    <ul className="list-disc pl-5 mb-2 space-y-1" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="list-decimal pl-5 mb-2 space-y-1" {...props}>
      {children}
    </ol>
  ),
  code: ({ inline, children, ...props }) => {
    if (inline) {
      return (
        <code
          className="px-1 py-0.5 bg-slate-200 text-indigo-700 rounded text-[0.9em] font-mono"
          {...props}
        >
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
  strong: ({ children, ...props }) => (
    <strong className="font-semibold text-slate-900" {...props}>
      {children}
    </strong>
  ),
};

export default function HelpMessage({ message }) {
  const { submitFeedback, retryLastMessage } = useHelpChat();
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [note, setNote] = useState('');

  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const hasServerId = Boolean(message.serverId);
  const isEmpty = !message.content && !message.error;

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-md px-4 py-2 max-w-[85%] text-sm whitespace-pre-wrap break-words">
          {message.content}
        </div>
      </div>
    );
  }

  // Assistant
  return (
    <div className="flex flex-col items-start space-y-1.5 max-w-[90%]">
      <div
        className={`bg-slate-100 text-slate-900 rounded-2xl rounded-tl-md px-4 py-3 text-sm w-full ${
          message.isStreaming && isEmpty ? '' : ''
        }`}
        aria-live={message.isStreaming ? 'polite' : undefined}
      >
        {message.error ? (
          <div className="flex items-start gap-2 text-rose-700">
            <AlertCircle size={16} strokeWidth={2} className="flex-shrink-0 mt-0.5" />
            <span>{message.error}</span>
          </div>
        ) : message.isStreaming && isEmpty ? (
          <div className="flex items-center gap-1 text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" />
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse [animation-delay:300ms]" />
          </div>
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {message.content}
          </ReactMarkdown>
        )}
      </div>

      {message.error && (
        <button
          onClick={retryLastMessage}
          className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
          type="button"
        >
          <RotateCw size={12} strokeWidth={2} />
          Retry
        </button>
      )}

      {isAssistant && !message.isStreaming && !message.error && hasServerId && (
        <div className="flex items-center gap-2 pl-1">
          <button
            type="button"
            onClick={() =>
              submitFeedback(
                message.serverId,
                message.feedback === 1 ? 0 : 1
              )
            }
            aria-label="Helpful"
            aria-pressed={message.feedback === 1}
            className={`p-1 rounded hover:bg-slate-200 transition-colors ${
              message.feedback === 1 ? 'text-indigo-600' : 'text-slate-400'
            }`}
          >
            <ThumbsUp size={14} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => {
              const next = message.feedback === -1 ? 0 : -1;
              submitFeedback(message.serverId, next);
              if (next === -1) setShowNoteInput(true);
              else setShowNoteInput(false);
            }}
            aria-label="Not helpful"
            aria-pressed={message.feedback === -1}
            className={`p-1 rounded hover:bg-slate-200 transition-colors ${
              message.feedback === -1 ? 'text-rose-600' : 'text-slate-400'
            }`}
          >
            <ThumbsDown size={14} strokeWidth={2} />
          </button>
        </div>
      )}

      {showNoteInput && message.feedback === -1 && (
        <div className="w-full flex flex-col gap-2 pt-1">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Tell us what went wrong (optional)"
            className="w-full text-xs rounded-lg border border-slate-200 p-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows={2}
          />
          <button
            type="button"
            onClick={() => {
              submitFeedback(message.serverId, -1, note.trim() || null);
              setShowNoteInput(false);
            }}
            className="self-end text-xs font-medium text-indigo-600 hover:text-indigo-700"
          >
            Submit
          </button>
        </div>
      )}
    </div>
  );
}
