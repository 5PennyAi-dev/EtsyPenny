import { Sparkles } from 'lucide-react';

function selectVariant({ importedCount, optimizedCount, publishedCount }) {
  if (importedCount === 0) return 'v1';
  if (optimizedCount === 0) return 'v2';
  if (publishedCount === 0) return 'v3';
  return null;
}

export { selectVariant };

export default function AmorceCard({
  importedCount,
  optimizedCount,
  publishedCount,
  onOpenDocs,
  onOpenStudioWithFirstImported,
}) {
  const variant = selectVariant({ importedCount, optimizedCount, publishedCount });
  if (!variant) return null;

  let title;
  let subtext;
  let ctaLabel;
  let onClick;

  if (variant === 'v1') {
    title = 'Select your first listings to optimize';
    subtext = 'Pick up to 5 listings below. Importing is free. You can then optimize them or check their current score.';
    ctaLabel = 'How it works';
    onClick = () => onOpenDocs('/docs/etsy-import');
  } else if (variant === 'v2') {
    title = 'Optimize your first listing';
    subtext = `You have ${importedCount} imported listings. Open one in Studio to generate optimized title, tags, and description.`;
    ctaLabel = 'Open Studio';
    onClick = () => onOpenStudioWithFirstImported();
  } else {
    title = 'Push your first optimization to Etsy';
    subtext = `You have ${optimizedCount} optimized listings. Select them below to publish to Etsy in one click.`;
    ctaLabel = 'See how';
    onClick = () => onOpenDocs('/docs/etsy-import#publishing');
  }

  const padding = variant === 'v1' ? 'p-5' : 'p-4';

  return (
    <div
      role="region"
      aria-label="Suggested next action"
      className={`flex items-center gap-4 ${padding} rounded-lg bg-indigo-50 mb-3`}
    >
      <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shrink-0">
        <Sparkles className="w-4 h-4 text-indigo-600" strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-indigo-900 mb-0.5">{title}</div>
        <div className="text-xs text-indigo-700 leading-snug">{subtext}</div>
      </div>
      <button
        type="button"
        onClick={onClick}
        className="shrink-0 px-3.5 py-1.5 text-xs font-medium rounded-md bg-white text-indigo-600 border border-slate-200 hover:bg-slate-50 transition"
      >
        {ctaLabel}
      </button>
    </div>
  );
}
