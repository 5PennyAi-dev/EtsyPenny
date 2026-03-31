import { ShoppingBag, Tag, CheckCircle, Download, TrendingUp, ExternalLink } from 'lucide-react';

const baseCards = [
  {
    key: 'active',
    label: 'Active listings',
    icon: ShoppingBag,
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    getValue: (p) => p.activeCount,
    getSub: () => 'on Etsy',
  },
  {
    key: 'avgTags',
    label: 'Avg. tags',
    icon: Tag,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    getValue: (p) => p.avgTags,
    getSub: (p) => {
      const v = p.avgTags;
      if (v >= 12) return 'Excellent tag coverage';
      if (v >= 8) return 'Good coverage';
      if (v >= 5) return 'Room to improve';
      return 'Needs attention';
    },
    getValueColor: (p) => {
      const v = p.avgTags;
      if (v >= 12) return 'text-emerald-600';
      if (v >= 8) return 'text-amber-600';
      return 'text-rose-600';
    },
  },
  {
    key: 'fullTags',
    label: 'Full tags (13/13)',
    icon: CheckCircle,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    getValue: (p) => p.fullTagsCount,
    getSub: (p) =>
      p.totalCount > 0
        ? `${Math.round((p.fullTagsCount / p.totalCount) * 100)}% of listings`
        : 'No listings yet',
  },
];

const importedCard = {
  key: 'imported',
  label: 'Imported',
  icon: Download,
  iconBg: 'bg-indigo-100',
  iconColor: 'text-indigo-600',
  getValue: (p) => p.importedCount,
  getSub: () => 'in PennySEO',
};

const improvementCard = {
  key: 'improvement',
  label: 'Avg. improvement',
  icon: TrendingUp,
  iconBg: 'bg-emerald-100',
  iconColor: 'text-emerald-600',
  getValue: (p) => p.avgImprovement != null ? `+${p.avgImprovement}` : '—',
  getSub: (p) => `${p.optimizedCount} listing${p.optimizedCount !== 1 ? 's' : ''} optimized`,
  getValueColor: (p) => p.avgImprovement > 0 ? 'text-emerald-600' : 'text-slate-800',
};

export default function ShopStatsBar({ etsyListings = [], importedListings = [], comparisonData = [] }) {
  const totalCount = etsyListings.length;
  const activeCount = etsyListings.filter((l) => l.state === 'active').length;
  const avgTags =
    totalCount > 0
      ? (etsyListings.reduce((sum, l) => sum + (l.tag_count ?? 0), 0) / totalCount).toFixed(1)
      : '—';
  const fullTagsCount = etsyListings.filter((l) => l.tag_count === 13).length;
  const importedCount = importedListings.length;

  // Compute avg improvement from comparison data
  const optimizedPairs = comparisonData.filter((d) => d.pennySeoScore != null);
  const optimizedCount = optimizedPairs.length;
  const avgImprovement = optimizedCount > 0
    ? Math.round(optimizedPairs.reduce((sum, d) => sum + (d.pennySeoScore - d.original_score), 0) / optimizedCount)
    : null;

  // Exported count
  const exportedCount = importedListings.filter(l => l.export_status === 'exported').length;

  // Show improvement card if any optimized listings exist, otherwise show imported card
  const fourthCard = optimizedCount > 0 ? improvementCard : importedCard;
  const cards = [...baseCards, fourthCard];

  // Add exported card when applicable
  if (exportedCount > 0) {
    cards.push({
      key: 'exported',
      label: 'Exported',
      icon: ExternalLink,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      getValue: () => exportedCount,
      getSub: () => 'pushed to Etsy',
    });
  }

  const props = {
    totalCount, activeCount, avgTags: Number(avgTags) || 0, fullTagsCount,
    importedCount, avgImprovement, optimizedCount, exportedCount,
  };

  return (
    <div className={`grid grid-cols-2 ${cards.length > 4 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-3`}>
      {cards.map((card) => {
        const Icon = card.icon;
        const valueColor = card.getValueColor ? card.getValueColor(props) : 'text-slate-800';
        return (
          <div
            key={card.key}
            className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-2"
          >
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 ${card.iconBg} rounded-lg flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${card.iconColor}`} strokeWidth={2} />
              </div>
              <span className="text-xs text-slate-500">{card.label}</span>
            </div>
            <div className={`text-2xl font-semibold ${valueColor}`}>
              {card.getValue(props)}
            </div>
            <p className="text-xs text-slate-400">{card.getSub(props)}</p>
          </div>
        );
      })}
    </div>
  );
}
