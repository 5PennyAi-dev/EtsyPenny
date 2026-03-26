import { useNavigate } from 'react-router-dom';
import { AlertTriangle, X, ArrowUpRight } from 'lucide-react';

const QUOTA_LABELS = {
  add_custom: 'custom keywords',
  add_favorite: 'favorite keywords',
};

const QuotaExceededModal = ({ isOpen, onClose, used = 0, limit = 0, quotaType }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const label = QUOTA_LABELS[quotaType] || 'items';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 rounded-xl">
              <AlertTriangle size={20} className="text-amber-600" />
            </div>
            <h3 className="text-lg font-bold">Monthly limit reached</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        <p className="text-sm text-slate-600 mb-5">
          You've used <span className="font-bold text-slate-800">{used}/{limit}</span> {label} this month.
          Upgrade your plan for higher limits.
        </p>

        <div className="flex gap-3">
          <button
            onClick={() => { onClose(); navigate('/pricing'); }}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <ArrowUpRight size={14} />
            Upgrade plan
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuotaExceededModal;
