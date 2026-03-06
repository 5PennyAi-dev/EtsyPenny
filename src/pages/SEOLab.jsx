import { useState, useEffect, useRef, useMemo } from 'react';
import { FlaskConical, Star, Search, RefreshCw, Trash2, Pencil, TrendingUp, ArrowUpRight, ArrowDownRight, Loader2, Gem, Settings2, X, ChevronUp, ChevronDown, ChevronsUpDown, ChevronRight, ChevronLeft, Folder, Plus, Filter } from 'lucide-react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

// --- Sparkline (copied from ResultsDisplay for self-containment) ---
const Sparkline = ({ data }) => {
  if (!data || data.length === 0) return <div className="text-slate-300 text-xs">-</div>;
  
  const reversedData = [...data].reverse();
  const width = 60;
  const height = 20;
  const min = Math.min(...reversedData);
  const max = Math.max(...reversedData);
  const range = max - min || 1;
  
  const points = reversedData.map((val, i) => {
    const x = (i / (reversedData.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  
  const first = reversedData[0] || 1;
  const last = reversedData[reversedData.length - 1] || 0;
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

// --- Freshness Helper ---
const getFreshnessStatus = (date) => {
  if (!date) return { label: 'Unknown', color: 'text-slate-400 bg-slate-50 border-slate-100' };
  const diff = (new Date() - new Date(date)) / (1000 * 60 * 60 * 24);
  if (diff < 7) return { label: 'Fresh', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' };
  if (diff < 30) return { label: 'Stale', color: 'text-amber-600 bg-amber-50 border-amber-100' };
  return { label: 'Expired', color: 'text-rose-600 bg-rose-50 border-rose-100' };
};

// --- Inline Editable Cell ---
const EditableCell = ({ value, onSave, placeholder = "—" }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    setIsEditing(false);
    const trimmed = editValue.trim();
    if (trimmed !== (value || '')) {
      onSave(trimmed || null);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') {
      setEditValue(value || '');
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="w-full px-2 py-1 text-xs text-slate-700 bg-white border border-indigo-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className="group flex items-center gap-1.5 cursor-pointer hover:bg-slate-50 px-2 py-1 rounded-md transition-colors -mx-2"
      title="Click to edit"
    >
      <span className={`text-xs ${value ? 'text-slate-600' : 'text-slate-300 italic'}`}>
        {value || placeholder}
      </span>
      <Pencil size={11} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </div>
  );
};

// --- Preset Components ---
const PresetRow = ({ preset, bankKeywords, onDelete, onUpdate, onRemoveKeyword, onEditKeywords }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Resolve keywords from the IDs
  const linkedKeywords = (preset.keyword_ids || [])
    .map(id => bankKeywords.find(k => k.id === id))
    .filter(Boolean);
    
  // Calculate Aggregates
  const tagsCount = linkedKeywords.length;
  const totalVolume = linkedKeywords.reduce((sum, kw) => sum + (kw.last_volume || 0), 0);
  
  // Filter out invalid/NaN for averages
  const validComp = linkedKeywords.filter(k => !isNaN(parseFloat(k.last_competition)));
  const avgComp = validComp.length > 0 
    ? validComp.reduce((sum, kw) => sum + parseFloat(kw.last_competition), 0) / validComp.length 
    : 0;
    
  const validCpc = linkedKeywords.filter(k => !isNaN(parseFloat(k.last_cpc)));
  const avgCpc = validCpc.length > 0
    ? validCpc.reduce((sum, kw) => sum + parseFloat(kw.last_cpc), 0) / validCpc.length
    : 0;

  return (
    <>
      {/* Main Preset Row */}
      <tr className="group hover:bg-slate-50 border-b border-slate-100 transition-colors">
        <td className="py-4 px-4 flex items-center gap-3 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <span className="text-slate-400">
            {isExpanded ? <ChevronUp size={18} /> : <Folder size={18} className="text-indigo-500 fill-indigo-100" />}
          </span>
          <div>
            <div className="font-bold text-slate-800 flex items-center gap-2">
              <div onClick={(e) => e.stopPropagation()}>
                <EditableCell
                   value={preset.title}
                   onSave={(val) => onUpdate(preset.id, 'title', val)}
                   placeholder="Preset Title"
                />
              </div>
              <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full uppercase tracking-widest font-bold">Preset</span>
            </div>
          </div>
        </td>
        <td className="px-3 text-sm text-slate-500">
          <div className="flex items-center gap-1.5 text-xs truncate max-w-[400px]" onClick={(e) => e.stopPropagation()}>
             <EditableCell
                value={preset.theme}
                onSave={(val) => onUpdate(preset.id, 'theme', val)}
                placeholder="Theme"
             />
             <ChevronRight size={10} className="text-slate-300 shrink-0" />
             <EditableCell
                value={preset.niche}
                onSave={(val) => onUpdate(preset.id, 'niche', val)}
                placeholder="Niche"
             />
             <ChevronRight size={10} className="text-slate-300 shrink-0" />
             <EditableCell
                value={preset.sub_niche}
                onSave={(val) => onUpdate(preset.id, 'sub_niche', val)}
                placeholder="Sub-niche"
             />
          </div>
        </td>
        <td className="px-3">
          <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-semibold whitespace-nowrap">
            {tagsCount} / 10 tags
          </span>
        </td>
        <td className="px-3 font-mono text-sm text-slate-600 text-center">{totalVolume.toLocaleString()}</td>
        <td className="px-3 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="w-12 bg-slate-200 h-1.5 rounded-full overflow-hidden shrink-0">
              <div 
                className={`h-full ${avgComp < 0.3 ? 'bg-emerald-500' : avgComp < 0.7 ? 'bg-amber-500' : 'bg-rose-500'}`}
                style={{ width: `${Math.min(avgComp * 100, 100)}%` }}
              />
            </div>
            <span className="text-xs font-medium text-slate-600">{avgComp.toFixed(2)}</span>
          </div>
        </td>
        <td className="px-3 text-center text-emerald-600 font-semibold text-xs">
          ${avgCpc.toFixed(2)}
        </td>
        <td className="px-3 text-right">
          <div className="flex items-center justify-end gap-1.5">
            <button onClick={(e) => { e.stopPropagation(); onEditKeywords(preset); }} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition" title="Add Keywords to Preset">
              <Plus size={14} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(preset.id); }} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition" title="Delete Preset">
              <Trash2 size={14} />
            </button>
          </div>
        </td>
      </tr>

      {/* Expanded Sub-Table */}
      {isExpanded && (
        <tr>
          <td colSpan="7" className="bg-slate-50/50 p-6 shadow-inner border-b border-slate-200">
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-slate-100/80 text-[10px] uppercase text-slate-500 font-bold tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4 w-[35%] border-b border-slate-200">Tag</th>
                    <th className="py-2.5 px-3 text-center border-b border-slate-200">Volume</th>
                    <th className="py-2.5 px-3 text-center border-b border-slate-200">Trend</th>
                    <th className="py-2.5 px-3 text-center border-b border-slate-200">Comp.</th>
                    <th className="py-2.5 px-3 text-center border-b border-slate-200">CPC</th>
                    <th className="py-2.5 px-3 text-center border-b border-slate-200">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {linkedKeywords.length === 0 ? (
                     <tr><td colSpan="6" className="py-6 text-center text-xs text-slate-400">No keywords found. They may have been removed from your bank.</td></tr>
                  ) : linkedKeywords.map((kw) => {
                    const comp = parseFloat(kw.last_competition);
                    const cpc = parseFloat(kw.last_cpc);
                    return (
                    <tr key={kw.id} className="text-xs hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-slate-700">
                         <div className="flex items-center gap-2">
                           <Star size={12} className="fill-amber-400 text-amber-400 shrink-0" />
                           {kw.tag}
                         </div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-600">{(kw.last_volume || 0).toLocaleString()}</td>
                      <td className="py-2.5 px-3">
                         <div className="flex justify-center scale-90">
                           <Sparkline data={kw.volume_history} />
                         </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {isNaN(comp) ? <span className="text-slate-300">-</span> : (
                          <span className={`${comp < 0.3 ? 'text-emerald-700' : comp < 0.7 ? 'text-amber-700' : 'text-rose-700'} font-medium`}>
                            {comp.toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-medium text-emerald-600">
                         {isNaN(cpc) ? <span className="text-slate-300">-</span> : `$${cpc.toFixed(2)}`}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => onRemoveKeyword(preset.id, kw.id)}
                          className="p-1 rounded text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Remove from preset"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
                 <button className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors mr-2 opacity-50 cursor-not-allowed">
                   Apply to Listing →
                 </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

const CreatePresetModal = ({ isOpen, onClose, user, userKeywordBank, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [theme, setTheme] = useState('');
  const [niche, setNiche] = useState('');
  const [subNiche, setSubNiche] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Advanced Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ theme: '', niche: '', subNiche: '' });

  const uniqueThemes = useMemo(() => {
    return [...new Set(userKeywordBank.map(k => k.theme).filter(Boolean))].sort();
  }, [userKeywordBank]);

  const uniqueNiches = useMemo(() => {
    return [...new Set(userKeywordBank
      .filter(k => !filters.theme || k.theme === filters.theme)
      .map(k => k.niche)
      .filter(Boolean))].sort();
  }, [userKeywordBank, filters.theme]);

  const uniqueSubNiches = useMemo(() => {
    return [...new Set(userKeywordBank
      .filter(k => (!filters.theme || k.theme === filters.theme) && (!filters.niche || k.niche === filters.niche))
      .map(k => k.sub_niche)
      .filter(Boolean))].sort();
  }, [userKeywordBank, filters.theme, filters.niche]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  
  const handleClearFilters = () => {
    setFilters({ theme: '', niche: '', subNiche: '' });
  };

  if (!isOpen) return null;

  const filteredBank = useMemo(() => {
    return userKeywordBank.filter(kw => {
      const matchesSearch = !search.trim() || kw.tag.toLowerCase().includes(search.toLowerCase());
      const matchesTheme = !filters.theme || kw.theme === filters.theme;
      const matchesNiche = !filters.niche || kw.niche === filters.niche;
      const matchesSubNiche = !filters.subNiche || kw.sub_niche === filters.subNiche;
      return matchesSearch && matchesTheme && matchesNiche && matchesSubNiche;
    });
  }, [userKeywordBank, search, filters]);

  const handleToggle = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(k => k !== id));
    } else {
      if (selectedIds.length >= 10) return; // Hard limit
      setSelectedIds(prev => [...prev, id]);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) return toast.error('Title is required');
    setIsSubmitting(true);
    
    const { data, error } = await supabase
      .from('keyword_presets')
      .insert({
        user_id: user.id,
        title: title.trim(),
        theme: theme.trim() || null,
        niche: niche.trim() || null,
        sub_niche: subNiche.trim() || null,
        keyword_ids: selectedIds
      })
      .select()
      .single();

    setIsSubmitting(false);
    if (error) {
       console.error(error);
       toast.error('Failed to create preset');
    } else {
       toast.success('Preset created');
       onSuccess(data);
       onClose();
       setTitle(''); setTheme(''); setNiche(''); setSubNiche(''); setSelectedIds([]); setSearch('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
               <Folder size={18} className="text-indigo-600 fill-indigo-100" /> Create Keyword Preset
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Group up to 10 keywords for one-click application.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
           <div className="space-y-4">
              <div>
                 <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Preset Title <span className="text-rose-500">*</span></label>
                 <input type="text" placeholder="e.g., Summer T-Shirts Broad Audience" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                 <div>
                   <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Theme</label>
                   <input type="text" placeholder="Apparel" value={theme} onChange={e => setTheme(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Niche</label>
                   <input type="text" placeholder="Graphic Tees" value={niche} onChange={e => setNiche(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Sub-niche</label>
                   <input type="text" placeholder="Minimalist" value={subNiche} onChange={e => setSubNiche(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                 </div>
              </div>
           </div>

           <div className="border border-slate-200 rounded-xl overflow-hidden flex flex-col flex-1 min-h-[300px]">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col gap-3">
                 <div className="flex items-center justify-between">
                   <div className="flex gap-2 w-full max-w-sm">
                     <div className="relative flex-1">
                       <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                       <input type="text" placeholder="Search your bank..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white outline-none transition-all" />
                     </div>
                     <button
                        onClick={() => setShowFilters(prev => !prev)}
                        className={`relative flex-shrink-0 p-1.5 rounded-md border transition-all focus:outline-none flex items-center justify-center ${
                          showFilters || Object.values(filters).some(Boolean)
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                        }`}
                        title="Filter Keywords"
                      >
                        <Filter size={14} />
                        {Object.values(filters).filter(Boolean).length > 0 && (
                          <span className="absolute top-0.5 right-0.5 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                          </span>
                        )}
                      </button>
                   </div>
                   <div className={`text-xs font-bold px-2.5 py-1 rounded-md ml-3 ${selectedIds.length === 10 ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                     {selectedIds.length} / 10 Selected
                   </div>
                 </div>

                 {showFilters && (
                    <div className="flex flex-wrap items-end gap-2 animate-in fade-in slide-in-from-top-1">
                      <div className="flex-1 min-w-[120px]">
                        <select value={filters.theme} onChange={(e) => handleFilterChange('theme', e.target.value)} className="w-full bg-white border border-slate-200 rounded py-1.5 px-2 text-xs text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all">
                          <option value="">All Themes</option>
                          {uniqueThemes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="flex-1 min-w-[120px]">
                        <select value={filters.niche} onChange={(e) => handleFilterChange('niche', e.target.value)} className="w-full bg-white border border-slate-200 rounded py-1.5 px-2 text-xs text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all">
                          <option value="">All Niches</option>
                          {uniqueNiches.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                      <div className="flex-1 min-w-[120px]">
                        <select value={filters.subNiche} onChange={(e) => handleFilterChange('subNiche', e.target.value)} className="w-full bg-white border border-slate-200 rounded py-1.5 px-2 text-xs text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all">
                          <option value="">All Sub-niches</option>
                          {uniqueSubNiches.map(sn => <option key={sn} value={sn}>{sn}</option>)}
                        </select>
                      </div>
                      {Object.values(filters).some(Boolean) && (
                        <button onClick={handleClearFilters} className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded transition-colors h-[28px]">
                          Clear
                        </button>
                      )}
                    </div>
                 )}
              </div>
              <div className="flex-1 overflow-y-auto p-3 bg-slate-50/30">
                 {filteredBank.length === 0 ? (
                    <div className="text-center text-xs text-slate-400 py-8">No keywords match your search.</div>
                 ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                       {filteredBank.map(kw => {
                          const isSelected = selectedIds.includes(kw.id);
                          const isDisabled = !isSelected && selectedIds.length >= 10;
                          return (
                             <div 
                               key={kw.id} 
                               onClick={() => !isDisabled && handleToggle(kw.id)}
                               className={`p-2 border rounded-lg text-xs flex items-center justify-between transition-all ${
                                 isSelected 
                                   ? 'border-indigo-500 bg-indigo-50 shadow-sm cursor-pointer' 
                                   : isDisabled 
                                     ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed' 
                                     : 'border-slate-200 hover:border-indigo-300 bg-white cursor-pointer'
                               }`}
                             >
                               <span className={`font-medium truncate mr-2 ${isSelected ? 'text-indigo-700' : 'text-slate-700'}`} title={kw.tag}>{kw.tag}</span>
                               <span className={`text-[10px] font-mono ${isSelected ? 'text-indigo-500' : 'text-slate-400'}`}>{(kw.last_volume || 0).toLocaleString()}</span>
                             </div>
                          );
                       })}
                    </div>
                 )}
              </div>
           </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
           <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors">Cancel</button>
           <button onClick={handleSubmit} disabled={isSubmitting || selectedIds.length === 0} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition shadow-sm disabled:opacity-50 flex items-center gap-2">
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              Save Preset
           </button>
        </div>
      </div>
    </div>
  );
};

const EditPresetKeywordsModal = ({ preset, isOpen, onClose, userKeywordBank, onSave }) => {
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Advanced Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ theme: '', niche: '', subNiche: '' });

  const uniqueThemes = useMemo(() => {
    return [...new Set(userKeywordBank.map(k => k.theme).filter(Boolean))].sort();
  }, [userKeywordBank]);

  const uniqueNiches = useMemo(() => {
    return [...new Set(userKeywordBank
      .filter(k => !filters.theme || k.theme === filters.theme)
      .map(k => k.niche)
      .filter(Boolean))].sort();
  }, [userKeywordBank, filters.theme]);

  const uniqueSubNiches = useMemo(() => {
    return [...new Set(userKeywordBank
      .filter(k => (!filters.theme || k.theme === filters.theme) && (!filters.niche || k.niche === filters.niche))
      .map(k => k.sub_niche)
      .filter(Boolean))].sort();
  }, [userKeywordBank, filters.theme, filters.niche]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  
  const handleClearFilters = () => {
    setFilters({ theme: '', niche: '', subNiche: '' });
  };

  // Initialize selected IDs when the modal opens with a valid preset
  useEffect(() => {
    if (isOpen && preset) {
      setSelectedIds(preset.keyword_ids || []);
      setSearch('');
      setFilters({ theme: '', niche: '', subNiche: '' });
      setShowFilters(false);
    }
  }, [isOpen, preset]);

  if (!isOpen || !preset) return null;

  const filteredBank = useMemo(() => {
    return userKeywordBank.filter(kw => {
      const matchesSearch = !search.trim() || kw.tag.toLowerCase().includes(search.toLowerCase());
      const matchesTheme = !filters.theme || kw.theme === filters.theme;
      const matchesNiche = !filters.niche || kw.niche === filters.niche;
      const matchesSubNiche = !filters.subNiche || kw.sub_niche === filters.subNiche;
      return matchesSearch && matchesTheme && matchesNiche && matchesSubNiche;
    });
  }, [userKeywordBank, search, filters]);

  const handleToggle = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(k => k !== id));
    } else {
      if (selectedIds.length >= 10) return; // Hard limit
      setSelectedIds(prev => [...prev, id]);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await onSave(preset.id, selectedIds);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
               <Folder size={18} className="text-indigo-600 fill-indigo-100" /> Manage Keywords: {preset.title}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Add or remove keywords from this preset (max 10).</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
           <div className="border border-slate-200 rounded-xl overflow-hidden flex flex-col flex-1 min-h-[300px]">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col gap-3">
                 <div className="flex items-center justify-between">
                   <div className="flex gap-2 w-full max-w-sm">
                     <div className="relative flex-1">
                       <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                       <input type="text" placeholder="Search your bank..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white outline-none transition-all" />
                     </div>
                     <button
                        onClick={() => setShowFilters(prev => !prev)}
                        className={`relative flex-shrink-0 p-1.5 rounded-md border transition-all focus:outline-none flex items-center justify-center ${
                          showFilters || Object.values(filters).some(Boolean)
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                        }`}
                        title="Filter Keywords"
                      >
                        <Filter size={14} />
                        {Object.values(filters).filter(Boolean).length > 0 && (
                          <span className="absolute top-0.5 right-0.5 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                          </span>
                        )}
                      </button>
                   </div>
                   <div className={`text-xs font-bold px-2.5 py-1 rounded-md ml-3 ${selectedIds.length === 10 ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                     {selectedIds.length} / 10 Selected
                   </div>
                 </div>

                 {showFilters && (
                    <div className="flex flex-wrap items-end gap-2 animate-in fade-in slide-in-from-top-1">
                      <div className="flex-1 min-w-[120px]">
                        <select value={filters.theme} onChange={(e) => handleFilterChange('theme', e.target.value)} className="w-full bg-white border border-slate-200 rounded py-1.5 px-2 text-xs text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all">
                          <option value="">All Themes</option>
                          {uniqueThemes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="flex-1 min-w-[120px]">
                        <select value={filters.niche} onChange={(e) => handleFilterChange('niche', e.target.value)} className="w-full bg-white border border-slate-200 rounded py-1.5 px-2 text-xs text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all">
                          <option value="">All Niches</option>
                          {uniqueNiches.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                      <div className="flex-1 min-w-[120px]">
                        <select value={filters.subNiche} onChange={(e) => handleFilterChange('subNiche', e.target.value)} className="w-full bg-white border border-slate-200 rounded py-1.5 px-2 text-xs text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all">
                          <option value="">All Sub-niches</option>
                          {uniqueSubNiches.map(sn => <option key={sn} value={sn}>{sn}</option>)}
                        </select>
                      </div>
                      {Object.values(filters).some(Boolean) && (
                        <button onClick={handleClearFilters} className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded transition-colors h-[28px]">
                          Clear
                        </button>
                      )}
                    </div>
                 )}
              </div>
              <div className="flex-1 overflow-y-auto p-3 bg-slate-50/30">
                 {filteredBank.length === 0 ? (
                    <div className="text-center text-xs text-slate-400 py-8">No keywords match your search.</div>
                 ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                       {filteredBank.map(kw => {
                          const isSelected = selectedIds.includes(kw.id);
                          const isDisabled = !isSelected && selectedIds.length >= 10;
                          return (
                             <div 
                               key={kw.id} 
                               onClick={() => !isDisabled && handleToggle(kw.id)}
                               className={`p-2 border rounded-lg text-xs flex items-center justify-between transition-all ${
                                 isSelected 
                                   ? 'border-indigo-500 bg-indigo-50 shadow-sm cursor-pointer' 
                                   : isDisabled 
                                     ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed' 
                                     : 'border-slate-200 hover:border-indigo-300 bg-white cursor-pointer'
                               }`}
                             >
                               <span className={`font-medium truncate mr-2 ${isSelected ? 'text-indigo-700' : 'text-slate-700'}`} title={kw.tag}>{kw.tag}</span>
                               <span className={`text-[10px] font-mono ${isSelected ? 'text-indigo-500' : 'text-slate-400'}`}>{(kw.last_volume || 0).toLocaleString()}</span>
                             </div>
                          );
                       })}
                    </div>
                 )}
              </div>
           </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
           <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors">Cancel</button>
           <button onClick={handleSubmit} disabled={isSubmitting || selectedIds.length === 0} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition shadow-sm disabled:opacity-50 flex items-center gap-2">
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              Save Changes
           </button>
        </div>
      </div>
    </div>
  );
};

// --- Main Page ---
const SEOLab = () => {
  const { user } = useAuth();
  const [keywords, setKeywords] = useState([]);
  const [presets, setPresets] = useState([]);
  const [view, setView] = useState('keywords'); // 'keywords' | 'presets'
  const [isLoading, setIsLoading] = useState(true);
  const [isPresetsLoading, setIsPresetsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [showGemSettings, setShowGemSettings] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPresetForKeywords, setEditingPresetForKeywords] = useState(null); // stores the full preset object when editing
  const [sortField, setSortField] = useState(null); // null = no sort (default order)
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Advanced Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ theme: '', niche: '', subNiche: '' });
  
  const gemSettingsRef = useRef(null);

  // Gem thresholds with Supabase persistence
  const DEFAULT_GEM = { minVolume: 1000, maxCompetition: 0.4, minCpc: 1.0 };
  const [gemThresholds, setGemThresholds] = useState(DEFAULT_GEM);
  const gemHydrated = useRef(false);
  const debounceTimer = useRef(null);

  // Fetch gem settings from user_settings on mount
  useEffect(() => {
    if (!user?.id) return;
    const fetchGemSettings = async () => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('gem_min_volume, gem_max_competition, gem_min_cpc')
        .eq('user_id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // No row exists — create one with defaults
        await supabase.from('user_settings').insert({
          user_id: user.id,
          gem_min_volume: DEFAULT_GEM.minVolume,
          gem_max_competition: DEFAULT_GEM.maxCompetition,
          gem_min_cpc: DEFAULT_GEM.minCpc,
        });
      } else if (data) {
        setGemThresholds({
          minVolume: data.gem_min_volume ?? DEFAULT_GEM.minVolume,
          maxCompetition: data.gem_max_competition ?? DEFAULT_GEM.maxCompetition,
          minCpc: data.gem_min_cpc ?? DEFAULT_GEM.minCpc,
        });
      }
      gemHydrated.current = true;
    };
    fetchGemSettings();
  }, [user?.id]);

  // Debounced save to Supabase when thresholds change
  useEffect(() => {
    if (!gemHydrated.current || !user?.id) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      const { error } = await supabase
        .from('user_settings')
        .update({
          gem_min_volume: gemThresholds.minVolume,
          gem_max_competition: gemThresholds.maxCompetition,
          gem_min_cpc: gemThresholds.minCpc,
        })
        .eq('user_id', user.id);
      if (error) console.error('Failed to save gem settings:', error);
    }, 500);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [gemThresholds, user?.id]);

  const isGem = (kw) => {
    const vol = kw.last_volume || 0;
    const comp = parseFloat(kw.last_competition);
    const cpc = parseFloat(kw.last_cpc);
    return vol >= gemThresholds.minVolume
      && !isNaN(comp) && comp <= gemThresholds.maxCompetition
      && !isNaN(cpc) && cpc >= gemThresholds.minCpc;
  };

  // Close gem settings on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (gemSettingsRef.current && !gemSettingsRef.current.contains(e.target)) {
        setShowGemSettings(false);
      }
    };
    if (showGemSettings) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showGemSettings]);

  // Fetch keyword bank
  useEffect(() => {
    if (!user?.id) return;
    const fetchBankAndPresets = async () => {
      setIsLoading(true);
      setIsPresetsLoading(true);
      
      const [bankRes, presetsRes] = await Promise.all([
        supabase.from('user_keyword_bank').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('keyword_presets').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      ]);

      if (bankRes.error) {
        console.error('Failed to fetch keyword bank:', bankRes.error);
        toast.error('Failed to load keyword bank.');
      } else if (bankRes.data) {
        setKeywords(bankRes.data);
      }
      
      if (presetsRes.error) {
        console.error('Failed to fetch presets:', presetsRes.error);
        toast.error('Failed to load presets.');
      } else if (presetsRes.data) {
        setPresets(presetsRes.data);
      }
      
      setIsLoading(false);
      setIsPresetsLoading(false);
    };
    fetchBankAndPresets();
  }, [user?.id]);

  // Inline update handler
  const handleUpdateField = async (id, field, value) => {
    const { error } = await supabase
      .from('user_keyword_bank')
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error(`Failed to update ${field}:`, error);
      toast.error(`Failed to update ${field}.`);
      return;
    }
    setKeywords(prev => prev.map(k => k.id === id ? { ...k, [field]: value } : k));
    toast.success('Field updated');
  };

  // Delete handler
  const handleDelete = async (id, tag) => {
    setDeletingId(id);
    const { error } = await supabase
      .from('user_keyword_bank')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete keyword:', error);
      toast.error('Failed to delete keyword.');
    } else {
      setKeywords(prev => prev.filter(k => k.id !== id));
      // Locally remove the deleted keyword ID from any affected presets
      setPresets(prevPresets => prevPresets.map(p => {
        if (p.keyword_ids && p.keyword_ids.includes(id)) {
           return { ...p, keyword_ids: p.keyword_ids.filter(kid => kid !== id) };
        }
        return p;
      }));
      toast.success(`"${tag}" removed from Keyword Bank`);
    }
    setDeletingId(null);
  };

  // Inline Preset update handler
  const handleUpdatePresetField = async (id, field, value) => {
    if (field === 'title' && !value) {
      toast.error('Preset title cannot be empty.');
      return;
    }
    const { error } = await supabase
      .from('keyword_presets')
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error(`Failed to update preset ${field}:`, error);
      toast.error(`Failed to update preset ${field}.`);
      return;
    }
    setPresets(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    toast.success('Preset updated');
  };

  // Remove individual keyword from preset
  const handleRemoveKeywordFromPreset = async (presetId, keywordIdToRemove) => {
    // 1. Find the preset in local state to get current keywords
    const targetPreset = presets.find(p => p.id === presetId);
    if (!targetPreset || !targetPreset.keyword_ids) return;

    // 2. Filter out the ID to remove
    const updatedIds = targetPreset.keyword_ids.filter(id => id !== keywordIdToRemove);
    
    // 3. Update Supabase
    const { error } = await supabase
      .from('keyword_presets')
      .update({ keyword_ids: updatedIds, updated_at: new Date().toISOString() })
      .eq('id', presetId);

    if (error) {
       console.error('Failed to remove keyword from preset:', error);
       toast.error('Failed to remove keyword from preset.');
       return;
    }

    // 4. Update React State optimistically
    setPresets(prev => prev.map(p => 
      p.id === presetId ? { ...p, keyword_ids: updatedIds } : p
    ));
    toast.success('Keyword removed from preset');
  };

  // Add/Manage keywords in a preset
  const handleSavePresetKeywords = async (presetId, newKeywordIds) => {
    const { error } = await supabase
      .from('keyword_presets')
      .update({ keyword_ids: newKeywordIds, updated_at: new Date().toISOString() })
      .eq('id', presetId);

    if (error) {
       console.error('Failed to update preset keywords:', error);
       toast.error('Failed to update preset keywords.');
       return;
    }

    setPresets(prev => prev.map(p => 
      p.id === presetId ? { ...p, keyword_ids: newKeywordIds } : p
    ));
    toast.success('Preset keywords updated');
  };

  const handleDeletePreset = async (id) => {
    if (!window.confirm("Are you sure you want to delete this preset?")) return;
    const { error } = await supabase.from('keyword_presets').delete().eq('id', id);
    if (error) {
       toast.error('Failed to delete preset.');
    } else {
       setPresets(prev => prev.filter(p => p.id !== id));
       toast.success('Preset deleted.');
    }
  };

  // Filtered keywords
  const filtered = useMemo(() => {
    if (view === 'presets') {
      return presets.filter(p => !searchQuery || 
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.niche && p.niche.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    return keywords.filter(kw => {
      // Base search
      const matchesSearch = !searchQuery || 
        kw.tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (kw.theme && kw.theme.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (kw.niche && kw.niche.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (kw.sub_niche && kw.sub_niche.toLowerCase().includes(searchQuery.toLowerCase()));

      // Gem filtering
      const checkComp = kw.last_competition != null ? parseFloat(kw.last_competition) : Infinity;
      const checkCpc = kw.last_cpc != null ? parseFloat(kw.last_cpc) : 0;
      const matchesGem = !showGemSettings || (
        (kw.last_volume || 0) >= gemThresholds.minVolume &&
        checkComp <= gemThresholds.maxCompetition &&
        checkCpc >= gemThresholds.minCpc
      );

      // Advanced Category Filters
      const matchesTheme = !filters.theme || kw.theme === filters.theme;
      const matchesNiche = !filters.niche || kw.niche === filters.niche;
      const matchesSubNiche = !filters.subNiche || kw.sub_niche === filters.subNiche;

      return matchesSearch && matchesGem && matchesTheme && matchesNiche && matchesSubNiche;
    });
  }, [keywords, presets, searchQuery, view, showGemSettings, gemThresholds, filters]);
    
  // Filtered presets
  const filteredPresets = view === 'presets' && searchQuery.trim()
    ? presets.filter(p => (
        p.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.niche?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.theme?.toLowerCase().includes(searchQuery.toLowerCase())
      ))
    : presets;

  // Sort toggle: null → asc → desc → null
  const toggleSort = (field) => {
    let nextSortField;
    let nextSortDirection;

    if (sortField === field) { // If clicking the same field
      if (sortDirection === 'asc') {
        nextSortDirection = 'desc';
      } else { // Currently 'desc', so reset
        nextSortField = null;
        nextSortDirection = 'asc'; // Default for next sort
      }
    } else { // Clicking a new field
      nextSortField = field;
      nextSortDirection = 'asc';
    }
    
    setSortField(nextSortField);
    setSortDirection(nextSortDirection);
    setCurrentPage(1); // Reset to page 1 on sort change
  };

  // Reset pagination on search or sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortField, sortDirection, view]);

  // Sort icon helper
  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronsUpDown size={12} className="text-slate-300" />;
    return sortDirection === 'asc'
      ? <ChevronUp size={12} className="text-indigo-600" />
      : <ChevronDown size={12} className="text-indigo-600" />;
  };

  // Extract unique options for dropdowns
  const uniqueThemes = useMemo(() => {
    return [...new Set(keywords.map(k => k.theme).filter(Boolean))].sort();
  }, [keywords]);

  const uniqueNiches = useMemo(() => {
    return [...new Set(keywords
      .filter(k => !filters.theme || k.theme === filters.theme)
      .map(k => k.niche)
      .filter(Boolean))].sort();
  }, [keywords, filters.theme]);

  const uniqueSubNiches = useMemo(() => {
    return [...new Set(keywords
      .filter(k => (!filters.theme || k.theme === filters.theme) && (!filters.niche || k.niche === filters.niche))
      .map(k => k.sub_niche)
      .filter(Boolean))].sort();
  }, [keywords, filters.theme, filters.niche]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value };
      // Cascade resets: If theme changes, clearing niche/subNiche often makes sense, but we'll let user control.
      // However, if the active niche is no longer valid for the new theme, reset it.
      return newFilters;
    });
    setCurrentPage(1);
  };
  
  const handleClearFilters = () => {
    setFilters({ theme: '', niche: '', subNiche: '' });
    setCurrentPage(1);
  };

  // Sorted data
  const sorted = (() => {
    if (!sortField) return filtered;
    const getValue = (kw) => {
      switch (sortField) {
        case 'tag': return (kw.tag || '').toLowerCase();
        case 'theme': return (kw.theme || '').toLowerCase();
        case 'niche': return (kw.niche || '').toLowerCase();
        case 'sub_niche': return (kw.sub_niche || '').toLowerCase();
        case 'last_volume': return kw.last_volume || 0;
        case 'last_competition': return parseFloat(kw.last_competition) || 0;
        case 'last_cpc': return parseFloat(kw.last_cpc) || 0;
        case 'last_sync_at': return kw.last_sync_at ? new Date(kw.last_sync_at).getTime() : 0;
        case 'updated_at': return kw.updated_at ? new Date(kw.updated_at).getTime() : 0;
        default: return '';
      }
    };
    return [...filtered].sort((a, b) => {
      const aVal = getValue(a);
      const bVal = getValue(b);
      let comparison = 0;
      if (aVal < bVal) comparison = -1;
      if (aVal > bVal) comparison = 1;
      
      if (sortDirection === 'desc') return comparison * -1;
      return comparison;
    });
  })();

  // Reset pagination on search, sort, or view change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortField, sortDirection, view, filters]);

  // Pagination Logic
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedKeywords = sorted.slice(startIndex, endIndex);
  const totalPages = Math.ceil(sorted.length / pageSize) || 1;

  // Stats
  const totalCount = keywords.length;
  const highPotentialCount = keywords.filter(k => isGem(k)).length;
  const oldDataCount = keywords.filter(k => getFreshnessStatus(k.last_sync_at).label === 'Expired').length;

  return (
    <Layout>
      <div className="p-8 space-y-8">

        {/* Header */}
        <div>
          <nav className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <span className="hover:text-slate-900 cursor-pointer">App</span>
            <span className="text-slate-300">/</span>
            <span className="font-medium text-indigo-600">SEO Lab</span>
          </nav>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <FlaskConical size={28} className="text-indigo-600" />
            SEO Lab
          </h1>
          <p className="text-sm text-slate-500 mt-1">Your strategic keyword workspace. Organize, track, and refine your best-performing tags.</p>
        </div>

        {/* Tabs Integration */}
        <div className="flex items-center gap-6 border-b border-slate-200">
          <button
            onClick={() => setView('keywords')}
            className={`py-3 px-1 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${
              view === 'keywords' 
                ? 'border-indigo-600 text-indigo-700' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Individual Keywords
          </button>
          <button
            onClick={() => setView('presets')}
            className={`py-3 px-1 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${
              view === 'presets' 
                ? 'border-indigo-600 text-indigo-700' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            My Presets
            {presets.length > 0 && <span className="text-xs bg-slate-100 text-slate-600 py-0.5 px-2 rounded-full">{presets.length}</span>}
          </button>
        </div>

        {/* Stats Cards - Only on keywords view */}
        {view === 'keywords' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-indigo-50">
              <Star size={20} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Keywords</p>
              <p className="text-2xl font-black text-slate-900">{totalCount}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-50">
              <TrendingUp size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">High Potential</p>
              <p className="text-2xl font-black text-slate-900">{highPotentialCount}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-rose-50">
              <RefreshCw size={20} className="text-rose-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Old Data (&gt;30d)</p>
              <p className="text-2xl font-black text-slate-900">{oldDataCount}</p>
            </div>
          </div>
        </div>
        )}

        {/* Search Bar + Gem Settings / Create Preset */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex gap-2 w-full md:w-auto flex-1 min-w-[240px] max-w-md">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={view === 'keywords' ? "Search bank..." : "Search presets title or niche..."}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 shadow-sm"
              />
            </div>
            
            {view === 'keywords' && (
              <button
                onClick={() => setShowFilters(prev => !prev)}
                className={`relative flex-shrink-0 p-2.5 rounded-xl border shadow-sm transition-all focus:outline-none flex items-center justify-center ${
                  showFilters || Object.values(filters).some(Boolean)
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
                title="Filter by Theme & Niche"
              >
                <Filter size={18} />
                {Object.values(filters).filter(Boolean).length > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
                  </span>
                )}
              </button>
            )}
          </div>
          
          {view === 'keywords' ? (
            <div className="relative" ref={gemSettingsRef}>
            <button
              onClick={() => setShowGemSettings(prev => !prev)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border shadow-sm transition-all ${
                showGemSettings
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200'
              }`}
            >
              <Gem size={16} />
              Gem Settings
              <Settings2 size={14} className="text-slate-400" />
            </button>

            {showGemSettings && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 p-5 space-y-5 animate-in fade-in slide-in-from-top-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Gem size={16} className="text-indigo-500" />
                    High Potential Criteria
                  </h3>
                  <button onClick={() => setShowGemSettings(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                    <X size={14} />
                  </button>
                </div>

                {/* Min Volume Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Min Volume</label>
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{gemThresholds.minVolume.toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={5000}
                    step={100}
                    value={gemThresholds.minVolume}
                    onChange={(e) => setGemThresholds(prev => ({ ...prev, minVolume: Number(e.target.value) }))}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-indigo-600 bg-slate-200"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400"><span>0</span><span>5,000</span></div>
                </div>

                {/* Max Competition Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Max Competition</label>
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{gemThresholds.maxCompetition.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={gemThresholds.maxCompetition}
                    onChange={(e) => setGemThresholds(prev => ({ ...prev, maxCompetition: Number(e.target.value) }))}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-indigo-600 bg-slate-200"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400"><span>0</span><span>1.00</span></div>
                </div>

                {/* Min CPC Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Min CPC</label>
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">${gemThresholds.minCpc.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={5}
                    step={0.1}
                    value={gemThresholds.minCpc}
                    onChange={(e) => setGemThresholds(prev => ({ ...prev, minCpc: Number(e.target.value) }))}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-indigo-600 bg-slate-200"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400"><span>$0</span><span>$5.00</span></div>
                </div>

                <p className="text-[10px] text-slate-400 text-center pt-1">Settings saved automatically</p>
              </div>
            )}
          </div>
          ) : (
            <button
               onClick={() => setIsCreateModalOpen(true)}
               className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition shadow-sm"
            >
               <Plus size={16} />
               Create Preset
            </button>
          )}
        </div>

        {/* Filter Bar (Conditional) */}
        {view === 'keywords' && showFilters && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-wrap items-end gap-4 animate-in fade-in slide-in-from-top-2 shadow-sm">
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Theme</label>
              <select 
                value={filters.theme} 
                onChange={(e) => handleFilterChange('theme', e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              >
                <option value="">All Themes</option>
                {uniqueThemes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Niche</label>
              <select 
                value={filters.niche} 
                onChange={(e) => handleFilterChange('niche', e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              >
                <option value="">All Niches</option>
                {uniqueNiches.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Sub-niche</label>
              <select 
                value={filters.subNiche} 
                onChange={(e) => handleFilterChange('subNiche', e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              >
                <option value="">All Sub-niches</option>
                {uniqueSubNiches.map(sn => <option key={sn} value={sn}>{sn}</option>)}
              </select>
            </div>

            {Object.values(filters).some(Boolean) && (
              <button 
                onClick={handleClearFilters}
                className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors h-[38px]"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* Dynamic Table Content */}
        {view === 'keywords' ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold w-[20%]">
                    <button onClick={() => toggleSort('tag')} className="inline-flex items-center gap-1 hover:text-slate-700 transition-colors">
                      Tag <SortIcon field="tag" />
                    </button>
                  </th>
                  <th className="px-3 py-3 font-semibold w-[12%]">
                    <button onClick={() => toggleSort('theme')} className="inline-flex items-center gap-1 hover:text-slate-700 transition-colors">
                      Theme <SortIcon field="theme" />
                    </button>
                  </th>
                  <th className="px-3 py-3 font-semibold w-[12%]">
                    <button onClick={() => toggleSort('niche')} className="inline-flex items-center gap-1 hover:text-slate-700 transition-colors">
                      Niche <SortIcon field="niche" />
                    </button>
                  </th>
                  <th className="px-3 py-3 font-semibold w-[12%]">
                    <button onClick={() => toggleSort('sub_niche')} className="inline-flex items-center gap-1 hover:text-slate-700 transition-colors">
                      Sub-niche <SortIcon field="sub_niche" />
                    </button>
                  </th>
                  <th className="px-3 py-3 text-center font-semibold w-[8%]">
                    <button onClick={() => toggleSort('last_volume')} className="inline-flex items-center gap-1 justify-center w-full hover:text-slate-700 transition-colors">
                      Volume <SortIcon field="last_volume" />
                    </button>
                  </th>
                  <th className="px-3 py-3 text-center font-semibold w-[9%]">
                    <button onClick={() => toggleSort('last_competition')} className="inline-flex items-center gap-1 justify-center w-full hover:text-slate-700 transition-colors">
                      Competition <SortIcon field="last_competition" />
                    </button>
                  </th>
                  <th className="px-3 py-3 text-center font-semibold w-[7%]">
                    <button onClick={() => toggleSort('last_cpc')} className="inline-flex items-center gap-1 justify-center w-full hover:text-slate-700 transition-colors">
                      CPC <SortIcon field="last_cpc" />
                    </button>
                  </th>
                  <th className="px-3 py-3 text-center font-semibold w-[10%]">Trend</th>
                  <th className="px-3 py-3 text-center font-semibold w-[8%]">
                    <button onClick={() => toggleSort('last_sync_at')} className="inline-flex items-center gap-1 justify-center w-full hover:text-slate-700 transition-colors">
                      Freshness <SortIcon field="last_sync_at" />
                    </button>
                  </th>
                  <th className="px-3 py-3 text-center font-semibold w-[10%]">
                    <button onClick={() => toggleSort('updated_at')} className="inline-flex items-center gap-1 justify-center w-full hover:text-slate-700 transition-colors">
                      Last Updated <SortIcon field="updated_at" />
                    </button>
                  </th>
                  <th className="px-3 py-3 text-center font-semibold w-[8%]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan="10" className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 size={24} className="text-indigo-500 animate-spin" />
                        <span className="text-sm text-slate-400">Loading your keyword bank...</span>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Star size={28} className="text-slate-200" />
                        <p className="text-sm text-slate-400 font-medium">
                          {searchQuery ? 'No keywords match your search.' : 'Your keyword bank is empty.'}
                        </p>
                        <p className="text-xs text-slate-400">
                          {!searchQuery && 'Star keywords from the Product Studio to add them here.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedKeywords.map((kw) => {
                    const freshness = getFreshnessStatus(kw.last_sync_at);
                    const comp = parseFloat(kw.last_competition);
                    const cpc = parseFloat(kw.last_cpc);

                    return (
                      <tr key={kw.id} className="hover:bg-slate-50/60 transition-colors group">
                        {/* Tag */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Star size={14} className="fill-amber-400 text-amber-400 shrink-0" />
                            <span className="font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors px-3 py-1 rounded-full text-xs cursor-default truncate max-w-[200px]" title={kw.tag}>
                                {kw.tag}
                            </span>
                            {isGem(kw) && (
                              <span title="Meets your High Potential criteria">
                                <Gem size={14} className="text-indigo-500 shrink-0" />
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Theme (editable) */}
                        <td className="px-3 py-3">
                          <EditableCell
                            value={kw.theme}
                            onSave={(v) => handleUpdateField(kw.id, 'theme', v)}
                            placeholder="Theme"
                          />
                        </td>

                        {/* Niche (editable) */}
                        <td className="px-3 py-3">
                          <EditableCell
                            value={kw.niche}
                            onSave={(v) => handleUpdateField(kw.id, 'niche', v)}
                            placeholder="Niche"
                          />
                        </td>

                        {/* Sub-niche (editable) */}
                        <td className="px-3 py-3">
                          <EditableCell
                            value={kw.sub_niche}
                            onSave={(v) => handleUpdateField(kw.id, 'sub_niche', v)}
                            placeholder="Sub-niche"
                          />
                        </td>

                        {/* Volume */}
                        <td className="px-3 py-3 text-center text-slate-600 font-mono text-xs">
                          {(kw.last_volume || 0).toLocaleString()}
                        </td>

                        {/* Competition */}
                        <td className="px-3 py-3 text-center">
                          {isNaN(comp) || kw.last_competition == null ? (
                            <span className="text-slate-300 text-xs">N/A</span>
                          ) : (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide border ${
                              comp < 0.3
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : comp < 0.7
                                  ? 'bg-amber-50 text-amber-700 border-amber-100'
                                  : 'bg-rose-50 text-rose-700 border-rose-100'
                            }`}>
                              {comp.toFixed(2)}
                            </span>
                          )}
                        </td>

                        {/* CPC */}
                        <td className="px-3 py-3 text-center">
                          {isNaN(cpc) || cpc === 0 || kw.last_cpc == null ? (
                            <span className="text-slate-300 text-xs">N/A</span>
                          ) : (() => {
                            let colorClass = 'bg-slate-50 text-slate-500 border-slate-100';
                            if (cpc >= 1.5) colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                            else if (cpc >= 0.6) colorClass = 'bg-amber-50 text-amber-700 border-amber-100';
                            return (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide border ${colorClass}`}>
                                ${cpc.toFixed(2)}
                              </span>
                            );
                          })()}
                        </td>

                        {/* Trend */}
                        <td className="px-3 py-3">
                          <div className="flex justify-center">
                            <Sparkline data={kw.volume_history} />
                          </div>
                        </td>

                        {/* Freshness */}
                        <td className="px-3 py-3 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${freshness.color}`}>
                            {freshness.label}
                          </span>
                        </td>

                        {/* Last Updated */}
                        <td className="px-3 py-3 text-center text-slate-500 text-xs">
                          {kw.updated_at ? new Date(kw.updated_at).toISOString().split('T')[0] : '—'}
                        </td>

                        {/* Actions */}
                        <td className="px-3 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              disabled
                              className="p-1.5 rounded-lg text-slate-300 border border-slate-100 bg-slate-50 cursor-not-allowed opacity-50"
                              title="Refresh Stats (coming soon)"
                            >
                              <RefreshCw size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(kw.id, kw.tag)}
                              disabled={deletingId === kw.id}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all disabled:opacity-50"
                              title="Remove from bank"
                            >
                              {deletingId === kw.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Trash2 size={14} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          {!isLoading && filtered.length > 0 && (
            <div className="bg-slate-50/50 border-t border-slate-100 px-4 py-3 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-200 rounded px-2 py-1 outline-none text-slate-700 focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
              
              <div className="text-center font-medium">
                {startIndex + 1}-{Math.min(endIndex, sorted.length)} of {sorted.length} keywords
              </div>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded hover:bg-slate-200 text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                   <ChevronLeft size={16} />
                </button>
                <div className="px-2 font-medium">
                  {currentPage} / {totalPages}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded hover:bg-slate-200 text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                   <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="overflow-x-auto">
               <table className="w-full text-sm text-left">
                 <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                   <tr>
                     <th className="px-4 py-3 font-semibold w-[25%]">Preset Name</th>
                     <th className="px-3 py-3 font-semibold w-[30%]">Context</th>
                     <th className="px-3 py-3 font-semibold w-[10%]">Composition</th>
                     <th className="px-3 py-3 font-semibold w-[10%] text-center">Total Volume</th>
                     <th className="px-3 py-3 font-semibold w-[10%] text-center">Avg. Competition</th>
                     <th className="px-3 py-3 font-semibold w-[10%] text-center">Avg. CPC</th>
                     <th className="px-3 py-3 font-semibold w-[5%] text-center">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {isPresetsLoading ? (
                      <tr>
                        <td colSpan="7" className="px-4 py-12 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <Loader2 size={24} className="text-indigo-500 animate-spin" />
                            <span className="text-sm text-slate-400">Loading your presets...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredPresets.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-4 py-12 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <Folder size={28} className="text-slate-200 mb-2" />
                            <p className="text-sm text-slate-400 font-medium">
                              {searchQuery ? 'No presets match your search.' : 'You haven\'t created any presets yet.'}
                            </p>
                            <p className="text-xs text-slate-400">
                              {!searchQuery && 'Click "Create Preset" to build your first strategy.'}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredPresets.map(preset => (
                         <PresetRow 
                            key={preset.id} 
                            preset={preset} 
                            bankKeywords={keywords} 
                            onDelete={handleDeletePreset}
                            onUpdate={handleUpdatePresetField}
                            onRemoveKeyword={handleRemoveKeywordFromPreset}
                            onEditKeywords={setEditingPresetForKeywords}
                         />
                      ))
                    )}
                 </tbody>
               </table>
             </div>
             {!isPresetsLoading && filteredPresets.length > 0 && (
                <div className="bg-slate-50/50 border-t border-slate-100 px-4 py-3 text-xs text-slate-400 text-center">
                  Showing {filteredPresets.length} of {presets.length} presets
                </div>
              )}
          </div>
        )}

      </div>
      
      {/* Create Modal */}
      <CreatePresetModal 
         isOpen={isCreateModalOpen} 
         onClose={() => setIsCreateModalOpen(false)} 
         user={user}
         userKeywordBank={keywords}
         onSuccess={(newPreset) => setPresets(prev => [newPreset, ...prev])}
      />

      {/* Edit Keywords Modal */}
      <EditPresetKeywordsModal
         isOpen={!!editingPresetForKeywords}
         preset={editingPresetForKeywords}
         onClose={() => setEditingPresetForKeywords(null)}
         userKeywordBank={keywords}
         onSave={handleSavePresetKeywords}
      />
    </Layout>
  );
};

export default SEOLab;
