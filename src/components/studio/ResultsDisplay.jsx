import { Copy, Check, Flame, TrendingUp, Leaf, Star, Sparkles, Pencil, RefreshCw, UploadCloud } from 'lucide-react';
import { useState, useEffect, useRef, useLayoutEffect } from 'react';

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

const CopyButton = ({ text, label = "Copy" }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`group flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200
        ${copied 
          ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
          : 'bg-white text-slate-500 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 shadow-sm'
        }`}
    >
      {copied ? <Check size={14} /> : <Copy size={14} className="group-hover:scale-110 transition-transform" />}
      {copied ? 'Copied' : label}
    </button>
  );
};

const ResultsDisplay = ({ results, isGeneratingDraft, onGenerateDraft }) => {
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

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
      
      {/* Main + Sidebar Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* --- MAIN CONTENT (Left - 8 Cols ~66%) --- */}
        <div className="lg:col-span-8 space-y-8">
            
            {/* 1. Design & Product Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-6 items-start">
                {/* Thumbnail */}
                 <div className="w-full sm:w-48 aspect-square rounded-xl overflow-hidden border border-slate-100 bg-slate-50 relative shrink-0 group">
                    {results.imageUrl ? (
                         <>
                            <img 
                                src={results.imageUrl} 
                                alt="Analyzed Product" 
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                         </>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <UploadCloud size={32} />
                        </div>
                    )}
                </div>
                
                {/* Details */}
                <div className="flex-grow space-y-4">
                     <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Analysis Context</h3>
                        <h2 className="text-xl font-bold text-slate-900 leading-snug">
                            {results.title || "New Product Analysis"}
                        </h2>
                     </div>
                     <div className="flex flex-wrap gap-2">
                        {results.tags.map((tag, i) => (
                        <span key={i} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-md border border-indigo-100/50 hover:bg-indigo-100 transition-colors cursor-default">
                            #{tag}
                        </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* 2. Full Width Performance Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <TrendingUp size={16} className="text-indigo-600" />
                        Keyword Performance
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
                                <th className="px-3 py-2 font-semibold w-1/4">Keyword</th>
                                <th className="px-2 py-2 text-center font-semibold">Avg. Vol</th>
                                <th className="px-2 py-2 text-center font-semibold">Trend</th>
                                <th className="px-2 py-2 text-center font-semibold">Competition</th>
                                <th className="px-2 py-2 text-center font-semibold">Score</th>
                                <th className="px-2 py-2 text-center font-semibold">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {results.analytics.map((row, i) => (
                                <tr key={i} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-3 font-medium text-slate-700 relative">
                                        {row.keyword}
                                        {row.is_promising && <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-amber-400/20 rounded-r opacity-0 group-hover:opacity-100 transition-opacity" />}
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
                        {hasDraft && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase rounded-full animate-in fade-in zoom-in">Draft Ready</span>}
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
                                onClick={onGenerateDraft}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
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
                                <label className="text-xs font-bold text-slate-500 uppercase flex justify-between">
                                    Title 
                                    <span className={`${displayedTitle.length > 140 ? 'text-rose-500' : 'text-slate-400'}`}>{displayedTitle.length}/140</span>
                                </label>
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
                                <label className="text-xs font-bold text-slate-500 uppercase">Description</label>
                                <textarea 
                                    ref={descriptionRef}
                                    value={displayedDescription}
                                    onChange={(e) => setDisplayedDescription(e.target.value)}
                                    className="w-full px-3 py-2 text-sm text-slate-700 bg-slate-50/50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none transition-all custom-scrollbar flex-grow overflow-hidden min-h-[300px]"
                                />
                            </div>

                            {/* Actions */}
                            <div className="pt-2 flex flex-col gap-2 mt-auto">
                                <button className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-sm font-medium rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2">
                                    <UploadCloud size={16} /> Sync to Etsy
                                </button>
                                <div className="grid grid-cols-2 gap-2">
                                     <CopyButton text={displayedTitle} label="Copy Title" />
                                     <CopyButton text={displayedDescription} label="Copy Desc" />
                                </div>
                            </div>
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
