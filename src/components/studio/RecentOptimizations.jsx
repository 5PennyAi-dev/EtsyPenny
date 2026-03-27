import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { History } from 'lucide-react';
import Accordion from '../ui/Accordion';

const getScoreColor = (score) => {
  if (!score) return { background: '#f1f5f9', color: '#94a3b8' };
  if (score >= 80) return { background: '#d1fae5', color: '#065f46' };
  if (score >= 60) return { background: '#fef3c7', color: '#92400e' };
  return { background: '#fee2e2', color: '#991b1b' };
};

const getListingStatus = (listing) => {
  const s = listing.computed_status;
  if (s === 'OPTIMIZED') return { label: 'Optimized', bg: '#d1fae5', color: '#065f46' };
  if (s === 'DRAFT_READY') return { label: 'Draft ready', bg: '#fef3c7', color: '#92400e' };
  if (s === 'SEO_READY') return { label: 'SEO ready', bg: '#e0e7ff', color: '#3730a3' };
  if (s === 'ANALYZED') return { label: 'Analyzed', bg: '#dbeafe', color: '#1e40af' };
  return { label: 'New', bg: '#f1f5f9', color: '#64748b' };
};

function relativeTime(dateStr) {
  if (!dateStr) return '—';
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  return `${months} mo ago`;
}

const RecentOptimizations = ({ onViewResults }) => {
  const { user } = useAuth();
  const [recentListings, setRecentListings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchRecentListings();
    }
  }, [user]);

  const fetchRecentListings = async () => {
    try {
      const { data, error } = await supabase
        .from('v_dashboard_listings')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentListings(data || []);
    } catch (err) {
      console.error('Error fetching recent listings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <div className="text-center py-4 text-slate-400">Loading recent listings...</div>;
  if (recentListings.length === 0) return null;

  return (
    <div className="mt-8">
      <Accordion
        defaultOpen={false}
        title={
          <div className="flex items-center gap-2">
            <History size={16} className="text-indigo-600" />
            <span className="text-sm font-bold text-slate-900">Recent Listings</span>
          </div>
        }
        headerActions={
          <a href="/history" className="text-xs font-medium text-indigo-600 hover:underline flex items-center gap-1">
            View all &rarr;
          </a>
        }
      >
        <div style={{ width: '100%', borderTop: '1px solid #f1f5f9' }}>
          {recentListings.map(listing => {
            const status = getListingStatus(listing);
            const scoreStyle = getScoreColor(listing.listing_strength);

            return (
              <div
                key={listing.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 8px',
                  borderBottom: '1px solid #f1f5f9',
                  gap: 12,
                  cursor: 'pointer',
                }}
                onClick={() => onViewResults(listing.id)}
              >
                {/* Image — fixed 36px */}
                <div style={{ width: 36, flexShrink: 0 }}>
                  {listing.image_url
                    ? <img src={listing.image_url} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }} />
                    : <div style={{ width: 36, height: 36, borderRadius: 6, background: '#f1f5f9' }} />
                  }
                </div>

                {/* Product Name + Theme — grows but capped */}
                <div style={{ flex: 1, minWidth: 0, maxWidth: 320 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {listing.title || 'Untitled'}
                  </div>
                  {listing.theme && (
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                      {listing.theme}
                    </div>
                  )}
                </div>

                {/* Spacer */}
                <div style={{ flex: 1 }} />

                {/* Score — fixed 50px */}
                <div style={{ width: 50, flexShrink: 0, textAlign: 'center' }}>
                  {listing.listing_strength != null && (
                    <span style={{
                      fontSize: 12,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 999,
                      ...scoreStyle,
                    }}>
                      {listing.listing_strength}
                    </span>
                  )}
                </div>

                {/* Status — fixed 90px */}
                <div style={{ width: 90, flexShrink: 0 }}>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 500,
                    padding: '3px 10px',
                    borderRadius: 999,
                    background: status.bg,
                    color: status.color,
                    whiteSpace: 'nowrap',
                  }}>
                    {status.label}
                  </span>
                </div>

                {/* Date — fixed 90px */}
                <div style={{ width: 90, flexShrink: 0, fontSize: 12, color: '#94a3b8', textAlign: 'right' }}>
                  {relativeTime(listing.updated_at)}
                </div>

                {/* Action — fixed 60px */}
                <div style={{ width: 60, flexShrink: 0, textAlign: 'right' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewResults(listing.id);
                    }}
                    style={{ fontSize: 13, fontWeight: 500, color: '#4f46e5', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Open →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Accordion>
    </div>
  );
};

export default RecentOptimizations;
