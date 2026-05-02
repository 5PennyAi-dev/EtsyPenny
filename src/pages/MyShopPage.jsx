import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Loader2, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import Layout from '@/components/Layout';
import ShopStatsBar from '@/components/shop/ShopStatsBar';
import EtsyListingGrid from '@/components/shop/EtsyListingGrid';
import ImportActionBar from '@/components/shop/ImportActionBar';
import ExportToEtsyModal from '@/components/shop/ExportToEtsyModal';
import ConnectEtsyEmptyState from '@/components/shop/ConnectEtsyEmptyState';
import HelpLink from '@/components/ui/HelpLink';
const scoreColor = (s) => s >= 85 ? '#4f46e5' : s >= 70 ? '#22c55e' : s >= 50 ? '#f59e0b' : '#ef4444';

export default function MyShopPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [connectionStatus, setConnectionStatus] = useState('loading'); // 'loading' | 'connected' | 'no-connection' | 'refresh-failed'
  const [shopMeta, setShopMeta] = useState({ shop_name: null, shop_url: null });
  const [etsyListings, setEtsyListings] = useState([]);
  const [importedListings, setImportedListings] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [pagination, setPagination] = useState({ count: 0, offset: 0, limit: 25 });
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isScoring, setIsScoring] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [baPage, setBaPage] = useState(0);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportModalData, setExportModalData] = useState([]);
  const [preparingListingId, setPreparingListingId] = useState(null);

  // Plan-based import limit
  const [planImportLimit, setPlanImportLimit] = useState(10);
  useEffect(() => {
    if (!profile?.subscription_plan) return;
    supabase.from('plans').select('etsy_import_limit').eq('id', profile.subscription_plan).single()
      .then(({ data }) => { if (data?.etsy_import_limit) setPlanImportLimit(data.etsy_import_limit); });
  }, [profile?.subscription_plan]);

  // Derived state
  const importLimit = importResult?.limit_remaining ?? Math.max(0, planImportLimit - importedListings.length);
  const importedIds = new Set(importedListings.map((l) => l.etsy_listing_id));
  const tokenBalance = (profile?.tokens_monthly_balance ?? 0) + (profile?.tokens_bonus_balance ?? 0);

  // Derive exclusive selection mode: 'import' | 'score' | 'export' | null
  const selectionMode = selectedIds.size === 0
    ? null
    : [...selectedIds].some((id) => !importedIds.has(id))
      ? 'import'
      : [...selectedIds].some((id) => {
          const imp = importedListings.find(l => l.etsy_listing_id === id);
          return imp && imp.scoring_status === 'scored' && imp.listing_id;
        })
        ? 'export'
        : 'score';

  // Comparison listings: scored + linked to a listings row
  const comparisonListings = importedListings.filter(
    (l) => l.scoring_status === 'scored' && l.original_score != null && l.listing_id
  );

  // Compute comparison data for stats bar — only truly optimized (different PennySEO score)
  const comparisonData = comparisonListings
    .map((l) => ({
      original_score: l.original_score,
      pennySeoScore: l.listings?.listings_global_eval?.[0]?.listing_strength ?? null,
    }))
    .filter((d) => d.pennySeoScore != null && d.pennySeoScore !== d.original_score);

  // B/A table pagination
  const BA_PAGE_SIZE = 5;
  const baPageCount = Math.ceil(comparisonListings.length / BA_PAGE_SIZE);
  const paginatedComparisons = comparisonListings.slice(baPage * BA_PAGE_SIZE, (baPage + 1) * BA_PAGE_SIZE);

  // ─── Status filter logic ────────────────────────────
  const getListingStatus = (etsyListingId) => {
    const imp = importedListings.find((l) => l.etsy_listing_id === etsyListingId);
    if (!imp) return 'not_imported';
    if (imp.scoring_status !== 'scored') return 'imported';
    if (imp.export_status === 'exported') return 'exported';
    const pennySeo = imp.listings?.listings_global_eval?.[0]?.listing_strength ?? null;
    if (pennySeo != null && pennySeo !== imp.original_score) return 'optimized';
    return 'scored';
  };

  const filterCounts = {
    all: etsyListings.length,
    imported: etsyListings.filter((l) => getListingStatus(l.etsy_listing_id) === 'imported').length,
    scored: etsyListings.filter((l) => getListingStatus(l.etsy_listing_id) === 'scored').length,
    optimized: etsyListings.filter((l) => getListingStatus(l.etsy_listing_id) === 'optimized').length,
    exported: etsyListings.filter((l) => getListingStatus(l.etsy_listing_id) === 'exported').length,
  };

  const filteredListings = statusFilter === 'all'
    ? etsyListings
    : etsyListings.filter((l) => getListingStatus(l.etsy_listing_id) === statusFilter);

  const filters = [
    { key: 'all', label: 'All', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', activeBg: 'bg-indigo-600' },
    { key: 'imported', label: 'Imported', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-300', activeBg: 'bg-slate-500' },
    { key: 'scored', label: 'Scored', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', activeBg: 'bg-amber-500' },
    { key: 'optimized', label: 'Optimized', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', activeBg: 'bg-emerald-600' },
    { key: 'exported', label: 'Exported', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', activeBg: 'bg-blue-500' },
  ];

  // ─── Fetch imported listings from DB ────────────────
  const fetchImported = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('etsy_listings')
      .select(`
        *,
        listings:listing_id (
          id,
          listings_global_eval ( listing_strength )
        )
      `)
      .eq('user_id', user.id)
      .order('imported_at', { ascending: false });
    setImportedListings(data || []);
  }, [user]);

  // ─── Fetch Etsy API listings ────────────────────────
  const fetchEtsyListings = useCallback(async (offset = 0) => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data } = await axios.get('/api/etsy/shop-listings', {
        params: { user_id: user.id, limit: 25, offset },
      });
      setEtsyListings(data.results || []);
      setPagination({ count: data.count, offset, limit: 25 });
      setConnectionStatus('connected');
    } catch (err) {
      console.error('[MyShopPage] Failed to fetch Etsy listings:', err);
      const code = err.response?.data?.code;
      if (err.response?.status === 409 && code === 'NO_ETSY_CONNECTION') {
        setConnectionStatus('no-connection');
      } else if (err.response?.status === 401 && code === 'ETSY_REFRESH_FAILED') {
        setConnectionStatus('refresh-failed');
      } else {
        toast.error('Failed to fetch Etsy listings');
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // ─── On mount: check connection + load data ─────────
  useEffect(() => {
    if (!user) return;

    async function init() {
      const { data: connection } = await supabase
        .from('etsy_shop_connections')
        .select('id, shop_name, shop_url')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('connected_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (connection) {
        setShopMeta({ shop_name: connection.shop_name, shop_url: connection.shop_url });
      } else {
        setShopMeta({ shop_name: null, shop_url: null });
      }

      await Promise.all([fetchImported(), fetchEtsyListings(0)]);
    }

    init();
  }, [user, fetchImported, fetchEtsyListings]);

  // ─── Sync / refresh ────────────────────────────────
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await fetchEtsyListings(pagination.offset);
      await fetchImported();
      toast.success('Shop data refreshed');
    } catch {
      toast.error('Failed to refresh');
    } finally {
      setIsSyncing(false);
    }
  };

  // ─── Toggle selection (exclusive mode: import / score / export) ──
  const handleToggleSelect = (etsyListingId) => {
    const clickedIsImported = importedIds.has(etsyListingId);
    const clickedMode = !clickedIsImported ? 'import' : (() => {
      const imp = importedListings.find(l => l.etsy_listing_id === etsyListingId);
      return (imp?.scoring_status === 'scored' && imp?.listing_id) ? 'export' : 'score';
    })();

    const modeLabels = { import: 'import mode', score: 'scoring mode', export: 'export mode' };

    setSelectedIds((prev) => {
      // If switching modes, clear previous selections and start fresh
      if (selectionMode && selectionMode !== clickedMode) {
        toast.info(`Switched to ${modeLabels[clickedMode]}`, { duration: 2000 });
        return new Set([etsyListingId]);
      }

      // Normal toggle within same mode
      const next = new Set(prev);
      if (next.has(etsyListingId)) {
        next.delete(etsyListingId);
      } else {
        next.add(etsyListingId);
      }
      return next;
    });
  };

  // ─── Import handler ─────────────────────────────────
  const handleImport = async () => {
    setIsImporting(true);
    try {
      const { data } = await axios.post('/api/etsy/import-listings', {
        user_id: user.id,
        etsy_listing_ids: Array.from(selectedIds),
      });
      setImportResult(data);
      toast.success(`${data.imported} listing${data.imported !== 1 ? 's' : ''} imported successfully`);
      setSelectedIds(new Set());
      await fetchImported();
    } catch (err) {
      if (err.response?.status === 402) {
        toast.error(err.response.data.error);
      } else {
        toast.error('Failed to import listings');
      }
    } finally {
      setIsImporting(false);
    }
  };

  // ─── Score handler ──────────────────────────────────
  const handleScore = async () => {
    const etsyListingUuids = [...selectedIds]
      .map((etsyId) => importedListings.find((l) => l.etsy_listing_id === etsyId))
      .filter((imp) => imp && (imp.scoring_status === 'pending' || imp.scoring_status === 'error'))
      .map((imp) => imp.id);

    if (etsyListingUuids.length === 0) return;

    setIsScoring(true);
    try {
      const { data } = await axios.post('/api/etsy/score-listings', {
        user_id: user.id,
        etsy_listing_ids: etsyListingUuids,
      });
      toast.success(`${data.scored} listing${data.scored !== 1 ? 's' : ''} scored (${data.tokens_deducted} tokens used)`);
      setSelectedIds(new Set());
      await fetchImported();
    } catch (err) {
      if (err.response?.status === 402) {
        toast.error(err.response.data.error || 'Insufficient tokens');
      } else {
        toast.error('Failed to score listings');
      }
    } finally {
      setIsScoring(false);
    }
  };

  // ─── Batch export handler ───────────────────────────
  const handleBatchExport = async () => {
    const selectedEtsyListings = importedListings.filter(el =>
      selectedIds.has(el.etsy_listing_id) && el.scoring_status === 'scored' && el.listing_id
    );

    if (selectedEtsyListings.length === 0) {
      toast.error('No exportable listings selected');
      return;
    }

    const listingIds = selectedEtsyListings.map(el => el.listing_id);

    try {
      const [{ data: listingsData }, { data: keywordsData }] = await Promise.all([
        supabase.from('listings').select('id, generated_title, generated_description, image_url').in('id', listingIds),
        supabase.from('listing_seo_stats').select('listing_id, tag').in('listing_id', listingIds).eq('is_current_eval', true),
      ]);

      const modalListings = selectedEtsyListings.map(el => {
        const listing = listingsData?.find(l => l.id === el.listing_id);
        const tags = keywordsData?.filter(k => k.listing_id === el.listing_id).map(k => k.tag).slice(0, 13) || [];
        return {
          etsy_listing_id: el.etsy_listing_id,
          listing_id: el.listing_id,
          title: el.original_title,
          description: el.original_description,
          tags: el.original_tags || [],
          optimized_title: listing?.generated_title,
          optimized_description: listing?.generated_description,
          optimized_tags: tags,
          image_url: el.thumbnail_url || listing?.image_url,
          display_title: listing?.generated_title || el.original_title,
        };
      }).filter(item => item.optimized_tags.length > 0 || item.optimized_title);

      if (modalListings.length === 0) {
        toast.error('Selected listings have no optimized SEO data. Open them in Studio first.');
        return;
      }

      setExportModalData(modalListings);
      setShowExportModal(true);
    } catch (err) {
      toast.error('Failed to load listing data for export');
      console.error('[export] Error loading data:', err);
    }
  };

  // ─── Open in Studio (prepare-listing, free) ────────
  const handleOpenInStudio = async (etsyListingRowId) => {
    const etsyRow = importedListings.find(l => l.etsy_listing_id === etsyListingRowId);
    if (!etsyRow) return;

    setPreparingListingId(etsyListingRowId);
    try {
      const { data } = await axios.post('/api/etsy/prepare-listing', {
        user_id: user.id,
        etsy_listing_id: etsyRow.id,
      });
      navigate('/studio', { state: { listingId: data.listing_id } });
    } catch (error) {
      toast.error('Failed to prepare listing: ' + (error.response?.data?.error || error.message));
    } finally {
      setPreparingListingId(null);
    }
  };

  // ─── Load more ──────────────────────────────────────
  const handleLoadMore = () => {
    fetchEtsyListings(pagination.offset + pagination.limit);
  };

  const hasMore = pagination.offset + pagination.limit < pagination.count;
  const hasSelection = selectedIds.size > 0;

  // ─── Empty / reconnect states ───────────────────────
  if (connectionStatus === 'no-connection' || connectionStatus === 'refresh-failed') {
    return (
      <Layout>
        <div className="min-h-screen bg-slate-50 px-6 lg:px-8 py-6">
          <ConnectEtsyEmptyState
            variant={connectionStatus === 'refresh-failed' ? 'refresh-failed' : 'no-connection'}
          />
        </div>
      </Layout>
    );
  }

  // ─── Loading state ──────────────────────────────────
  if (connectionStatus === 'loading') {
    return (
      <Layout>
        <div className="min-h-screen bg-slate-50 px-6 lg:px-8 py-6 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      </Layout>
    );
  }

  // ─── Connected state ────────────────────────────────
  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 px-6 lg:px-8 py-6 space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-800">My Etsy Shop</h1>
            <HelpLink to="/docs/etsy-import" tooltip="How Etsy import works" />
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {shopMeta.shop_name ? (
                shopMeta.shop_url ? (
                  <a
                    href={shopMeta.shop_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 hover:underline"
                  >
                    Connected to {shopMeta.shop_name}
                    <ExternalLink size={11} />
                  </a>
                ) : (
                  <>Connected to {shopMeta.shop_name}</>
                )
              ) : (
                'Connected to your Etsy shop'
              )}
            </span>
          </div>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} strokeWidth={2} />
            Sync
          </button>
        </div>

        {/* Stats bar */}
        <ShopStatsBar etsyListings={etsyListings} importedListings={importedListings} comparisonData={comparisonData} />

        {/* Before / After comparison table */}
        {comparisonListings.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-medium text-slate-700">Before / After</h2>
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr 100px 140px 80px 120px', gap: 8, padding: '6px 0', borderBottom: '1px solid #e2e8f0' }}>
                <span />
                <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Title</span>
                <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, textAlign: 'center' }}>Original</span>
                <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, textAlign: 'center' }}>PennySEO</span>
                <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, textAlign: 'center' }}>Δ</span>
                <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, textAlign: 'right' }}>Action</span>
              </div>
              <div style={{ minHeight: comparisonListings.length > BA_PAGE_SIZE ? BA_PAGE_SIZE * 52 : undefined }}>
                {paginatedComparisons.map((listing, i) => {
                  const pennySeo = listing.listings?.listings_global_eval?.[0]?.listing_strength ?? null;
                  const hasOptimized = pennySeo != null && pennySeo !== listing.original_score;
                  const delta = hasOptimized ? pennySeo - listing.original_score : null;
                  return (
                    <div key={listing.id} style={{
                      display: 'grid', gridTemplateColumns: '48px 1fr 100px 140px 80px 120px',
                      gap: 8, padding: '8px 0', alignItems: 'center', minHeight: 52,
                      background: i % 2 === 1 ? '#f8fafc' : 'white',
                      borderBottom: '1px solid #f1f5f9',
                    }}>
                      <img src={listing.thumbnail_url} alt="" style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'cover' }} />
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {listing.original_title}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: scoreColor(listing.original_score), textAlign: 'center' }}>
                        {listing.original_score}
                      </span>
                      {hasOptimized ? (
                        <span style={{ fontSize: 14, fontWeight: 700, color: scoreColor(pennySeo), textAlign: 'center' }}>{pennySeo}</span>
                      ) : (
                        <div style={{ textAlign: 'center' }}>
                          <button onClick={() => navigate('/studio', { state: { listingId: listing.listing_id } })}
                            style={{ fontSize: 12, fontWeight: 600, color: '#4f46e5', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
                            Optimize →
                          </button>
                        </div>
                      )}
                      {delta != null ? (
                        <span style={{ fontSize: 15, fontWeight: 600, color: delta > 0 ? '#22c55e' : '#ef4444', textAlign: 'center' }}>
                          {delta > 0 ? '↑ +' : '↓ '}{delta > 0 ? delta : delta}
                        </span>
                      ) : <span />}
                      {hasOptimized ? (
                        <button onClick={() => navigate('/studio', { state: { listingId: listing.listing_id } })}
                          style={{ fontSize: 12, color: '#4f46e5', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, textAlign: 'right', width: '100%' }}>
                          Open in Studio
                        </button>
                      ) : <span />}
                    </div>
                  );
                })}
              </div>
              {baPageCount > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, paddingTop: 8 }}>
                  <button
                    disabled={baPage === 0}
                    onClick={() => setBaPage((p) => p - 1)}
                    style={{ fontSize: 12, color: baPage === 0 ? '#cbd5e1' : '#4f46e5', background: 'none', border: 'none', cursor: baPage === 0 ? 'default' : 'pointer', fontWeight: 500 }}
                  >
                    « Previous
                  </button>
                  <span style={{ fontSize: 12, color: '#64748b' }}>Page {baPage + 1} of {baPageCount}</span>
                  <button
                    disabled={baPage >= baPageCount - 1}
                    onClick={() => setBaPage((p) => p + 1)}
                    style={{ fontSize: 12, color: baPage >= baPageCount - 1 ? '#cbd5e1' : '#4f46e5', background: 'none', border: 'none', cursor: baPage >= baPageCount - 1 ? 'default' : 'pointer', fontWeight: 500 }}
                  >
                    Next »
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section label + filter pills */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-slate-700">
              Your Etsy listings
              {pagination.count > 0 && (
                <span className="ml-2 text-sm font-normal text-slate-400">({pagination.count})</span>
              )}
            </h2>
            {hasSelection && (
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                Clear selection
              </button>
            )}
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-2">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  statusFilter === f.key
                    ? `${f.activeBg} text-white border-transparent`
                    : `${f.bg} ${f.text} ${f.border}`
                }`}
              >
                {f.label} · {filterCounts[f.key]}
              </button>
            ))}
          </div>
        </div>

        {/* Listing grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <EtsyListingGrid
            listings={filteredListings}
            importedIds={importedIds}
            importedListings={importedListings}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onOpenInStudio={handleOpenInStudio}
            preparingListingId={preparingListingId}
          />
        )}

        {/* Load more */}
        {hasMore && !isLoading && (
          <div className="text-center pt-2 pb-8">
            <button
              onClick={handleLoadMore}
              className="px-5 py-2 rounded-lg text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
            >
              Load more listings
            </button>
          </div>
        )}

        {/* Spacer for action bar */}
        {hasSelection && <div className="h-16" />}
      </div>

      {/* Action bar */}
      {hasSelection && (
        <ImportActionBar
          selectedCount={selectedIds.size}
          selectionMode={selectionMode}
          isImporting={isImporting}
          onImport={handleImport}
          limitRemaining={importLimit}
          isScoring={isScoring}
          onScore={handleScore}
          tokenBalance={tokenBalance}
          onExport={handleBatchExport}
          exportCount={selectedIds.size}
        />
      )}

      {/* Export to Etsy Modal */}
      {showExportModal && exportModalData.length > 0 && (
        <ExportToEtsyModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          onSuccess={() => {
            setShowExportModal(false);
            setSelectedIds(new Set());
            fetchImported();
          }}
          listings={exportModalData}
          user={user}
        />
      )}
    </Layout>
  );
}
