import { Copy, Check, Flame, TrendingUp, Leaf, Star, Sparkles, Pencil, RefreshCw, UploadCloud, ArrowUpDown, ArrowUp, ArrowDown, FileDown, Lightbulb, AlertTriangle, Target, Loader2, Info } from 'lucide-react';
import { useState, useEffect, useRef, useLayoutEffect, useMemo, useCallback } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import ListingPDFDocument from '../pdf/ListingPDFDocument';

const Sparkline = ({ data }) => {
  if (!data || data.length === 0) return <div className="text-slate-300 text-xs">-</div>;

  const width = 60;
  const height = 20;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  const first = data[0] || 1;
  const last = data[data.length - 1] || 0;
  const percentChange = ((last - first) / first) * 100;
  const isPositive = percentChange >= 0;

  return (
    <div className="flex flex-col items-center">
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          fill="none"
          stroke={isPositive ? "#10b981" : "#f43f5e"}
          strokeWidth="1.5"
          points={points}
        />
      </svg>
      <span className={`text-[10px] font-bold mt-1 ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
        {isPositive ? '↗' : '↘'} {Math.abs(percentChange).toFixed(0)}%
      </span>
    </div>
  );
};

const CopyButton = ({ text, label = "Copy", className = "", tooltipSide = "top" }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e) => {
    e.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const positionClasses = tooltipSide === "top" 
    ? "bottom-full mb-2" 
    : "top-full mt-2";
    
  const arrowClasses = tooltipSide === "top"
    ? "top-full border-t-slate-800 border-b-transparent border-l-transparent border-r-transparent"
    : "bottom-full border-b-slate-800 border-t-transparent border-l-transparent border-r-transparent";

  return (
    <div className={`relative group/copy inline-flex ${className}`}>
      <button
        onClick={handleCopy}
        className={`flex items-center justify-center p-1 rounded-md transition-all duration-200
          ${copied 
            ? 'text-emerald-500 bg-emerald-50' 
            : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'
          }`}
        type="button"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
      
      {/* Tooltip */}
      <div className={`absolute left-1/2 -translate-x-1/2 px-2 py-1 text-[10px] font-medium text-white bg-slate-800 rounded shadow-lg opacity-0 group-hover/copy:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 ${positionClasses}`}>
        {copied ? 'Copied!' : label}
        <div className={`absolute left-1/2 -translate-x-1/2 border-4 ${arrowClasses}`}></div>
      </div>
    </div>
  );
};

// Full Skeleton Screen shown while generateInsight is loading (covers both columns)
const InsightSkeleton = ({ phase = 'seo' }) => (
  <div className="flex flex-col lg:flex-row gap-8 items-start">
    {/* Left Column Skeleton */}
    <div className="flex-1 min-w-0 space-y-8 animate-pulse">
      {/* Audit Header Skeleton */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 flex items-center gap-8">
          <div className="w-[130px] h-[130px] rounded-full bg-slate-100 flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="h-3 w-24 bg-slate-100 rounded" />
            <div className="h-6 w-48 bg-slate-100 rounded" />
            <div className="h-4 w-full bg-slate-100 rounded" />
            <div className="h-4 w-3/4 bg-slate-100 rounded" />
          </div>
        </div>
        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100">
          <div className="h-3 w-20 bg-slate-100 rounded mb-2" />
          <div className="h-4 w-full bg-slate-100 rounded" />
        </div>
      </div>

      {/* Table Skeleton */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div className="h-5 w-44 bg-slate-100 rounded" />
          <div className="flex gap-3">
            <div className="h-4 w-16 bg-slate-100 rounded" />
            <div className="h-4 w-16 bg-slate-100 rounded" />
            <div className="h-4 w-16 bg-slate-100 rounded" />
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-3.5">
              <div className="w-4 h-4 bg-slate-100 rounded" />
              <div className="h-5 w-32 bg-slate-100 rounded-full" />
              <div className="flex-1" />
              <div className="h-4 w-14 bg-slate-100 rounded" />
              <div className="h-5 w-14 bg-slate-100 rounded" />
              <div className="h-5 w-12 bg-slate-100 rounded" />
              <div className="h-5 w-10 bg-slate-100 rounded" />
              <div className="flex gap-1">
                <div className="w-4 h-4 bg-slate-100 rounded-full" />
                <div className="w-4 h-4 bg-slate-100 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Right Column Skeleton (Sidebar — 33%) */}
    <div className="w-full lg:w-1/3 lg:flex-shrink-0 sticky top-8">
      <div className="bg-slate-50/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm p-1">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 min-h-[400px] flex flex-col items-center justify-center">
          {/* Active spinner */}
          <div className="relative mb-6">
            <div className="w-16 h-16 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles size={20} className="text-indigo-600" />
            </div>
          </div>
          <h4 className="text-slate-900 font-bold text-base mb-2">
            {phase === 'seo' ? 'Generating SEO Tags...' : 'Generating Insights...'}
          </h4>
          <p className="text-slate-500 text-sm text-center px-4 leading-relaxed">
            {phase === 'seo' 
              ? 'Researching keywords and analyzing competition' 
              : 'Analyzing keywords and calculating your listing score'}
          </p>
        </div>
      </div>
    </div>
  </div>
);

const AuditHeader = ({ score, statusLabel, strategicVerdict, improvementPriority, scoreExplanation, onSEOSniper, isSniperLoading }) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  const size = 130;
  const strokeWidth = 11;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score || 0), 100);
    return () => clearTimeout(timer);
  }, [score]);

  const getColor = (val) => {
    if (val >= 80) return { stroke: '#16A34A', text: 'text-emerald-600', fallbackLabel: 'Strong Listing', fallbackSub: 'High visibility potential' };
    if (val >= 50) return { stroke: '#F59E0B', text: 'text-amber-600', fallbackLabel: 'Good Foundation', fallbackSub: 'Minor tweaks could boost reach' };
    return { stroke: '#E11D48', text: 'text-rose-600', fallbackLabel: 'Needs Work', fallbackSub: 'Consider revising keywords' };
  };

  const tier = getColor(score || 0);

  if (score === null || score === undefined) return null;

  const displayLabel = statusLabel || tier.fallbackLabel;
  const displayVerdict = strategicVerdict || tier.fallbackSub;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Main Gauge + Executive Summary + Sniper Button */}
      <div className="p-6 flex items-center gap-8">
        {/* Gauge Circle */}
        <div className="relative flex-shrink-0">
          <svg width={size} height={size} className="-rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#F1F5F9"
              strokeWidth={strokeWidth}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={tier.stroke}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.3s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-black ${tier.text}`}>{animatedScore}</span>
            <span className="text-[10px] text-slate-400 font-medium">/100</span>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Listing Strength</span>
            {/* Score Explanation Info Icon */}
            <div className="relative group/score">
              <div className="w-5 h-5 rounded-full bg-slate-100 hover:bg-indigo-100 flex items-center justify-center cursor-help transition-colors border border-slate-200 hover:border-indigo-300">
                <Info size={12} className="text-slate-400 group-hover/score:text-indigo-600 transition-colors" />
              </div>
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-4 py-3 text-xs text-white bg-slate-800 rounded-lg shadow-xl opacity-0 invisible group-hover/score:opacity-100 group-hover/score:visible transition-all z-50 w-80 pointer-events-none leading-relaxed whitespace-normal">
                {scoreExplanation || "Score breakdown will appear after the next analysis."}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-[6px] border-b-slate-800 border-t-transparent border-l-transparent border-r-transparent"></div>
              </div>
            </div>
          </div>
          <span className={`text-xl font-bold ${tier.text} leading-tight`}>{displayLabel}</span>
          <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{displayVerdict}</p>
        </div>

        {/* SEO Sniper Button — integrated top-right */}
        {onSEOSniper && (
          <div className="flex-shrink-0">
            <button
              onClick={onSEOSniper}
              disabled={!!isSniperLoading}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200
                ${isSniperLoading
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md shadow-sm'
                }`}
            >
              {isSniperLoading === 'sniper' ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Generating keywords...</span>
                </>
              ) : isSniperLoading === 'insight' ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Generating Insights...</span>
                </>
              ) : (
                <>
                  <Target size={16} />
                  <span>SEO Sniper</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Priority Banner */}
      {improvementPriority && (
        <div className="px-6 py-3.5 bg-amber-50/70 border-t border-amber-100 flex items-start gap-3">
          <div className="p-1 bg-amber-100 rounded-lg flex-shrink-0 mt-0.5">
            <AlertTriangle size={14} className="text-amber-600" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Priority Action</span>
            <p className="text-sm text-amber-900 font-medium leading-relaxed mt-0.5">{improvementPriority}</p>
          </div>
        </div>
      )}
    </div>
  );
};

const ResultsDisplay = ({ results, isGeneratingDraft, onGenerateDraft, onRelaunchSEO, onSEOSniper, isSniperLoading, isInsightLoading, onCompetitionAnalysis, isCompetitionLoading }) => {
  const [displayedTitle, setDisplayedTitle] = useState("");
  const [displayedDescription, setDisplayedDescription] = useState("");
  const descriptionRef = useRef(null);

  // Auto-resize description with robust handling
  useLayoutEffect(() => {
    if (descriptionRef.current) {
        // Reset height to auto to correctly calculate scrollHeight
        descriptionRef.current.style.height = 'auto';
        // Set height to scrollHeight
        descriptionRef.current.style.height = descriptionRef.current.scrollHeight + 'px';
    }
  }, [displayedDescription, isGeneratingDraft]); // Add isGeneratingDraft to trigger on mount/visible
  
  // Sync local state when results change (e.g. after draft generation)
  useEffect(() => {
    if (results) {
        setDisplayedTitle(results.title || "");
        setDisplayedDescription(results.description || "");
    }
  }, [results]);

  // Tag Selection State (must be declared before any early returns — Rules of Hooks)
  const [selectedTags, setSelectedTags] = useState([]);

  // Initialize selectedTags when results load
  useEffect(() => {
    if (results?.analytics) {
        setSelectedTags(results.analytics.map(r => r.keyword));
    }
  }, [results]);

  // Split analytics into primary and competition keywords
  const primaryAnalytics = useMemo(() => {
    if (!results?.analytics) return [];
    return results.analytics.filter(k => !k.is_competition);
  }, [results?.analytics]);

  const competitionAnalytics = useMemo(() => {
    if (!results?.analytics) return [];
    return results.analytics.filter(k => k.is_competition);
  }, [results?.analytics]);

  // Sorting Logic
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'desc' });
  
  const sortedAnalytics = useMemo(() => {
    if (!primaryAnalytics.length) return [];
    
    let sortableItems = [...primaryAnalytics];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aValue, bValue;
        
        switch (sortConfig.key) {
            case 'volume':
                aValue = a.volume;
                bValue = b.volume;
                break;
            case 'trend':
                const aFirst = a.volume_history?.[0] || 1;
                const aLast = a.volume_history?.[a.volume_history.length - 1] || 0;
                aValue = ((aLast - aFirst) / aFirst) * 100;
                
                const bFirst = b.volume_history?.[0] || 1;
                const bLast = b.volume_history?.[b.volume_history.length - 1] || 0;
                bValue = ((bLast - bFirst) / bFirst) * 100;
                break;
            case 'competition':
                const getCompScore = (val) => {
                    const numVal = parseFloat(val);
                    if (!isNaN(numVal)) return numVal;
                    if (val === 'Low') return 0.2;
                    if (val === 'Medium') return 0.5;
                    if (val === 'High') return 0.8;
                    return 0.5;
                };
                aValue = getCompScore(a.competition);
                bValue = getCompScore(b.competition);
                break;
            case 'score':
                aValue = a.score;
                bValue = b.score;
                break;
            default:
                return 0;
        }

        if (aValue < bValue) {
            return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
            return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [results?.analytics, sortConfig]);

  // --- ALL HOOKS ARE ABOVE THIS LINE --- Early returns below are safe ---

  // If insight/seo is loading, show full skeleton
  if (isInsightLoading) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
        <InsightSkeleton phase={isInsightLoading} />
      </div>
    );
  }

  if (!results) return null;

  const hasDraft = !!results.title && results.title !== "SEO Analysis Completed";

  const toggleTag = (keyword) => {
    setSelectedTags(prev => 
        prev.includes(keyword) 
            ? prev.filter(k => k !== keyword)
            : [...prev, keyword]
    );
  };

  const handleMagicDraft = () => {
    if (selectedTags.length === 0) {
        alert("Please select at least one tag to craft your listing.");
        return;
    }
    onGenerateDraft(selectedTags);
  };

  const requestSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }) => {
      if (sortConfig.key !== columnKey) return <ArrowUpDown size={14} className="text-slate-300 ml-1 inline-block opacity-0 group-hover:opacity-50 transition-opacity" />;
      if (sortConfig.direction === 'asc') return <ArrowUp size={14} className="text-indigo-600 ml-1 inline-block" />;
      return <ArrowDown size={14} className="text-indigo-600 ml-1 inline-block" />;
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
      
      {/* Main + Sidebar Flex Layout */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* --- MAIN CONTENT (Fluid width) --- */}
        <div className="flex-1 min-w-0 space-y-8">

            {/* Hero Audit Header with integrated SEO Sniper */}
            {results.global_strength !== null && results.global_strength !== undefined && (
                <AuditHeader 
                    score={results.global_strength}
                    statusLabel={results.status_label}
                    strategicVerdict={results.strategic_verdict}
                    improvementPriority={results.improvement_priority}
                    scoreExplanation={results.score_explanation}
                    onSEOSniper={onSEOSniper}
                    isSniperLoading={isSniperLoading}
                />
            )}

            {/* 1. Full Width Performance Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <TrendingUp size={16} className="text-indigo-600" />
                        Keyword Performance
                        <CopyButton text={selectedTags.join(', ')} label="Copy Keywords" tooltipSide="bottom" />
                        <span className="text-xs font-normal text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full ml-1">
                            {selectedTags.length} / {results.analytics.length} selected
                        </span>
                        
                         <button 
                            onClick={onRelaunchSEO}
                            className="ml-2 flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100 shadow-sm"
                            title="Relaunch Analysis (Costs 1 Credit)"
                         >
                            <RefreshCw size={12} />
                            Refresh Data
                         </button>
                    </h3>
                    <div className="flex items-center gap-4 text-xs text-slate-500 hidden sm:flex">
                         {onCompetitionAnalysis && (
                             <button
                                 onClick={onCompetitionAnalysis}
                                 disabled={!!isCompetitionLoading}
                                 className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors border shadow-sm
                                     ${isCompetitionLoading
                                         ? 'text-slate-400 bg-slate-50 border-slate-200 cursor-not-allowed'
                                         : 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border-indigo-100'
                                     }`}
                             >
                                 {isCompetitionLoading ? (
                                     <><Loader2 size={12} className="animate-spin" /> Analyzing...</>
                                 ) : (
                                     <><TrendingUp size={12} /> Analyse Competition</>
                                 )}
                             </button>
                         )}
                         <span className="flex items-center gap-1"><Flame size={12} className="text-orange-500"/> Trending</span>
                         <span className="flex items-center gap-1"><Leaf size={12} className="text-emerald-500"/> Evergreen</span>
                         <span className="flex items-center gap-1"><Star size={12} className="text-amber-400"/> Opportunity</span>
                         <span className="flex items-center gap-1"><Target size={12} className="text-indigo-500"/> Sniper</span>
                    </div>
                </div>
                <div>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-2 w-10 text-center">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedTags.length === results.analytics.length && results.analytics.length > 0}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedTags(results.analytics.map(r => r.keyword));
                                            } else {
                                                setSelectedTags([]);
                                            }
                                        }}
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    />
                                </th>
                                <th className="px-3 py-2 font-semibold w-1/4">Tag / Keyword</th>
                                <th 
                                    className="px-2 py-2 text-center font-semibold cursor-pointer select-none group hover:bg-slate-100 transition-colors"
                                    onClick={() => requestSort('volume')}
                                >
                                    Avg. Vol <SortIcon columnKey="volume" />
                                </th>
                                <th 
                                    className="px-2 py-2 text-center font-semibold cursor-pointer select-none group hover:bg-slate-100 transition-colors"
                                    onClick={() => requestSort('trend')}
                                >
                                    Trend <SortIcon columnKey="trend" />
                                </th>
                                <th 
                                    className="px-2 py-2 text-center font-semibold cursor-pointer select-none group hover:bg-slate-100 transition-colors"
                                    onClick={() => requestSort('competition')}
                                >
                                    Competition <SortIcon columnKey="competition" />
                                </th>
                                <th 
                                    className="px-2 py-2 text-center font-semibold cursor-pointer select-none group hover:bg-slate-100 transition-colors"
                                    onClick={() => requestSort('score')}
                                >
                                    Score <SortIcon columnKey="score" />
                                </th>
                                <th className="px-2 py-2 text-center font-semibold">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sortedAnalytics.map((row, i) => (
                                <tr key={i} className={`hover:bg-slate-50 transition-colors group ${!selectedTags.includes(row.keyword) ? 'opacity-50 grayscale-[0.5]' : ''}`}>
                                    <td className="px-4 py-3 text-center">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedTags.includes(row.keyword)}
                                            onChange={() => toggleTag(row.keyword)}
                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                    </td>
                                    <td className="px-3 py-3 font-medium relative">
                                        <div className="flex items-center gap-2">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                {row.keyword}
                                            </span>
                                            {row.insight && (
                                                <div className="relative group/insight">
                                                    <Lightbulb
                                                        size={14}
                                                        className={`cursor-help shrink-0 ${
                                                            row.is_top === true ? "text-green-500" :
                                                            row.is_top === false ? "text-amber-500" :
                                                            "text-gray-400"
                                                        }`}
                                                    />
                                                    {/* Tooltip */}
                                                    <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-2 text-xs text-white bg-slate-800 rounded-lg shadow-xl opacity-0 invisible group-hover/insight:opacity-100 group-hover/insight:visible transition-all z-50 w-64 pointer-events-none leading-relaxed">
                                                        {row.insight}
                                                        <div className="absolute right-full top-1/2 -translate-y-1/2 border-[6px] border-r-slate-800 border-t-transparent border-b-transparent border-l-transparent"></div>
                                                    </div>
                                                </div>
                                            )}
                                            {row.is_sniper_seo && (
                                                <Target size={14} className="text-indigo-500 shrink-0" />
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center text-slate-600 font-mono text-xs">
                                        {row.volume.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-center">
                                            <Sparkline data={row.volume_history} />
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {(() => {
                                            const numVal = parseFloat(row.competition);
                                            const displayVal = !isNaN(numVal) ? numVal.toFixed(2) : row.competition;
                                            const colorClass = (!isNaN(numVal) ? numVal : 0.5) < 0.3 
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                                : (!isNaN(numVal) ? numVal : 0.5) < 0.7 
                                                    ? 'bg-amber-50 text-amber-700 border-amber-100' 
                                                    : 'bg-rose-50 text-rose-700 border-rose-100';
                                            return (
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide border ${colorClass}`}>
                                                    {displayVal}
                                                </span>
                                            );
                                        })()}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="font-bold text-slate-700">{row.score}</div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            {row.is_trending && <Flame size={16} className="text-orange-500 fill-orange-500/20" />}
                                            {row.is_evergreen && <Leaf size={16} className="text-emerald-500 fill-emerald-500/20" />}
                                            {row.is_promising && <Star size={16} className="text-amber-400 fill-amber-400/20" />}
                                            {(!row.is_trending && !row.is_evergreen && !row.is_promising) && <span className="text-slate-300">-</span>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 2. Competitors Keywords Table (Read-only) */}
            {competitionAnalytics.length > 0 && (
                <div className="bg-white rounded-2xl border border-orange-200 shadow-sm">
                    <div className="px-6 py-4 border-b border-orange-100 bg-orange-50/50 flex justify-between items-center">
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <Flame size={16} className="text-orange-500" />
                            Competitors Keywords
                            <span className="text-xs font-normal text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full ml-1">
                                {competitionAnalytics.length} keywords
                            </span>
                            {/* Info tooltip with competitor_seed */}
                            <div className="relative group/compinfo">
                                <div className="w-5 h-5 rounded-full bg-orange-100 hover:bg-orange-200 flex items-center justify-center cursor-help transition-colors border border-orange-200 hover:border-orange-300">
                                    <Info size={12} className="text-orange-500 group-hover/compinfo:text-orange-700 transition-colors" />
                                </div>
                                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-4 py-3 text-xs text-white bg-slate-800 rounded-lg shadow-xl opacity-0 invisible group-hover/compinfo:opacity-100 group-hover/compinfo:visible transition-all z-50 w-72 pointer-events-none leading-relaxed whitespace-normal">
                                    Based on the first ten Etsy listings returned by Google search with keywords <span className="font-bold text-orange-300">"{results?.competitor_seed || 'N/A'}"</span>.
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-[6px] border-b-slate-800 border-t-transparent border-l-transparent border-r-transparent"></div>
                                </div>
                            </div>
                        </h3>
                        <div className="flex items-center gap-4 text-xs text-slate-500 hidden sm:flex">
                            <span className="flex items-center gap-1"><Flame size={12} className="text-orange-500"/> Trending</span>
                            <span className="flex items-center gap-1"><Leaf size={12} className="text-emerald-500"/> Evergreen</span>
                        </div>
                    </div>
                    <div>
                        <table className="w-full text-sm text-left">
                            <thead className="bg-orange-50/30 text-slate-500 font-medium border-b border-orange-100">
                                <tr>
                                    <th className="px-4 py-2 font-semibold w-1/4">Tag / Keyword</th>
                                    <th className="px-2 py-2 text-center font-semibold">Avg. Vol</th>
                                    <th className="px-2 py-2 text-center font-semibold">Trend</th>
                                    <th className="px-2 py-2 text-center font-semibold">Competition</th>
                                    <th className="px-2 py-2 text-center font-semibold">Score</th>
                                    <th className="px-2 py-2 text-center font-semibold">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-orange-50">
                                {competitionAnalytics.map((row, i) => (
                                    <tr key={i} className="hover:bg-orange-50/30 transition-colors">
                                        <td className="px-4 py-3 font-medium">
                                            <div className="flex items-center gap-2">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
                                                    {row.keyword}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center text-slate-600 font-mono text-xs">
                                            {row.volume.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-center">
                                                <Sparkline data={row.volume_history} />
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {(() => {
                                                const numVal = parseFloat(row.competition);
                                                const displayVal = !isNaN(numVal) ? numVal.toFixed(2) : row.competition;
                                                const colorClass = (!isNaN(numVal) ? numVal : 0.5) < 0.3 
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                                    : (!isNaN(numVal) ? numVal : 0.5) < 0.7 
                                                        ? 'bg-amber-50 text-amber-700 border-amber-100' 
                                                        : 'bg-rose-50 text-rose-700 border-rose-100';
                                                return (
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide border ${colorClass}`}>
                                                        {displayVal}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="font-bold text-slate-700">{row.score}</div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {row.is_trending && <Flame size={16} className="text-orange-500 fill-orange-500/20" />}
                                                {row.is_evergreen && <Leaf size={16} className="text-emerald-500 fill-emerald-500/20" />}
                                                {row.is_promising && <Star size={16} className="text-amber-400 fill-amber-400/20" />}
                                                {(!row.is_trending && !row.is_evergreen && !row.is_promising) && <span className="text-slate-300">-</span>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>

        {/* --- SIDEBAR: DRAFTING (33% width) --- */}
        <div className="w-full lg:w-1/3 lg:flex-shrink-0 sticky top-8 space-y-4">
             <div className="bg-slate-50/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm p-1 transition-all duration-500">
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 min-h-[400px] flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <Pencil size={16} className="text-indigo-600" />
                            Listing Preview
                        </h3>
                        {hasDraft && (
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => onGenerateDraft(selectedTags)}
                                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100"
                                    title="Regenerate Draft"
                                >
                                    <RefreshCw size={12} />
                                    Regenerate
                                </button>
                            </div>
                        )}
                    </div>

                    {!hasDraft && !isGeneratingDraft ? (
                         // STATE B: READY TO CRAFT
                         <div className="flex-1 flex flex-col items-center justify-center text-center py-8 animate-in fade-in slide-in-from-bottom-4">
                             <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse-slow">
                                 <Sparkles className="text-indigo-600" size={32} />
                             </div>
                             <h4 className="text-slate-900 font-bold text-lg mb-2">Ready to Craft?</h4>
                             <p className="text-slate-500 text-sm mb-8 px-4 leading-relaxed">
                                 We found <span className="text-indigo-600 font-bold">{results.analytics.length} high-opportunity keywords</span>. 
                                 Ready to turn them into a high-converting listing?
                             </p>
                             <button 
                                onClick={handleMagicDraft}
                                disabled={selectedTags.length === 0}
                                className={`w-full py-3 text-white text-sm font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2
                                    ${selectedTags.length === 0 
                                        ? 'bg-slate-300 cursor-not-allowed shadow-none' 
                                        : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-0.5'}`}
                             >
                                <Sparkles size={18} /> Magic Draft ✨
                             </button>
                         </div>
                    ) : isGeneratingDraft ? (
                        // STATE C: DRAFTING (LOADING)
                        <div className="flex-1 flex flex-col items-center justify-center text-center py-8 space-y-6 animate-in fade-in">
                            <div className="relative">
                                <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Sparkles size={20} className="text-indigo-600 animate-pulse" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-slate-900 font-medium">Writing your story...</h4>
                                <p className="text-slate-400 text-xs">Integrating keywords & optimizing for conversion</p>
                            </div>
                        </div>
                    ) : (
                        // STATE D: DRAFT READY (EDITOR)
                        <div className="flex-1 flex flex-col space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Title Input */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                        Title 
                                        <CopyButton text={displayedTitle} label="Copy Title" />
                                    </label>
                                    <span className={`text-xs font-bold ${displayedTitle.length > 140 ? 'text-rose-500' : 'text-slate-400'}`}>{displayedTitle.length}/140</span>
                                </div>
                                <textarea 
                                    value={displayedTitle}
                                    onChange={(e) => setDisplayedTitle(e.target.value)}
                                    className={`w-full px-3 py-2 text-sm text-slate-700 bg-slate-50/50 border rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none transition-all
                                        ${displayedTitle.length > 140 ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20' : 'border-slate-200'}`}
                                    rows={3}
                                />
                            </div>

                            {/* Description Input */}
                            <div className="space-y-1.5 flex-grow flex flex-col">
                                <div className="flex items-center gap-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Description</label>
                                    <CopyButton text={displayedDescription} label="Copy Description" />
                                </div>
                                <textarea 
                                    ref={descriptionRef}
                                    value={displayedDescription}
                                    onChange={(e) => setDisplayedDescription(e.target.value)}
                                    className="w-full px-3 py-2 text-sm text-slate-700 bg-slate-50/50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none transition-all custom-scrollbar flex-grow overflow-hidden min-h-[300px]"
                                />
                            </div>

                                <PDFDownloadLink
                                    key={`pdf-${displayedTitle}-${selectedTags.length}-version6`}
                                    document={
                                        <ListingPDFDocument 
                                            listing={{
                                                title: displayedTitle,
                                                description: displayedDescription,
                                                imageUrl: results.imageUrl,
                                                global_strength: results.global_strength ?? null,
                                                status_label: results.status_label ?? null,
                                                strategic_verdict: results.strategic_verdict ?? null,
                                                productName: displayedTitle.split(' ').slice(0, 5).join(' ') + '...', // Simple truncated name
                                                tags: results.analytics
                                                    .filter(k => selectedTags.includes(k.keyword))
                                                    .map(k => {
                                                        // Calculate Trend %
                                                        let trend = 0;
                                                        if (k.volume_history && k.volume_history.length > 0) {
                                                            const first = k.volume_history[0] || 1; // Avoid divide by zero
                                                            const last = k.volume_history[k.volume_history.length - 1] || 0;
                                                            trend = Math.round(((last - first) / first) * 100);
                                                        }

                                                        return { 
                                                            keyword: k.keyword, 
                                                            score: k.score,
                                                            volume: k.volume,
                                                            competition: k.competition,
                                                            trend: trend,
                                                            volume_history: k.volume_history || [],
                                                            is_trending: k.is_trending,
                                                            is_evergreen: k.is_evergreen,
                                                            is_promising: k.is_promising,
                                                            insight: k.insight || null,
                                                            is_top: k.is_top ?? null,
                                                            is_sniper_seo: k.is_sniper_seo ?? false
                                                        };
                                                    })
                                            }}
                                        />
                                    }
                                    fileName={`${displayedTitle.substring(0, 20).replace(/\s+/g, '_')}_SEO_v4.pdf`}
                                    className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-medium rounded-lg border border-indigo-200 transition-all flex items-center justify-center gap-2"
                                >
                                    {({ blob, url, loading, error }) => (
                                        loading ? 'Generating PDF...' : <><FileDown size={16} /> Export to PDF</>
                                    )}
                                </PDFDownloadLink>
                        </div>
                    )}
                </div>
             </div>
        </div>

      </div>
    </div>
  );
};

export default ResultsDisplay;
