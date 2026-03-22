import {
  ImagePlus,
  Eye,
  Tags,
  FileEdit,
  CheckCircle,
  AlertTriangle,
  Plus,
} from 'lucide-react';
import { LISTING_STATUSES, STATUS_PIPELINE } from '@/lib/listingStatuses';

const ICONS = {
  ImagePlus,
  Eye,
  Tags,
  FileEdit,
  CheckCircle,
};

function getActionDescription(key, count) {
  const descriptions = {
    NEW: `${count} listing${count > 1 ? 's' : ''} uploaded — waiting for visual analysis`,
    ANALYZED: `${count} listing${count > 1 ? 's' : ''} analyzed — ready for SEO generation`,
    SEO_READY: `${count} listing${count > 1 ? 's' : ''} with keywords — review and select your final 13`,
    DRAFT_READY: `${count} listing${count > 1 ? 's' : ''} ready — generate title and description`,
    OPTIMIZED: `${count} listing${count > 1 ? 's' : ''} fully optimized`,
  };
  return descriptions[key] || '';
}

export default function NextActions({ counts = {}, onNavigate, onNewListing }) {
  const actionableStatuses = STATUS_PIPELINE.filter(
    (key) => key !== 'OPTIMIZED' && (counts?.[`count_${key.toLowerCase()}`] || 0) > 0
  );
  const listingsBelow50 = counts?.listings_below_50 || 0;
  const hasActions = actionableStatuses.length > 0 || listingsBelow50 > 0;

  if (!hasActions) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-3">
          <CheckCircle className="w-6 h-6 text-emerald-600" strokeWidth={2} />
        </div>
        <h3 className="text-base font-medium text-slate-800 mb-1">All caught up!</h3>
        <p className="text-sm text-slate-500 mb-4">
          Create a new listing to get started.
        </p>
        <button
          onClick={onNewListing}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New listing
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Next actions</h3>
      <div className="space-y-2">
        {actionableStatuses.map((key) => {
          const status = LISTING_STATUSES[key];
          const Icon = ICONS[status.icon] || ImagePlus;
          const count = counts[`count_${key.toLowerCase()}`] || 0;

          return (
            <div
              key={key}
              className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <div
                className={`w-8 h-8 ${status.bg} rounded-lg flex items-center justify-center flex-shrink-0`}
              >
                <Icon className={`w-4 h-4 ${status.text}`} strokeWidth={2} />
              </div>
              <span className="text-sm text-slate-600 flex-1">
                {getActionDescription(key, count)}
              </span>
              <span
                className={`${status.bg} ${status.text} w-6 h-6 rounded-full text-xs font-medium flex items-center justify-center flex-shrink-0`}
              >
                {count}
              </span>
              <button
                onClick={() => onNavigate(null, key)}

                className="text-xs font-medium text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors flex-shrink-0"
              >
                {status.action}
              </button>
            </div>
          );
        })}

        {listingsBelow50 > 0 && (
          <div className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-slate-50 transition-colors">
            <div className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-rose-600" strokeWidth={2} />
            </div>
            <span className="text-sm text-slate-600 flex-1">
              {listingsBelow50} listing{listingsBelow50 > 1 ? 's' : ''} with SEO score below 50
            </span>
            <span className="bg-rose-100 text-rose-700 w-6 h-6 rounded-full text-xs font-medium flex items-center justify-center flex-shrink-0">
              {listingsBelow50}
            </span>
            <button
              onClick={() => onNavigate(null, 'LOW_SCORE')}
              className="text-xs font-medium text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors flex-shrink-0"
            >
              Fix
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
