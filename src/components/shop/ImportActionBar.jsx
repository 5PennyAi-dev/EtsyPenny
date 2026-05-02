import { Loader2, ExternalLink } from 'lucide-react';

export default function ImportActionBar({
  selectedCount,
  selectionMode,
  isImporting,
  onImport,
  limitRemaining,
  isScoring,
  onScore,
  tokenBalance = 0,
  onExport,
  exportCount = 0,
}) {
  const exceedsImportLimit = selectedCount > limitRemaining;
  const scoreCost = selectedCount * 3;
  const insufficientTokens = tokenBalance < scoreCost;

  return (
    <div className="fixed bottom-0 left-64 right-0 bg-white border-t border-slate-200 shadow-lg px-6 py-3 flex items-center justify-between z-40">
      <span className="text-sm font-medium text-slate-700">
        {selectedCount} listing{selectedCount !== 1 ? 's' : ''} selected
      </span>

      <div className="flex items-center gap-4">
        {/* Import mode */}
        {selectionMode === 'import' && (
          <>
            <span className="text-xs text-slate-400">
              Import limit: {limitRemaining} remaining
            </span>

            {exceedsImportLimit && (
              <span className="text-xs text-rose-600 font-medium">
                Exceeds your plan limit
              </span>
            )}

            <button
              onClick={onImport}
              disabled={isImporting || exceedsImportLimit}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
                isImporting || exceedsImportLimit
                  ? 'bg-indigo-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing...
                </>
              ) : (
                `Import ${selectedCount}`
              )}
            </button>
          </>
        )}

        {/* Score mode */}
        {selectionMode === 'score' && (
          <>
            {insufficientTokens && (
              <span className="text-xs text-rose-600 font-medium">
                Not enough tokens
              </span>
            )}

            <button
              onClick={onScore}
              disabled={isScoring || insufficientTokens}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
                isScoring || insufficientTokens
                  ? 'bg-emerald-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {isScoring ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Scoring...
                </>
              ) : (
                `Score ${selectedCount} (${scoreCost} tokens)`
              )}
            </button>
          </>
        )}

        {selectionMode === 'export' && (
          <>
            {exportCount > 5 && (
              <span className="text-xs text-rose-600 font-medium">
                Max 5 per batch
              </span>
            )}

            <button
              onClick={onExport}
              disabled={exportCount === 0 || exportCount > 5}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors ${
                exportCount === 0 || exportCount > 5
                  ? 'bg-[#F56400]/50 cursor-not-allowed'
                  : 'bg-[#F56400] hover:bg-[#E05A00]'
              }`}
            >
              <ExternalLink className="w-4 h-4" />
              Push to Etsy ({exportCount})
            </button>
          </>
        )}
      </div>
    </div>
  );
}
