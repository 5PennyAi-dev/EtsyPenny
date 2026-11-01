import { ExternalLink, Loader2 } from 'lucide-react';

function BulkButton({ children, onClick, disabled, tone = 'indigo' }) {
  const tones = {
    indigo: 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300',
    emerald: 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300',
    slate: 'bg-slate-700 hover:bg-slate-800 disabled:bg-slate-300',
  };
  return <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-white transition-colors disabled:cursor-not-allowed ${tones[tone]}`}>{children}</button>;
}

export default function ImportActionBar({
  selectedCount, plan, isImporting, onImport, limitRemaining,
  isScoring, onScore, tokenBalance = 0, onReview,
}) {
  const importCount = plan.importIds.length;
  const scoreCount = plan.scoreIds.length;
  const reviewCount = plan.reviewIds.length;
  const skippedCount = plan.skippedIds.length;
  const scoreCost = scoreCount * 3;
  const importLimited = importCount > limitRemaining;
  const insufficientTokens = tokenBalance < scoreCost;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white px-4 py-3 shadow-lg lg:left-64 lg:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <span className="text-sm font-medium text-slate-700">{selectedCount} listing{selectedCount !== 1 ? 's' : ''} selected</span>
          <p className="text-xs text-slate-500">Each action applies only to compatible listings.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {importCount > 0 && <BulkButton onClick={() => onImport(plan.importIds)} disabled={isImporting || importLimited}>{isImporting && <Loader2 className="h-4 w-4 animate-spin" />}{isImporting ? 'Importing…' : `Import ${importCount}`}</BulkButton>}
          {scoreCount > 0 && <BulkButton tone="emerald" onClick={() => onScore(plan.scoreIds)} disabled={isScoring || insufficientTokens}>{isScoring && <Loader2 className="h-4 w-4 animate-spin" />}{isScoring ? 'Scoring…' : `Score SEO ${scoreCount} (${scoreCost} credits)`}</BulkButton>}
          {reviewCount > 0 && <BulkButton tone="slate" onClick={() => onReview(plan.reviewIds)} disabled={reviewCount > 5}><ExternalLink className="h-4 w-4" />Review ${reviewCount}{reviewCount > 5 ? ' (max 5)' : ''}</BulkButton>}
          {importLimited && <span className="text-xs font-medium text-rose-600">Import limit: {limitRemaining} remaining</span>}
          {scoreCount > 0 && insufficientTokens && <span className="text-xs font-medium text-rose-600">Not enough credits</span>}
          {skippedCount > 0 && <span className="text-xs text-slate-500">{skippedCount} need an individual action.</span>}
        </div>
      </div>
    </div>
  );
}
