export const LISTING_STATUSES = {
  NEW: {
    key: 'NEW',
    label: 'New',
    color: 'slate',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    icon: 'ImagePlus',
    action: 'Analyze',
    actionLabel: 'Analyze design',
    description: 'Image uploaded, needs visual analysis',
    barColor: '#888780',
  },
  ANALYZED: {
    key: 'ANALYZED',
    label: 'Analyzed',
    color: 'blue',
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    icon: 'Eye',
    action: 'Generate SEO',
    actionLabel: 'Generate SEO keywords',
    description: 'Visual analysis complete, ready for SEO',
    barColor: '#378ADD',
  },
  SEO_READY: {
    key: 'SEO_READY',
    label: 'SEO ready',
    color: 'teal',
    bg: 'bg-teal-100',
    text: 'text-teal-700',
    icon: 'Tags',
    action: 'Review',
    actionLabel: 'Review and select 13 keywords',
    description: 'Keywords generated, select your final 13',
    barColor: '#1D9E75',
  },
  DRAFT_READY: {
    key: 'DRAFT_READY',
    label: 'Draft ready',
    color: 'amber',
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    icon: 'FileEdit',
    action: 'Generate',
    actionLabel: 'Generate title and description',
    description: '13 keywords selected, generate listing copy',
    barColor: '#BA7517',
  },
  OPTIMIZED: {
    key: 'OPTIMIZED',
    label: 'Optimized',
    color: 'emerald',
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    icon: 'CheckCircle',
    action: 'View',
    actionLabel: 'Listing fully optimized',
    description: 'Title, description, and tags ready',
    barColor: '#639922',
  },
};

export const STATUS_PIPELINE = ['NEW', 'ANALYZED', 'SEO_READY', 'DRAFT_READY', 'OPTIMIZED'];

export function getStatusAction(status) {
  return LISTING_STATUSES[status] || LISTING_STATUSES.NEW;
}
