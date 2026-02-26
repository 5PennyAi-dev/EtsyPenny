import { Zap, Loader2, SlidersHorizontal, BarChart3, Shield, ShoppingCart, Crosshair, DollarSign } from 'lucide-react';
import Accordion from '../ui/Accordion';

const LEVELS = ['Low', 'Regular', 'High', 'Aggressive'];

export const PARAMETERS = [
  {
    key: 'Volume',
    label: 'Market Reach (Volume)',
    description: 'Prioritize keywords with massive search volumes.',
    icon: BarChart3,
    values: [0.10, 0.25, 0.50, 0.85],
  },
  {
    key: 'Competition',
    label: 'Ranking Ease (Competition)',
    description: 'Favor keywords where competition is low, making it easier to rank.',
    icon: Shield,
    values: [0.05, 0.10, 0.25, 0.45],
  },
  {
    key: 'Transaction',
    label: 'Buyer Intent (Transactional)',
    description: 'Boost keywords that signal purchase intent from shoppers.',
    icon: ShoppingCart,
    values: [0.10, 0.25, 0.50, 0.85],
  },
  {
    key: 'Niche',
    label: 'Niche Specificity (Niche)',
    description: 'Favor keywords closely matching your exact niche and product.',
    icon: Crosshair,
    values: [0.08, 0.20, 0.40, 0.70],
  },
  {
    key: 'CPC',
    label: 'Market Value (CPC)',
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
    <div className="space-y-2">
      {/* Label Row */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <Icon size={15} className="text-indigo-500" />
          {param.label}
        </label>
        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
          {LEVELS[selectedIndex]}
        </span>
      </div>

      {/* Segmented Control */}
      <div className="relative flex bg-slate-100 rounded-lg p-0.5 border border-slate-200">
        {LEVELS.map((level, i) => {
          const isActive = i === selectedIndex;
          return (
            <button
              key={level}
              type="button"
              onClick={() => onChange(i)}
              className={`
                flex-1 text-xs font-semibold py-2 rounded-md transition-all duration-200 relative z-10
                ${isActive
                  ? 'bg-white text-indigo-700 shadow-sm border border-indigo-100'
                  : 'text-slate-500 hover:text-slate-700 border border-transparent'
                }
              `}
            >
              {level}
            </button>
          );
        })}
      </div>

      {/* Description */}
      <p className="text-xs text-slate-400 leading-relaxed pl-0.5">{param.description}</p>
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
      <div className="p-6 space-y-6 border-t border-slate-100">
        {/* Sliders Grid — 1 col on mobile, 2 on md+ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
          {PARAMETERS.map(param => (
            <SegmentedSlider
              key={param.key}
              param={param}
              selectedIndex={selections[param.key]}
              onChange={(i) => handleChange(param.key, i)}
            />
          ))}
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handleApply}
            disabled={!listingId || isApplyingStrategy}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm"
          >
            {isApplyingStrategy ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Applying...
              </>
            ) : (
              <>
                <Zap size={16} />
                Apply New Strategy
              </>
            )}
          </button>
        </div>
      </div>
    </Accordion>
  );
};

export default StrategyTuner;
