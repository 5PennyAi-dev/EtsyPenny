import { useState, useEffect, useMemo } from 'react';
import { Folder, Search, X, Loader2, Filter, Info, Tag, Gem, BarChart3, Target } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

const CreatePresetModal = ({ isOpen, onClose, user, userKeywordBank: externalBank, onSuccess, initialTheme, initialNiche, initialSubNiche, initialKeywordTags, preSelectedIds, currentListing, existingPresets, gemThresholds }) => {
  const [title, setTitle] = useState('');
  const [theme, setTheme] = useState('');
  const [niche, setNiche] = useState('');
  const [subNiche, setSubNiche] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [themes, setThemes] = useState([]);
  const [niches, setNiches] = useState([]);

  // Self-fetch bank if not provided externally and no initialKeywordTags
  const [selfFetchedBank, setSelfFetchedBank] = useState([]);
  const [isFetchingBank, setIsFetchingBank] = useState(false);

  // Determine mode: "performance" (from table) vs "bank" (full bank, SEO Lab style)
  const isPerformanceMode = initialKeywordTags?.length > 0;

  // In performance mode: build virtual items from initialKeywordTags
  // In bank mode: use external bank or self-fetched bank
  const [virtualItems, setVirtualItems] = useState([]);
  const userKeywordBank = isPerformanceMode ? virtualItems : (externalBank || selfFetchedBank);

  // Advanced Filters (bank mode only)
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ theme: '', niche: '', subNiche: '' });

  // Fetch bank data when modal opens in bank mode (no external bank, no initialKeywordTags)
  useEffect(() => {
    if (!isOpen || !user?.id || externalBank || isPerformanceMode) return;
    const fetchBank = async () => {
      setIsFetchingBank(true);
      const { data, error } = await supabase
        .from('user_keyword_bank')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (!error && data) setSelfFetchedBank(data);
      setIsFetchingBank(false);
    };
    fetchBank();
  }, [isOpen, user?.id, externalBank, isPerformanceMode]);

  // Fetch taxonomy for Theme/Niche dropdowns
  useEffect(() => {
    if (!isOpen || !user?.id) return;
    async function fetchTaxonomy() {
      const [themesRes, nichesRes, userThemesRes, userNichesRes] = await Promise.all([
        supabase.from('system_themes').select('name').eq('is_active', true).order('name'),
        supabase.from('system_niches').select('name').eq('is_active', true).order('name'),
        supabase.from('user_custom_themes').select('name').eq('user_id', user.id),
        supabase.from('user_custom_niches').select('name').eq('user_id', user.id),
      ]);
      setThemes([
        ...(userThemesRes.data || []).map(t => ({ name: t.name, isCustom: true })),
        ...(themesRes.data || []).map(t => ({ name: t.name, isCustom: false })),
      ]);
      setNiches([
        ...(userNichesRes.data || []).map(n => ({ name: n.name, isCustom: true })),
        ...(nichesRes.data || []).map(n => ({ name: n.name, isCustom: false })),
      ]);
    }
    fetchTaxonomy();
  }, [isOpen, user?.id]);

  // Reset state when modal opens and pre-fill
  useEffect(() => {
    if (!isOpen) return;
    setTitle('');
    setSearch('');
    setIsSubmitting(false);
    setShowFilters(false);
    setFilters({ theme: '', niche: '', subNiche: '' });
    setActivePill('all');

    // Pre-fill context from listing
    setTheme(initialTheme || '');
    setNiche(initialNiche || '');
    setSubNiche(initialSubNiche || '');

    if (isPerformanceMode) {
      // Build virtual items from the performance table keywords, sorted by volume desc
      const sorted = [...initialKeywordTags].sort((a, b) => (b.volume || 0) - (a.volume || 0));
      const items = sorted.map((kw, idx) => ({
        id: `perf-${idx}`,            // virtual ID
        tag: kw.tag,
        last_volume: kw.volume || 0,
        last_competition: kw.competition,
        last_cpc: kw.cpc,
        volume_history: kw.volume_history || [],
        _isVirtual: true
      }));
      setVirtualItems(items);

      // Pre-select top 10 by volume
      setSelectedIds(items.slice(0, 10).map(i => i.id));
    } else if (externalBank?.length > 0) {
      // Bank mode with initialKeywordTags: pre-select matching keywords
      if (initialKeywordTags?.length > 0) {
        const bankByTag = {};
        externalBank.forEach(kw => { bankByTag[kw.tag.toLowerCase()] = kw; });
        const sorted = [...initialKeywordTags].sort((a, b) => (b.volume || 0) - (a.volume || 0));
        const matchedIds = [];
        for (const kw of sorted) {
          if (matchedIds.length >= 10) break;
          const bankItem = bankByTag[kw.tag.toLowerCase()];
          if (bankItem) matchedIds.push(bankItem.id);
        }
        setSelectedIds(matchedIds);
      } else {
        setSelectedIds([]);
      }
    } else if (preSelectedIds?.length > 0) {
      // Bank mode with pre-selected IDs (from SEO Lab bulk action)
      setSelectedIds(preSelectedIds.slice(0, 10));
    } else {
      setSelectedIds([]);
    }
  }, [isOpen, initialTheme, initialNiche, initialSubNiche, initialKeywordTags, externalBank, isPerformanceMode, preSelectedIds]);

  // Filters (mainly for bank mode, but search works in both)
  const uniqueThemes = useMemo(() => {
    if (isPerformanceMode) return [];
    return [...new Set((userKeywordBank || []).map(k => k.theme).filter(Boolean))].sort();
  }, [userKeywordBank, isPerformanceMode]);

  const uniqueNiches = useMemo(() => {
    if (isPerformanceMode) return [];
    return [...new Set((userKeywordBank || [])
      .filter(k => !filters.theme || k.theme === filters.theme)
      .map(k => k.niche)
      .filter(Boolean))].sort();
  }, [userKeywordBank, filters.theme, isPerformanceMode]);

  const uniqueSubNiches = useMemo(() => {
    if (isPerformanceMode) return [];
    return [...new Set((userKeywordBank || [])
      .filter(k => (!filters.theme || k.theme === filters.theme) && (!filters.niche || k.niche === filters.niche))
      .map(k => k.sub_niche)
      .filter(Boolean))].sort();
  }, [userKeywordBank, filters.theme, filters.niche, isPerformanceMode]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  
  const handleClearFilters = () => {
    setFilters({ theme: '', niche: '', subNiche: '' });
  };

  // Quick filter pills (bank mode only)
  const [activePill, setActivePill] = useState('all');

  const MODAL_PILLS = [
    { key: 'all',            label: 'All',             icon: Tag,      color: 'slate' },
    { key: 'gems',           label: 'Gems',            icon: Gem,      color: 'emerald' },
    { key: 'highVolume',     label: 'High Volume',     icon: BarChart3, color: 'blue' },
    { key: 'lowCompetition', label: 'Low Competition', icon: Target,   color: 'teal' },
  ];

  const PILL_COLORS = {
    slate:   { active: 'bg-slate-100 text-slate-700 border-slate-300',     inactive: 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50' },
    emerald: { active: 'bg-emerald-100 text-emerald-700 border-emerald-300', inactive: 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50' },
    blue:    { active: 'bg-blue-100 text-blue-700 border-blue-300',        inactive: 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50' },
    teal:    { active: 'bg-teal-100 text-teal-700 border-teal-300',        inactive: 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50' },
  };

  const matchesPill = (kw, pill) => {
    switch (pill) {
      case 'gems': {
        if (!gemThresholds) return false;
        const vol = kw.last_volume || 0;
        const comp = parseFloat(kw.last_competition);
        const cpc = parseFloat(kw.last_cpc);
        return vol >= gemThresholds.minVolume && !isNaN(comp) && comp <= gemThresholds.maxCompetition && !isNaN(cpc) && cpc >= gemThresholds.minCpc;
      }
      case 'highVolume': return (kw.last_volume || 0) >= 5000;
      case 'lowCompetition': { const c = parseFloat(kw.last_competition); return !isNaN(c) && c < 0.5; }
      default: return true;
    }
  };

  const filteredBank = useMemo(() => {
    if (!isOpen) return [];
    return (userKeywordBank || []).filter(kw => {
      const matchesSearch = !search.trim() || kw.tag.toLowerCase().includes(search.toLowerCase());
      if (isPerformanceMode) return matchesSearch; // No category filters in performance mode
      const matchesTheme = !filters.theme || kw.theme === filters.theme;
      const matchesNiche = !filters.niche || kw.niche === filters.niche;
      const matchesSubNiche = !filters.subNiche || kw.sub_niche === filters.subNiche;
      const matchesPillFilter = activePill === 'all' || matchesPill(kw, activePill);
      return matchesSearch && matchesTheme && matchesNiche && matchesSubNiche && matchesPillFilter;
    });
  }, [userKeywordBank, search, filters, isOpen, isPerformanceMode, activePill, gemThresholds]);

  const isDuplicate = title.trim() && existingPresets?.some(p => p.title?.toLowerCase() === title.trim().toLowerCase());

  if (!isOpen) return null;

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
    if (isDuplicate) return toast.error(`A preset named "${title.trim()}" already exists.`);
    if (selectedIds.length === 0) return toast.error('Select at least one keyword');
    setIsSubmitting(true);

    try {
      // Server-side duplicate check as fallback
      const { data: existing } = await supabase
        .from('keyword_presets')
        .select('id')
        .eq('user_id', user.id)
        .ilike('title', title.trim())
        .maybeSingle();
      if (existing) {
        toast.error(`A preset named "${title.trim()}" already exists. Choose a different name.`);
        setIsSubmitting(false);
        return;
      }
      let presetKeywordIds = [];

      if (isPerformanceMode) {
        // In performance mode, we need to upsert all selected virtual items into the bank
        const selectedItems = virtualItems.filter(v => selectedIds.includes(v.id));
        
        // Fetch existing bank entries to avoid duplicates
        const { data: existingBank } = await supabase
          .from('user_keyword_bank')
          .select('id, tag')
          .eq('user_id', user.id);
        
        const bankByTag = {};
        (existingBank || []).forEach(kw => { bankByTag[kw.tag.toLowerCase()] = kw; });

        const toInsert = [];
        const alreadyInBank = [];

        for (const item of selectedItems) {
          const existing = bankByTag[item.tag.toLowerCase()];
          if (existing) {
            alreadyInBank.push(existing.id);
          } else {
            toInsert.push({
              user_id: user.id,
              tag: item.tag,
              product_type: currentListing?.product_types?.name || null,
              theme: currentListing?.theme || null,
              niche: currentListing?.niche || null,
              sub_niche: currentListing?.sub_niche || null,
              last_volume: item.last_volume ?? null,
              last_competition: item.last_competition != null ? parseFloat(item.last_competition) : null,
              last_cpc: item.last_cpc != null ? parseFloat(item.last_cpc) : null,
              volume_history: item.volume_history || []
            });
          }
        }

        // Insert new keywords into the bank
        let newIds = [];
        if (toInsert.length > 0) {
          const { data: insertedRows, error: insertError } = await supabase
            .from('user_keyword_bank')
            .insert(toInsert)
            .select('id');

          if (insertError) {
            console.error('Failed to save keywords to bank:', insertError);
            toast.error('Failed to save some keywords to your bank.');
          } else {
            newIds = (insertedRows || []).map(r => r.id);
          }
        }

        presetKeywordIds = [...alreadyInBank, ...newIds];

      } else {
        // Bank mode: selectedIds already reference real bank IDs
        presetKeywordIds = [...selectedIds];
      }

      // Create the preset
      const { data, error } = await supabase
        .from('keyword_presets')
        .insert({
          user_id: user.id,
          title: title.trim(),
          theme: theme.trim() || null,
          niche: niche.trim() || null,
          sub_niche: subNiche.trim() || null,
          keyword_ids: presetKeywordIds
        })
        .select()
        .single();

      if (error) {
        console.error(error);
        toast.error('Failed to create preset');
      } else {
        const savedCount = isPerformanceMode ? presetKeywordIds.length : 0;
        toast.success(`Preset created!${savedCount > 0 ? ` ${savedCount} keyword${savedCount > 1 ? 's' : ''} saved to your bank.` : ''}`);
        if (onSuccess) onSuccess(data);
        onClose();
      }
    } catch (err) {
      console.error('CreatePresetModal handleSubmit error:', err);
      toast.error('Failed to create preset');
    } finally {
      setIsSubmitting(false);
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
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-xs text-slate-500">
                {isPerformanceMode
                  ? 'Save your selected keywords as a reusable preset. Uncheck any you want to exclude.'
                  : 'Group up to 10 keywords for one-click application.'}
              </p>
              {!isPerformanceMode && (
                <div className="relative group">
                  <Info className="w-3.5 h-3.5 text-slate-400 cursor-help shrink-0" />
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg w-56 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                    Etsy allows 13 tags per listing. Presets are limited to 10 to encourage keyword diversity — reusing identical tags across listings hurts your shop's search visibility.
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-1 border-4 border-transparent border-b-slate-800"></div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
           <div className="space-y-4">
              <div>
                 <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Preset Title <span className="text-rose-500">*</span></label>
                 <input type="text" placeholder="e.g., Summer T-Shirts Broad Audience" value={title} onChange={e => setTitle(e.target.value)} className={`w-full px-3 py-2 border rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all ${isDuplicate ? 'border-rose-300' : 'border-slate-200'}`} />
                 {isDuplicate && <p className="text-xs text-rose-500 mt-1">A preset with this name already exists</p>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                 <div>
                   <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Theme</label>
                   <select value={theme} onChange={e => setTheme(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all">
                     <option value="">Select theme...</option>
                     {themes.some(t => t.isCustom) && (
                       <optgroup label="My Themes">
                         {themes.filter(t => t.isCustom).map(t => (
                           <option key={`custom-${t.name}`} value={t.name}>{t.name}</option>
                         ))}
                       </optgroup>
                     )}
                     <optgroup label="PennySEO Themes">
                       {themes.filter(t => !t.isCustom).map(t => (
                         <option key={t.name} value={t.name}>{t.name}</option>
                       ))}
                     </optgroup>
                     {theme && !themes.some(t => t.name === theme) && (
                       <option value={theme}>{theme}</option>
                     )}
                   </select>
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Niche</label>
                   <select value={niche} onChange={e => setNiche(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all">
                     <option value="">Select niche...</option>
                     {niches.some(n => n.isCustom) && (
                       <optgroup label="My Niches">
                         {niches.filter(n => n.isCustom).map(n => (
                           <option key={`custom-${n.name}`} value={n.name}>{n.name}</option>
                         ))}
                       </optgroup>
                     )}
                     <optgroup label="PennySEO Niches">
                       {niches.filter(n => !n.isCustom).map(n => (
                         <option key={n.name} value={n.name}>{n.name}</option>
                       ))}
                     </optgroup>
                     {niche && !niches.some(n => n.name === niche) && (
                       <option value={niche}>{niche}</option>
                     )}
                   </select>
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
                       <input type="text" placeholder={isPerformanceMode ? "Search keywords..." : "Search your bank..."} value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white outline-none transition-all" />
                     </div>
                     {!isPerformanceMode && (
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
                     )}
                   </div>
                   <div className={`text-xs font-bold px-2.5 py-1 rounded-md ml-3 ${selectedIds.length === 10 ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                     {selectedIds.length} / 10 Selected
                   </div>
                 </div>

                 {!isPerformanceMode && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {MODAL_PILLS.map(({ key, label, icon: Icon, color }) => {
                        const isActive = activePill === key;
                        const count = key === 'all' ? (userKeywordBank || []).length : (userKeywordBank || []).filter(kw => matchesPill(kw, key)).length;
                        return (
                          <button
                            key={key}
                            onClick={() => setActivePill(isActive && key !== 'all' ? 'all' : key)}
                            className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md border transition-all ${
                              isActive ? PILL_COLORS[color].active : PILL_COLORS[color].inactive
                            }`}
                          >
                            <Icon size={11} />
                            {label}
                            <span className={`text-[10px] px-1 py-0.5 rounded-full ${isActive ? 'bg-white/50' : 'bg-slate-100'}`}>{count}</span>
                          </button>
                        );
                      })}
                    </div>
                 )}

                 {!isPerformanceMode && showFilters && (
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
                 {isFetchingBank ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 size={20} className="animate-spin text-indigo-500" />
                      <span className="ml-2 text-xs text-slate-500">Loading keywords...</span>
                    </div>
                 ) : filteredBank.length === 0 ? (
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
                               <div className="flex items-center gap-1.5 shrink-0">
                                 {kw._used_in_count > 0 && <span className="text-[10px] text-indigo-500 font-medium">{kw._used_in_count}×</span>}
                                 <span className={`text-[10px] font-mono ${isSelected ? 'text-indigo-500' : 'text-slate-400'}`}>{(kw.last_volume || 0).toLocaleString()}</span>
                               </div>
                             </div>
                          );
                       })}
                    </div>
                 )}
              </div>
              {selectedIds.length > 0 && (() => {
                const selectedKws = (userKeywordBank || []).filter(kw => selectedIds.includes(kw.id));
                const avgVol = selectedKws.length ? Math.round(selectedKws.reduce((s, k) => s + (k.last_volume || 0), 0) / selectedKws.length) : 0;
                const validComp = selectedKws.filter(k => !isNaN(parseFloat(k.last_competition)));
                const avgComp = validComp.length ? validComp.reduce((s, k) => s + parseFloat(k.last_competition), 0) / validComp.length : 0;
                const validCpc = selectedKws.filter(k => !isNaN(parseFloat(k.last_cpc)));
                const avgCpc = validCpc.length ? validCpc.reduce((s, k) => s + parseFloat(k.last_cpc), 0) / validCpc.length : 0;
                return (
                  <div className="flex items-center gap-4 px-3 py-2 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
                    <span>Avg volume: <span className="font-medium text-slate-700">{avgVol.toLocaleString()}</span></span>
                    <span>Avg comp: <span className={`font-medium ${avgComp < 0.5 ? 'text-emerald-600' : avgComp < 0.9 ? 'text-amber-600' : 'text-rose-600'}`}>{avgComp.toFixed(2)}</span></span>
                    <span>Avg CPC: <span className="font-medium text-emerald-600">${avgCpc.toFixed(2)}</span></span>
                  </div>
                );
              })()}
           </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
           <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors">Cancel</button>
           <button onClick={handleSubmit} disabled={isSubmitting || selectedIds.length === 0 || isDuplicate} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition shadow-sm disabled:opacity-50 flex items-center gap-2">
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              Save Preset
           </button>
        </div>
      </div>
    </div>
  );
};

export default CreatePresetModal;
