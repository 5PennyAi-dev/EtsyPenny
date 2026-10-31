import { Check, ExternalLink, Loader2, MoreHorizontal, Package } from 'lucide-react';
import { useState } from 'react';

function scoreClass(score) {
  if (score >= 70) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (score >= 40) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-rose-50 text-rose-700 border-rose-200';
}

function statusClass(key) {
  if (key === 'attention') return 'bg-rose-50 text-rose-700 border-rose-200';
  if (key === 'published') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (key === 'ready') return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  return 'bg-slate-50 text-slate-600 border-slate-200';
}

function activityLabel(imported) {
  const value = imported?.last_exported_at || imported?.scored_at || imported?.imported_at;
  if (!value || Number.isNaN(new Date(value).getTime())) return '—';
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function actionLabel(action) {
  return { optimize: 'Optimize', prepare: 'Open Studio', score: 'Select to score', retry_score: 'Retry score', retry_preparation: 'Retry preparation', continue: 'Continue', review: 'Review', view: 'View', working: 'In progress' }[action] || 'View';
}

function ListingRow({ row, isSelected, onToggleSelect, onOpenInStudio }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { etsyListing: listing, imported, ux } = row;
  const score = imported?.listings?.listings_global_eval?.[0]?.listing_strength ?? imported?.original_score;
  const isWorking = ux.action === 'working';
  const canOpenStudio = Boolean(imported);
  const canReview = imported?.scoring_status === 'scored' && (imported?.selected_keyword_count ?? 0) >= 13;
  const displayedAction = ux.action === 'review' && !canReview ? 'continue' : ux.action;
  const handleAction = () => {
    if (['prepare', 'retry_preparation', 'continue'].includes(displayedAction) && canOpenStudio) return onOpenInStudio(listing.etsy_listing_id);
    if (!isWorking) onToggleSelect(listing.etsy_listing_id);
  };

  return (
    <div className={`relative grid min-h-[88px] grid-cols-[auto_44px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-b border-slate-100 px-3 py-3 last:border-b-0 lg:min-h-[72px] lg:grid-cols-[auto_44px_minmax(170px,1.8fr)_minmax(120px,1fr)_64px_minmax(130px,1fr)_72px_auto_auto] lg:gap-3 lg:px-4 ${isSelected ? 'bg-indigo-50/60' : 'bg-white'}`}>
      <button type="button" aria-label={`${isSelected ? 'Deselect' : 'Select'} ${listing.title}`} onClick={() => onToggleSelect(listing.etsy_listing_id)} className={`flex h-5 w-5 items-center justify-center rounded border ${isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white text-transparent hover:border-indigo-400'}`}><Check size={14} strokeWidth={3} /></button>
      {listing.thumbnail_url ? <img src={listing.thumbnail_url} alt="" className="h-11 w-11 rounded-lg bg-slate-100 object-cover" loading="lazy" /> : <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100"><Package size={20} className="text-slate-400" /></div>}
      <div className="min-w-0"><p className="truncate text-sm font-medium text-slate-800">{listing.title || 'Untitled listing'}</p><p className="mt-0.5 truncate text-xs text-slate-500 lg:hidden">{ux.progress} · {ux.publication}</p></div>
      <span className="hidden text-xs text-slate-600 lg:block">{ux.progress}</span>
      <span className={`hidden w-fit rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums lg:block ${score == null ? 'border-slate-200 text-slate-400' : scoreClass(score)}`}>{score ?? '—'}</span>
      <span className={`hidden w-fit rounded-full border px-2 py-0.5 text-xs font-medium lg:block ${statusClass(ux.publicationKey)}`}>{ux.publication}</span>
      <span className="hidden text-xs text-slate-500 lg:block">{activityLabel(imported)}</span>
      <button type="button" onClick={handleAction} disabled={isWorking} className="col-start-3 row-start-2 inline-flex w-fit shrink-0 items-center justify-center rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 lg:col-auto lg:row-auto">{isWorking && <Loader2 size={13} className="mr-1 animate-spin" />}{actionLabel(displayedAction)}</button>
      <div className="relative"><button type="button" aria-label={`More actions for ${listing.title}`} aria-expanded={isMenuOpen} onClick={() => setIsMenuOpen((current) => !current)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"><MoreHorizontal size={18} /></button>{isMenuOpen && <div className="absolute right-0 z-20 mt-1 w-40 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">{canOpenStudio && <button type="button" onClick={() => { setIsMenuOpen(false); onOpenInStudio(listing.etsy_listing_id); }} className="block w-full rounded px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50">Open in Studio</button>}{listing.etsy_url && <a href={listing.etsy_url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50">View on Etsy <ExternalLink size={12} /></a>}</div>}</div>
    </div>
  );
}

export default function EtsyListingGrid({ rows = [], selectedIds, onToggleSelect, onOpenInStudio }) {
  if (rows.length === 0) return <div className="py-12 text-center text-sm text-slate-500"><Package className="mx-auto mb-3 text-slate-300" size={36} /><p>No listings found</p></div>;
  return <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="hidden grid-cols-[auto_44px_minmax(170px,1.8fr)_minmax(120px,1fr)_64px_minmax(130px,1fr)_72px_auto_auto] items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-slate-500 lg:grid"><span /><span /><span>Listing</span><span>SEO progress</span><span>Score</span><span>Publication</span><span>Activity</span><span>Action</span><span /></div>{rows.map((row) => <ListingRow key={row.etsyListing.etsy_listing_id} row={row} isSelected={selectedIds.has(row.etsyListing.etsy_listing_id)} onToggleSelect={onToggleSelect} onOpenInStudio={onOpenInStudio} />)}</div>;
}
