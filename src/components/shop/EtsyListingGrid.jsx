import { Package, Check, Loader2 } from 'lucide-react';

function getTagBadgeClasses(tagCount) {
  if (tagCount === 13) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (tagCount >= 7) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-rose-50 text-rose-700 border-rose-200';
}

function getScoreColor(score) {
  if (score >= 70) return 'text-emerald-600';
  if (score >= 40) return 'text-amber-600';
  return 'text-rose-600';
}

function getScoreBarColor(score) {
  if (score >= 70) return 'bg-emerald-500';
  if (score >= 40) return 'bg-amber-500';
  return 'bg-rose-500';
}

function getCardStatus({ isImported, scoringStatus, originalScore, pennySeoScore, exportStatus }) {
  if (!isImported) return 'fresh';
  if (exportStatus === 'error') return 'error';
  if (exportStatus === 'exported') return 'published';
  if (scoringStatus === 'scoring') return 'scoring';
  if (scoringStatus === 'error') return 'error';
  if (scoringStatus === 'scored' && originalScore != null) {
    if (pennySeoScore != null && pennySeoScore !== originalScore) return 'optimized';
    return 'scored';
  }
  return 'imported';
}

const STATUS_PILL_STYLES = {
  imported:  { label: 'Imported',  classes: 'bg-slate-200 text-slate-700' },
  scored:    { label: 'Scored',    classes: 'bg-amber-200 text-amber-900' },
  optimized: { label: 'Optimized', classes: 'bg-green-200 text-green-900' },
  published: { label: 'Published', classes: 'bg-blue-200 text-blue-900' },
  error:     { label: 'Error',     classes: 'bg-rose-200 text-rose-900' },
};

function StatusPill({ status }) {
  if (status === 'scoring') {
    return (
      <span className="absolute top-1.5 right-1.5 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium tracking-tight bg-indigo-200 text-indigo-900">
        <Loader2 className="w-2.5 h-2.5 animate-spin" strokeWidth={2.5} />
        Scoring
      </span>
    );
  }
  const style = STATUS_PILL_STYLES[status];
  if (!style) return null;
  return (
    <span className={`absolute top-1.5 right-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-medium tracking-tight ${style.classes}`}>
      {style.label}
    </span>
  );
}

function ListingCard({ listing, isImported, isSelected, onToggleSelect, scoringStatus, originalScore, pennySeoScore, exportStatus, listingId, onOpenInStudio, isPreparing }) {
  const tagCount = listing.tag_count ?? 0;
  const isScored = scoringStatus === 'scored' && originalScore != null;
  const isSelectable = true;

  const cardStatus = getCardStatus({ isImported, scoringStatus, originalScore, pennySeoScore, exportStatus });

  // Score pill: shown for scored / optimized / published. Prefer optimized score when available.
  let scorePillValue = null;
  if (cardStatus === 'scored') {
    scorePillValue = originalScore;
  } else if (cardStatus === 'optimized' || cardStatus === 'published') {
    scorePillValue = pennySeoScore != null ? pennySeoScore : originalScore;
  }

  return (
    <div
      onClick={() => isSelectable && onToggleSelect(listing.etsy_listing_id)}
      className={`bg-white rounded-md overflow-hidden transition-all ${
        isSelected ? 'border-2 border-indigo-500' : 'border border-slate-200'
      } ${isSelectable ? 'cursor-pointer hover:shadow-md' : ''}`}
    >
      {/* Image */}
      <div className="aspect-square relative bg-slate-100">
        {listing.thumbnail_url ? (
          <img
            src={listing.thumbnail_url}
            alt={listing.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-10 h-10 text-slate-300" strokeWidth={1.5} />
          </div>
        )}

        {/* Checkbox overlay — top-left */}
        {isSelectable && (
          <div className="absolute top-2 left-2">
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                isSelected
                  ? 'bg-indigo-600 border-indigo-600'
                  : 'bg-white/80 border-slate-300 backdrop-blur-sm'
              }`}
            >
              {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
            </div>
          </div>
        )}

        {/* Status pill — top-right, only for imported (or beyond) */}
        {cardStatus !== 'fresh' && <StatusPill status={cardStatus} />}

        {/* Score pill — bottom-left, for scored / optimized / published */}
        {scorePillValue != null && (
          <span className="absolute bottom-1.5 left-1.5 text-[10px] px-1.5 py-0.5 rounded bg-white/90 text-slate-900 font-medium tabular-nums">
            {scorePillValue}
          </span>
        )}
      </div>

      {/* Text content */}
      <div className="p-2 space-y-1.5">
        <h3 className="text-sm font-medium text-slate-800 line-clamp-1 leading-snug">
          {listing.title}
        </h3>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getTagBadgeClasses(tagCount)}`}
          >
            {tagCount}/13 tags
          </span>
          {isScored ? (
            <div className="flex items-center gap-1.5 flex-1">
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${getScoreBarColor(originalScore)}`}
                  style={{ width: `${originalScore}%` }}
                />
              </div>
              <span className={`text-xs font-semibold ${getScoreColor(originalScore)}`}>
                {originalScore}
              </span>
            </div>
          ) : (
            <span className="text-xs text-slate-400">&mdash;</span>
          )}
        </div>

        {/* Open in Studio — for imported but not yet scored/prepared listings */}
        {isImported && scoringStatus === 'pending' && !listingId && onOpenInStudio && (
          <button
            onClick={(e) => { e.stopPropagation(); onOpenInStudio(listing.etsy_listing_id); }}
            disabled={isPreparing}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors disabled:text-indigo-400"
          >
            {isPreparing ? 'Preparing...' : 'Open in Studio →'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function EtsyListingGrid({ listings = [], importedIds, importedListings = [], selectedIds, onToggleSelect, onOpenInStudio, preparingListingId }) {
  if (listings.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" strokeWidth={1.5} />
        <p className="text-sm">No listings found</p>
      </div>
    );
  }

  // Build lookup for imported listing data
  const importedLookup = {};
  for (const imp of importedListings) {
    importedLookup[imp.etsy_listing_id] = imp;
  }

  return (
    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {listings.map((listing) => {
        const imported = importedLookup[listing.etsy_listing_id];
        return (
          <ListingCard
            key={listing.etsy_listing_id}
            listing={listing}
            isImported={importedIds.has(listing.etsy_listing_id)}
            isSelected={selectedIds.has(listing.etsy_listing_id)}
            onToggleSelect={onToggleSelect}
            scoringStatus={imported?.scoring_status}
            originalScore={imported?.original_score}
            pennySeoScore={imported?.listings?.listings_global_eval?.[0]?.listing_strength ?? null}
            exportStatus={imported?.export_status}
            listingId={imported?.listing_id}
            onOpenInStudio={onOpenInStudio}
            isPreparing={preparingListingId === listing.etsy_listing_id}
          />
        );
      })}
    </div>
  );
}
