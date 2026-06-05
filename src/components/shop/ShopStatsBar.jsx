function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-md border border-slate-200 px-3 py-2.5">
      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">{label}</div>
      <div className="text-lg font-medium text-slate-900 tabular-nums">{value}</div>
    </div>
  );
}

export default function ShopStatsBar({ importedCount, optimizedCount, publishedCount }) {
  if (importedCount === 0 && optimizedCount === 0 && publishedCount === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-3 gap-2 mb-3">
      <StatCard label="Imported" value={importedCount} />
      <StatCard label="Optimized" value={optimizedCount} />
      <StatCard label="Published" value={publishedCount} />
    </div>
  );
}
