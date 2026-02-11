import { Copy, Check, Flame, TrendingUp, Leaf, Star, Sparkles, Pencil, RefreshCw, UploadCloud, ArrowUpDown, ArrowUp, ArrowDown, FileDown } from 'lucide-react';
import { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
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

const ResultsDisplay = ({ results, isGeneratingDraft, onGenerateDraft, onRelaunchSEO }) => {
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

  if (!results) return null;

  const hasDraft = !!results.title && results.title !== "SEO Analysis Completed";
  
  // Tag Selection State
  const [selectedTags, setSelectedTags] = useState([]);

  // Initialize selectedTags when results load
  useEffect(() => {
    if (results?.analytics) {
        setSelectedTags(results.analytics.map(r => r.keyword));
    }
  }, [results]);

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

  // Sorting Logic
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'desc' }); // Default sorted by volume DESC if we set key: 'volume' initially, but let's keep it null
  
  const sortedAnalytics = useMemo(() => {
    if (!results?.analytics) return [];
    
    let sortableItems = [...results.analytics];
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
                // Helper to score competition: Low=1, Medium=2, High=3 (Actually Low is better usually, but request says Low < Medium < High for sorting value)
                // Let's interpret the request: "Low < Medium < High".
                // If ASC: Low -> Medium -> High. This means Low has lower value.
                const getCompScore = (val) => {
                    const numVal = parseFloat(val);
                    if (!isNaN(numVal)) return numVal; // If number 0-1, use it directly (0.1 < 0.5 < 0.9)
                    if (val === 'Low') return 0.2;
                    if (val === 'Medium') return 0.5;
                    if (val === 'High') return 0.8;
                    return 0.5; // Default medium
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

  const requestSort = (key) => {
    let direction = 'desc'; // Default to descending for numbers usually
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
      
      {/* Main + Sidebar Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* --- MAIN CONTENT (Left - 8 Cols ~66%) --- */}
        <div className="lg:col-span-8 space-y-8">
            
            {/* 1. Full Width Performance Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
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
                    <div className="flex gap-4 text-xs text-slate-500 hidden sm:flex">
                         <span className="flex items-center gap-1"><Flame size={12} className="text-orange-500"/> Trending</span>
                         <span className="flex items-center gap-1"><Leaf size={12} className="text-emerald-500"/> Evergreen</span>
                         <span className="flex items-center gap-1"><Star size={12} className="text-amber-400"/> Opportunity</span>
                    </div>
                </div>
                <div className="overflow-x-auto">
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
                                            {row.is_promising && <Star size={12} className="text-amber-400 fill-amber-400" />}
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
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border
                                            ${row.competition === 'Low' || (parseFloat(row.competition) < 0.3) ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                                            row.competition === 'Medium' || (parseFloat(row.competition) < 0.7) ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                            'bg-rose-50 text-rose-700 border-rose-100'}`}>
                                            {typeof row.competition === 'string' && isNaN(parseFloat(row.competition)) ? 
                                                row.competition.substring(0,3) : 
                                                (parseFloat(row.competition) < 0.3 ? 'Low' : parseFloat(row.competition) < 0.7 ? 'Med' : 'High')
                                            }
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="font-bold text-slate-700">{row.score}</div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            {row.is_trending && <Flame size={16} className="text-orange-500 fill-orange-500/20" />}
                                            {row.is_evergreen && <Leaf size={16} className="text-emerald-500 fill-emerald-500/20" />}
                                            {(!row.is_trending && !row.is_evergreen && !row.is_promising) && <span className="text-slate-300">-</span>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        {/* --- SIDEBAR: DRAFTING (Right - 4 Cols ~33%) --- */}
        <div className="lg:col-span-4 sticky top-8 space-y-4">
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
                                    key={`pdf-${displayedTitle}-${selectedTags.length}-version4`}
                                    document={
                                        <ListingPDFDocument 
                                            listing={{
                                                title: displayedTitle,
                                                description: displayedDescription,
                                                imageUrl: results.imageUrl,
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
                                                            is_trending: k.is_trending,
                                                            is_evergreen: k.is_evergreen,
                                                            is_promising: k.is_promising
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
