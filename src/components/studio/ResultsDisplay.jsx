import { Copy, Check, Flame, TrendingUp, Leaf, Star, Sparkles, Pencil, RefreshCw, UploadCloud, ArrowUpDown, ArrowUp, ArrowDown, FileDown, Lightbulb, AlertTriangle, Target, Loader2, Info, Plus, Minus, Save, Download, ArrowUpRight, ArrowDownRight, ShoppingCart, Pin, Tag } from 'lucide-react';
import { useState, useEffect, useRef, useLayoutEffect, useMemo, useCallback } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import ListingPDFDocument from '../pdf/ListingPDFDocument';
import Accordion from '../ui/Accordion';
import StrategySwitcher from './StrategySwitcher';

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
      <span className={`text-[10px] font-bold mt-1 flex items-center gap-0.5 ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
        {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />} {Math.abs(percentChange).toFixed(0)}%
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

// Component Helper Skeletons
const AuditSkeleton = () => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-pulse mb-8">
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
);

// Reusable Loading Spinner with Message
const LoadingSpinner = ({ message, subMessage }) => (
    <div className="flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-500">
        <div className="relative mb-6">
            <div className="w-16 h-16 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles size={20} className="text-indigo-600" />
            </div>
        </div>
        <h4 className="text-slate-900 font-bold text-base mb-2">
            {message || 'Loading...'}
        </h4>
        <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed">
            {subMessage || 'Please wait while we analyze your data.'}
        </p>
    </div>
);

const TableSkeleton = ({ message, subMessage }) => (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-8 relative overflow-hidden">
        {/* Header Skeleton */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center opacity-50">
            <div className="h-5 w-44 bg-slate-200 rounded animate-pulse" />
            <div className="flex gap-3">
                <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
                <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
            </div>
        </div>
        
        {/* Content with Overlay Spinner */}
        <div className="relative min-h-[300px]">
            {/* Background Skeleton Rows */}
            <div className="divide-y divide-slate-100 opacity-30 pointer-events-none">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-6 py-4">
                        <div className="w-4 h-4 bg-slate-100 rounded" />
                        <div className="h-5 w-32 bg-slate-100 rounded-full" />
                        <div className="flex-1" />
                        <div className="h-4 w-14 bg-slate-100 rounded" />
                        <div className="h-5 w-14 bg-slate-100 rounded" />
                    </div>
                ))}
            </div>

            {/* Centered Loading Spinner */}
            <div className="absolute inset-0 flex items-center justify-center backdrop-blur-[1px]">
                  <LoadingSpinner message={message} subMessage={subMessage} />
            </div>
        </div>
    </div>
);

const SidebarSkeleton = ({ phase }) => (
    <div className="bg-slate-50/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm p-1">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 min-h-[400px] flex flex-col items-center justify-center">
            <LoadingSpinner 
                message={phase === 'seo' ? 'Generating SEO Tags...' : 'Generating Insights...'} 
                subMessage={phase === 'seo' ? 'Researching keywords and analyzing competition' : 'Analyzing keywords and calculating your listing score'}
            />
        </div>
    </div>
);

const AuditHeader = ({
    score,
    statusLabel,
    strategicVerdict,
    improvementPriority,
    scoreExplanation,

    // New Props for Diagnostic Dashboard
    scoreJustificationVisibility,
    scoreJustificationRelevance,
    scoreJustificationConversion,
    listingVisibility,
    listingRawVisibilityIndex,
    listingConversion,
    listingRelevance,
    improvementPlanRemove,
    improvementPlanAdd,
    primaryAction,
  }) => {
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
    const displayLabel = statusLabel || tier.fallbackLabel;
    const displayVerdict = strategicVerdict || tier.fallbackSub;
  
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">
        {/* --- 1. HEALTH OVERVIEW --- */}
        <div className="p-6 flex flex-col md:flex-row items-center gap-8 border-b border-slate-100 bg-slate-50/30">
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
              <span className="text-[10px] text-slate-400 font-medium">STRENGTH</span>
            </div>
          </div>
  
          {/* Executive Summary */}
          <div className="flex flex-col flex-1 min-w-0 text-center md:text-left">
            <h2 className={`text-2xl font-bold ${tier.text} mb-2 uppercase tracking-tight`}>{displayLabel}</h2>
            <p className="text-slate-600 leading-relaxed font-medium bg-white p-3 rounded-lg border border-slate-100 shadow-sm inline-block md:inline-block">
                "{displayVerdict}"
            </p>
          </div>
  
          {/* SEO Sniper Button (Integrated Top-Right) */}

        </div>
        
        {/* --- 2. DIAGNOSTIC GRID (The Three Pillars) --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            {/* Pillar 1: Visibility */}
            <div className="p-6 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                       <TrendingUp size={14} /> Visibility
                    </span>
                    <span className="text-xl font-black text-slate-900">{listingVisibility || '-'}</span>
                </div>
                {/* Sub-metric */}
                <div className="mb-3">
                     <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        Index: {listingRawVisibilityIndex || '-'}
                     </span>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed text-balance">
                    {scoreJustificationVisibility || "Analysis pending..."}
                </p>
            </div>
  
            {/* Pillar 2: Relevance */}
            <div className="p-6 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between mb-4">
                     <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                       <Target size={14} /> Relevance
                     </span>
                     <span className="text-xl font-black text-slate-900">{listingRelevance || '-'}</span>
                </div>
                {/* Sub-metric */}
                <div className="mb-3">
                    {/* Simplified logic: <60 = Bottleneck, >80 = Strong */}
                    {(listingRelevance && listingRelevance < 60) ? (
                        <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 flex items-center gap-1 w-fit">
                            <AlertTriangle size={10} /> Bottleneck
                        </span>
                    ) : (
                        <span className="text-xs font-medium text-slate-400">Relevance Score</span>
                    )}
                </div>
                <p className="text-sm text-slate-500 leading-relaxed text-balance">
                    {scoreJustificationRelevance || "Analysis pending..."}
                </p>
            </div>
  
            {/* Pillar 3: Conversion */}
            <div className="p-6 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between mb-4">
                     <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                       <ShoppingCart size={14} /> Conversion
                     </span>
                     <span className="text-xl font-black text-slate-900">{listingConversion || '-'}</span>
                </div>
                {/* Sub-metric */}
                <div className="mb-3">
                     {(listingConversion && listingConversion > 85) ? (
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 flex items-center gap-1 w-fit">
                            <Sparkles size={10} /> Elite Status
                        </span>
                    ) : (
                        <span className="text-xs font-medium text-slate-400">Intent Score</span>
                    )}
                </div>
                <p className="text-sm text-slate-500 leading-relaxed text-balance">
                    {scoreJustificationConversion || "Analysis pending..."}
                </p>
            </div>
        </div>
  
        {/* --- 3. ACTION CENTER --- */}
        <div className="bg-slate-50/50 border-t border-slate-100">
             {/* Lists Row (Remove / Add) */}
             <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 border-b border-slate-100">
                  {/* Remove List */}
                  {improvementPlanRemove && improvementPlanRemove.length > 0 && (
                      <div className="p-5 flex items-start gap-4">
                          <span className="text-xs font-bold text-rose-500 uppercase tracking-wider mt-1.5 min-w-[60px]">Remove:</span>
                          <div className="flex flex-wrap gap-2">
                              {improvementPlanRemove.map((tag, i) => (
                                  <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-400 text-xs decoration-slate-400">
                                      {tag} <Minus size={10} className="text-rose-400" />
                                  </span>
                              ))}
                          </div>
                      </div>
                  )}
  
                  {/* Add List */}
                  {improvementPlanAdd && improvementPlanAdd.length > 0 && (
                      <div className="p-5 flex items-start gap-4">
                           <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider mt-1.5 min-w-[60px]">Add:</span>
                           <div className="flex flex-wrap gap-2">
                              {improvementPlanAdd.map((tag, i) => (
                                  <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white border border-emerald-100 text-emerald-700 font-medium text-xs shadow-sm">
                                      {tag} <Plus size={10} className="text-emerald-500" />
                                  </span>
                              ))}
                           </div>
                      </div>
                  )}
             </div>
  
             {/* Primary Action Banner */}
             {primaryAction && (
                <div className="p-4 bg-indigo-600 text-white flex items-center justify-center gap-3 text-sm font-medium">
                    <div className="p-1 bg-white/20 rounded-full">
                        <Flame size={14} className="text-white" />
                    </div>
                    <span><span className="font-bold opacity-80 uppercase tracking-wider mr-2">Primary Action:</span> {primaryAction}</span>
                </div>
             )}
        </div>
      </div>
    );
  };
  
  const ResultsDisplay = ({ results, isGeneratingDraft, onGenerateDraft, onRelaunchSEO, isInsightLoading,  onCompetitionAnalysis,
    isCompetitionLoading,
    onAddKeyword,
    onSaveListingInfo,
    children,
    // Strategy Switcher Props
    activeMode,
    onModeChange,
    availableModes
  }) => {
    const [displayedTitle, setDisplayedTitle] = useState("");
    const [displayedDescription, setDisplayedDescription] = useState("");
    const descriptionRef = useRef(null);

    // Local state for sorting
    const [sortConfig, setSortConfig] = useState({ key: 'score', direction: 'desc' });
    const [selectedTags, setSelectedTags] = useState([]);
  
    // --- Accordion State Management ---
    const [isCompetitionOpen, setIsCompetitionOpen] = useState(false);
  
    // Auto-open competition accordion when loading starts
    useEffect(() => {
      if (isCompetitionLoading) {
          setIsCompetitionOpen(true);
      }
    }, [isCompetitionLoading]);
  
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
  
    // Initialize selectedTags when results load
    useEffect(() => {
      if (results?.analytics) {
          // Check if explicit AI selections exist (new feature)
          const iaSelections = results.analytics
            .filter(r => r.is_selection_ia === true)
            .map(r => r.keyword);
          
          if (iaSelections.length > 0) {
             // Apply AI selection
             setSelectedTags(iaSelections);
          } else {
             // Fallback: If no AI selection (or legacy data), select all by default
             setSelectedTags(results.analytics.map(r => r.keyword));
          }
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
  
  
  
    // Allow rendering even without results (for empty state tables)
    // if (!results) return null; // REMOVED
  
    const hasDraft = !!results?.title && results?.title !== "SEO Analysis Completed";
  
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
  
              {/* Strategy Switcher */}
              {!isInsightLoading && results && availableModes && (
                 <StrategySwitcher 
                    activeMode={activeMode} 
                    onModeChange={onModeChange} 
                    availableModes={availableModes}
                 />
              )}

              {/* Hero Audit Header with integrated SEO Sniper */}
              {isInsightLoading ? (
                  <AuditSkeleton />
              ) : (results && (
                  <AuditHeader 
                      score={results.listing_strength ?? results.global_strength}
                      statusLabel={results.status_label}
                      strategicVerdict={results.strategic_verdict}
                      improvementPriority={results.improvement_priority}
                      scoreExplanation={results.score_explanation}

                      // New Props
                      scoreJustificationVisibility={results.score_justification_visibility}
                      scoreJustificationRelevance={results.score_justification_relevance}
                      scoreJustificationConversion={results.score_justification_conversion}
                      listingVisibility={results.listing_visibility}
                      listingRawVisibilityIndex={results.listing_raw_visibility_index}
                      listingConversion={results.listing_conversion}
                      listingRelevance={results.listing_relevance}
                      improvementPlanRemove={results.improvement_plan_remove}
                      improvementPlanAdd={results.improvement_plan_add}
                      primaryAction={results.improvement_plan_primary_action}
                  />
              ))}

            {/* 1. Full Width Performance Table */}
            {isInsightLoading ? (
                <TableSkeleton 
                    message={isInsightLoading === 'insight' ? "Insight generation" : "Generating SEO data"}
                    subMessage={isInsightLoading === 'insight' ? "Analyzing keywords and calculating your listing score." : "Analyzing search volume, competition, and trends."}
                />
            ) : (
                <div className={!results ? "opacity-50 grayscale pointer-events-none" : ""}>
                <Accordion
                    defaultOpen={!!results} // Collapsed if no results
                title={
                    <div className="flex items-center gap-2">
                        <TrendingUp size={16} className={`text-indigo-600 ${!results ? 'text-slate-400' : ''}`} />
                        <span className="text-sm font-bold text-slate-900">Keyword Performance</span>
                         {results && (
                            <CopyButton 
                                text={selectedTags.join(', ')} 
                                label="Copy selected keywords to clipboard." 
                                className="mx-2 text-slate-400 hover:text-indigo-600" 
                                tooltipSide="right" 
                            />
                         )}
                         {results && (
                            <span className="text-xs font-normal text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full ml-1">
                                {selectedTags.length} / {results.analytics?.length || 0} selected
                            </span>
                         )}
                    </div>
                }
                headerActions={
                    results && (
                    <div className="flex items-center gap-2">
                         
                         <button 
                            onClick={(e) => { e.stopPropagation(); onRelaunchSEO(); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100 shadow-sm"
                            title="Relaunch Analysis (Costs 1 Credit)"
                         >
                            <RefreshCw size={12} />
                            Refresh Data
                         </button>

                         <div className="flex items-center gap-3 text-xs text-slate-500 ml-2 hidden sm:flex border-l border-slate-200 pl-3">
                             <span className="flex items-center gap-1" title="Trending"><Flame size={12} className="text-orange-500"/></span>
                             <span className="flex items-center gap-1" title="Evergreen"><Leaf size={12} className="text-emerald-500"/></span>
                             <span className="flex items-center gap-1" title="Opportunity"><Star size={12} className="text-amber-400"/></span>
                         </div>
                    </div>
                    )
                }
            >
                <div className="border-t border-slate-100">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-2 w-10 text-center">
                                    <input 
                                        type="checkbox" 
                                        checked={results && results.analytics && selectedTags.length === results.analytics.length && results.analytics.length > 0}
                                        onChange={(e) => {
                                            if (e.target.checked && results && results.analytics) {
                                                setSelectedTags(results.analytics.map(r => r.keyword));
                                            } else {
                                                setSelectedTags([]);
                                            }
                                        }}
                                        disabled={!results}
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
                                    />
                                </th>
                                <th className="px-3 py-2 font-semibold text-left">Tag / Keyword</th>
                                <th 
                                    className="px-2 py-2 text-center font-semibold cursor-pointer select-none group hover:bg-slate-100 transition-colors w-[9%]"
                                    onClick={() => requestSort('score')}
                                >
                                    Score <SortIcon columnKey="score" />
                                </th>
                                <th className="px-2 py-2 text-center font-semibold w-[9%]">
                                    Conv. Intent.
                                </th>
                                <th className="px-2 py-2 text-center font-semibold w-[9%]">
                                    Relevance
                                </th>
                                <th className="px-2 py-2 text-center font-semibold w-[9%]">
                                    Placement
                                </th>
                                <th 
                                    className="px-2 py-2 text-center font-semibold cursor-pointer select-none group hover:bg-slate-100 transition-colors w-[11%]"
                                    onClick={() => requestSort('volume')}
                                >
                                    Avg. Vol <SortIcon columnKey="volume" />
                                </th>
                                <th 
                                    className="px-2 py-2 text-center font-semibold cursor-pointer select-none group hover:bg-slate-100 transition-colors w-[11%]"
                                    onClick={() => requestSort('trend')}
                                >
                                    Trend <SortIcon columnKey="trend" />
                                </th>
                                <th 
                                    className="px-2 py-2 text-center font-semibold cursor-pointer select-none group hover:bg-slate-100 transition-colors w-[11%]"
                                    onClick={() => requestSort('competition')}
                                >
                                    Competition <SortIcon columnKey="competition" />
                                </th>
                                <th className="px-2 py-2 text-center font-semibold whitespace-nowrap w-[7%]">Status</th>
                                <th className="px-2 py-2 text-center font-semibold whitespace-nowrap w-[5%]"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {!results ? (
                                <tr>
                                    <td colSpan="8" className="px-4 py-8 text-center text-slate-400 italic">
                                        No analysis results yet. Start a new listing analysis.
                                    </td>
                                </tr>
                            ) : sortedAnalytics.map((row, i) => (
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
                                    <td className="px-4 py-3 text-center">
                                        <div className="font-bold text-slate-700">{row.score}</div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {(() => {
                                            const score = row.transactional_score;
                                            if (!score) return <span className="text-slate-300">-</span>;
                                            
                                            let colorClass = "text-slate-400";
                                            let showIcon = false;
                                            
                                            if (score >= 8) {
                                                colorClass = "text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded";
                                                showIcon = true;
                                            } else if (score >= 5) {
                                                colorClass = "text-slate-600 font-medium";
                                            }
                                            
                                            return (
                                                <div className="flex items-center justify-center gap-1.5">
                                                    {showIcon && <ShoppingCart size={14} className="text-emerald-500" />}
                                                    <span className={colorClass}>{score}/10</span>
                                                </div>
                                            );
                                        })()}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {(() => {
                                            const score = row.niche_score;
                                            if (!score) return <span className="text-slate-300">-</span>;
                                            
                                            let colorClass = "text-slate-400";
                                            let showIcon = false;
                                            
                                            if (score >= 8) {
                                                colorClass = "text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded";
                                                showIcon = true;
                                            } else if (score >= 5) {
                                                colorClass = "text-slate-600 font-medium";
                                            }
                                            
                                            return (
                                                <div className="flex items-center justify-center gap-1.5">
                                                    {showIcon && <Target size={14} className="text-emerald-500" />}
                                                    <span className={colorClass}>{score}/10</span>
                                                </div>
                                            );
                                        })()}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {(() => {
                                            const label = row.intent_label;
                                            if (!label) return <span className="text-slate-300">-</span>;
                                            
                                            return (
                                                <div className="flex items-center justify-center gap-1.5 text-slate-600 text-xs font-medium bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                                    {label === "Title" ? (
                                                        <Pin size={12} className="text-indigo-500" />
                                                    ) : (
                                                        <Tag size={12} className="text-slate-400" />
                                                    )}
                                                    {label}
                                                </div>
                                            );
                                        })()}
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
                                        <div className="flex items-center justify-center gap-2">
                                            {row.is_trending && <Flame size={16} className="text-orange-500 fill-orange-500/20" />}
                                            {row.is_evergreen && <Leaf size={16} className="text-emerald-500 fill-emerald-500/20" />}
                                            {row.is_promising && <Star size={16} className="text-amber-400 fill-amber-400/20" />}
                                            {(!row.is_trending && !row.is_evergreen && !row.is_promising) && <span className="text-slate-300">-</span>}
                                        </div>
                                    </td>
                                    <td className="px-2 py-3 text-center">
                                        <button disabled className="w-6 h-6 rounded-full flex items-center justify-center transition-colors border mx-auto bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed opacity-50">
                                            <Minus size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Accordion>
            </div>
            )}

            {/* 2. Competitors Keywords Table (Read-only) */}
            <div className={!results && !isCompetitionLoading ? "opacity-50 grayscale pointer-events-none" : ""}>
                <Accordion
                    isOpen={isCompetitionOpen}
                    onToggle={setIsCompetitionOpen}
                    className="border-orange-200"
                    title={
                        <div className="flex items-center gap-2">
                            <Flame size={16} className={`text-orange-500 ${!results ? 'text-slate-400' : ''}`} />
                            <span className="text-sm font-bold text-slate-900">Competitors Keywords</span>
                            {/* Info tooltip with competitor_seed */}
                            {results && (
                            <>
                            <div className="relative group/compinfo" onClick={(e) => e.stopPropagation()}>
                                <div className="w-4 h-4 rounded-full bg-orange-100 hover:bg-orange-200 flex items-center justify-center cursor-help transition-colors border border-orange-200 hover:border-orange-300">
                                    <Info size={10} className="text-orange-500 group-hover/compinfo:text-orange-700 transition-colors" />
                                </div>
                                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-4 py-3 text-xs text-white bg-slate-800 rounded-lg shadow-xl opacity-0 invisible group-hover/compinfo:opacity-100 group-hover/compinfo:visible transition-all z-50 w-72 pointer-events-none leading-relaxed whitespace-normal">
                                    {results?.competitor_seed && competitionAnalytics.length > 0 ? (
                                        <>Based on the first ten Etsy listings returned by Google search with keywords <span className="font-bold text-orange-300">"{results.competitor_seed}"</span>.</>
                                    ) : (
                                        "Launch competition analysis to see results"
                                    )}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-[6px] border-b-slate-800 border-t-transparent border-l-transparent border-r-transparent"></div>
                                </div>
                            </div>
                            <span className="text-xs font-normal text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full ml-1">
                                {competitionAnalytics.length} keywords
                            </span>
                            </>
                            )}
                        </div>
                    }
                    headerActions={
                        results && (
                        <div className="flex items-center gap-2">
                             {onCompetitionAnalysis && (
                                 <button
                                     onClick={(e) => { e.stopPropagation(); onCompetitionAnalysis(); }}
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
                             <div className="flex items-center gap-4 text-xs text-slate-500 hidden sm:flex border-l border-slate-200 pl-3">
                                  <span className="flex items-center gap-1"><Flame size={12} className="text-orange-500"/> Trending</span>
                                  <span className="flex items-center gap-1"><Leaf size={12} className="text-emerald-500"/> Evergreen</span>
                             </div>
                        </div>
                        )
                    }
                >
                    <div className="border-t border-orange-100 relative min-h-[300px]">
                        {isCompetitionLoading ? (
                            <div className="flex items-center justify-center p-12 h-[300px]">
                                <LoadingSpinner 
                                    message="Analysing Competitors..." 
                                    subMessage="Identifiying best keywords from top performing listings." 
                                />
                            </div>
                        ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-orange-50/30 text-slate-500 font-medium border-b border-orange-100">
                                <tr>
                                    <th className="px-4 py-2 font-semibold text-left">Tag / Keyword</th>
                                    <th className="px-2 py-2 text-center font-semibold w-[14%]">Avg. Vol</th>
                                    <th className="px-2 py-2 text-center font-semibold w-[14%]">Trend</th>
                                    <th className="px-2 py-2 text-center font-semibold w-[14%]">Competition</th>
                                    <th className="px-2 py-2 text-center font-semibold w-[10%]">Score</th>
                                    <th className="px-2 py-2 text-center font-semibold whitespace-nowrap w-[8%]">Status</th>
                                    <th className="px-2 py-2 text-center font-semibold whitespace-nowrap w-[6%]"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-orange-50">
                                {!results ? (
                                    <tr>
                                        <td colSpan="7" className="px-4 py-8 text-center text-slate-400 italic">
                                            No competitor analysis yet.
                                        </td>
                                    </tr>
                                ) : competitionAnalytics.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="px-4 py-8 text-center text-slate-400 italic">
                                            No competitor keywords found in this analysis.
                                        </td>
                                    </tr>
                                ) : competitionAnalytics.map((row, i) => (
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
                                        <td className="px-2 py-3 text-center">
                                            {(() => {
                                                // Check if keyword exists in analytics AND is NOT a competitor keyword (i.e. it's in the main list)
                                                // We check for !a.is_competition because we want to know if it's already in the "My Performance" list
                                                const isAlreadyAdded = results?.analytics?.some(a => 
                                                    a.keyword.toLowerCase() === row.keyword.toLowerCase() && !a.is_competition
                                                );
                                                return (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (!isAlreadyAdded && onAddKeyword) {
                                                                onAddKeyword(row);
                                                            }
                                                        }}
                                                        disabled={isAlreadyAdded}
                                                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors border mx-auto ${
                                                            isAlreadyAdded 
                                                                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-default' 
                                                                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border-indigo-200'
                                                        }`}
                                                        title={isAlreadyAdded ? "Already in Performance Analysis" : "Add to Performance Analysis"}
                                                    >
                                                        {isAlreadyAdded ? <Check size={14} /> : <Plus size={14} />}
                                                    </button>
                                                );
                                            })()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        )}
                    </div>
                </Accordion>
                </div>
        {/* Injected Content (e.g. Recent History) */}
        {children}
        </div>

        {/* --- SIDEBAR: DRAFTING (33% width) --- */}
        <div className="w-full lg:w-1/3 lg:flex-shrink-0 sticky top-8 space-y-4">
             <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 min-h-[400px] flex flex-col transition-all duration-500">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <Info size={16} className="text-indigo-600" />
                            Listing Info
                        </h3>
                         <div className="flex items-center gap-2">
                             {/* Optimize Button - Moved to Header */}
                             <button 
                                onClick={handleMagicDraft}
                                disabled={selectedTags.length === 0}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all shadow-sm border
                                    ${selectedTags.length === 0 
                                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' 
                                        : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 hover:shadow-indigo-200'}`}
                             >
                                <Sparkles size={14} /> Optimize with AI
                             </button>
                         </div>
                    </div>

                    {isGeneratingDraft ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center py-8 space-y-6 animate-in fade-in">
                            <div className="relative">
                                <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Sparkles size={20} className="text-indigo-600 animate-pulse" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-slate-900 font-medium">Refining your listing...</h4>
                                <p className="text-slate-400 text-xs">Optimizing title & description with AI</p>
                            </div>
                        </div>
                    ) : (
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
                                    placeholder="Product title will appear here..."
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
                                    placeholder="Product description will appear here..."
                                    className="w-full px-3 py-2 text-sm text-slate-700 bg-slate-50/50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none transition-all custom-scrollbar flex-grow overflow-hidden min-h-[300px]"
                                />
                            </div>

                                {/* Save Info & Export Buttons */}
                                <div className="flex flex-col gap-2 pt-2">
                                {results ? (
                                <button
                                    onClick={() => onSaveListingInfo(displayedTitle, displayedDescription)}
                                    className="w-full py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-lg border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 transition-all flex items-center justify-center gap-2 shadow-sm"
                                >
                                    <Save size={16} />
                                    <span className="font-bold">Save Info</span>
                                </button>
                                ) : (
                                    <button disabled className="w-full py-2.5 bg-slate-100 text-slate-400 text-sm font-medium rounded-lg border border-slate-200 cursor-not-allowed flex items-center justify-center gap-2">
                                        <Save size={16} />
                                        <span className="font-bold">Save Info</span>
                                    </button>
                                )}

                                {results && (
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
                                                    tags: (results.analytics || [])
                                                        .filter(k => selectedTags.includes(k.keyword))
                                                        .map(k => {
                                                            // Calculate Trend %
                                                            let trend = 0;
                                                            const first = k.volume_history?.[0] || 1;
                                                            const last = k.volume_history?.[k.volume_history.length - 1] || 0;
                                                            trend = Math.round(((last - first) / first) * 100);
                                                            
                                                            return {
                                                                keyword: k.keyword,
                                                                volume: k.volume,
                                                                competition: k.competition, 
                                                                score: k.score,
                                                                trend: trend,
                                                                is_trending: k.is_trending,
                                                                is_evergreen: k.is_evergreen,
                                                                is_promising: k.is_promising
                                                            };
                                                        })
                                                }} 
                                                fileName={`${displayedTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_analysis.pdf`}
                                            />
                                        }
                                        className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold rounded-lg border border-transparent transition-all flex items-center justify-center gap-2 shadow-sm"
                                    >
                                        {({ blob, url, loading, error }) =>
                                            loading ? (
                                                <>
                                                    <Loader2 size={16} className="animate-spin" />
                                                    <span>Preparing PDF...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Download size={16} />
                                                    <span>Export PDF Report</span>
                                                </>
                                            )
                                        }
                                    </PDFDownloadLink>
                                    )}
                                </div>
                        </div>
                    )}
             </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsDisplay;
