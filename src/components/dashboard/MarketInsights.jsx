import { useState } from 'react';
import { Radar, Gem, Info, LayoutTemplate } from 'lucide-react';

/**
 * Market Value Index color tiers.
 * > 70  → Emerald (strong commercial value)
 * 40-70 → Amber (moderate)
 * < 40  → Blue (low)
 */
const getMarketTier = (v) => {
  if (v > 70) return { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' };
  if (v >= 40) return { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', iconBg: 'bg-amber-50', iconColor: 'text-amber-600' };
  return { text: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', iconBg: 'bg-blue-50', iconColor: 'text-blue-600' };
};

/**
 * Market Saturation tier (0-100%)
 */
const getSaturationTier = (percent) => {
  if (percent > 80) return { bar: 'bg-rose-500', text: 'text-rose-600', context: '> 80% = Crowded Market' };
  if (percent < 60) return { bar: 'bg-emerald-500', text: 'text-emerald-600', context: '< 60% = Open Market' };
  return { bar: 'bg-amber-500', text: 'text-amber-600', context: 'Average Saturation' };
};

/**
 * Entry Barrier tier (0.0 - 1.0)
 */
const getEntryTier = (ratio) => {
  if (ratio > 0.7) return { bar: 'bg-rose-500', text: 'text-rose-600', context: '> 0.7 = Hard Entry' };
  if (ratio < 0.5) return { bar: 'bg-emerald-500', text: 'text-emerald-600', context: '< 0.5 = Open Doors' };
  return { bar: 'bg-amber-500', text: 'text-amber-600', context: 'Moderate Entry' };
};

const MARKET_VALUE_TOOLTIP = 'This index measures the commercial worth of your keywords by benchmarking your average Cost-Per-Click (CPC) against market standards ($2.00). A higher score indicates high-value keywords with strong buyer intent.';
const MARKET_STRATEGY_TOOLTIP = 'Market Saturation reflects the global competition in this niche. Entry Barrier focuses only on your top 5 best keyword opportunities of each listing. A saturated market with a low entry barrier means you\'ve found a clever way to bypass the crowd.';

const MarketInsights = ({ stats }) => {
  const [showTooltipMarket, setShowTooltipMarket] = useState(false);
  const [showTooltipOpp, setShowTooltipOpp] = useState(false);

  if (!stats) return null;

  const reach = Math.round(Number(stats.avg_raw_visibility_index) || 0);
  const cpc = Number(stats.avg_cpc) || 0;
  const profit = Math.round(Number(stats.avg_profit) || 0);
  
  // Contextual Metrics for Market Strategy
  const saturationPercent = Math.round((Number(stats.avg_competition_all) || 0) * 100);
  const entryBarrierRatio = Number(stats.avg_competition2) || 0;

  const satTier = getSaturationTier(saturationPercent);
  const entryTier = getEntryTier(entryBarrierRatio);
  
  const marketTier = getMarketTier(profit);

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-900 mb-4">Market Insights</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

        {/* Card 1: Market Reach */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-blue-50 group-hover:scale-110 transition-transform">
              <Radar size={20} className="text-blue-600" />
            </div>
          </div>
          <p className="text-xs font-medium text-slate-500 mb-1">Market Reach</p>
          <h3 className="text-2xl font-bold text-slate-900">{reach.toLocaleString()}</h3>
          <p className="text-xs text-slate-400 mt-1">Raw visibility index of your catalog</p>
        </div>

        {/* Card 2: Market Value Index (merged CPC + Profit) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="flex items-start justify-between mb-3">
            <div className={`p-2.5 rounded-xl ${marketTier.iconBg} group-hover:scale-110 transition-transform`}>
              <Gem size={20} className={marketTier.iconColor} />
            </div>
            {/* Tooltip trigger */}
            <div
              className="relative"
              onMouseEnter={() => setShowTooltipMarket(true)}
              onMouseLeave={() => setShowTooltipMarket(false)}
            >
              <Info size={14} className="text-slate-400 cursor-help hover:text-indigo-500 transition-colors mt-1" />
              {showTooltipMarket && (
                <div className="absolute right-0 top-full mt-2 w-64 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg shadow-lg z-50 leading-relaxed pointer-events-none">
                  {MARKET_VALUE_TOOLTIP}
                  <div className="absolute right-3 -top-1 w-2 h-2 bg-slate-900 rotate-45" />
                </div>
              )}
            </div>
          </div>
          <p className="text-xs font-medium text-slate-500 mb-1">Market Value Index</p>
          <div className="flex items-baseline gap-3">
            <h3 className={`text-3xl font-black ${marketTier.text}`}>{profit}</h3>
            <span className="text-sm font-semibold text-slate-400">/ 100</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-slate-400">Avg. CPC</span>
            <span className="text-xs font-bold text-slate-600">${cpc.toFixed(2)}</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Relative commercial strength of your keywords</p>
        </div>

        {/* Card 3: Market Strategy (Split Layout) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group flex flex-col">
          <div className="flex items-start justify-between mb-4">
            <div className="p-2.5 rounded-xl bg-purple-50 group-hover:scale-110 transition-transform">
              <LayoutTemplate size={20} className="text-purple-600" />
            </div>
            {/* Tooltip trigger */}
            <div
              className="relative"
              onMouseEnter={() => setShowTooltipOpp(true)}
              onMouseLeave={() => setShowTooltipOpp(false)}
            >
              <Info size={14} className="text-slate-400 cursor-help hover:text-indigo-500 transition-colors mt-1" />
              {showTooltipOpp && (
                <div className="absolute right-0 top-full mt-2 w-64 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg shadow-lg z-50 leading-relaxed pointer-events-none">
                  {MARKET_STRATEGY_TOOLTIP}
                  <div className="absolute right-3 -top-1 w-2 h-2 bg-slate-900 rotate-45" />
                </div>
              )}
            </div>
          </div>
          
          <div className="mb-2 flex-grow flex flex-col justify-center">
            <p className="text-xs font-medium text-slate-500 mb-1">Market Strategy</p>
            <p className="text-xs text-slate-400 mb-4">Strategic landscape for your selected keywords</p>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Left Column - Market Saturation */}
              <div>
                <div className="flex flex-col mb-1.5">
                  <span className="text-xs font-semibold text-slate-700 mb-0.5">Market Saturation</span>
                  <span className={`text-xl font-bold leading-none ${satTier.text}`}>{saturationPercent}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1.5">
                  <div
                    className={`h-full rounded-full ${satTier.bar} transition-all duration-700`}
                    style={{ width: `${Math.min(saturationPercent, 100)}%` }}
                  />
                </div>
                <p className="text-[10px] font-medium text-slate-400">{satTier.context}</p>
              </div>

              {/* Right Column - Entry Barrier */}
              <div>
                <div className="flex flex-col mb-1.5">
                  <span className="text-xs font-semibold text-slate-700 mb-0.5">Entry Barrier</span>
                  <span className={`text-xl font-bold leading-none ${entryTier.text}`}>
                    {entryBarrierRatio.toFixed(2)} <span className="text-[10px] text-slate-400 font-medium tracking-tight">/ 1.0</span>
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1.5">
                  <div
                    className={`h-full rounded-full ${entryTier.bar} transition-all duration-700`}
                    style={{ width: `${Math.min(entryBarrierRatio * 100, 100)}%` }}
                  />
                </div>
                <p className="text-[10px] font-medium text-slate-400">{entryTier.context}</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default MarketInsights;
