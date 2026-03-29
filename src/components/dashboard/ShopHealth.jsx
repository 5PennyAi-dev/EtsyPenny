import { useState } from 'react';
import RadialGauge from './RadialGauge';
import { Activity, Target, ShoppingCart, Swords, TrendingUp, TrendingDown } from 'lucide-react';

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

function ScoreEvolutionChart({ data }) {
  const [hovered, setHovered] = useState(null);

  if (!data || data.length < 2) {
    return (
      <div className="h-20 flex items-center justify-center text-slate-300 text-xs">
        Not enough data yet — optimize more listings to see your trend
      </div>
    );
  }

  const width = 400;
  const height = 80;
  const padding = { top: 8, bottom: 8, left: 0, right: 0 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const values = data.map(d => d.avg);
  const min = Math.min(...values) - 5;
  const max = Math.max(...values) + 5;
  const range = max - min || 1;

  const points = data.map((d, i) => ({
    x: padding.left + (i / (data.length - 1)) * chartW,
    y: padding.top + chartH - ((d.avg - min) / range) * chartH,
    date: d.date,
    avg: d.avg,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x},${height - padding.bottom} L ${points[0].x},${height - padding.bottom} Z`;

  const first = data[0].avg;
  const last = data[data.length - 1].avg;
  const diff = last - first;
  const isPositive = diff >= 0;

  const handleMouseMove = (e) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * width;
    let closest = 0;
    let closestDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - mouseX);
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    });
    setHovered(closest);
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-semibold text-slate-500">
          Avg SEO Score — Last 30 days
        </span>
        <span className={`text-xs font-semibold inline-flex items-center gap-1 ${isPositive ? 'text-emerald-600' : 'text-rose-500'}`}>
          {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          {isPositive ? '+' : ''}{diff} pts
        </span>
      </div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="w-full h-20"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHovered(null)}
        >
          <defs>
            <linearGradient id="shopHealthGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#shopHealthGradient)" />
          <path d={linePath} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinejoin="round" />
          {hovered != null && points[hovered] && (
            <circle cx={points[hovered].x} cy={points[hovered].y} r="4" fill="#6366f1" />
          )}
        </svg>
        {hovered != null && points[hovered] && (
          <div
            className="absolute -top-8 bg-slate-800 text-white text-[10px] font-medium px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap z-10"
            style={{ left: `${(points[hovered].x / width) * 100}%`, transform: 'translateX(-50%)' }}
          >
            {new Date(points[hovered].date).toLocaleDateString('en', { month: 'short', day: 'numeric' })} — Score: {points[hovered].avg}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ShopHealth({ avgScore, avgVisibility, avgRelevance, avgConversion, avgCompetition, listingsBelow50 = 0, scoreHistory = [] }) {
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

      {/* Score Evolution Chart */}
      <div className="border-t border-slate-100 mt-4 pt-4 w-full">
        <ScoreEvolutionChart data={scoreHistory} />
      </div>
    </div>
  );
}
