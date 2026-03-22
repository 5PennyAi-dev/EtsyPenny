import { LISTING_STATUSES, STATUS_PIPELINE } from '@/lib/listingStatuses';

export default function PipelineBar({ counts = {}, total = 0 }) {
  const activeStatuses = STATUS_PIPELINE.filter((key) => (counts[key] || 0) > 0);

  if (total === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Listing pipeline</h3>

      {/* Stacked bar */}
      <div className="flex rounded-lg overflow-hidden gap-0.5 bg-slate-200">
        {activeStatuses.map((key) => (
          <div
            key={key}
            style={{
              flex: counts[key] || 0,
              backgroundColor: LISTING_STATUSES[key].barColor,
            }}
            className="h-6 flex items-center justify-center text-white text-xs font-medium min-w-[28px]"
          >
            {counts[key]}
          </div>
        ))}
      </div>

      {/* Status pills */}
      <div className="flex flex-wrap gap-2 mt-3">
        {STATUS_PIPELINE.map(
          (key) =>
            (counts[key] || 0) > 0 && (
              <span
                key={key}
                className={`${LISTING_STATUSES[key].bg} ${LISTING_STATUSES[key].text} text-[11px] px-2.5 py-0.5 rounded-full font-medium`}
              >
                {counts[key]} {LISTING_STATUSES[key].label.toLowerCase()}
              </span>
            )
        )}
      </div>
    </div>
  );
}
