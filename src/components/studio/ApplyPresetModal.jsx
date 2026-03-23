import { useState, useEffect, useMemo } from 'react';
import { X, Search, Image, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const STATUS_COLORS = {
  NEW: 'bg-slate-100 text-slate-600',
  ANALYZED: 'bg-blue-100 text-blue-700',
  SEO_READY: 'bg-amber-100 text-amber-700',
  DRAFT_READY: 'bg-indigo-100 text-indigo-700',
  OPTIMIZED: 'bg-emerald-100 text-emerald-700',
};

const SCORE_COLOR = (score) => {
  if (score >= 70) return 'bg-emerald-100 text-emerald-700';
  if (score >= 40) return 'bg-amber-100 text-amber-700';
  return 'bg-rose-100 text-rose-700';
};

export default function ApplyPresetModal({ isOpen, onClose, preset, presetKeywords, onApply }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedListingId, setSelectedListingId] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setSearch('');
    setSelectedListingId(null);
    setApplying(false);
    fetchListings();
  }, [isOpen]);

  async function fetchListings() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('v_dashboard_listings')
        .select('*')
        .order('updated_at', { ascending: false });
      setListings(data || []);
    } catch (err) {
      console.error('Failed to fetch listings:', err);
    } finally {
      setLoading(false);
    }
  }

  const filteredListings = useMemo(() => {
    if (!search.trim()) return listings;
    const q = search.toLowerCase();
    return listings.filter(l =>
      l.title?.toLowerCase().includes(q) ||
      l.theme?.toLowerCase().includes(q) ||
      l.niche?.toLowerCase().includes(q)
    );
  }, [listings, search]);

  async function handleApply() {
    if (!selectedListingId) return;
    setApplying(true);
    try {
      await onApply(selectedListingId, presetKeywords);
      onClose();
    } catch (err) {
      console.error('Failed to apply preset:', err);
    } finally {
      setApplying(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Apply "{preset?.title}"
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              This will add {presetKeywords?.length || 0} keywords to the selected listing's keyword pool.
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-slate-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search listings..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white outline-none transition-all"
            />
          </div>
        </div>

        {/* Listing rows */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="animate-spin text-indigo-500" />
              <span className="ml-2 text-sm text-slate-500">Loading listings...</span>
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="text-center text-sm text-slate-400 py-12">
              {search ? 'No listings match your search.' : 'No listings found.'}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredListings.map(listing => {
                const isSelected = selectedListingId === listing.id;
                return (
                  <div
                    key={listing.id}
                    onClick={() => setSelectedListingId(listing.id)}
                    className={`flex items-center gap-3 px-6 py-3 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-50 border-l-2 border-l-indigo-500'
                        : 'hover:bg-slate-50 border-l-2 border-l-transparent'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="w-9 h-9 rounded-lg bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                      {listing.image_url ? (
                        <img src={listing.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Image size={16} className="text-slate-300" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium truncate ${isSelected ? 'text-indigo-700' : 'text-slate-700'}`}>
                          {listing.title || listing.generated_title || 'Untitled Listing'}
                        </span>
                        {listing.listing_strength != null && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${SCORE_COLOR(listing.listing_strength)}`}>
                            {Math.round(listing.listing_strength)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {(listing.theme || listing.niche) && (
                          <span className="text-xs text-slate-400 truncate">
                            {[listing.theme, listing.niche].filter(Boolean).join(' › ')}
                          </span>
                        )}
                        {listing.computed_status && (
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${STATUS_COLORS[listing.computed_status] || 'bg-slate-100 text-slate-500'}`}>
                            {listing.computed_status.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!selectedListingId || applying}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            {applying && <Loader2 size={14} className="animate-spin" />}
            Apply Keywords
          </button>
        </div>
      </div>
    </div>
  );
}
