import { useState, useEffect, useRef, useMemo } from 'react';
import { FlaskConical, Star, Search, RefreshCw, Trash2, Pencil, TrendingUp, ArrowUpRight, ArrowDownRight, Loader2, Gem, Settings2, X, ChevronUp, ChevronDown, ChevronsUpDown, ChevronRight, ChevronLeft, Folder, Plus, Filter, Flame, Leaf, BarChart3, Clock, Target, AlertCircle, Tag, MoreHorizontal, Copy, Check, FolderPlus, Download, List, LayoutList } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import CreatePresetModal from '../components/studio/CreatePresetModal';
import ApplyPresetModal from '../components/studio/ApplyPresetModal';

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

// --- Stale threshold (days) — single source of truth for filter pill + date color ---
const STALE_DAYS = 21;

// --- Freshness Helper ---
const getFreshnessStatus = (date) => {
  if (!date) return { label: 'Stale', color: 'text-amber-600 bg-amber-50 border-amber-100' };
  const diff = (new Date() - new Date(date)) / (1000 * 60 * 60 * 24);
  if (diff <= STALE_DAYS) return { label: 'Fresh', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' };
  return { label: 'Stale', color: 'text-amber-600 bg-amber-50 border-amber-100' };
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
const PresetRow = ({ preset, bankKeywords, onDelete, onUpdate, onRemoveKeyword, onEditKeywords, onApplyToListing }) => {
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
                      <td className="py-2.5 px-4 font-semibold text-slate-700 w-[35%]">
                         <div className="flex items-center gap-2">
                           <Star size={12} className="fill-amber-400 text-amber-400 shrink-0" />
                           <span className="font-semibold text-slate-700 bg-slate-100/80 hover:bg-slate-200/80 transition-colors px-2.5 py-0.5 rounded-full text-[11px] cursor-default truncate max-w-[200px]" title={kw.tag}>
                             {kw.tag}
                           </span>
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
                 <button
                   onClick={() => onApplyToListing && onApplyToListing(preset, linkedKeywords)}
                   disabled={linkedKeywords.length === 0}
                   className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors mr-2 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
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

// CreatePresetModal is now imported from '../components/studio/CreatePresetModal'
// EditPresetKeywordsModal remains inline as it is only used here







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

  const filteredBank = useMemo(() => {
    if (!isOpen || !preset) return [];
    return userKeywordBank.filter(kw => {
      const matchesSearch = !search.trim() || kw.tag.toLowerCase().includes(search.toLowerCase());
      const matchesTheme = !filters.theme || kw.theme === filters.theme;
      const matchesNiche = !filters.niche || kw.niche === filters.niche;
      const matchesSubNiche = !filters.subNiche || kw.sub_niche === filters.subNiche;
      return matchesSearch && matchesTheme && matchesNiche && matchesSubNiche;
    });
  }, [userKeywordBank, search, filters, isOpen, preset]);

  if (!isOpen || !preset) return null;

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

// --- Filter Pill Config ---
const FILTER_PILL_CONFIG = [
  { key: 'all',            label: 'All',              icon: Tag,          color: 'slate' },
  { key: 'gems',           label: 'Gems',             icon: Gem,          color: 'emerald' },
  { key: 'trending',       label: 'Trending',         icon: Flame,        color: 'amber' },
  { key: 'highVolume',     label: 'High Volume',      icon: BarChart3,    color: 'blue' },
  { key: 'lowCompetition', label: 'Low Competition',  icon: Target,       color: 'teal' },
  { key: 'unused',         label: 'Unused',           icon: AlertCircle,  color: 'rose' },
  { key: 'stale',          label: 'Stale',            icon: Clock,        color: 'slate' },
];

const FILTER_COLORS = {
  slate:   { active: 'bg-slate-100 text-slate-700 border-slate-300',     badge: 'bg-slate-200 text-slate-800' },
  emerald: { active: 'bg-emerald-100 text-emerald-700 border-emerald-300', badge: 'bg-emerald-200 text-emerald-800' },
  amber:   { active: 'bg-amber-100 text-amber-700 border-amber-300',     badge: 'bg-amber-200 text-amber-800' },
  blue:    { active: 'bg-blue-100 text-blue-700 border-blue-300',        badge: 'bg-blue-200 text-blue-800' },
  teal:    { active: 'bg-teal-100 text-teal-700 border-teal-300',        badge: 'bg-teal-200 text-teal-800' },
  rose:    { active: 'bg-rose-100 text-rose-700 border-rose-300',        badge: 'bg-rose-200 text-rose-800' },
};

// --- Action Menu Item ---
function ActionMenuItem({ icon, label, onClick, disabled, danger }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-colors ${
        danger ? 'text-rose-600 hover:bg-rose-50'
        : disabled ? 'text-slate-300 cursor-default'
        : 'text-slate-600 hover:bg-slate-50'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {icon}
      {label}
    </button>
  );
}

// --- Niche Group Accordion (for grouped view) ---
function NicheGroupAccordion({ group, selectedIds, onToggleSelect, refreshingIds, openMenuId, setOpenMenuId, isGem, isKeywordStale, onRefresh, onDelete, onAddToPreset, paginatedKeywords }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        {isOpen ? <ChevronDown size={16} className="text-slate-400 shrink-0" /> : <ChevronRight size={16} className="text-slate-400 shrink-0" />}

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm font-medium text-slate-700 truncate">{group.key}</span>
          <span className="text-[11px] text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full font-medium shrink-0">{group.count}</span>
          {group.gemsCount > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
              <Gem size={11} /> {group.gemsCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 text-[11px] text-slate-400 shrink-0">
          <span>Avg vol: <span className="text-slate-600 font-medium">{group.avgVolume.toLocaleString()}</span></span>
          <span>Avg comp: <span className={`font-medium ${group.avgCompetition < 0.5 ? 'text-emerald-600' : group.avgCompetition < 0.9 ? 'text-amber-600' : 'text-rose-600'}`}>{group.avgCompetition}</span></span>
          <span>In use: <span className="text-slate-600 font-medium">{group.totalUsed}/{group.count}</span></span>
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <table className="w-full table-fixed text-sm">
              <tbody className="divide-y divide-slate-100">
                {group.keywords.map(kw => {
                  const comp = parseFloat(kw.last_competition);
                  const cpc = parseFloat(kw.last_cpc);
                  return (
                    <tr key={kw.id} className={`hover:bg-slate-50/50 transition-colors group ${selectedIds.has(kw.id) ? 'bg-indigo-50/40' : ''} ${refreshingIds.has(kw.id) ? 'opacity-50 pointer-events-none' : ''}`}>
                      <td className="w-[32px] pl-3 pr-1 py-2">
                        <input type="checkbox" checked={selectedIds.has(kw.id)} onChange={() => onToggleSelect(kw.id)} className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                      </td>
                      <td className="py-2 px-1 overflow-hidden">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Star size={13} className="fill-amber-400 text-amber-400 shrink-0" />
                          <span className="font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full text-xs truncate" title={kw.tag}>{kw.tag}</span>
                          {isGem(kw) && <Gem size={12} className="text-indigo-500 shrink-0" />}
                          {kw._is_trending && <Flame size={12} className="text-rose-500 shrink-0" />}
                          {kw._is_evergreen && <Leaf size={12} className="text-emerald-500 shrink-0" />}
                        </div>
                      </td>
                      <td className="w-[72px] py-2 text-right pr-3 text-slate-600 text-xs" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {refreshingIds.has(kw.id) ? <RefreshCw size={14} className="text-indigo-400 animate-spin ml-auto" /> : (kw.last_volume || 0).toLocaleString()}
                      </td>
                      <td className="w-[60px] py-2 text-center">
                        {isNaN(comp) || kw.last_competition == null ? <span className="text-slate-300 text-xs">N/A</span> : (
                          <span className={`text-xs font-medium ${comp < 0.3 ? 'text-emerald-600' : comp < 0.7 ? 'text-amber-600' : 'text-rose-600'}`}>{comp.toFixed(2)}</span>
                        )}
                      </td>
                      <td className="w-[56px] py-2 text-center text-xs">
                        {isNaN(cpc) || cpc === 0 ? <span className="text-slate-300">N/A</span> : <span className={cpc >= 1.5 ? 'text-emerald-600 font-medium' : 'text-slate-500'}>${cpc.toFixed(2)}</span>}
                      </td>
                      <td className="w-[48px] py-2 text-center">
                        {(kw._used_in_count || 0) > 0 ? (
                          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">{kw._used_in_count}</span>
                        ) : <span className="text-xs text-slate-300">—</span>}
                      </td>
                      <td className="w-[40px] py-2 text-center relative">
                        <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(prev => prev === kw.id ? null : kw.id); }} className="p-1 rounded hover:bg-slate-100 transition-colors">
                          <MoreHorizontal size={16} className="text-slate-400" />
                        </button>
                        {openMenuId === kw.id && (
                          <div data-action-menu className="absolute right-0 z-30 w-48 bg-white rounded-lg border border-slate-200 shadow-lg py-1 top-8">
                            <ActionMenuItem icon={<Copy size={14} />} label="Copy keyword" onClick={() => { navigator.clipboard.writeText(kw.tag); toast.success('Copied!'); setOpenMenuId(null); }} />
                            <ActionMenuItem icon={<FolderPlus size={14} />} label="Add to preset" onClick={() => { onAddToPreset(kw.id); setOpenMenuId(null); }} />
                            {isKeywordStale(kw) && (
                              <ActionMenuItem icon={<RefreshCw size={14} className={refreshingIds.has(kw.id) ? 'animate-spin' : ''} />} label="Refresh data" disabled={refreshingIds.has(kw.id)} onClick={() => { onRefresh(kw); setOpenMenuId(null); }} />
                            )}
                            <div className="border-t border-slate-100 my-1" />
                            <ActionMenuItem icon={<Trash2 size={14} />} label="Remove from bank" onClick={() => { onDelete(kw.id, kw.tag); setOpenMenuId(null); }} danger />
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

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
  const [sortField, setSortField] = useState('last_volume'); // default: most popular first
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' | 'desc'
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Advanced Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ theme: '', niche: '', subNiche: '' });

  // Filter pills
  const [activePills, setActivePills] = useState([]);

  // Usage data from v_keyword_usage_count
  const [usageMap, setUsageMap] = useState({});

  // View mode: 'list' (flat table) | 'grouped' (by niche)
  const [viewMode, setViewMode] = useState('list');

  // Selection & action menu
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [openMenuId, setOpenMenuId] = useState(null);
  const [bulkPresetIds, setBulkPresetIds] = useState(new Set());
  const [copiedId, setCopiedId] = useState(null);

  // Preset sorting
  const [presetSort, setPresetSort] = useState({ key: 'title', dir: 'asc' });

  // Apply preset to listing modal
  const [applyPreset, setApplyPreset] = useState(null); // { preset, keywords }

  // Refresh stale keywords
  const [refreshingIds, setRefreshingIds] = useState(new Set());

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

  // Fetch keyword usage counts + trending/evergreen flags
  useEffect(() => {
    if (!user?.id) return;
    const fetchUsage = async () => {
      const { data, error } = await supabase
        .from('v_keyword_usage_count')
        .select('tag, listing_count, is_trending, is_evergreen')
        .eq('user_id', user.id);
      if (!error && data) {
        const map = {};
        data.forEach(r => { map[r.tag.toLowerCase()] = r; });
        setUsageMap(map);
      }
    };
    fetchUsage();
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

  const handleApplyPresetToListing = async (listingId, kws) => {
    const response = await axios.post('/api/seo/add-from-favorite', {
      listing_id: listingId,
      user_id: user.id,
      keywords: kws.map(kw => ({
        tag: kw.tag,
        last_volume: kw.last_volume,
        last_competition: kw.last_competition,
        last_cpc: kw.last_cpc,
        volume_history: kw.volume_history || [],
      })),
    });
    if (response.data?.success) {
      toast.success(`Added ${kws.length} keywords to listing`);
    } else {
      toast.error('Failed to apply preset');
    }
  };

  // Enrich keywords with computed fields
  const enrichedKeywords = useMemo(() => {
    return keywords.map(kw => {
      const usage = usageMap[kw.tag?.toLowerCase()] || {};
      const isTrending = usage.is_trending || false;
      const isEvergreen = usage.is_evergreen || false;
      return {
        ...kw,
        _used_in_count: usage.listing_count || 0,
        _is_trending: isTrending,
        _is_evergreen: isEvergreen,
      };
    });
  }, [keywords, usageMap]);

  // Filtered keywords
  const filtered = useMemo(() => {
    if (view === 'presets') {
      return presets.filter(p => !searchQuery ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.niche && p.niche.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    return enrichedKeywords.filter(kw => {
      // 1. Filter pills (AND logic)
      if (activePills.length > 0) {
        for (const pill of activePills) {
          switch (pill) {
            case 'gems':           if (!isGem(kw)) return false; break;
            case 'trending':       if (!kw._is_trending) return false; break;
            case 'highVolume':     if ((kw.last_volume || 0) < 5000) return false; break;
            case 'lowCompetition': { const c = parseFloat(kw.last_competition); if (isNaN(c) || c >= 0.5) return false; break; }
            case 'unused':         if (kw._used_in_count > 0) return false; break;
            case 'stale':          if (getFreshnessStatus(kw.last_sync_at).label !== 'Stale') return false; break;
          }
        }
      }

      // 2. Base search
      const matchesSearch = !searchQuery ||
        kw.tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (kw.theme && kw.theme.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (kw.niche && kw.niche.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (kw.sub_niche && kw.sub_niche.toLowerCase().includes(searchQuery.toLowerCase()));

      // 3. Gem panel filtering
      const checkComp = kw.last_competition != null ? parseFloat(kw.last_competition) : Infinity;
      const checkCpc = kw.last_cpc != null ? parseFloat(kw.last_cpc) : 0;
      const matchesGem = !showGemSettings || (
        (kw.last_volume || 0) >= gemThresholds.minVolume &&
        checkComp <= gemThresholds.maxCompetition &&
        checkCpc >= gemThresholds.minCpc
      );

      // 4. Advanced Category Filters
      const matchesTheme = !filters.theme || kw.theme === filters.theme;
      const matchesNiche = !filters.niche || kw.niche === filters.niche;
      const matchesSubNiche = !filters.subNiche || kw.sub_niche === filters.subNiche;

      return matchesSearch && matchesGem && matchesTheme && matchesNiche && matchesSubNiche;
    });
  }, [enrichedKeywords, presets, searchQuery, view, showGemSettings, gemThresholds, filters, activePills]);
    
  // Filtered presets
  const filteredPresets = view === 'presets' && searchQuery.trim()
    ? presets.filter(p => (
        p.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.niche?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.theme?.toLowerCase().includes(searchQuery.toLowerCase())
      ))
    : presets;

  // Pre-compute aggregates and sort presets
  const sortedPresets = useMemo(() => {
    const withAgg = filteredPresets.map(p => {
      const linked = (p.keyword_ids || []).map(id => keywords.find(k => k.id === id)).filter(Boolean);
      const validComp = linked.filter(k => !isNaN(parseFloat(k.last_competition)));
      const validCpc = linked.filter(k => !isNaN(parseFloat(k.last_cpc)));
      return {
        ...p,
        _totalVolume: linked.reduce((s, k) => s + (k.last_volume || 0), 0),
        _avgCompetition: validComp.length ? validComp.reduce((s, k) => s + parseFloat(k.last_competition), 0) / validComp.length : 0,
        _avgCpc: validCpc.length ? validCpc.reduce((s, k) => s + parseFloat(k.last_cpc), 0) / validCpc.length : 0,
      };
    });
    return [...withAgg].sort((a, b) => {
      let aVal, bVal;
      switch (presetSort.key) {
        case 'title': aVal = a.title?.toLowerCase() || ''; bVal = b.title?.toLowerCase() || ''; break;
        case 'composition': aVal = a.keyword_ids?.length || 0; bVal = b.keyword_ids?.length || 0; break;
        case 'totalVolume': aVal = a._totalVolume; bVal = b._totalVolume; break;
        case 'avgCompetition': aVal = a._avgCompetition; bVal = b._avgCompetition; break;
        case 'avgCpc': aVal = a._avgCpc; bVal = b._avgCpc; break;
        default: aVal = a.title?.toLowerCase() || ''; bVal = b.title?.toLowerCase() || '';
      }
      if (aVal < bVal) return presetSort.dir === 'asc' ? -1 : 1;
      if (aVal > bVal) return presetSort.dir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredPresets, keywords, presetSort]);

  function handlePresetSort(key) {
    setPresetSort(prev => ({
      key,
      dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc',
    }));
  }

  // Stale check helper
  const isKeywordStale = (kw) => {
    if (!kw.last_sync_at) return true;
    const days = (Date.now() - new Date(kw.last_sync_at).getTime()) / (1000 * 60 * 60 * 24);
    return days > STALE_DAYS;
  };

  // Grouped view: keywords grouped by Theme › Niche
  const groupedKeywords = useMemo(() => {
    if (viewMode !== 'grouped' || view !== 'keywords') return null;

    const groups = {};
    filtered.forEach(kw => {
      const theme = kw.theme || 'Uncategorized';
      const niche = kw.niche || '';
      const groupKey = theme;

      if (!groups[groupKey]) {
        groups[groupKey] = { key: groupKey, theme, keywords: [] };
      }
      groups[groupKey].keywords.push(kw);
    });

    Object.values(groups).forEach(group => {
      const kws = group.keywords;
      group.count = kws.length;
      group.avgVolume = Math.round(kws.reduce((s, k) => s + (k.last_volume || 0), 0) / kws.length);
      group.avgCompetition = +(kws.reduce((s, k) => s + (parseFloat(k.last_competition) || 0), 0) / kws.length).toFixed(2);
      group.totalUsed = kws.filter(k => (k._used_in_count || 0) > 0).length;
      group.gemsCount = kws.filter(k => isGem(k)).length;
      group.keywords.sort((a, b) => (b.last_volume || 0) - (a.last_volume || 0));
    });

    return Object.values(groups).sort((a, b) => b.count - a.count);
  }, [filtered, viewMode, view, gemThresholds]);

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
    if (sortField !== field) return <ChevronsUpDown size={10} className="text-slate-300 shrink-0" />;
    return sortDirection === 'asc'
      ? <ChevronUp size={10} className="text-indigo-600 shrink-0" />
      : <ChevronDown size={10} className="text-indigo-600 shrink-0" />;
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

  // Toggle filter pill
  const togglePill = (key) => {
    if (key === 'all') {
      setActivePills([]);
    } else {
      setActivePills(prev =>
        prev.includes(key)
          ? prev.filter(k => k !== key)
          : [...prev, key]
      );
    }
    setCurrentPage(1);
    setSelectedIds(new Set()); // Clear selection on filter change
  };

  // Row selection
  function toggleSelectOne(id) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    const visibleIds = paginatedKeywords.map(kw => kw.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) visibleIds.forEach(id => next.delete(id));
      else visibleIds.forEach(id => next.add(id));
      return next;
    });
  }

  // Bulk export CSV
  function handleBulkExportCSV() {
    const selected = enrichedKeywords.filter(kw => selectedIds.has(kw.id));
    const headers = ['Tag', 'Theme', 'Niche', 'Sub-niche', 'Volume', 'Competition', 'CPC', 'Used In'];
    const rows = selected.map(kw => [
      kw.tag, kw.theme || '', kw.niche || '', kw.sub_niche || '',
      kw.last_volume || '', kw.last_competition || '', kw.last_cpc || '', kw._used_in_count || 0,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pennyseo-keywords-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${selected.length} keywords to CSV`);
  }

  // Bulk add to preset
  function handleBulkAddToPreset() {
    setBulkPresetIds(new Set(selectedIds));
    setIsCreateModalOpen(true);
  }

  // Bulk delete
  async function handleBulkDelete() {
    const count = selectedIds.size;
    if (!window.confirm(`Delete ${count} keyword${count > 1 ? 's' : ''} from your bank? This cannot be undone.`)) return;

    const ids = Array.from(selectedIds);
    const { error } = await supabase
      .from('user_keyword_bank')
      .delete()
      .in('id', ids);

    if (error) {
      toast.error('Failed to delete keywords');
      return;
    }

    // Update local state
    setKeywords(prev => prev.filter(kw => !selectedIds.has(kw.id)));
    // Cascade-remove from presets locally
    setPresets(prevPresets => prevPresets.map(p => {
      if (!p.keyword_ids) return p;
      const cleaned = p.keyword_ids.filter(kid => !selectedIds.has(kid));
      return cleaned.length !== p.keyword_ids.length ? { ...p, keyword_ids: cleaned } : p;
    }));
    setSelectedIds(new Set());
    toast.success(`Deleted ${count} keyword${count > 1 ? 's' : ''}`);
  }

  // Refresh stale keyword(s) via DataForSEO
  async function handleRefreshKeyword(kw) {
    setRefreshingIds(prev => new Set([...prev, kw.id]));
    try {
      const res = await axios.post('/api/seo/refresh-keyword-bank', {
        keyword_bank_ids: [kw.id],
        tags: [kw.tag],
      });
      if (res.data?.results) {
        const fresh = res.data.results.find(r => r.tag === kw.tag);
        if (fresh && !fresh.error) {
          setKeywords(prev => prev.map(k => k.id !== kw.id ? k : {
            ...k,
            last_volume: fresh.last_volume ?? fresh.search_volume ?? k.last_volume,
            last_competition: fresh.last_competition ?? fresh.competition ?? k.last_competition,
            last_cpc: fresh.last_cpc ?? fresh.cpc ?? k.last_cpc,
            volume_history: fresh.volume_history || k.volume_history,
            last_sync_at: fresh.last_sync_at || new Date().toISOString(),
          }));
          toast.success(`Refreshed "${kw.tag}"`);
        }
      }
    } catch (err) {
      console.error('Refresh failed:', err);
      toast.error(`Failed to refresh "${kw.tag}"`);
    } finally {
      setRefreshingIds(prev => { const n = new Set(prev); n.delete(kw.id); return n; });
    }
  }

  async function handleBulkRefresh() {
    const staleSelected = enrichedKeywords.filter(kw => selectedIds.has(kw.id) && isKeywordStale(kw));
    if (staleSelected.length === 0) return;
    if (staleSelected.length > 20) {
      toast.error('Maximum 20 keywords per refresh. Select fewer keywords.');
      return;
    }
    setRefreshingIds(prev => new Set([...prev, ...staleSelected.map(k => k.id)]));
    try {
      const res = await axios.post('/api/seo/refresh-keyword-bank', {
        keyword_bank_ids: staleSelected.map(k => k.id),
        tags: staleSelected.map(k => k.tag),
      });
      if (res.data?.results) {
        const freshMap = {};
        res.data.results.forEach(r => { if (!r.error) freshMap[r.tag] = r; });
        setKeywords(prev => prev.map(k => {
          const f = freshMap[k.tag];
          if (!f) return k;
          return {
            ...k,
            last_volume: f.last_volume ?? f.search_volume ?? k.last_volume,
            last_competition: f.last_competition ?? f.competition ?? k.last_competition,
            last_cpc: f.last_cpc ?? f.cpc ?? k.last_cpc,
            volume_history: f.volume_history || k.volume_history,
            last_sync_at: f.last_sync_at || new Date().toISOString(),
          };
        }));
        toast.success(`Refreshed ${Object.keys(freshMap).length} keywords`);
      }
    } catch (err) {
      toast.error('Bulk refresh failed');
    } finally {
      setRefreshingIds(new Set());
    }
  }

  async function handleRefreshAllStale() {
    const allStale = filtered.filter(kw => isKeywordStale(kw));
    if (allStale.length === 0) return;
    if (allStale.length > 50) {
      toast.error(`Too many stale keywords (${allStale.length}). Use bulk select to refresh in batches of 20.`);
      return;
    }
    setRefreshingIds(prev => new Set([...prev, ...allStale.map(k => k.id)]));
    try {
      const res = await axios.post('/api/seo/refresh-keyword-bank', {
        keyword_bank_ids: allStale.map(k => k.id),
        tags: allStale.map(k => k.tag),
      });
      if (res.data?.results) {
        const freshMap = {};
        res.data.results.forEach(r => { if (!r.error) freshMap[r.tag] = r; });
        setKeywords(prev => prev.map(k => {
          const f = freshMap[k.tag];
          if (!f) return k;
          return {
            ...k,
            last_volume: f.last_volume ?? f.search_volume ?? k.last_volume,
            last_competition: f.last_competition ?? f.competition ?? k.last_competition,
            last_cpc: f.last_cpc ?? f.cpc ?? k.last_cpc,
            volume_history: f.volume_history || k.volume_history,
            last_sync_at: f.last_sync_at || new Date().toISOString(),
          };
        }));
        toast.success(`Refreshed ${Object.keys(freshMap).length} stale keywords`);
      }
    } catch (err) {
      toast.error('Refresh all stale failed');
    } finally {
      setRefreshingIds(new Set());
    }
  }

  // Close action menu on outside click
  useEffect(() => {
    if (!openMenuId) return;
    function handleClickOutside(e) {
      if (!e.target.closest('[data-action-menu]')) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  // Clear selection on tab switch
  useEffect(() => {
    setSelectedIds(new Set());
    setOpenMenuId(null);
  }, [view]);

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
        case '_used_in_count': return kw._used_in_count || 0;
        case 'last_sync_at': return kw.last_sync_at ? new Date(kw.last_sync_at).getTime() : 0;
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

  // Reset pagination on search, sort, filter, or view change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortField, sortDirection, view, filters, activePills]);

  // Pagination Logic
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedKeywords = sorted.slice(startIndex, endIndex);
  const totalPages = Math.ceil(sorted.length / pageSize) || 1;

  // Pill counts (computed from enriched keywords for accurate counts)
  const pillCounts = useMemo(() => {
    const counts = {};
    FILTER_PILL_CONFIG.forEach(f => {
      if (f.key === 'all') { counts.all = enrichedKeywords.length; return; }
      counts[f.key] = enrichedKeywords.filter(kw => {
        switch (f.key) {
          case 'gems':           return isGem(kw);
          case 'trending':       return kw._is_trending;
          case 'highVolume':     return (kw.last_volume || 0) >= 5000;
          case 'lowCompetition': { const c = parseFloat(kw.last_competition); return !isNaN(c) && c < 0.5; }
          case 'unused':         return kw._used_in_count === 0;
          case 'stale':          return getFreshnessStatus(kw.last_sync_at).label === 'Stale';
          default: return true;
        }
      }).length;
    });
    return counts;
  }, [enrichedKeywords, gemThresholds]);

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
            Favorite Tags
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

        {/* Filter Pills - Only on keywords view */}
        {view === 'keywords' && (
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            {FILTER_PILL_CONFIG.map(({ key, label, icon: Icon, color }) => {
              const isActive = key === 'all' ? activePills.length === 0 : activePills.includes(key);
              const colors = FILTER_COLORS[color];
              const count = pillCounts[key] || 0;
              return (
                <button
                  key={key}
                  onClick={() => togglePill(key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    isActive
                      ? colors.active
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {Icon && <Icon size={13} />}
                  {label}
                  <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                    isActive ? colors.badge : 'bg-slate-100 text-slate-400'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}

            {/* Refresh all stale button — only when Stale pill is active */}
            {activePills.includes('stale') && (pillCounts.stale || 0) > 0 && (
              <button
                onClick={handleRefreshAllStale}
                disabled={refreshingIds.size > 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={12} className={refreshingIds.size > 0 ? 'animate-spin' : ''} />
                Refresh all {pillCounts.stale} stale
              </button>
            )}
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

            {/* View mode toggle: List vs Grouped */}
            {view === 'keywords' && (
              <div className="flex items-center gap-0.5 border border-slate-200 rounded-lg p-0.5 shadow-sm">
                <button
                  onClick={() => { setViewMode('list'); setSelectedIds(new Set()); }}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'list'
                      ? 'bg-indigo-100 text-indigo-600'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="List view"
                >
                  <List size={16} />
                </button>
                <button
                  onClick={() => { setViewMode('grouped'); setSelectedIds(new Set()); }}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'grouped'
                      ? 'bg-indigo-100 text-indigo-600'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="Group by niche"
                >
                  <LayoutList size={16} />
                </button>
              </div>
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
          viewMode === 'list' ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left table-fixed">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-[11px] tracking-wider text-slate-400 font-medium">
                  <th className="w-[32px] pl-3 pr-1 py-3">
                    <input
                      type="checkbox"
                      checked={paginatedKeywords.length > 0 && paginatedKeywords.every(kw => selectedIds.has(kw.id))}
                      onChange={toggleSelectAll}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  <th className="w-[22%] py-3 px-1">
                    <button onClick={() => toggleSort('tag')} className="inline-flex items-center gap-1 hover:text-slate-600 transition-colors">
                      Tag <SortIcon field="tag" />
                    </button>
                  </th>
                  <th className="w-[18%] py-3 px-2">
                    <button onClick={() => toggleSort('theme')} className="inline-flex items-center gap-1 hover:text-slate-600 transition-colors">
                      Niche <SortIcon field="theme" />
                    </button>
                  </th>
                  <th className="w-[72px] py-3 text-right pr-3">
                    <button onClick={() => toggleSort('last_volume')} className="inline-flex items-center gap-1 justify-end w-full hover:text-slate-600 transition-colors">
                      Volume <SortIcon field="last_volume" />
                    </button>
                  </th>
                  <th className="w-[60px] py-3 text-center">
                    <button onClick={() => toggleSort('last_competition')} className="inline-flex items-center gap-1 justify-center w-full hover:text-slate-600 transition-colors">
                      Comp. <SortIcon field="last_competition" />
                    </button>
                  </th>
                  <th className="w-[56px] py-3 text-center">
                    <button onClick={() => toggleSort('last_cpc')} className="inline-flex items-center gap-1 justify-center w-full hover:text-slate-600 transition-colors">
                      CPC <SortIcon field="last_cpc" />
                    </button>
                  </th>
                  <th className="w-[48px] py-3 text-center">
                    <button onClick={() => toggleSort('_used_in_count')} className="inline-flex items-center gap-1 justify-center w-full hover:text-slate-600 transition-colors">
                      Used <SortIcon field="_used_in_count" />
                    </button>
                  </th>
                  <th className="w-[80px] py-3 text-center">Trend</th>
                  <th className="w-[56px] py-3 text-center">
                    <button onClick={() => toggleSort('last_sync_at')} className="inline-flex items-center gap-1 justify-center w-full hover:text-slate-600 transition-colors">
                      Fresh <SortIcon field="last_sync_at" />
                    </button>
                  </th>
                  <th className="w-[40px] py-3 text-center">Actions</th>
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
                    const comp = parseFloat(kw.last_competition);
                    const cpc = parseFloat(kw.last_cpc);
                    const nichePath = [kw.theme, kw.niche, kw.sub_niche].filter(Boolean).join(' › ');
                    const syncDate = kw.last_sync_at ? new Date(kw.last_sync_at) : null;
                    const daysSinceSync = syncDate ? (Date.now() - syncDate.getTime()) / (1000 * 60 * 60 * 24) : Infinity;
                    const isStale = daysSinceSync > STALE_DAYS;
                    const shortDate = syncDate
                      ? syncDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : '—';

                    return (
                      <tr key={kw.id} className={`hover:bg-slate-50/60 transition-colors group ${selectedIds.has(kw.id) ? 'bg-indigo-50/40' : ''} ${refreshingIds.has(kw.id) ? 'opacity-50 pointer-events-none' : ''}`}>
                        {/* Checkbox */}
                        <td className="pl-3 pr-1">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(kw.id)}
                            onChange={() => toggleSelectOne(kw.id)}
                            className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>

                        {/* Tag (with star) */}
                        <td className="py-2.5 px-1 overflow-hidden">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Star size={13} className="fill-amber-400 text-amber-400 shrink-0" />
                            <span className="font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors px-2.5 py-0.5 rounded-full text-xs cursor-default truncate" title={kw.tag}>
                                {kw.tag}
                            </span>
                            {isGem(kw) && (
                              <span title="Meets your High Potential criteria">
                                <Gem size={12} className="text-indigo-500 shrink-0" />
                              </span>
                            )}
                            {kw._is_trending && (
                              <span title="Trending across your listings">
                                <Flame size={12} className="text-rose-500 shrink-0" />
                              </span>
                            )}
                            {kw._is_evergreen && (
                              <span title="Evergreen keyword">
                                <Leaf size={12} className="text-emerald-500 shrink-0" />
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Niche (merged Theme › Niche › Sub-niche) */}
                        <td className="py-2.5 px-2 overflow-hidden">
                          <div className="text-xs truncate" title={nichePath || '—'}>
                            {kw.theme && <span className="text-slate-600">{kw.theme}</span>}
                            {kw.niche && <><span className="text-slate-300 mx-1">›</span><span className="text-slate-400">{kw.niche}</span></>}
                            {kw.sub_niche && <><span className="text-slate-300 mx-1">›</span><span className="text-slate-400">{kw.sub_niche}</span></>}
                            {!nichePath && <span className="text-slate-300">—</span>}
                          </div>
                        </td>

                        {/* Volume */}
                        <td className="py-2.5 text-right pr-3 text-slate-600 text-xs" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {refreshingIds.has(kw.id) ? (
                            <RefreshCw size={14} className="text-indigo-400 animate-spin ml-auto" />
                          ) : (
                            (kw.last_volume || 0).toLocaleString()
                          )}
                        </td>

                        {/* Competition */}
                        <td className="py-2.5 text-center">
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
                        <td className="py-2.5 text-center">
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

                        {/* Used In */}
                        <td className="py-2.5 text-center">
                          {kw._used_in_count === 0 ? (
                            <span className="text-slate-300 text-xs leading-none">—</span>
                          ) : (
                            <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              kw._used_in_count >= 3
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                            }`}>
                              {kw._used_in_count}
                            </span>
                          )}
                        </td>

                        {/* Trend */}
                        <td className="py-2.5">
                          <div className="flex justify-center">
                            <Sparkline data={kw.volume_history} />
                          </div>
                        </td>

                        {/* Freshness — show date, colored by recency */}
                        <td className="py-2.5 text-center">
                          {!syncDate ? (
                            <span className="text-xs text-slate-300" title="Never synced">—</span>
                          ) : isStale ? (
                            <>
                              <span className="text-xs text-amber-500 group-hover:hidden font-medium" title={`Stale — last synced: ${syncDate.toLocaleDateString()}`}>
                                {shortDate}
                              </span>
                              <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-full font-bold hidden group-hover:inline-flex" title={`Last synced: ${syncDate.toLocaleDateString()}`}>
                                Stale
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium" title={`Last synced: ${syncDate.toLocaleDateString()}`}>
                              {shortDate}
                            </span>
                          )}
                        </td>

                        {/* Actions (dropdown menu) */}
                        <td className="py-2.5 text-center relative">
                          <button
                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(prev => prev === kw.id ? null : kw.id); }}
                            className="p-1 rounded hover:bg-slate-100 transition-colors"
                          >
                            <MoreHorizontal size={16} className="text-slate-400" />
                          </button>
                          {openMenuId === kw.id && (
                            <div
                              data-action-menu
                              className={`absolute right-0 z-30 w-48 bg-white rounded-lg border border-slate-200 shadow-lg py-1 ${
                                (() => {
                                  const idx = paginatedKeywords.indexOf(kw);
                                  return idx >= paginatedKeywords.length - 3 ? 'bottom-8' : 'top-8';
                                })()
                              }`}
                            >
                              <ActionMenuItem
                                icon={<Copy size={14} />}
                                label="Copy keyword"
                                onClick={() => { navigator.clipboard.writeText(kw.tag); toast.success('Copied!'); setOpenMenuId(null); }}
                              />
                              <ActionMenuItem
                                icon={<FolderPlus size={14} />}
                                label="Add to preset"
                                onClick={() => { setBulkPresetIds(new Set([kw.id])); setIsCreateModalOpen(true); setOpenMenuId(null); }}
                              />
                              {isKeywordStale(kw) && (
                                <ActionMenuItem
                                  icon={<RefreshCw size={14} className={refreshingIds.has(kw.id) ? 'animate-spin' : ''} />}
                                  label="Refresh data"
                                  disabled={refreshingIds.has(kw.id)}
                                  onClick={() => { handleRefreshKeyword(kw); setOpenMenuId(null); }}
                                />
                              )}
                              <div className="border-t border-slate-100 my-1" />
                              <ActionMenuItem
                                icon={<Trash2 size={14} />}
                                label="Remove from bank"
                                onClick={() => { handleDelete(kw.id, kw.tag); setOpenMenuId(null); }}
                                danger
                              />
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Bulk Action Bar */}
          {selectedIds.size > 0 && (
            <div className="sticky bottom-0 z-10 bg-white border-t border-slate-200 px-4 py-3 flex items-center gap-3 shadow-sm">
              <span className="text-sm font-medium text-slate-700">
                {selectedIds.size} selected
              </span>

              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={handleBulkAddToPreset}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <FolderPlus size={14} />
                  Add to preset
                </button>

                <button
                  onClick={handleBulkExportCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <Download size={14} />
                  Export CSV
                </button>

                {/* Refresh stale — only when selected keywords include stale ones */}
                {enrichedKeywords.filter(kw => selectedIds.has(kw.id) && isKeywordStale(kw)).length > 0 && (
                  <button
                    onClick={handleBulkRefresh}
                    disabled={refreshingIds.size > 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-200 text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw size={14} className={refreshingIds.size > 0 ? 'animate-spin' : ''} />
                    Refresh stale ({enrichedKeywords.filter(kw => selectedIds.has(kw.id) && isKeywordStale(kw)).length})
                  </button>
                )}

                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>

              <button
                onClick={() => setSelectedIds(new Set())}
                className="ml-auto text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                Clear selection
              </button>
            </div>
          )}

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
                {startIndex + 1}-{Math.min(endIndex, sorted.length)} of {sorted.length} tags
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
          /* ── Grouped view ── */
          <div className="space-y-2">
            {(!groupedKeywords || groupedKeywords.length === 0) ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center text-slate-400 text-sm">
                {isLoading ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 size={24} className="text-indigo-500 animate-spin" />
                    <span>Loading your keyword bank...</span>
                  </div>
                ) : 'No keywords match the current filters.'}
              </div>
            ) : (
              groupedKeywords.map(group => (
                <NicheGroupAccordion
                  key={group.key}
                  group={group}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelectOne}
                  refreshingIds={refreshingIds}
                  openMenuId={openMenuId}
                  setOpenMenuId={setOpenMenuId}
                  isGem={isGem}
                  isKeywordStale={isKeywordStale}
                  onRefresh={handleRefreshKeyword}
                  onDelete={handleDelete}
                  onAddToPreset={(kwId) => { setBulkPresetIds(new Set([kwId])); setIsCreateModalOpen(true); }}
                />
              ))
            )}

            {/* Bulk Action Bar (shared with list view) */}
            {selectedIds.size > 0 && (
              <div className="sticky bottom-0 z-10 bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3 shadow-sm">
                <span className="text-sm font-medium text-slate-700">{selectedIds.size} selected</span>
                <div className="flex items-center gap-2 ml-4">
                  <button onClick={handleBulkAddToPreset} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                    <FolderPlus size={14} /> Add to preset
                  </button>
                  <button onClick={handleBulkExportCSV} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                    <Download size={14} /> Export CSV
                  </button>
                  {enrichedKeywords.filter(kw => selectedIds.has(kw.id) && isKeywordStale(kw)).length > 0 && (
                    <button onClick={handleBulkRefresh} disabled={refreshingIds.size > 0} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-200 text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-50">
                      <RefreshCw size={14} className={refreshingIds.size > 0 ? 'animate-spin' : ''} /> Refresh stale ({enrichedKeywords.filter(kw => selectedIds.has(kw.id) && isKeywordStale(kw)).length})
                    </button>
                  )}
                  <button onClick={handleBulkDelete} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors">
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
                <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs text-slate-400 hover:text-slate-600 transition-colors">Clear selection</button>
              </div>
            )}
          </div>
          )
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="overflow-x-auto">
               <table className="w-full text-sm text-left">
                 <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                   <tr>
                     <th className="px-4 py-3 font-semibold w-[25%] cursor-pointer hover:text-slate-700 select-none" onClick={() => handlePresetSort('title')}>
                       <div className="flex items-center gap-1">
                         Preset Name
                         {presetSort.key === 'title' && (presetSort.dir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                       </div>
                     </th>
                     <th className="px-3 py-3 font-semibold w-[30%]">Context</th>
                     <th className="px-3 py-3 font-semibold w-[10%] cursor-pointer hover:text-slate-700 select-none" onClick={() => handlePresetSort('composition')}>
                       <div className="flex items-center gap-1">
                         Composition
                         {presetSort.key === 'composition' && (presetSort.dir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                       </div>
                     </th>
                     <th className="px-3 py-3 font-semibold w-[10%] text-center cursor-pointer hover:text-slate-700 select-none" onClick={() => handlePresetSort('totalVolume')}>
                       <div className="flex items-center justify-center gap-1">
                         Total Volume
                         {presetSort.key === 'totalVolume' && (presetSort.dir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                       </div>
                     </th>
                     <th className="px-3 py-3 font-semibold w-[10%] text-center cursor-pointer hover:text-slate-700 select-none" onClick={() => handlePresetSort('avgCompetition')}>
                       <div className="flex items-center justify-center gap-1">
                         Avg. Competition
                         {presetSort.key === 'avgCompetition' && (presetSort.dir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                       </div>
                     </th>
                     <th className="px-3 py-3 font-semibold w-[10%] text-center cursor-pointer hover:text-slate-700 select-none" onClick={() => handlePresetSort('avgCpc')}>
                       <div className="flex items-center justify-center gap-1">
                         Avg. CPC
                         {presetSort.key === 'avgCpc' && (presetSort.dir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                       </div>
                     </th>
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
                    ) : sortedPresets.length === 0 ? (
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
                      sortedPresets.map(preset => (
                         <PresetRow
                            key={preset.id}
                            preset={preset}
                            bankKeywords={keywords}
                            onDelete={handleDeletePreset}
                            onUpdate={handleUpdatePresetField}
                            onRemoveKeyword={handleRemoveKeywordFromPreset}
                            onEditKeywords={setEditingPresetForKeywords}
                            onApplyToListing={(p, kws) => setApplyPreset({ preset: p, keywords: kws })}
                         />
                      ))
                    )}
                 </tbody>
               </table>
             </div>
             {!isPresetsLoading && sortedPresets.length > 0 && (
                <div className="bg-slate-50/50 border-t border-slate-100 px-4 py-3 text-xs text-slate-400 text-center">
                  Showing {sortedPresets.length} of {presets.length} presets
                </div>
              )}
          </div>
        )}

      </div>
      
      {/* Create Modal */}
      <CreatePresetModal
         isOpen={isCreateModalOpen}
         onClose={() => { setIsCreateModalOpen(false); setBulkPresetIds(new Set()); }}
         user={user}
         userKeywordBank={enrichedKeywords}
         preSelectedIds={bulkPresetIds.size > 0 ? Array.from(bulkPresetIds) : undefined}
         onSuccess={(newPreset) => setPresets(prev => [newPreset, ...prev])}
         existingPresets={presets}
         gemThresholds={gemThresholds}
      />

      {/* Apply Preset to Listing Modal */}
      <ApplyPresetModal
         isOpen={!!applyPreset}
         onClose={() => setApplyPreset(null)}
         preset={applyPreset?.preset}
         presetKeywords={applyPreset?.keywords}
         onApply={handleApplyPresetToListing}
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
