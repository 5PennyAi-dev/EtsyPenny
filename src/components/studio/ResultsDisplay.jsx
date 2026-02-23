import { 
  Copy, Check, Flame, TrendingUp, Leaf, Star, Sparkles, Pencil, RefreshCw, UploadCloud, 
  ArrowUpDown, ArrowUp, ArrowDown, FileDown, Lightbulb, AlertTriangle, Target, Loader2, 
  Info, Plus, Minus, Save, Download, ArrowUpRight, ArrowDownRight, ShoppingCart, 
  Pin, Tag, User, Zap, Swords, DollarSign
} from 'lucide-react';
import { useState, useEffect, useRef, useLayoutEffect, useMemo, useCallback, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PDFDownloadLink } from '@react-pdf/renderer';
import ListingPDFDocument from '../pdf/ListingPDFDocument';
import Accordion from '../ui/Accordion';

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
    listingVisibility,
    listingConversion,
    listingRelevance,
    listingCompetition,
    listingProfit
  }) => {
    const getMetricsColor = (val) => {
      const num = Number(val) || 0;
      if (num >= 80) return { text: 'text-emerald-600', bg: 'bg-emerald-500', stroke: 'stroke-emerald-500', fill: 'fill-emerald-500' };
      if (num >= 50) return { text: 'text-amber-600', bg: 'bg-amber-500', stroke: 'stroke-amber-500', fill: 'fill-amber-500' };
      return { text: 'text-rose-600', bg: 'bg-rose-500', stroke: 'stroke-rose-500', fill: 'fill-rose-500' };
    };

    const mainTier = getMetricsColor(score);
    const visTier = getMetricsColor(listingVisibility);
    const relTier = getMetricsColor(listingRelevance);
    const convTier = getMetricsColor(listingConversion);
    const compTier = getMetricsColor(listingCompetition);
    
    // Profit score is 0-100. Let's map it to 0-5 stars/dollars for the visual
    const profitScore = Number(listingProfit) || 0;
    const profitTier = getMetricsColor(profitScore);
    const filledDollars = Math.round((profitScore / 100) * 5); // 0 to 5

    const MiniGauge = ({ value, tier }) => (
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1.5">
        <div 
          className={`h-full rounded-full ${tier.bg} transition-all duration-1000 ease-out`} 
          style={{ width: `${Math.min(100, Math.max(0, Number(value) || 0))}%` }} 
        />
      </div>
    );

    const RadialGauge = ({ value, tier }) => {
      const radius = 36;
      const circumference = 2 * Math.PI * radius;
      const strokeDashoffset = circumference - (Number(value) / 100) * circumference;
      
      return (
        <div className="relative flex items-center justify-center">
          {/* Background Circle */}
          <svg className="transform -rotate-90 w-24 h-24">
            <circle
              className="text-slate-100"
              strokeWidth="8"
              stroke="currentColor"
              fill="transparent"
              r={radius}
              cx="48"
              cy="48"
            />
            {/* Foreground Circle */}
            <circle
              className={`${tier.text} drop-shadow-sm transition-all duration-1000 ease-out`}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
              r={radius}
              cx="48"
              cy="48"
            />
          </svg>
          {/* Inside Text */}
          <div className="absolute flex flex-col items-center justify-center">
            <span className={`text-3xl font-black tracking-tighter ${tier.text}`}>
              {value || 0}
            </span>
          </div>
        </div>
      );
    };

    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-100 mb-8">
        
        {/* SECTION A: The Verdict (Listing Strength) */}
        <div className="md:w-1/3 p-6 md:p-8 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-row items-center justify-between xl:justify-center xl:gap-8">
            <div className="flex flex-col gap-1">
                 <span className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                   <Sparkles size={16} className="text-indigo-500" /> Verdict
                 </span>
                 <h3 className="text-xl font-black text-slate-800 leading-tight">
                    Listing<br/>Strength
                 </h3>
            </div>
            <RadialGauge value={score} tier={mainTier} />
        </div>

        {/* SECTION B: Technical Analysis (Proof Grid) */}
        <div className="md:w-5/12 p-6 md:px-8 hover:bg-slate-50/30 transition-colors flex flex-col justify-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Technical Analysis</span>
            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                {/* Visibility */}
                <div>
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                           <TrendingUp size={14} className="text-slate-400" /> Visibility
                        </span>
                        <span className={`text-sm font-bold ${visTier.text}`}>{listingVisibility || 0}</span>
                    </div>
                    <MiniGauge value={listingVisibility} tier={visTier} />
                </div>
                {/* Relevance */}
                <div>
                    <div className="flex items-center justify-between mb-1">
                         <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                           <Target size={14} className="text-slate-400" /> Relevance
                         </span>
                         <span className={`text-sm font-bold ${relTier.text}`}>{listingRelevance || 0}</span>
                    </div>
                    <MiniGauge value={listingRelevance} tier={relTier} />
                </div>
                {/* Conversion */}
                <div>
                    <div className="flex items-center justify-between mb-1">
                         <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                           <ShoppingCart size={14} className="text-slate-400" /> Conversion
                         </span>
                         <span className={`text-sm font-bold ${convTier.text}`}>{listingConversion || 0}</span>
                    </div>
                    <MiniGauge value={listingConversion} tier={convTier} />
                </div>
                {/* Competition */}
                <div>
                    <div className="flex items-center justify-between mb-1">
                         <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                           <Swords size={14} className="text-slate-400" /> Competition
                         </span>
                         <span className={`text-sm font-bold ${compTier.text}`}>{listingCompetition || 0}</span>
                    </div>
                    <MiniGauge value={listingCompetition} tier={compTier} />
                </div>
            </div>
        </div>

        {/* SECTION C: Business Potential (Profitability) */}
        <div className="md:w-1/4 p-6 md:p-8 hover:bg-slate-50/30 transition-colors flex flex-col items-center justify-center border-l border-slate-100">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Est. Value</span>
            
            <div className="flex items-center justify-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((index) => (
                   <DollarSign 
                      key={index} 
                      size={24} 
                      className={`transition-colors duration-500 ${index <= filledDollars ? profitTier.text : 'text-slate-200'}`} 
                      strokeWidth={index <= filledDollars ? 3 : 2}
                   />
                ))}
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
                 <span className={`text-3xl font-black ${profitTier.text}`}>{profitScore}</span>
                 <span className="text-sm font-medium text-slate-400">/100</span>
            </div>
        </div>

      </div>
    );
  };
  
  const ResultsDisplay = ({ results, isGeneratingDraft, onGenerateDraft, onRelaunchSEO, isInsightLoading,  onCompetitionAnalysis,
    isCompetitionLoading,
    onAddKeyword,
    onAddCustomKeyword,
    isAddingKeyword,
    onSaveListingInfo,
    onRecalculateScores,
    isRecalculating,
    resetSelectionKey,
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
  
    // --- Table State Management ---
    const [isTableExpanded, setIsTableExpanded] = useState(false);
  
    // --- Inline Add Keyword State Management ---
    const [isAddingRow, setIsAddingRow] = useState(false);
    const [newKeywordInput, setNewKeywordInput] = useState('');
    const addInputRef = useRef(null);

    // Focus input when adding row is toggled
    useEffect(() => {
        if (isAddingRow && addInputRef.current) {
            addInputRef.current.focus();
        }
    }, [isAddingRow]);

    const handleAddSubmission = () => {
        const trimmed = newKeywordInput.trim();
        if (!trimmed) {
            setIsAddingRow(false);
            setNewKeywordInput('');
            return;
        }
        
        if (onAddCustomKeyword) {
             onAddCustomKeyword(trimmed, () => {
                 // Success callback: close the row and reset
                 setIsAddingRow(false);
                 setNewKeywordInput('');
             });
        }
    };

    const handleAddKeyDown = (e) => {
        if (e.key === 'Enter' && !isAddingKeyword) {
            e.preventDefault();
            handleAddSubmission();
        } else if (e.key === 'Escape') {
            setIsAddingRow(false);
            setNewKeywordInput('');
        }
    };

    const handleAddBlur = () => {
        // Only trigger submit/close on blur if we are not actively adding the keyword
        if (!isAddingKeyword) {
            if (newKeywordInput.trim() !== '') {
                 handleAddSubmission();
            } else {
                 setIsAddingRow(false);
            }
        }
    };
  
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
  
    // Initialize selectedTags only when explicitly instructed by ProductStudio
    // (e.g., initial load, mode switch, or fresh insights generated)
    useEffect(() => {
      if (results?.analytics) {
          // Check if explicit AI selections exist (new feature)
          const currentEvalSelections = results.analytics
            .filter(r => r.is_current_eval === true)
            .map(r => r.keyword);
          
          if (currentEvalSelections.length > 0) {
             // Apply AI selection
             setSelectedTags(currentEvalSelections);
          } else {
             // Fallback: If no AI selection (or legacy data), select all by default
             setSelectedTags(results.analytics.map(r => r.keyword));
          }
      }
    }, [resetSelectionKey]);
  
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

      // Primary Sort: selected items always on top
      sortableItems.sort((a, b) => {
          const aSelected = selectedTags.includes(a.keyword);
          const bSelected = selectedTags.includes(b.keyword);

          if (aSelected && !bSelected) return -1;
          if (!aSelected && bSelected) return 1;

          // Secondary Sort: user-defined column sort
          if (sortConfig.key !== null) {
              let aValue, bValue;
              
              switch (sortConfig.key) {
                  case 'volume':
                      aValue = a.volume;
                      bValue = b.volume;
                      break;
                  case 'trend':
                      const aData = a.volume_history || [];
                      const aFirst = aData[0] || 1;
                      const aLast = aData[aData.length - 1] || 0;
                      aValue = ((aLast - aFirst) / aFirst) * 100;
                      
                      const bData = b.volume_history || [];
                      const bFirst = bData[0] || 1;
                      const bLast = bData[bData.length - 1] || 0;
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
                  case 'cpc':
                      aValue = parseFloat(a.cpc) || 0;
                      bValue = parseFloat(b.cpc) || 0;
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
          }
          return 0;
      });
      
      return sortableItems;
    }, [results?.analytics, sortConfig, selectedTags]);
  
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
  
              {/* Strategy Switcher Removed per User Request */}
              {/* Hero Audit Header with integrated SEO Sniper */}
              {isInsightLoading ? (
                  <AuditSkeleton />
              ) : results ? (
                  <AuditHeader 
                      score={results.listing_strength ?? results.global_strength}
                      statusLabel={results.status_label}
                      strategicVerdict={results.strategic_verdict}
                      improvementPriority={results.improvement_priority}
                      listingVisibility={results.listing_visibility}
                      listingRawVisibilityIndex={results.listing_raw_visibility_index}
                      listingConversion={results.listing_conversion}
                      listingRelevance={results.listing_relevance}
                      listingCompetition={results.listing_competition}
                      listingProfit={results.listing_profit}
                      improvementPlanRemove={results.improvement_plan_remove}
                      improvementPlanAdd={results.improvement_plan_add}
                      primaryAction={results.improvement_plan_primary_action}
                  />
              ) : null}

            {/* 1. Full Width Performance Table */}
            {isInsightLoading ? (
                <TableSkeleton 
                    message={isInsightLoading === 'insight' ? "Insight generation" : "Generating SEO data"}
                    subMessage={isInsightLoading === 'insight' ? "Analyzing keywords and calculating your listing score." : "Analyzing search volume, competition, and trends."}
                />
             ) : (
                <div className={!results ? "opacity-50 grayscale pointer-events-none" : ""}>
                    <Accordion type="single" collapsible defaultValue="keyword-performance">
                        <AccordionItem value="keyword-performance" className="border-none">
                            {/* Accordion Header / Trigger Area */}
                            <div className="flex items-center justify-between py-4">
                                <AccordionTrigger className="hover:no-underline py-0 flex-1 justify-start gap-4">
                                    <div className="flex items-center gap-2 text-left">
                                        <TrendingUp size={16} className={`text-indigo-600 ${!results ? 'text-slate-400' : ''}`} />
                                        <span className="text-sm font-bold text-slate-900">Keyword Performance</span>
                                         {results && (
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <CopyButton 
                                                    text={selectedTags.join(', ')} 
                                                    label="Copy selected keywords to clipboard." 
                                                    className="mx-2 text-slate-400 hover:text-indigo-600" 
                                                    tooltipSide="right" 
                                                />
                                            </div>
                                         )}
                                         {results && (
                                            <span className="text-xs font-normal text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full ml-1">
                                                {selectedTags.length} / {results.analytics?.length || 0} selected
                                            </span>
                                         )}
                                    </div>
                                </AccordionTrigger>

                                {/* Header Actions (Outside of Trigger so they are clickable) */}
                                {results && (
                                    <div className="flex items-center gap-2 pr-4">
                                         <button 
                                            onClick={(e) => { 
                                                e.stopPropagation();
                                                const selectedKeywordsData = primaryAnalytics.filter(k => selectedTags.includes(k.keyword));
                                                onRecalculateScores?.(selectedKeywordsData); 
                                            }}
                                            disabled={isRecalculating}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 rounded-lg transition-colors border border-indigo-100 shadow-sm"
                                            title="Recalculate Global Scores"
                                         >
                                            {isRecalculating ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                                            Recalculate Scores
                                         </button>

                                         <div className="flex items-center gap-3 text-xs text-slate-500 ml-2 hidden sm:flex border-l border-slate-200 pl-3">
                                             <span className="flex items-center gap-1" title="Trending"><Flame size={12} className="text-orange-500"/></span>
                                             <span className="flex items-center gap-1" title="Evergreen"><Leaf size={12} className="text-emerald-500"/></span>
                                             <span className="flex items-center gap-1" title="Opportunity"><Star size={12} className="text-amber-400"/></span>
                                         </div>
                                    </div>
                                )}
                            </div>

                            <AccordionContent>
                                <div className="border-t border-slate-100 pb-4">
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
                                <th className="px-2 py-2 text-center font-semibold w-[10%]">
                                    Conv. Intent.
                                </th>
                                <th className="px-2 py-2 text-center font-semibold w-[9%]">
                                    Relevance
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
                                <th 
                                    className="px-2 py-2 text-center font-semibold cursor-pointer select-none group hover:bg-slate-100 transition-colors w-[9%]"
                                    onClick={() => requestSort('cpc')}
                                >
                                    CPC <SortIcon columnKey="cpc" />
                                </th>
                                <th className="px-2 py-2 text-center font-semibold whitespace-nowrap w-[7%]">Status</th>
                                <th className="px-2 py-2 text-center font-semibold whitespace-nowrap w-[5%]"></th>
                            </tr>
                        </thead>
                        <motion.tbody layout className="divide-y divide-slate-100">
                            {!results ? (
                                <AnimatePresence initial={false}>
                                    <motion.tr layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                        <td colSpan="8" className="px-4 py-8 text-center text-slate-400 italic">
                                            No analysis results yet. Start a new listing analysis.
                                        </td>
                                    </motion.tr>
                                </AnimatePresence>
                            ) : (
                                <AnimatePresence initial={false}>
                                    {(isTableExpanded ? sortedAnalytics : sortedAnalytics.slice(0, Math.max(13, selectedTags.length))).map((row, i, arr) => {
                                        const isSelected = selectedTags.includes(row.keyword);
                                        // Detect if this is the first unselected row (the divider injection point)
                                        const isFirstUnselected = !isSelected && (i === 0 || selectedTags.includes(arr[i - 1].keyword));
                
                                        return (
                                            <Fragment key={`fragment-${row.keyword}`}>
                                                {isFirstUnselected && (
                                                    <motion.tr layout key="suggestions-divider" className="bg-slate-50/50 border-y border-slate-200 pointer-events-none mt-1">
                                                        <td colSpan="8" className="px-4 py-2">
                                                            <div className="flex items-center gap-2">
                                                                <Lightbulb size={12} className="text-slate-400" />
                                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Suggestions & Discovery</span>
                                                            </div>
                                                        </td>
                                                    </motion.tr>
                                                )}
                                                <motion.tr 
                                                    layout
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0 }}
                                                    transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                                                    key={row.keyword} 
                                                    className={`hover:bg-slate-50 transition-colors group ${isSelected ? 'bg-indigo-50/40 relative z-10' : 'opacity-80'}`}
                                                >
                                                    <td className="px-4 py-3 text-center">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={isSelected}
                                                            onChange={() => toggleTag(row.keyword)}
                                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-transform hover:scale-110 cursor-pointer"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-3 font-medium relative">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${isSelected ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-600 border-slate-100'}`}>
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
                                                                <Target size={14} className="text-indigo-500 shrink-0 cursor-help" title="Competitor Keyword" />
                                                            )}
                                                            {row.is_user_added && (
                                                                <User size={14} className="text-slate-400 shrink-0 cursor-help" title="Manually Added Keyword" />
                                                            )}
                                                            {row.is_selection_ia && (
                                                                <Sparkles size={14} className="text-indigo-400 shrink-0 cursor-help" title="AI Selected" />
                                                            )}
                                                            {!row.is_sniper_seo && !row.is_user_added && !row.is_selection_ia && (
                                                                <Tag size={12} className="text-slate-300 shrink-0 hidden group-hover:block" />
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {/* Relevance / Niche Score Column */}
                                                        {(() => {
                                                            const score = Number(row.niche_score);
                                                            if (!isNaN(score)) {
                                                                let colorClass = 'text-slate-300'; // Default: Light Grey (1-4)
                                                                let Icon = null;
                                                                let iconColorClass = '';
                                                                
                                                                if (score >= 8) {
                                                                    colorClass = 'text-emerald-700 font-bold'; // Green (8-10)
                                                                    Icon = Target;
                                                                    iconColorClass = 'text-emerald-500';
                                                                } else if (score >= 5) {
                                                                    colorClass = 'text-slate-600 font-medium'; // Dark Grey (5-7)
                                                                }
                
                                                                return (
                                                                    <div className={`flex items-center justify-center gap-1.5 ${colorClass}`}>
                                                                        {Icon && <Icon size={14} className={iconColorClass} />}
                                                                        {score}
                                                                    </div>
                                                                );
                                                            }
                                                            return <span className="text-slate-300">-</span>;
                                                        })()}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <div className={`font-bold ${isSelected ? 'text-indigo-900' : 'text-slate-600'}`}>{row.score}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center text-slate-600 font-mono text-xs">
                                                        {(row.volume || 0).toLocaleString()}
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
                                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide border ${colorClass} ${!isSelected ? 'opacity-80' : ''}`}>
                                                                    {displayVal}
                                                                </span>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {(() => {
                                                            const numVal = parseFloat(row.cpc);
                                                            if (isNaN(numVal) || numVal === 0 || row.cpc === null || row.cpc === undefined) {
                                                                return <span className="text-slate-400 opacity-50 font-medium text-xs">N/A</span>;
                                                            }
                                                            
                                                            let colorClass = 'bg-slate-50 text-slate-500 border-slate-100';
                                                            if (numVal >= 1.5) {
                                                                colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                                                            } else if (numVal >= 0.6) {
                                                                colorClass = 'bg-amber-50 text-amber-700 border-amber-100';
                                                            }
                                                            
                                                            return (
                                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide border ${colorClass} ${!isSelected ? 'opacity-80' : ''}`}>
                                                                    ${numVal.toFixed(2)}
                                                                </span>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            {row.is_trending && <Flame size={16} className={`text-orange-500 fill-orange-500/20 ${!isSelected ? 'opacity-70' : ''}`} />}
                                                            {row.is_evergreen && <Leaf size={16} className={`text-emerald-500 fill-emerald-500/20 ${!isSelected ? 'opacity-70' : ''}`} />}
                                                            {row.is_promising && <Star size={16} className={`text-amber-400 fill-amber-400/20 ${!isSelected ? 'opacity-70' : ''}`} />}
                                                            {(!row.is_trending && !row.is_evergreen && !row.is_promising) && <span className="text-slate-300">-</span>}
                                                        </div>
                                                    </td>
                                                    <td className="px-2 py-3 text-center">
                                                         {/* Show X only if not a competitor keyword */}
                                                         {!row.is_competition && (
                                                             <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    // We use onAddKeyword here for REMOVAL if available
                                                                    // It requires tracking this keyword as well - ideally we should pass a remove func
                                                                    // For now, setting it to disabled until a remove handler is implemented
                                                                }}
                                                                disabled
                                                                className="w-6 h-6 rounded-full flex items-center justify-center transition-colors border mx-auto bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed opacity-50 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200"
                                                                title="Delete keyword (Coming soon)"
                                                             >
                                                                 <Minus size={14} />
                                                             </button>
                                                         )}
                                                    </td>
                                                </motion.tr>
                                            </Fragment>
                                        );
                                    })}
                                </AnimatePresence>
                            )}
                            {/* --- INLINE ADD ROW --- */}
                            {isAddingRow && (
                                <motion.tr layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-indigo-50/30 border-t-2 border-indigo-100">
                                    <td className="px-4 py-3 text-center">
                                        <input 
                                            type="checkbox" 
                                            disabled
                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 opacity-50"
                                        />
                                    </td>
                                    <td className="px-3 py-3" colSpan="9">
                                        <input
                                            ref={addInputRef}
                                            type="text"
                                            value={newKeywordInput}
                                            onChange={(e) => setNewKeywordInput(e.target.value)}
                                            onKeyDown={handleAddKeyDown}
                                            onBlur={handleAddBlur}
                                            disabled={isAddingKeyword}
                                            placeholder="Type a custom keyword and press Enter..."
                                            className="w-full px-3 py-1.5 text-sm text-slate-700 bg-white border border-indigo-200 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 disabled:opacity-50"
                                        />
                                    </td>
                                    <td className="px-2 py-3 text-center">
                                        {isAddingKeyword ? (
                                            <Loader2 size={16} className="mx-auto text-indigo-500 animate-spin" />
                                        ) : (
                                            <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap hidden sm:inline-block">Return ↵</span>
                                        )}
                                    </td>
                                </motion.tr>
                            )}
                                </motion.tbody>
                            </table>
                        </div>
                    {/* --- EXPAND / COLLAPSE BUTTON --- */}
                    {results && sortedAnalytics.length > Math.max(13, selectedTags.length) && (
                        <div className="bg-slate-50/50 border-t border-slate-100 p-2 flex justify-center">
                            <button
                                onClick={() => setIsTableExpanded(!isTableExpanded)}
                                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-indigo-50"
                            >
                                {isTableExpanded ? (
                                    <><ArrowDownRight size={14} className="rotate-180" /> Show Less</>
                                ) : (
                                    <><ArrowDownRight size={14} /> Show All Results ({sortedAnalytics.length})</>
                                )}
                            </button>
                        </div>
                    )}

                    {/* --- ADD CUSTOM KEYWORD BUTTON --- */}
                    {results && (
                        <div className="bg-slate-50/50 border-t border-slate-100 p-3 flex justify-center rounded-b-xl">
                            <button
                                onClick={() => {
                                    setIsAddingRow(true);
                                    setNewKeywordInput('');
                                }}
                                disabled={isAddingRow || isAddingKeyword}
                                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 hover:border-indigo-200 hover:text-indigo-600 rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Plus size={14} className={isAddingRow ? 'text-slate-400' : 'text-indigo-500'} />
                                Add Custom Keyword
                            </button>
                        </div>
                    )}
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div> 
            )}

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
