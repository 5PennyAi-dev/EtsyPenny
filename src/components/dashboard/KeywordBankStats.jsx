import { useNavigate } from 'react-router-dom';
import { Gem, FolderOpen, Star } from 'lucide-react';

const stats = [
  { key: 'keywords', label: 'Saved keywords', icon: Star, color: 'text-amber-600', bg: 'bg-amber-100' },
  { key: 'presets', label: 'Presets', icon: FolderOpen, color: 'text-indigo-600', bg: 'bg-indigo-100' },
  { key: 'gems', label: 'Gems found', icon: Gem, color: 'text-emerald-600', bg: 'bg-emerald-100' },
];

export default function KeywordBankStats({ keywords = 0, presets = 0, gems = 0 }) {
  const navigate = useNavigate();
  const values = { keywords, presets, gems };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-4">Keyword bank</h3>

      <div className="grid grid-cols-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.key} className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 ${s.bg} rounded-lg flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${s.color}`} strokeWidth={2} />
              </div>
              <span className={`text-xl font-semibold ${s.key === 'gems' ? 'text-emerald-600' : 'text-slate-800'}`}>
                {values[s.key]}
              </span>
              <span className="text-xs text-slate-400">{s.label}</span>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => navigate('/lab')}
        className="mt-4 w-full text-center text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
      >
        Manage keywords
      </button>
    </div>
  );
}
