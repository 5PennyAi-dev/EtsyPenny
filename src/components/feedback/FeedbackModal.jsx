import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, MessageSquareText, Check, Loader2, Bug, Lightbulb, HelpCircle, MoreHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';

const TYPES = [
  { key: 'bug', label: 'Bug', icon: Bug, color: 'rose' },
  { key: 'suggestion', label: 'Suggestion', icon: Lightbulb, color: 'blue' },
  { key: 'question', label: 'Question', icon: HelpCircle, color: 'amber' },
  { key: 'other', label: 'Other', icon: MoreHorizontal, color: 'slate' },
];

const FeedbackModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [type, setType] = useState('suggestion');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleClose = () => {
    onClose();
    // Reset after animation
    setTimeout(() => {
      setType('suggestion');
      setMessage('');
      setSending(false);
      setSent(false);
    }, 200);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (message.trim().length < 10) {
      toast.error('Please write at least 10 characters.');
      return;
    }

    setSending(true);
    try {
      await axios.post('/api/feedback', {
        user_id: user?.id,
        email: user?.email,
        type,
        message: message.trim(),
        page: window.location.pathname,
      });
      setSent(true);
      setTimeout(handleClose, 2000);
    } catch {
      toast.error('Failed to send feedback. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={handleClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-1">
              <div className="p-3 rounded-full bg-indigo-100 text-indigo-600">
                <MessageSquareText size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900">Share your feedback</h3>
              </div>
              <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-5 ml-[56px]">Help us improve PennySEO during beta</p>

            {sent ? (
              <div className="flex flex-col items-center py-8 gap-3">
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                  <Check size={28} className="text-green-600" />
                </div>
                <p className="text-slate-700 font-semibold">Thank you!</p>
                <p className="text-sm text-slate-500">We'll look into it.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {/* Type selector */}
                <div className="flex gap-2 mb-4">
                  {TYPES.map((t) => {
                    const Icon = t.icon;
                    const active = type === t.key;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setType(t.key)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border
                          ${active
                            ? `bg-${t.color}-50 border-${t.color}-200 text-${t.color}-700`
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                          }`}
                      >
                        <Icon size={14} />
                        {t.label}
                      </button>
                    );
                  })}
                </div>

                {/* Message */}
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue or idea..."
                  rows={4}
                  required
                  minLength={10}
                  className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none mb-4"
                />

                {/* Actions */}
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sending || message.trim().length < 10}
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
                  >
                    {sending ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send feedback'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default FeedbackModal;
