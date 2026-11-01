function Metric({ label, value }) {
  return <span><span className="font-medium text-slate-700">{value}</span> {label}</span>;
}

export default function ShopStatsBar({ catalogTotal, catalogLoaded, workspaceImported, workspacePublished, loadedReadyToPublish }) {
  if (!catalogTotal && !workspaceImported) return null;

  return (
    <div className="mb-3 flex flex-col gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex flex-wrap gap-x-3 gap-y-1"><span className="font-medium uppercase tracking-wide text-slate-400">Catalog</span><Metric value={catalogTotal} label="active on Etsy" /><Metric value={catalogLoaded} label="loaded here" /></div>
      <span className="hidden text-slate-300 sm:inline">|</span>
      <div className="flex flex-wrap gap-x-3 gap-y-1"><span className="font-medium uppercase tracking-wide text-slate-400">Workspace</span><Metric value={workspaceImported} label="imported" /><Metric value={workspacePublished} label="published" /></div>
      <span className="hidden text-slate-300 sm:inline">|</span>
      <div><Metric value={loadedReadyToPublish} label="ready to review in loaded catalog" /></div>
    </div>
  );
}
