import { useNavigate } from 'react-router-dom';

const ROW_GRID = {
  display: 'grid',
  gridTemplateColumns: '36px 2fr 1fr 1fr 1fr 60px',
  alignItems: 'center',
  gap: '0 10px',
};

const HEADER_STYLE = {
  ...ROW_GRID,
  fontSize: 11,
  color: '#94a3b8',
  fontWeight: 500,
  paddingBottom: 8,
  borderBottom: '1px solid #f1f5f9',
  marginBottom: 4,
};

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
  if (!dateStr) return '-';
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes + 'm ago';
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + 'h ago';
  const days = Math.floor(hours / 24);
  if (days < 30) return days + 'd ago';
  const months = Math.floor(days / 30);
  return months + 'mo ago';
}

export default function ListingsTable({ listings = [], onAction }) {
  const navigate = useNavigate();

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Recent Listings</span>
        <button
          onClick={() => navigate('/history')}
          style={{ fontSize: 12, color: '#4f46e5', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          View all
        </button>
      </div>

      <div style={HEADER_STYLE}>
        <div>Image</div>
        <div>Product Name</div>
        <div style={{ textAlign: 'center' }}>Score</div>
        <div>Status</div>
        <div style={{ textAlign: 'right' }}>Date</div>
        <div style={{ textAlign: 'right' }}>Action</div>
      </div>

      {listings.map(function (listing) {
        var status = getListingStatus(listing);
        var scoreStyle = getScoreColor(listing.listing_strength);

        return (
          <div
            key={listing.id}
            style={{ ...ROW_GRID, padding: '8px 0', borderBottom: '1px solid #f8fafc', cursor: 'pointer' }}
            onClick={() => onAction(listing.id, listing.computed_status)}
          >
            <div>
              {listing.image_url
                ? <img src={listing.image_url} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }} />
                : <div style={{ width: 32, height: 32, borderRadius: 6, background: '#f1f5f9' }} />
              }
            </div>

            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{listing.title || 'Untitled'}</span>
                {listing.selected_keywords > 0 && (
                  <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 6, flexShrink: 0 }}>
                    {'* ' + listing.selected_keywords + ' kw'}
                  </span>
                )}
              </div>
              {listing.theme && (
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {listing.theme}
                </div>
              )}
            </div>

            <div style={{ textAlign: 'center' }}>
              {listing.listing_strength != null && (
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 999, ...scoreStyle }}>
                  {listing.listing_strength}
                </span>
              )}
            </div>

            <div>
              <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 999, background: status.bg, color: status.color, whiteSpace: 'nowrap' }}>
                {status.label}
              </span>
            </div>

            <div style={{ fontSize: 11, color: '#cbd5e1', textAlign: 'right' }}>
              {relativeTime(listing.updated_at)}
            </div>

            <div style={{ textAlign: 'right' }}>
              <button
                onClick={function (e) {
                  e.stopPropagation();
                  onAction(listing.id, listing.computed_status);
                }}
                style={{ fontSize: 12, fontWeight: 500, color: '#4f46e5', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Open
              </button>
            </div>
          </div>
        );
      })}

      {listings.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8', fontSize: 13 }}>
          No listings yet - create your first one!
        </div>
      )}
    </div>
  );
}
