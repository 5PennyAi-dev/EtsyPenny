import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useBulkProgress } from '@/context/BulkProgressContext';
import Layout from '@/components/Layout';
import axios from 'axios';
import { toast } from 'sonner';

const STATUS_CONFIG = {
  new: {
    computed: 'NEW',
    label: 'New',
    description: 'Listings created but not yet analyzed',
    color: '#64748b',
    bg: '#f1f5f9',
    bulkAction: 'Analyze Images',
    actionCost: 1,
    actionKey: 'analyze_image',
    bulkLimit: 10,
    bulkLimitMessage: 'Maximum 10 listings for image analysis at once.',
  },
  analyzed: {
    computed: 'ANALYZED',
    label: 'Analyzed',
    description: 'Image analyzed — ready for keyword generation',
    color: '#1e40af',
    bg: '#dbeafe',
    bulkAction: 'Generate Keywords',
    actionCost: 8,
    actionKey: 'generate_keywords',
    bulkLimit: 5,
    bulkLimitMessage: 'Maximum 5 listings for keyword generation at once.',
  },
  'seo-ready': {
    computed: 'SEO_READY',
    label: 'SEO Ready',
    description: 'Keywords generated — ready for review',
    color: '#3730a3',
    bg: '#e0e7ff',
    bulkAction: null,
    actionCost: 0,
    actionKey: null,
    bulkLimit: 0,
    bulkLimitMessage: null,
  },
  'draft-ready': {
    computed: 'DRAFT_READY',
    label: 'Draft Ready',
    description: 'Keywords selected — ready for draft generation',
    color: '#92400e',
    bg: '#fef3c7',
    bulkAction: 'Generate Drafts',
    actionCost: 1,
    actionKey: 'generate_draft',
    bulkLimit: 15,
    bulkLimitMessage: 'Maximum 15 listings for draft generation at once.',
  },
  complete: {
    computed: 'OPTIMIZED',
    label: 'Complete',
    description: 'Title, description and keywords ready',
    color: '#065f46',
    bg: '#d1fae5',
    bulkAction: null,
    actionCost: 0,
    actionKey: null,
    bulkLimit: 0,
    bulkLimitMessage: null,
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
  gridTemplateColumns: '24px 36px 2fr 1fr 1fr 1fr 60px',
  alignItems: 'center',
  gap: '0 10px',
};

export default function ListingsByStatusPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, refreshProfile } = useAuth();
  const { bulkProgress, startBulk, incrementBulk, finishBulk } = useBulkProgress();

  const currentStatus = new URLSearchParams(location.search).get('status') || 'new';
  const config = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.new;

  const [allListings, setAllListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const totalTokens = (profile?.tokens_monthly_balance ?? 0) + (profile?.tokens_bonus_balance ?? 0);

  useEffect(() => {
    if (user) fetchListings();
  }, [user]);

  // Reset selection when status changes
  useEffect(() => {
    setSelected([]);
  }, [currentStatus]);

  async function fetchListings() {
    setLoading(true);
    const { data, error } = await supabase
      .from('v_dashboard_listings')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (!error) setAllListings(data || []);
    setLoading(false);
  }

  const filteredListings = allListings.filter(
    (l) => statusToKey(l.computed_status) === currentStatus
  );

  const statusCounts = {};
  for (const key of STATUS_KEYS) {
    statusCounts[key] = allListings.filter((l) => statusToKey(l.computed_status) === key).length;
  }

  const handleBulkAction = async () => {
    setShowConfirmModal(false);
    // Note: bulk processing runs in the browser. Closing the tab or refreshing
    // the page will interrupt processing. A server-side job queue would be
    // required to survive tab close — acceptable limitation for v1.
    startBulk(selected.length, config.bulkAction);

    for (let i = 0; i < selected.length; i++) {
      const listingId = selected[i];
      const listing = allListings.find((l) => l.id === listingId);
      let hasError = false;
      try {
        if (config.actionKey === 'analyze_image') {
          await axios.post('/api/seo/analyze-image', {
            listing_id: listingId,
            user_id: user.id,
            mockup_url: listing?.image_url,
          });
        } else if (config.actionKey === 'generate_keywords') {
          await axios.post('/api/seo/generate-keywords', {
            listing_id: listingId,
            user_id: user.id,
          });
        } else if (config.actionKey === 'generate_draft') {
          await axios.post('/api/seo/generate-draft', {
            listing_id: listingId,
            user_id: user.id,
          });
        }
      } catch (err) {
        hasError = true;
        if (err.response?.status === 402) {
          toast.error('Insufficient tokens — stopping bulk action.');
          incrementBulk(true);
          break;
        }
        toast.error(`Failed on listing ${i + 1}: ${err.message}`);
      }
      incrementBulk(hasError);
    }

    finishBulk();
    setSelected([]);
    toast.success(`Bulk ${config.bulkAction} complete!`);
    await refreshProfile();
    fetchListings();
  };

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 px-6 lg:px-8 py-6">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <button
            onClick={() => navigate(-1)}
            style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}
          >
            ← Back
          </button>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: 0 }}>
              {config.label} Listings
            </h1>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0' }}>
              {config.description} · {filteredListings.length} listing{filteredListings.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Status tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {STATUS_KEYS.map((key) => {
            const cfg = STATUS_CONFIG[key];
            return (
              <button
                key={key}
                onClick={() => navigate(`/listings?status=${key}`)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 500,
                  border: 'none',
                  cursor: 'pointer',
                  background: currentStatus === key ? cfg.bg : '#f8fafc',
                  color: currentStatus === key ? cfg.color : '#94a3b8',
                }}
              >
                {cfg.label} ({statusCounts[key] || 0})
              </button>
            );
          })}
        </div>

        {config.bulkLimit > 0 && (
          <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>
            You can select up to <strong>{config.bulkLimit}</strong> listings at once for this action.
          </p>
        )}

        {/* Progress bar */}
        {bulkProgress.running && (
          <div style={{ marginBottom: 16, padding: '12px 16px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
            <div style={{ fontSize: 13, color: '#065f46', marginBottom: 6 }}>
              Processing {bulkProgress.current} of {bulkProgress.total} listings...
              {bulkProgress.errors > 0 && (
                <span style={{ color: '#dc2626', marginLeft: 8 }}>
                  ({bulkProgress.errors} failed)
                </span>
              )}
            </div>
            <div style={{ height: 4, background: '#dcfce7', borderRadius: 999 }}>
              <div
                style={{
                  height: 4,
                  background: '#22c55e',
                  borderRadius: 999,
                  width: `${(bulkProgress.current / bulkProgress.total) * 100}%`,
                  transition: 'width 0.3s',
                }}
              />
            </div>
          </div>
        )}

        {/* Bulk action bar */}
        {selected.length > 0 && config.bulkAction && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 16px',
              background: '#eef2ff',
              borderRadius: 8,
              marginBottom: 16,
              border: '1px solid #c7d2fe',
            }}
          >
            <span style={{ fontSize: 13, color: '#3730a3', fontWeight: 500 }}>
              {selected.length} listing{selected.length > 1 ? 's' : ''} selected
            </span>
            <span style={{ fontSize: 12, color: '#6366f1' }}>
              · {selected.length * config.actionCost} tokens required
            </span>
            <div style={{ flex: 1 }} />
            <button
              onClick={() => setShowConfirmModal(true)}
              style={{
                padding: '6px 16px',
                background: '#4f46e5',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {config.bulkAction} ({selected.length})
            </button>
            <button
              onClick={() => setSelected([])}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 12 }}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Main card */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20 }}>
          {/* Column headers */}
          <div style={{ ...ROW_GRID, paddingBottom: 8, borderBottom: '1px solid #f1f5f9', fontSize: 11, color: '#94a3b8', fontWeight: 500, marginBottom: 4 }}>
            <div>
              {config.bulkAction && (
                <input
                  type="checkbox"
                  checked={selected.length === Math.min(filteredListings.length, config.bulkLimit) && filteredListings.length > 0}
                  onChange={(e) =>
                    setSelected(e.target.checked ? filteredListings.slice(0, config.bulkLimit).map((l) => l.id) : [])
                  }
                  style={{ cursor: 'pointer' }}
                />
              )}
            </div>
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
          ) : filteredListings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8', fontSize: 13 }}>
              No {config.label.toLowerCase()} listings found.
            </div>
          ) : (
            filteredListings.map((listing) => {
              const isSelected = selected.includes(listing.id);
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
                    background: isSelected ? '#f5f3ff' : 'transparent',
                    transition: 'background 0.15s',
                    cursor: 'pointer',
                  }}
                  onClick={() => navigate('/studio', { state: { listingId: listing.id } })}
                >
                  {/* Checkbox */}
                  <div onClick={(e) => e.stopPropagation()}>
                    {config.bulkAction && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked && selected.length >= config.bulkLimit) {
                            toast.error(config.bulkLimitMessage);
                            return;
                          }
                          setSelected((prev) =>
                            e.target.checked
                              ? [...prev, listing.id]
                              : prev.filter((id) => id !== listing.id)
                          );
                        }}
                        style={{ cursor: 'pointer' }}
                      />
                    )}
                  </div>

                  {/* Image */}
                  <div>
                    {listing.image_url ? (
                      <img
                        src={listing.image_url}
                        alt=""
                        style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ width: 32, height: 32, borderRadius: 6, background: '#f1f5f9' }} />
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
                      Open →
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Confirm modal */}
        {showConfirmModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 50,
            }}
          >
            <div
              style={{
                background: '#fff',
                borderRadius: 12,
                padding: 24,
                width: 360,
                boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: '0 0 8px' }}>
                Confirm bulk action
              </h3>
              <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px' }}>
                {config.bulkAction} for{' '}
                <strong>
                  {selected.length} listing{selected.length > 1 ? 's' : ''}
                </strong>{' '}
                will cost <strong>{selected.length * config.actionCost} tokens</strong>. You currently
                have <strong>{totalTokens} tokens</strong>.
              </p>
              {totalTokens < selected.length * config.actionCost && (
                <p style={{ fontSize: 12, color: '#dc2626', marginBottom: 12 }}>
                  Insufficient tokens. Please buy more or select fewer listings.
                </p>
              )}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  style={{
                    padding: '8px 16px',
                    background: '#f1f5f9',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 13,
                    cursor: 'pointer',
                    color: '#64748b',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkAction}
                  disabled={totalTokens < selected.length * config.actionCost}
                  style={{
                    padding: '8px 16px',
                    background: '#4f46e5',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 13,
                    cursor: 'pointer',
                    color: '#fff',
                    fontWeight: 500,
                    opacity: totalTokens < selected.length * config.actionCost ? 0.5 : 1,
                  }}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
