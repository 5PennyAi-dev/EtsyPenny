import { ArrowRight, ExternalLink, TrendingUp, TrendingDown, Minus, Package } from 'lucide-react';

function getScoreColor(score) {
  if (score >= 70) return 'text-emerald-600';
  if (score >= 40) return 'text-amber-600';
  return 'text-rose-600';
}

function getScoreBg(score) {
  if (score >= 70) return 'bg-emerald-50 border-emerald-200';
  if (score >= 40) return 'bg-amber-50 border-amber-200';
  return 'bg-rose-50 border-rose-200';
}

function ScoreBox({ label, score, tagLabel }) {
  return (
    <div className={`flex-1 border rounded-lg p-3 text-center ${getScoreBg(score)}`}>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${getScoreColor(score)}`}>{score}</p>
      {tagLabel && <p className="text-xs text-slate-400 mt-1">{tagLabel}</p>}
    </div>
  );
}

export default function BeforeAfterCard({ etsyListing, pennySeoScore, onOpenInStudio }) {
  const originalScore = etsyListing.original_score ?? 0;
  const tagCount = etsyListing.tag_count ?? 0;
  const hasRealAfter = pennySeoScore != null && pennySeoScore !== originalScore;
  const delta = hasRealAfter ? pennySeoScore - originalScore : null;

  const DeltaIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const deltaColor = delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-rose-600' : 'text-slate-500';
  const deltaBarColor = delta > 0 ? 'bg-emerald-500' : delta < 0 ? 'bg-rose-500' : 'bg-slate-300';
  const deltaText = delta > 0 ? `+${delta} improvement` : delta < 0 ? `${delta} regression` : 'No change';

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      {/* Header: thumbnail + title */}
      <div className="flex items-center gap-3">
        {etsyListing.thumbnail_url ? (
          <img
            src={etsyListing.thumbnail_url}
            alt={etsyListing.original_title}
            className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5 text-slate-300" strokeWidth={1.5} />
          </div>
        )}
        <h3 className="text-sm font-medium text-slate-800 line-clamp-1 flex-1">
          {etsyListing.original_title}
        </h3>
      </div>

      {hasRealAfter ? (
        <>
          {/* Full comparison: Before → After */}
          <div className="flex items-center gap-3">
            <ScoreBox label="Original" score={originalScore} tagLabel={`${tagCount}/13 tags`} />
            <ArrowRight className="w-5 h-5 text-slate-300 flex-shrink-0" strokeWidth={2} />
            <ScoreBox label="PennySEO" score={pennySeoScore} tagLabel="13/13 tags" />
          </div>

          {/* Delta bar */}
          <div className="space-y-1.5">
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${deltaBarColor}`}
                style={{ width: `${Math.min(100, Math.abs(delta))}%` }}
              />
            </div>
            <div className={`flex items-center gap-1 ${deltaColor}`}>
              <DeltaIcon className="w-3.5 h-3.5" strokeWidth={2} />
              <span className="text-xs font-medium">{deltaText}</span>
            </div>
          </div>

          <button
            onClick={onOpenInStudio}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors w-full justify-center"
          >
            <ExternalLink className="w-4 h-4" strokeWidth={2} />
            Open in Studio
          </button>
        </>
      ) : (
        <>
          {/* Before only + CTA */}
          <div className="flex items-center gap-3">
            <ScoreBox label="Original Score" score={originalScore} tagLabel={`${tagCount}/13 tags`} />
          </div>

          <button
            onClick={onOpenInStudio}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors w-full justify-center"
          >
            Optimize in SEO Studio
            <ArrowRight className="w-4 h-4" strokeWidth={2} />
          </button>
        </>
      )}
    </div>
  );
}
