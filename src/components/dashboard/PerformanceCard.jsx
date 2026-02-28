import { AlertTriangle, Activity } from 'lucide-react';
import RadialGauge from './RadialGauge';

const SECONDARY_METRICS = [
  {
    key: 'avg_visibility',
    label: 'Visibility',
    tooltip: 'How well your tags match search demand on Etsy marketplace.',
  },
  {
    key: 'avg_relevance',
    label: 'Relevance',
    tooltip: 'How accurately your keywords match your product niche and category.',
  },
  {
    key: 'avg_conversion',
    label: 'Conversion',
    tooltip: 'Likelihood of turning views into purchases based on keyword buyer intent.',
  },
  {
    key: 'avg_competition',
    label: 'Competition',
    tooltip: 'Average market competition level for your keywords. Lower is better.',
    invertColors: true,
  },
];


const PerformanceCard = ({ stats, loading }) => {

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      </div>
    );
  }

  // Fallback for new users with no data
  if (!stats || stats.total_listings === 0) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <Activity size={20} className="text-indigo-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Shop Health</h2>
        </div>
        <div className="text-center py-8">
          <p className="text-slate-500 text-sm">No performance data yet. Complete your first SEO analysis to see your scores here.</p>
        </div>
      </div>
    );
  }

  const needsFix = Number(stats.listings_needing_fix) || 0;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-indigo-50 rounded-lg">
          <Activity size={20} className="text-indigo-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Shop Health</h2>
          <p className="text-xs text-slate-400 mt-0.5">Average scores across {stats.total_listings} listing{stats.total_listings > 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Gauges: Hero + Secondary */}
      <div className="flex flex-col md:flex-row items-center gap-8">
        {/* Hero — Global Strength */}
        <div className="flex-shrink-0">
          <RadialGauge
            value={Number(stats.avg_strength) || 0}
            label="Global Strength"
            tooltip="Overall listing quality combining all SEO factors into a single score."
            size={130}
          />
        </div>

        {/* Vertical Divider */}
        <div className="hidden md:block w-px self-stretch bg-slate-200" />
        {/* Horizontal Divider (mobile) */}
        <div className="block md:hidden h-px w-full bg-slate-200" />

        {/* Secondary Gauges */}
        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-6">
          {SECONDARY_METRICS.map((metric) => {
            const displayValue = Number(stats[metric.key]) || 0;
            return (
              <RadialGauge
                key={metric.key}
                value={displayValue}
                label={metric.label}
                tooltip={metric.tooltip}
                invertColors={metric.invertColors}
              />
            );
          })}
        </div>
      </div>

      {/* Warning Banner */}
      {needsFix > 0 && (
        <div className="mt-6 flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
          <p className="text-sm font-medium text-amber-800">
            ⚠️ {needsFix} listing{needsFix > 1 ? 's' : ''} require{needsFix === 1 ? 's' : ''} immediate SEO optimization.
          </p>
        </div>
      )}
    </div>
  );
};

export default PerformanceCard;
