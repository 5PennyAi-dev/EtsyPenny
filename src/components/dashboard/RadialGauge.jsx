import { Info } from 'lucide-react';
import { useState } from 'react';

/**
 * Color tier based on a 0-100 score.
 * < 50  → Rose (Critical)
 * 50-75 → Amber (Average)
 * > 75  → Emerald (Excellent)
 */
const getTier = (value) => {
  const v = Number(value) || 0;
  if (v >= 75) return { stroke: 'text-emerald-500', text: 'text-emerald-600', label: 'Top performing', bg: 'bg-emerald-50', border: 'border-emerald-100' };
  if (v >= 50) return { stroke: 'text-amber-500', text: 'text-amber-600', label: 'Improvement needed', bg: 'bg-amber-50', border: 'border-amber-100' };
  return { stroke: 'text-rose-500', text: 'text-rose-600', label: 'Critical', bg: 'bg-rose-50', border: 'border-rose-100' };
};

/**
 * Inverted tiers for metrics where LOWER is BETTER (e.g. competition).
 * < 30  → Emerald (Low competition = great)
 * 30-60 → Amber (Medium)
 * > 60  → Rose (High competition = bad)
 */
const getTierInverted = (value) => {
  const v = Number(value) || 0;
  if (v <= 30) return { stroke: 'text-emerald-500', text: 'text-emerald-600', label: 'Low competition', bg: 'bg-emerald-50', border: 'border-emerald-100' };
  if (v <= 60) return { stroke: 'text-amber-500', text: 'text-amber-600', label: 'Medium', bg: 'bg-amber-50', border: 'border-amber-100' };
  return { stroke: 'text-rose-500', text: 'text-rose-600', label: 'High competition', bg: 'bg-rose-50', border: 'border-rose-100' };
};

const RadialGauge = ({ value = 0, label, tooltip, size = 100, invertColors = false }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const tier = invertColors ? getTierInverted(value) : getTier(value);
  const radius = (size - 16) / 2; // leave room for stroke
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Number(value) / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* SVG Gauge */}
      <div className="relative flex items-center justify-center">
        <svg
          className="transform -rotate-90"
          width={size}
          height={size}
        >
          {/* Background track */}
          <circle
            className="text-slate-100"
            strokeWidth="8"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx={center}
            cy={center}
          />
          {/* Foreground arc */}
          <circle
            className={`${tier.stroke} drop-shadow-sm transition-all duration-1000 ease-out`}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx={center}
            cy={center}
          />
        </svg>
        {/* Center value */}
        <div className="absolute flex flex-col items-center justify-center">
          <span className={`${size >= 120 ? 'text-3xl' : 'text-2xl'} font-black tracking-tighter ${tier.text}`}>
            {Math.round(value) || 0}
          </span>
        </div>
      </div>

      {/* Label + Tooltip trigger */}
      <div className="flex items-center gap-1 relative">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        {tooltip && (
          <div
            className="relative"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <Info size={14} className="text-slate-400 cursor-help hover:text-indigo-500 transition-colors" />
            {showTooltip && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-48 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg shadow-lg z-50 leading-relaxed pointer-events-none">
                {tooltip}
                <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 bg-slate-900 rotate-45" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export { getTier, getTierInverted };
export default RadialGauge;
