import { useState, useEffect, useRef } from 'react';
import { Star, Search, Gem, Sparkles, X, Loader2, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'suggested', label: 'Suggested' },
  { key: 'gems', label: 'Gems' },
];

const FavoritesPickerModal = ({ isOpen, onClose, onAddBatchKeywords, isAddingBatch, user, currentListing, existingKeywords = new Set() }) => {
  const [bankKeywords, setBankKeywords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedTags, setSelectedTags] = useState(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gemThresholds, setGemThresholds] = useState({ minVolume: 1000, maxCompetition: 0.4, minCpc: 1.0 });
  const backdropRef = useRef(null);

  // Fetch bank + gem settings when modal opens
  useEffect(() => {
    if (!isOpen || !user?.id) return;
    setSelectedTags(new Set());
    setSearchQuery('');
    setActiveFilter('all');

    const fetchData = async () => {
      setIsLoading(true);
      const [bankRes, settingsRes] = await Promise.all([
        supabase.from('user_keyword_bank').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('user_settings').select('gem_min_volume, gem_max_competition, gem_min_cpc').eq('user_id', user.id).single()
      ]);
      if (bankRes.data) setBankKeywords(bankRes.data);
      if (settingsRes.data) {
        setGemThresholds({
          minVolume: settingsRes.data.gem_min_volume ?? 1000,
          maxCompetition: settingsRes.data.gem_max_competition ?? 0.4,
          minCpc: settingsRes.data.gem_min_cpc ?? 1.0,
        });
      }
      setIsLoading(false);
    };
    fetchData();
  }, [isOpen, user?.id]);

  if (!isOpen) return null;

  // Filter logic
  const isGem = (kw) => {
    const vol = kw.last_volume || 0;
    const comp = parseFloat(kw.last_competition);
    const cpc = parseFloat(kw.last_cpc);
    return vol >= gemThresholds.minVolume && !isNaN(comp) && comp <= gemThresholds.maxCompetition && !isNaN(cpc) && cpc >= gemThresholds.minCpc;
  };

  const isSuggested = (kw) => {
    if (!currentListing) return false;
    const t = (currentListing.theme || '').toLowerCase();
    const n = (currentListing.niche || '').toLowerCase();
    const kwTheme = (kw.theme || '').toLowerCase();
    const kwNiche = (kw.niche || '').toLowerCase();
    return (t && kwTheme && kwTheme.includes(t)) || (n && kwNiche && kwNiche.includes(n));
  };

  let filtered = bankKeywords;
  if (activeFilter === 'suggested') filtered = filtered.filter(isSuggested);
  if (activeFilter === 'gems') filtered = filtered.filter(isGem);
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(kw => kw.tag.toLowerCase().includes(q));
  }

  const toggleSelect = (tag) => {
    setSelectedTags(prev => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag); else next.add(tag);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (selectedTags.size === 0 || !onAddBatchKeywords) return;
    setIsSubmitting(true);
    const tags = [...selectedTags];
    await onAddBatchKeywords(tags);
    setIsSubmitting(false);
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === backdropRef.current) onClose();
  };

  return (
    <div ref={backdropRef} onClick={handleBackdropClick} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Star size={18} className="text-amber-400 fill-amber-400" />
            Add from Keyword Bank
          </h2>
          <button onClick={onClose} disabled={isSubmitting} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50">
            <X size={16} />
          </button>
        </div>

        {/* Search + Filters */}
        <div className="px-5 pt-4 pb-3 space-y-3 border-b border-slate-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search keywords..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none placeholder:text-slate-400"
            />
          </div>
          <div className="flex items-center gap-2">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  activeFilter === f.key
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                {f.key === 'gems' && <Gem size={12} className="inline mr-1 -mt-0.5" />}
                {f.key === 'suggested' && <Sparkles size={12} className="inline mr-1 -mt-0.5" />}
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto min-h-0 px-2 py-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 size={20} className="text-indigo-500 animate-spin mb-2" />
              <span className="text-sm text-slate-400">Loading keyword bank...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Star size={24} className="text-slate-200 mb-2" />
              <p className="text-sm text-slate-400">
                {searchQuery ? 'No matching keywords.' : activeFilter !== 'all' ? 'No keywords match this filter.' : 'Your keyword bank is empty.'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((kw) => {
                const isDuplicate = existingKeywords.has(kw.tag.toLowerCase());
                const isChecked = selectedTags.has(kw.tag);
                const comp = parseFloat(kw.last_competition);
                return (
                  <div
                    key={kw.id}
                    onClick={() => !isDuplicate && !isSubmitting && toggleSelect(kw.tag)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                      isDuplicate
                        ? 'opacity-40 cursor-not-allowed bg-slate-50'
                        : isChecked
                          ? 'bg-indigo-50/60 border border-indigo-100'
                          : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isDuplicate || isSubmitting}
                      onChange={() => {}}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0 disabled:opacity-50"
                    />

                    {/* Tag + Star */}
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <Star size={12} className="text-amber-400 fill-amber-400 shrink-0" />
                      <span className="text-sm font-semibold text-slate-700 truncate">{kw.tag}</span>
                      {isGem(kw) && <Gem size={12} className="text-indigo-500 shrink-0" />}
                      {isDuplicate && (
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded ml-1 shrink-0 flex items-center gap-0.5">
                          <Check size={10} /> Added
                        </span>
                      )}
                    </div>

                    {/* Compact metrics */}
                    <div className="flex items-center gap-3 shrink-0 text-xs text-slate-500">
                      <span className="font-mono">{(kw.last_volume || 0).toLocaleString()}</span>
                      {!isNaN(comp) && (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                          comp < 0.3 ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : comp < 0.7 ? 'bg-amber-50 text-amber-700 border-amber-100'
                          : 'bg-rose-50 text-rose-700 border-rose-100'
                        }`}>{comp.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium">
            {isSubmitting
              ? `Adding ${selectedTags.size} keywords...`
              : `${selectedTags.size} selected`
            }
          </span>
          <button
            onClick={handleSubmit}
            disabled={selectedTags.size === 0 || isSubmitting}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm"
          >
            {isSubmitting ? (
              <><Loader2 size={14} className="animate-spin" /> Adding...</>
            ) : (
              <><Star size={14} /> Add Selected Keywords</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FavoritesPickerModal;
