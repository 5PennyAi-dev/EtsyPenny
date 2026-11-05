import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import Layout from '@/components/Layout';
import { filterSeoListings, getSeoListingPresentation, SEO_STATUS_LABELS } from '@/lib/seo-listings-utils';
import { getMyShopUxState, getMyShopWorkflowPresentation } from '@/lib/my-shop-utils';

const STATUS_CONFIG = {
  new: {
    computed: 'NEW',
    label: SEO_STATUS_LABELS.NEW,
    color: '#64748b',
    bg: '#f1f5f9',
  },
  analyzed: {
    computed: 'ANALYZED',
    label: SEO_STATUS_LABELS.ANALYZED,
    color: '#1e40af',
    bg: '#dbeafe',
  },
  'seo-ready': {
    computed: 'SEO_READY',
    label: SEO_STATUS_LABELS.SEO_READY,
    color: '#047857',
    bg: '#d1fae5',
  },
  'draft-ready': {
    computed: 'DRAFT_READY',
    label: SEO_STATUS_LABELS.DRAFT_READY,
    color: '#047857',
    bg: '#d1fae5',
  },
  complete: {
    computed: 'OPTIMIZED',
    label: SEO_STATUS_LABELS.OPTIMIZED,
    color: '#0f766e',
    bg: '#ccfbf1',
  },
};

const STATUS_KEYS = ['new', 'analyzed', 'seo-ready', 'draft-ready', 'complete'];

const getScoreColor = (score) => {
  if (!score) return { background: '#f1f5f9', color: '#94a3b8' };
  if (score >= 80) return { background: '#d1fae5', color: '#065f46' };
  if (score >= 60) return { background: '#fef3c7', color: '#92400e' };
  return { background: '#fee2e2', color: '#991b1b' };
};

function relativeTime(dateStr) {
  if (!dateStr) return '—';
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

// Map computed_status → URL status key
function statusToKey(computed) {
  for (const [key, cfg] of Object.entries(STATUS_CONFIG)) {
    if (cfg.computed === computed) return key;
  }
  return 'new';
}

const ROW_GRID = {
  display: 'grid',
  gridTemplateColumns: '36px 2fr 1fr 1fr 1fr 60px',
  alignItems: 'center',
  gap: '0 10px',
};

export default function ListingsByStatusPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const currentStatus = searchParams.get('status') || 'new';
  const config = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.new;

  const [allListings, setAllListings] = useState([]);
  const [etsyListingsByListingId, setEtsyListingsByListingId] = useState(new Map());
  const [etsyMetadataAvailable, setEtsyMetadataAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [originFilter, setOriginFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchListings = useCallback(async () => {
    setLoading(true);
    const [listingResult, etsyResult] = await Promise.all([
      supabase
        .from('v_dashboard_listings')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false }),
      supabase
        .from('etsy_listings')
        .select('listing_id, preparation_status, preparation_claim_expires_at, scoring_status, export_status, prepared_at, scored_at, last_exported_at, listings:listing_id ( etsy_proposal_fields )')
        .eq('user_id', user.id),
    ]);

    if (!listingResult.error) setAllListings(listingResult.data || []);
    if (etsyResult.error) {
      setEtsyMetadataAvailable(false);
      setEtsyListingsByListingId(new Map());
    } else {
      setEtsyMetadataAvailable(true);
      setEtsyListingsByListingId(new Map((etsyResult.data || [])
        .filter((listing) => listing.listing_id)
        .map((listing) => [listing.listing_id, listing])));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) fetchListings();
  }, [user, fetchListings]);

  const presentationRows = allListings.map((listing) => {
    const etsyListing = etsyListingsByListingId.get(listing.id);
    const etsyWorkflow = etsyMetadataAvailable && etsyListing
      ? getMyShopWorkflowPresentation(getMyShopUxState(etsyListing))
      : null;
    return {
      listing,
      presentation: getSeoListingPresentation(listing, etsyListing, { etsyMetadataAvailable, etsyWorkflow }),
    };
  });
  const filteredRows = filterSeoListings(presentationRows, {
    origin: originFilter,
    status: config.computed,
    search: searchQuery,
  });
  const statusCounts = {};
  for (const key of STATUS_KEYS) {
    statusCounts[key] = filterSeoListings(presentationRows, { origin: originFilter, status: STATUS_CONFIG[key].computed }).length;
  }

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 px-6 lg:px-8 py-6">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>
              SEO Listings
            </h1>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
              {allListings.length} listing{allListings.length !== 1 ? 's' : ''} total · {filteredRows.length} {config.label.toLowerCase()}
            </p>
          </div>
        </div>

        <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>SEO Progress</p>
        {/* Status tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #e2e8f0' }}>
          {STATUS_KEYS.map((key) => {
            const cfg = STATUS_CONFIG[key];
            const isActive = currentStatus === key;
            return (
              <button
                key={key}
                onClick={() => setSearchParams({ status: key })}
                style={{
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  border: 'none',
                  borderBottom: isActive ? '2px solid #4f46e5' : '2px solid transparent',
                  background: 'none',
                  color: isActive ? '#4f46e5' : '#94a3b8',
                  cursor: 'pointer',
                  marginBottom: -1,
                  transition: 'all 0.15s',
                }}
              >
                {cfg.label}
                <span style={{
                  marginLeft: 6, fontSize: 11, fontWeight: 500,
                  padding: '1px 6px', borderRadius: 999,
                  background: isActive ? '#eef2ff' : '#f8fafc',
                  color: isActive ? '#4f46e5' : '#94a3b8',
                }}>
                  {statusCounts[key] || 0}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <div role="group" aria-label="Filter by listing origin" style={{ display: 'flex', gap: 4 }}>
            {[['all', 'All'], ['etsy', 'Etsy'], ['manual', 'Manual']].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setOriginFilter(value)}
                style={{ padding: '6px 10px', border: `1px solid ${originFilter === value ? '#a5b4fc' : '#e2e8f0'}`, borderRadius: 6, background: originFilter === value ? '#eef2ff' : '#fff', color: originFilter === value ? '#4338ca' : '#64748b', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
              >
                {label}
              </button>
            ))}
          </div>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search listings..."
            aria-label="Search listings"
            style={{ marginLeft: 'auto', minWidth: 200, padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, color: '#334155' }}
          />
        </div>

        {/* Main card */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20 }}>
          {/* Column headers */}
          <div style={{ ...ROW_GRID, paddingBottom: 8, borderBottom: '1px solid #f1f5f9', fontSize: 11, color: '#94a3b8', fontWeight: 500, marginBottom: 4 }}>
            <div>Image</div>
            <div>Product Name</div>
            <div style={{ textAlign: 'center' }}>Score</div>
            <div>Status</div>
            <div style={{ textAlign: 'right' }}>Date</div>
            <div style={{ textAlign: 'right' }}>Action</div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8', fontSize: 13 }}>
              Loading listings...
            </div>
          ) : filteredRows.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8', fontSize: 13 }}>
              No listings match the current filters.
            </div>
          ) : (
            filteredRows.map(({ listing, presentation }) => {
              const scoreStyle = getScoreColor(listing.listing_strength);
              const statusKey = statusToKey(listing.computed_status);
              const statusCfg = STATUS_CONFIG[statusKey];

              return (
                <div
                  key={listing.id}
                  style={{
                    ...ROW_GRID,
                    padding: '8px 0',
                    borderBottom: '1px solid #f8fafc',
                    transition: 'background 0.15s',
                    cursor: 'pointer',
                  }}
                  onClick={() => navigate('/studio', { state: { listingId: listing.id } })}
                >
                  {/* Image */}
                  <div style={{ position: 'relative' }}>
                    {listing.image_url ? (
                      <img
                        src={listing.image_url}
                        alt=""
                        style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ width: 32, height: 32, borderRadius: 6, background: '#f1f5f9' }} />
                    )}
                    {presentation.origin === 'etsy' && (
                      <span style={{ position: 'absolute', top: -4, left: -4, background: '#f97316', color: 'white', fontSize: 9, fontWeight: 700, lineHeight: 1, padding: '2px 4px', borderRadius: 4 }}>Etsy</span>
                    )}
                  </div>

                  {/* Name + Theme */}
                  <div style={{ overflow: 'hidden' }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#1e293b',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {listing.title || 'Untitled'}
                    </div>
                    <div style={{ fontSize: 11, color: presentation.origin === 'unknown' ? '#b45309' : '#64748b', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {presentation.originLabel}
                      {presentation.etsyWorkflow && ` · Etsy Workflow: ${presentation.etsyWorkflow.label}`}
                      {presentation.etsyNotice && ` · ${presentation.etsyNotice.label}`}
                    </div>
                    {listing.theme && (
                      <div
                        style={{
                          fontSize: 11,
                          color: '#94a3b8',
                          marginTop: 1,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {listing.theme}
                      </div>
                    )}
                  </div>

                  {/* Score */}
                  <div style={{ textAlign: 'center' }}>
                    {listing.listing_strength != null && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: 999,
                          ...scoreStyle,
                        }}
                      >
                        {listing.listing_strength}
                      </span>
                    )}
                  </div>

                  {/* Status */}
                  <div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        padding: '2px 8px',
                        borderRadius: 999,
                        background: statusCfg.bg,
                        color: statusCfg.color,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {statusCfg.label}
                    </span>
                  </div>

                  {/* Date */}
                  <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'right' }}>
                    {relativeTime(listing.updated_at)}
                  </div>

                  {/* Action */}
                  <div style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => navigate('/studio', { state: { listingId: listing.id } })}
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: '#4f46e5',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      Open
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Layout>
  );
}
