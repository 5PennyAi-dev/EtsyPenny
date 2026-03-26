import { useNavigate } from 'react-router-dom';
import { AlertTriangle, X, Coins, ArrowUpRight } from 'lucide-react';

const ACTION_LABELS = {
  analyze_image: 'Analyze image (1 token)',
  generate_keywords: 'Generate keywords (8 tokens)',
  rerun_keywords: 'Re-run keywords (4 tokens)',
  generate_draft: 'Generate draft (1 token)',
};

const InsufficientTokensModal = ({ isOpen, onClose, balance = 0, required = 0, action }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-100 rounded-xl">
              <AlertTriangle size={20} className="text-rose-600" />
            </div>
            <h3 className="text-lg font-bold">Not enough tokens</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        <p className="text-sm text-slate-600 mb-2">
          This action requires <span className="font-bold text-slate-800">{required} tokens</span>.
          You currently have <span className="font-bold text-slate-800">{balance} tokens</span>.
        </p>

        {action && ACTION_LABELS[action] && (
          <p className="text-xs text-slate-400 mb-5">Action: {ACTION_LABELS[action]}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => { onClose(); navigate('/billing'); }}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <Coins size={14} />
            Buy tokens
          </button>
          <button
            onClick={() => { onClose(); navigate('/pricing'); }}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-bold text-indigo-600 border-2 border-indigo-200 rounded-xl hover:bg-indigo-50 transition-colors"
          >
            <ArrowUpRight size={14} />
            Upgrade plan
          </button>
        </div>
        <button
          onClick={onClose}
          className="w-full mt-2 px-4 py-2 text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default InsufficientTokensModal;
