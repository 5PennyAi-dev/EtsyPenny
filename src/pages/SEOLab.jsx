import { useState, useEffect, useRef } from 'react';
import { FlaskConical, Star, Search, RefreshCw, Trash2, Pencil, TrendingUp, ArrowUpRight, ArrowDownRight, Loader2, Gem, Settings2, X, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

// --- Sparkline (copied from ResultsDisplay for self-containment) ---
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
        <polyline fill="none" stroke={isPositive ? "#10b981" : "#f43f5e"} strokeWidth="1.5" points={points} />
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

// --- Main Page ---
const SEOLab = () => {
  const { user } = useAuth();
  const [keywords, setKeywords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [showGemSettings, setShowGemSettings] = useState(false);
  const [sortField, setSortField] = useState(null); // null = no sort (default order)
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'
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
    const fetchBank = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('user_keyword_bank')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Failed to fetch keyword bank:', error);
        toast.error('Failed to load keyword bank.');
      }
      if (data) setKeywords(data);
      setIsLoading(false);
    };
    fetchBank();
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
      toast.success(`"${tag}" removed from Keyword Bank`);
    }
    setDeletingId(null);
  };

  // Filtered keywords
  const filtered = searchQuery.trim()
    ? keywords.filter(k => k.tag.toLowerCase().includes(searchQuery.toLowerCase()))
    : keywords;

  // Sort toggle: null → asc → desc → null
  const toggleSort = (field) => {
    if (sortField !== field) {
      setSortField(field);
      setSortDirection('asc');
    } else if (sortDirection === 'asc') {
      setSortDirection('desc');
    } else {
      setSortField(null);
      setSortDirection('asc');
    }
  };

  // Sort icon helper
  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronsUpDown size={12} className="text-slate-300" />;
    return sortDirection === 'asc'
      ? <ChevronUp size={12} className="text-indigo-600" />
      : <ChevronDown size={12} className="text-indigo-600" />;
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
        default: return '';
      }
    };
    return [...filtered].sort((a, b) => {
      const aVal = getValue(a);
      const bVal = getValue(b);
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  })();

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

        {/* Stats Cards */}
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

        {/* Search Bar + Gem Settings */}
        <div className="flex items-start gap-4 flex-wrap">
          <div className="relative max-w-md flex-1 min-w-[240px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search keywords..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 shadow-sm"
            />
          </div>
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
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">
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
                  sorted.map((kw) => {
                    const freshness = getFreshnessStatus(kw.last_sync_at);
                    const comp = parseFloat(kw.last_competition);
                    const cpc = parseFloat(kw.last_cpc);

                    return (
                      <tr key={kw.id} className="hover:bg-slate-50/60 transition-colors group">
                        {/* Tag */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Star size={14} className="fill-amber-400 text-amber-400 shrink-0" />
                            <span className="font-semibold text-slate-800">{kw.tag}</span>
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
            <div className="bg-slate-50/50 border-t border-slate-100 px-4 py-3 text-xs text-slate-400 text-center">
              Showing {filtered.length} of {totalCount} keywords
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
};

export default SEOLab;
