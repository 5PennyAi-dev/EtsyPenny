import { useNavigate } from 'react-router-dom';
import { Flame, Sparkles, TrendingUp } from 'lucide-react';

function formatVolume(vol) {
  if (vol >= 10000) return `${(vol / 1000).toFixed(0)}k`;
  if (vol >= 1000) return `${(vol / 1000).toFixed(1)}k`;
  return String(vol);
}

function formatCompetition(comp) {
  if (comp == null) return '—';
  const pct = Math.round(comp * 100);
  return `${pct}%`;
}

export default function TrendingKeywords({ keywords = [] }) {
  if (keywords.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
        <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Trending keywords</h3>
        <p className="text-sm text-slate-400">
          Generate SEO for more listings to discover trending keywords in your niches.
        </p>
      </div>
    );
  }

  const navigate = useNavigate();
  const display = keywords.slice(0, 5);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-4">Trending in your niches</h3>
      <div className="grid grid-cols-1 gap-3">
        {display.map((kw) => (
          <div
            key={kw.tag}
            onClick={() => navigate('/lab')}
            className="border border-slate-100 rounded-lg p-3 hover:border-indigo-200 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-1 mb-1">
              {kw.is_trending && <Flame className="w-3.5 h-3.5 text-orange-500" strokeWidth={2} />}
              {kw.is_promising && <Sparkles className="w-3.5 h-3.5 text-amber-500" strokeWidth={2} />}
              <span className="text-xs text-slate-400">{kw.niche || kw.theme}</span>
            </div>
            <p className="text-sm font-semibold text-slate-800 truncate">{kw.tag}</p>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {formatVolume(kw.search_volume)}
              </span>
              <span className="text-xs text-slate-400">
                comp. {formatCompetition(kw.competition)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
