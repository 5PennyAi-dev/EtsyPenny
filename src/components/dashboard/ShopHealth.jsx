import RadialGauge from './RadialGauge';
import { Activity, Target, ShoppingCart, Swords } from 'lucide-react';

const subMetrics = [
  { key: 'visibility', label: 'Visibility', icon: Activity, color: 'text-blue-600', bg: 'bg-blue-100' },
  { key: 'relevance', label: 'Relevance', icon: Target, color: 'text-indigo-600', bg: 'bg-indigo-100' },
  { key: 'conversion', label: 'Conversion', icon: ShoppingCart, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  { key: 'competition', label: 'Competition', icon: Swords, color: 'text-rose-600', bg: 'bg-rose-100', inverted: true },
];

function getHealthLabel(score) {
  if (score == null) return '';
  if (score >= 75) return 'Strong shop';
  if (score >= 50) return 'Good foundation';
  return 'Needs work';
}

export default function ShopHealth({ avgScore, avgVisibility, avgRelevance, avgConversion, avgCompetition, listingsBelow50 = 0 }) {
  const hasData = avgScore != null;

  if (!hasData) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
        <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Shop health</h3>
        <p className="text-sm text-slate-400">
          Analyze your first listing to see shop health metrics.
        </p>
      </div>
    );
  }

  const metrics = {
    visibility: avgVisibility,
    relevance: avgRelevance,
    conversion: avgConversion,
    competition: avgCompetition,
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-4">Shop health</h3>

      <div className="flex items-start gap-6">
        {/* Main gauge */}
        <div className="flex flex-col items-center">
          <RadialGauge value={avgScore || 0} label="Strength" size={130} />
          <span className="text-xs text-slate-500 mt-1">{getHealthLabel(avgScore)}</span>
        </div>

        {/* Sub-metrics grid */}
        <div className="grid grid-cols-2 gap-3 flex-1">
          {subMetrics.map((m) => {
            const Icon = m.icon;
            const val = metrics[m.key];
            return (
              <div key={m.key} className="flex items-center gap-2 py-2">
                <div className={`w-7 h-7 ${m.bg} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-3.5 h-3.5 ${m.color}`} strokeWidth={2} />
                </div>
                <div>
                  <p className="text-lg font-semibold text-slate-800">{val ?? '—'}</p>
                  <p className="text-xs text-slate-400">{m.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
