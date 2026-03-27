import { LayoutGrid, TrendingUp, CheckCircle, Coins } from 'lucide-react';

const cards = [
  {
    key: 'total',
    label: 'Total listings',
    icon: LayoutGrid,
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    getValue: (p) => p.totalListings,
    getSub: (p) => `${p.createdThisMonth} this month`,
  },
  {
    key: 'score',
    label: 'Avg. SEO score',
    icon: TrendingUp,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    getValue: (p) => p.avgScore ?? '—',
    getSub: (p) => {
      const v = p.avgScore;
      if (v == null) return 'No data yet';
      if (v >= 80) return 'Strong performance';
      if (v >= 60) return 'Good foundation';
      if (v >= 40) return 'Needs improvement';
      return 'Needs attention';
    },
    getValueColor: (p) => {
      const v = p.avgScore;
      if (v == null) return 'text-slate-400';
      if (v >= 70) return 'text-emerald-600';
      if (v >= 40) return 'text-amber-600';
      return 'text-rose-600';
    },
  },
  {
    key: 'optimized',
    label: 'Fully optimized',
    icon: CheckCircle,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    getValue: (p) => p.optimizedCount,
    getSub: (p) =>
      p.totalListings > 0
        ? `${Math.round((p.optimizedCount / p.totalListings) * 100)}% of listings`
        : 'No listings yet',
  },
  {
    key: 'tokens',
    label: 'Tokens',
    icon: Coins,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    getValue: (p) => p.tokensMonthly + p.tokensBonus,
    getSub: (p) => {
      const plan = p.subscriptionPlan.charAt(0).toUpperCase() + p.subscriptionPlan.slice(1);
      const parts = [`${plan} plan`];
      if (p.tokensBonus > 0) parts.push(`+${p.tokensBonus} bonus`);
      return parts.join(' · ');
    },
  },
];

export default function QuickStats({
  totalListings = 0,
  createdThisMonth = 0,
  avgScore,
  optimizedCount = 0,
  tokensMonthly = 0,
  tokensBonus = 0,
  subscriptionPlan = 'free',
}) {
  const props = { totalListings, createdThisMonth, avgScore, optimizedCount, tokensMonthly, tokensBonus, subscriptionPlan };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
