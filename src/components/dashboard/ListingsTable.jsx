import { useNavigate } from 'react-router-dom';
import { LISTING_STATUSES, getStatusAction } from '@/lib/listingStatuses';
import { Image as ImageIcon } from 'lucide-react';

function ScorePill({ score }) {
  if (score == null) return <span className="text-xs text-slate-400">—</span>;
  let classes = 'bg-amber-100 text-amber-700';
  if (score >= 80) classes = 'bg-emerald-100 text-emerald-700';
  else if (score < 50) classes = 'bg-rose-100 text-rose-700';
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${classes}`}>
      {score}
    </span>
  );
}

export default function ListingsTable({ listings = [], onAction }) {
  const navigate = useNavigate();

  if (listings.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
        <p className="text-sm text-slate-400">No listings yet. Create your first one to get started.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100">
        <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide">Listings</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-xs text-slate-500 font-medium uppercase tracking-wide border-b border-slate-100">
              <th className="text-left py-2.5 px-4" style={{ width: 56 }}></th>
              <th className="text-left py-2.5 px-2">Name</th>
              <th className="text-center py-2.5 px-2">Score</th>
              <th className="text-center py-2.5 px-2">Status</th>
              <th className="text-center py-2.5 px-2">Tags</th>
              <th className="text-right py-2.5 px-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {listings.map((listing) => {
              const status = LISTING_STATUSES[listing.computed_status] || LISTING_STATUSES.NEW;
              const action = getStatusAction(listing.computed_status);
              return (
                <tr
                  key={listing.id}
                  className="border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => onAction(listing.id, listing.computed_status)}
                >
                  <td className="py-2 px-4" style={{ width: 56 }}>
                    {listing.image_url ? (
                      <img
                        src={listing.image_url}
                        alt=""
                        style={{ width: 36, height: 36, minWidth: 36, minHeight: 36 }}
                        className="rounded-lg object-cover"
                      />
                    ) : (
                      <div
                        style={{ width: 36, height: 36, minWidth: 36, minHeight: 36 }}
                        className="rounded-lg bg-slate-100 flex items-center justify-center"
                      >
                        <ImageIcon className="w-4 h-4 text-slate-400" strokeWidth={2} />
                      </div>
                    )}
                  </td>
                  <td className="py-2 px-2">
                    <span className="text-sm font-medium text-slate-800 truncate block max-w-[200px]">
                      {listing.title || 'Untitled'}
                    </span>
                    {listing.niche && (
                      <span className="text-xs text-slate-400">{listing.niche}</span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-center">
                    <ScorePill score={listing.listing_strength} />
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span className={`${status.bg} ${status.text} text-xs px-2 py-0.5 rounded-full font-medium`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span className={listing.selected_keywords >= 13 ? 'text-emerald-600 font-medium' : 'text-slate-500'}>
                      {listing.selected_keywords} / 13
                    </span>
                  </td>
                  <td className="py-2 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAction(listing.id, listing.computed_status);
                      }}
                      className="text-xs font-medium text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      {action.action}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 border-t border-slate-100 text-center">
        <button
          onClick={() => navigate('/history')}
          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium cursor-pointer transition-colors"
        >
          View all listings &rarr;
        </button>
      </div>
    </div>
  );
}
