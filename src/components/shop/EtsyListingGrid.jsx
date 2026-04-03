import { Package, Check, Loader2, AlertCircle } from 'lucide-react';

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

function StatusBadge({ scoringStatus, originalScore }) {
  if (scoringStatus === 'scoring') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100/90 text-indigo-600 backdrop-blur-sm">
        <Loader2 className="w-3 h-3 animate-spin" strokeWidth={2.5} />
        Scoring...
      </span>
    );
  }
  if (scoringStatus === 'scored' && originalScore != null) {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold backdrop-blur-sm ${
        originalScore >= 70 ? 'bg-emerald-100/90 text-emerald-700' :
        originalScore >= 40 ? 'bg-amber-100/90 text-amber-700' :
        'bg-rose-100/90 text-rose-700'
      }`}>
        {originalScore}
      </span>
    );
  }
  if (scoringStatus === 'error') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100/90 text-rose-600 backdrop-blur-sm">
        <AlertCircle className="w-3 h-3" strokeWidth={2.5} />
        Error
      </span>
    );
  }
  // pending (imported but not scored)
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100/90 text-slate-600 backdrop-blur-sm">
      <Check className="w-3 h-3" strokeWidth={2.5} />
      Imported
    </span>
  );
}

function ListingCard({ listing, isImported, isSelected, onToggleSelect, scoringStatus, originalScore, pennySeoScore, exportStatus, listingId, onOpenInStudio, isPreparing }) {
  const tagCount = listing.tag_count ?? 0;
  const isScored = scoringStatus === 'scored' && originalScore != null;
  const hasDelta = isScored && pennySeoScore != null && pennySeoScore !== originalScore;
  const delta = hasDelta ? pennySeoScore - originalScore : 0;
  // All cards are selectable — exclusive mode logic in MyShopPage prevents mixing
  const isSelectable = true;

  // Status bottom border color (exported takes priority over optimized)
  const cardStatus = !isImported ? null
    : exportStatus === 'exported' ? 'exported'
    : (scoringStatus !== 'scored') ? 'imported'
    : (pennySeoScore != null && pennySeoScore !== originalScore) ? 'optimized'
    : 'scored';
  const statusBorderColor = { imported: '#94a3b8', scored: '#f59e0b', optimized: '#22c55e', exported: '#3b82f6' }[cardStatus];

  return (
    <div
      onClick={() => isSelectable && onToggleSelect(listing.etsy_listing_id)}
      className={`bg-white border rounded-xl overflow-hidden transition-all ${
        isImported ? 'border-slate-200 border-l-2 border-l-indigo-300' : 'border-slate-200'
      } ${isSelected ? 'ring-2 ring-indigo-500' : ''} ${
        isSelectable ? 'cursor-pointer hover:shadow-md' : ''
      }`}
      style={statusBorderColor ? { borderBottom: `7px solid ${statusBorderColor}` } : undefined}
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

        {/* Checkbox overlay — shown when card is selectable */}
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

        {/* Status overlay — top-right, always shown for imported cards */}
        {isImported && (
          <div className="absolute top-2 right-2">
            <StatusBadge scoringStatus={scoringStatus} originalScore={originalScore} />
          </div>
        )}

        {/* Delta badge — bottom-right, shown when optimized */}
        {hasDelta && (
          <div className="absolute bottom-2 right-2">
            <span className={`px-1.5 py-0.5 rounded text-xs font-bold backdrop-blur-sm ${
              delta > 0 ? 'bg-emerald-100/90 text-emerald-700' : 'bg-rose-100/90 text-rose-700'
            }`}>
              {delta > 0 ? '+' : ''}{delta}
            </span>
          </div>
        )}

        {/* Export status badge — bottom-left */}
        {exportStatus === 'exported' && (
          <div className="absolute bottom-2 left-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm">
            <Check className="w-3 h-3 text-white" strokeWidth={3} />
          </div>
        )}
        {exportStatus === 'error' && (
          <div className="absolute bottom-2 left-2 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center shadow-sm">
            <AlertCircle className="w-3 h-3 text-white" strokeWidth={3} />
          </div>
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
