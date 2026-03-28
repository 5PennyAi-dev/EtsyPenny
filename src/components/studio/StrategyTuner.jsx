import { Sparkles, Loader2, SlidersHorizontal, TrendingUp, BarChart2, ShoppingCart, Target, DollarSign, Info } from 'lucide-react';
import Accordion from '../ui/Accordion';

const LEVELS = ['Low', 'Regular', 'High', 'Aggressive'];
const LEVEL_LABELS = ['Low', 'Regular', 'High', 'Aggr.'];

export const PARAMETERS = [
  {
    key: 'Volume',
    label: 'Reach',
    description: 'Prioritize keywords with massive search volumes.',
    icon: TrendingUp,
    values: [0.10, 0.25, 0.50, 0.85],
  },
  {
    key: 'Competition',
    label: 'Ranking ease',
    description: 'Adjust how aggressively to prioritize low-competition keywords.',
    icon: BarChart2,
    values: [0.05, 0.10, 0.25, 0.45],
  },
  {
    key: 'Transaction',
    label: 'Buy intent',
    description: 'Boost keywords that signal purchase intent from shoppers.',
    icon: ShoppingCart,
    values: [0.10, 0.25, 0.50, 0.85],
  },
  {
    key: 'Niche',
    label: 'Niche focus',
    description: 'Favor keywords closely matching your exact niche and product.',
    icon: Target,
    values: [0.08, 0.20, 0.40, 0.70],
  },
  {
    key: 'CPC',
    label: 'Market value',
    description: 'Prioritize keywords with higher cost-per-click, indicating commercial value.',
    icon: DollarSign,
    values: [0.08, 0.20, 0.40, 0.70],
  },
];

// Helper: convert index-based selections to numeric values for the payload
export const getStrategyValues = (selections) => {
  const parameters = {};
  for (const param of PARAMETERS) {
    parameters[param.key] = param.values[selections[param.key] ?? 1];
  }
  return parameters;
};

// Helper: reverse-map numeric DB values back to slider indices
export const getSelectionsFromValues = (paramValues) => {
  const selections = {};
  for (const param of PARAMETERS) {
    const dbValue = paramValues?.[param.key];
    if (dbValue == null) {
      selections[param.key] = 1; // Default to "Regular"
      continue;
    }
    // Find closest matching index
    let bestIndex = 1;
    let bestDiff = Infinity;
    param.values.forEach((v, i) => {
      const diff = Math.abs(v - dbValue);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIndex = i;
      }
    });
    selections[param.key] = bestIndex;
  }
  return selections;
};

// Default selections (all "Regular" = index 1)
export const DEFAULT_STRATEGY_SELECTIONS = Object.fromEntries(
  PARAMETERS.map(p => [p.key, 1])
);

const SegmentedSlider = ({ param, selectedIndex, onChange }) => {
  const Icon = param.icon;

  return (
    <div className="space-y-1.5">
      {/* Label Row with tooltip */}
      <div className="flex items-center gap-1.5">
        <Icon size={13} className="text-indigo-500" />
        <span className="text-xs font-semibold text-slate-700">{param.label}</span>
        <div className="relative group/tip">
          <Info size={12} className="text-slate-400 cursor-help" />
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-3 py-2 bg-slate-800 text-white text-[11px] rounded-lg w-52 opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none z-50 leading-relaxed">
            {param.description}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-800" />
          </div>
        </div>
      </div>

      {/* Segmented Control */}
      <div className="relative flex bg-slate-100 rounded-lg p-0.5 border border-slate-200">
        {LEVEL_LABELS.map((label, i) => {
          const isActive = i === selectedIndex;
          return (
            <button
              key={LEVELS[i]}
              type="button"
              onClick={() => onChange(i)}
              className={`
                flex-1 text-xs font-semibold py-1.5 rounded-md transition-all duration-200 relative z-10
                ${isActive
                  ? 'bg-white text-indigo-700 shadow-sm border border-indigo-100'
                  : 'text-slate-500 hover:text-slate-700 border border-transparent'
                }
              `}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const StrategyTuner = ({ listingId, onApplyStrategy, isApplyingStrategy, selections, onSelectionsChange }) => {

  const handleChange = (paramKey, levelIndex) => {
    onSelectionsChange({ ...selections, [paramKey]: levelIndex });
  };

  const handleApply = () => {
    onApplyStrategy?.(getStrategyValues(selections));
  };

  return (
    <Accordion
      defaultOpen={false}
      title={
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-indigo-600" />
          <span className="text-sm font-bold text-slate-900">Advanced SEO Strategy Tuner</span>
        </div>
      }
    >
      <div className="px-5 py-3 border-t border-slate-100">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3">
          {PARAMETERS.map(param => (
            <SegmentedSlider
              key={param.key}
              param={param}
              selectedIndex={selections[param.key]}
              onChange={(i) => handleChange(param.key, i)}
            />
          ))}

          {/* Apply button — 6th cell, bottom-right aligned */}
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleApply}
              disabled={!listingId || isApplyingStrategy}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {isApplyingStrategy ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  Apply strategy
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Accordion>
  );
};

export default StrategyTuner;
