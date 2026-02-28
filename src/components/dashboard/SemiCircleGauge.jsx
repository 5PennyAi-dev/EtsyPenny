import { useState, useEffect } from 'react';

/**
 * Opportunity Index color tiers
 * > 70  → Emerald (strong opportunity)
 * 40-70 → Amber (moderate)
 * < 40  → Rose (difficult)
 */
const getOpportunityTier = (value) => {
  if (value > 70) return { stroke: 'text-emerald-500', text: 'text-emerald-600', label: 'High' };
  if (value >= 40) return { stroke: 'text-amber-500', text: 'text-amber-600', label: 'Medium' };
  return { stroke: 'text-rose-500', text: 'text-rose-600', label: 'Low' };
};

const SemiCircleGauge = ({ value = 0, size = 200 }) => {
  const [animatedValue, setAnimatedValue] = useState(0);
  const tier = getOpportunityTier(value);

  useEffect(() => {
    // Add a small delay for the animation to trigger after mount
    const timeout = setTimeout(() => {
      setAnimatedValue(value);
    }, 100);
    return () => clearTimeout(timeout);
  }, [value]);

  // viewBox is 200x120 to leave some room at the bottom
  const radius = 80;
  const cx = 100;
  const cy = 100;
  const strokeWidth = 14;
  
  // The path for a semi-circle from left to right
  // A rx ry x-axis-rotation large-arc-flag sweep-flag x y
  const pathData = `M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`;
  
  const arcLength = Math.PI * radius;
  const activeLength = (animatedValue / 100) * arcLength;
  const strokeDashoffset = arcLength - activeLength;

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 200 110"
        className="drop-shadow-sm"
        style={{ maxWidth: `${size}px` }}
      >
        {/* Background track */}
        <path
          d={pathData}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          className="text-slate-100"
        />
        {/* Active progress track */}
        <path
          d={pathData}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={arcLength}
          strokeDashoffset={strokeDashoffset}
          fill="none"
          className={`${tier.stroke} transition-all duration-1000 ease-out`}
        />
      </svg>
      
      {/* Absolute positioned value text */}
      <div className="absolute bottom-2 flex flex-col items-center justify-center">
        <span className={`text-5xl font-black tracking-tighter ${tier.text}`}>
          {Math.round(value)}
        </span>
      </div>
    </div>
  );
};

export default SemiCircleGauge;
