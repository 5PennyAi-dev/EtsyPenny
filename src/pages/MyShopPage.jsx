import { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, Loader2, ExternalLink, Search, AlertCircle, SlidersHorizontal, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import Layout from '@/components/Layout';
import ShopStatsBar from '@/components/shop/ShopStatsBar';
import AmorceCard from '@/components/shop/AmorceCard';
import EtsyListingGrid from '@/components/shop/EtsyListingGrid';
import ImportActionBar from '@/components/shop/ImportActionBar';
import ExportToEtsyModal from '@/components/shop/ExportToEtsyModal';
import ConnectEtsyEmptyState from '@/components/shop/ConnectEtsyEmptyState';
import HelpLink from '@/components/ui/HelpLink';
import { MY_SHOP_TABS, MY_SHOP_WORKFLOW, filterAndSortMyShopListings, getMyShopBulkActionPlan, getNextPreparationClaimExpiry, isMyShopBulkSelectable, mergeEtsyListings } from '@/lib/my-shop-utils';

function EmptyResults({ activeTab, searchQuery, hasExtraFilters, onClearStatus, onClearAll }) {
  const hasStatus = activeTab !== 'all' || hasExtraFilters;
  const hasSearch = !!searchQuery.trim();

  if (hasStatus && hasSearch) {
    return (
      <div className="py-8 text-center text-sm text-slate-500">
        No listings match the current filter and search.{' '}
        <button onClick={onClearAll} className="text-indigo-600 hover:text-indigo-700 font-medium">
          Clear filters
        </button>
      </div>
    );
  }
  if (hasSearch) {
    return (
      <div className="py-8 text-center text-sm text-slate-500">
        No titles match &ldquo;{searchQuery}&rdquo;.
      </div>
    );
  }
  if (hasStatus) {
    return (
      <div className="py-8 text-center text-sm text-slate-500">
        No listings in this view.{' '}
        <button onClick={onClearStatus} className="text-indigo-600 hover:text-indigo-700 font-medium">
          Show all
        </button>
      </div>
    );
  }
  return null;
}

export default function MyShopPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [connectionStatus, setConnectionStatus] = useState('loading'); // 'loading' | 'connected' | 'no-connection' | 'refresh-failed' | 'error'
  const [shopMeta, setShopMeta] = useState({ shop_name: null, shop_url: null });
  const [etsyListings, setEtsyListings] = useState([]);
  const [importedListings, setImportedListings] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [pagination, setPagination] = useState({ count: 0, offset: 0, limit: 25 });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isScoring, setIsScoring] = useState(false);
  const [activeTab, setActiveTab] = useState('to_optimize');
  const [progressFilter, setProgressFilter] = useState('all');
  const [publicationFilter, setPublicationFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('activity');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportModalMode, setExportModalMode] = useState('review');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 200);
    return () => clearTimeout(t);
  }, [searchQuery]);
  const [exportModalData, setExportModalData] = useState([]);
  const [preparingListingId, setPreparingListingId] = useState(null);
  const [preparationClock, setPreparationClock] = useState(() => Date.now());
  const [catalogError, setCatalogError] = useState(null);

  const getAuthHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Your session has expired. Please sign in again.');
    return { Authorization: `Bearer ${session.access_token}` };
  }, []);

  // Plan-based import limit
  const [planImportLimit, setPlanImportLimit] = useState(10);
  useEffect(() => {
    if (!profile?.subscription_plan) return;
    supabase.from('plans').select('etsy_import_limit').eq('id', profile.subscription_plan).single()
      .then(({ data }) => { if (data?.etsy_import_limit) setPlanImportLimit(data.etsy_import_limit); });
  }, [profile?.subscription_plan]);

  // Derived state
  const importLimit = importResult?.limit_remaining ?? Math.max(0, planImportLimit - importedListings.length);
  const tokenBalance = (profile?.tokens_monthly_balance ?? 0) + (profile?.tokens_bonus_balance ?? 0);

  // Workspace totals come from imported records; catalog counts below are explicitly local.
  const importedCount = importedListings.length;
  const optimizedCount = importedListings.filter(
    (l) => {
      const ps = l.listings?.listings_global_eval?.[0]?.listing_strength;
      return ps != null && ps !== l.original_score;
    }
  ).length;
  const publishedCount = importedListings.filter((l) => l.export_status === 'exported').length;

  const handleOpenStudioWithFirstImported = () => {
    const candidate = [...importedListings]
      .filter((l) => {
        const ps = l.listings?.listings_global_eval?.[0]?.listing_strength;
        return !(ps != null && ps !== l.original_score);
      })
      .sort((a, b) => new Date(b.imported_at) - new Date(a.imported_at))[0];

    if (candidate?.listing_id) {
      navigate('/studio', { state: { listingId: candidate.listing_id } });
    } else if (candidate) {
      handleOpenInStudio(candidate.etsy_listing_id);
    } else {
      navigate('/studio');
    }
  };

  const handleOpenDocs = (path) => navigate(path);

  // ─── UX tabs, local filters and ordering ─────────────
  const allRows = useMemo(() => filterAndSortMyShopListings({
    etsyListings, importedListings, tab: 'all', preparingListingId, now: preparationClock,
  }), [etsyListings, importedListings, preparingListingId, preparationClock]);
  const tabCounts = useMemo(() => Object.fromEntries(MY_SHOP_TABS.map((tab) => [
    tab,
    tab === 'all' ? etsyListings.length : allRows.filter((row) => row.ux.category === tab).length,
  ])), [allRows, etsyListings.length]);
  const filteredRows = useMemo(() => filterAndSortMyShopListings({
    etsyListings, importedListings, tab: activeTab, search: debouncedSearch,
    progress: progressFilter, publication: publicationFilter, sort: sortOrder,
    preparingListingId, now: preparationClock,
  }), [etsyListings, importedListings, activeTab, debouncedSearch, progressFilter, publicationFilter, sortOrder, preparingListingId, preparationClock]);
  const selectedRows = useMemo(() => allRows.filter((row) => selectedIds.has(row.etsyListing.etsy_listing_id)), [allRows, selectedIds]);
  const bulkActionPlan = useMemo(() => getMyShopBulkActionPlan(selectedRows), [selectedRows]);
  const tabs = [
    { key: 'to_optimize', label: MY_SHOP_WORKFLOW.to_optimize.label }, { key: 'in_progress', label: MY_SHOP_WORKFLOW.in_progress.label },
    { key: 'ready_to_publish', label: MY_SHOP_WORKFLOW.ready_to_publish.label }, { key: 'needs_attention', label: MY_SHOP_WORKFLOW.needs_attention.label },
    { key: 'published', label: MY_SHOP_WORKFLOW.published.label }, { key: 'all', label: 'All Listings' },
  ];

  // Re-render once at the next persisted claim expiry. This does not poll or
  // write to Supabase; the preparation endpoint remains the final authority.
  useEffect(() => {
    const now = Date.now();
    const nextExpiry = getNextPreparationClaimExpiry(importedListings, now);
    if (nextExpiry === null) return undefined;
    const timeout = window.setTimeout(() => setPreparationClock(Date.now()), Math.max(0, nextExpiry - now) + 1);
    return () => window.clearTimeout(timeout);
  }, [importedListings, preparationClock]);
  const hasExtraFilters = progressFilter !== 'all' || publicationFilter !== 'all' || sortOrder !== 'activity';
  const clearFilters = () => { setProgressFilter('all'); setPublicationFilter('all'); setSortOrder('activity'); setSearchQuery(''); };

  // ─── Fetch imported listings from DB ────────────────
  const fetchImported = useCallback(async () => {
    if (!user) return [];
    const { data, error } = await supabase
      .from('etsy_listings')
      .select(`
        *,
        listings:listing_id (
          id,
          generated_title,
          generated_description,
          computed_status,
          etsy_proposal_fields,
          listings_global_eval ( listing_strength )
        )
      `)
      .eq('user_id', user.id)
      .order('imported_at', { ascending: false });
    if (error) throw error;

    const rows = data || [];
    const linkedIds = rows.map((r) => r.listing_id).filter(Boolean);

    const countsByListingId = {};
    const proposalCountsByListingId = {};
    if (linkedIds.length > 0) {
      const [{ data: evalRows, error: evalError }, { data: proposalRows, error: proposalError }] = await Promise.all([
        supabase.from('listing_seo_stats').select('listing_id').in('listing_id', linkedIds).eq('is_current_eval', true),
        supabase.from('listing_seo_stats').select('listing_id').in('listing_id', linkedIds).eq('is_proposal_selected', true),
      ]);
      if (evalError) throw evalError;
      if (proposalError) throw proposalError;
      for (const r of evalRows || []) {
        countsByListingId[r.listing_id] = (countsByListingId[r.listing_id] || 0) + 1;
      }
      for (const r of proposalRows || []) {
        proposalCountsByListingId[r.listing_id] = (proposalCountsByListingId[r.listing_id] || 0) + 1;
      }
    }

    const enriched = rows.map((r) => ({
      ...r,
      selected_keyword_count: r.listing_id ? (countsByListingId[r.listing_id] || 0) : 0,
      proposal_tag_count: r.listing_id ? (proposalCountsByListingId[r.listing_id] || 0) : 0,
    }));
    setImportedListings(enriched);
    return enriched;
  }, [user]);

  // ─── Fetch Etsy API listings ────────────────────────
  const fetchEtsyListings = useCallback(async ({ offset = 0, append = false, initial = false } = {}) => {
    if (!user) return false;
    if (append) setIsLoadingMore(true);
    else setIsLoading(true);
    setCatalogError(null);
    try {
      const headers = await getAuthHeaders();
      const { data } = await axios.get('/api/etsy/shop-listings', {
        params: { limit: 25, offset },
        headers,
      });
      const results = data.results || [];
      if (append) {
        setEtsyListings((current) => mergeEtsyListings(current, results));
      } else {
        const nextListings = mergeEtsyListings([], results);
        setEtsyListings(nextListings);
        setSelectedIds((current) => new Set([...current].filter((id) => (
          nextListings.some((listing) => listing.etsy_listing_id === id)
        ))));
      }
      setPagination({ count: data.count || 0, offset, limit: 25 });
      setConnectionStatus('connected');
      return true;
    } catch (err) {
      console.error('[MyShopPage] Failed to fetch Etsy listings:', err);
      const code = err.response?.data?.code;
      if (err.response?.status === 409 && code === 'NO_ETSY_CONNECTION') {
        setConnectionStatus('no-connection');
      } else if (err.response?.status === 401 && code === 'ETSY_REFRESH_FAILED') {
        setConnectionStatus('refresh-failed');
      } else {
        const message = err.response?.data?.error || 'Failed to fetch Etsy listings. Please try again.';
        setCatalogError(message);
        if (initial) setConnectionStatus('error');
        toast.error(message);
      }
      return false;
    } finally {
      if (append) setIsLoadingMore(false);
      else setIsLoading(false);
    }
  }, [user, getAuthHeaders]);

  // ─── On mount: check connection + load data ─────────
  useEffect(() => {
    if (!user) return;

    async function init() {
      const { data: connection, error: connectionError } = await supabase
        .from('etsy_shop_connections')
        .select('id, shop_name, shop_url')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('connected_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (connectionError) {
        setCatalogError('Failed to load your Etsy connection. Please try again.');
        setConnectionStatus('error');
        return;
      }

      if (connection) {
        setShopMeta({ shop_name: connection.shop_name, shop_url: connection.shop_url });
      } else {
        setShopMeta({ shop_name: null, shop_url: null });
      }

      try {
        const [, etsyLoaded] = await Promise.all([
          fetchImported(),
          fetchEtsyListings({ offset: 0, initial: true }),
        ]);
        if (!etsyLoaded) return;
      } catch (error) {
        console.error('[MyShopPage] Failed to load shop data:', error);
        setCatalogError('Failed to load your shop data. Please try again.');
        setConnectionStatus('error');
      }
    }

    init();
  }, [user, fetchImported, fetchEtsyListings]);

  // ─── Sync / refresh ────────────────────────────────
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const etsyLoaded = await fetchEtsyListings({ offset: 0 });
      await fetchImported();
      if (etsyLoaded) toast.success('Shop data refreshed');
    } catch (error) {
      console.error('[MyShopPage] Failed to refresh shop data:', error);
      setCatalogError('Failed to refresh shop data. Please try again.');
      toast.error('Failed to refresh shop data');
    } finally {
      setIsSyncing(false);
    }
  };

  // ─── Toggle selection (state-neutral; action bar groups compatible rows) ──
  const handleToggleSelect = (etsyListingId) => {
    const row = allRows.find((candidate) => candidate.etsyListing.etsy_listing_id === etsyListingId);
    if (!row || !isMyShopBulkSelectable(row)) {
      toast.info('This listing needs an individual action first.');
      return;
    }
    setSelectedIds((prev) => {
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
  const handleImport = async (etsyIds = Array.from(selectedIds), { openStudioAfterPreparation = false } = {}) => {
    if (etsyIds.length === 0) return;
    setIsImporting(true);
    const justImportedIds = new Set(etsyIds);
    try {
      const headers = await getAuthHeaders();
      const { data } = await axios.post('/api/etsy/import-listings', {
        etsy_listing_ids: etsyIds,
      }, { headers });
      setImportResult(data);
      setSelectedIds((current) => new Set([...current].filter((id) => !justImportedIds.has(id))));

      // Fetch imported rows, then auto-prepare newly imported listings
      // so they appear immediately in /listings at "New" status (free operation).
      const freshImported = await fetchImported();
      const toPrep = freshImported.filter(
        (l) => justImportedIds.has(l.etsy_listing_id) && !l.listing_id
      );
      if (openStudioAfterPreparation && etsyIds.length === 1) {
        const etsyId = etsyIds[0];
        const row = freshImported.find((listing) => listing.etsy_listing_id === etsyId);
        if (!row) throw new Error('The imported listing could not be found. Refresh the catalog and try again.');
        setPreparingListingId(etsyId);
        try {
          const { data: prepared } = await axios.post('/api/etsy/prepare-listing', { etsy_listing_id: row.id }, { headers });
          navigate('/studio', { state: { listingId: prepared.listing_id } });
        } catch (error) {
          const message = error.response?.data?.error || error.message || 'Preparation failed. Please try again.';
          await fetchImported();
          toast.error(error.response?.data?.code === 'PREPARATION_IN_PROGRESS'
            ? 'Preparation is already in progress. Refresh My Shop for the latest status.'
            : `Imported, but preparation failed: ${message}`);
        } finally {
          setPreparingListingId(null);
        }
      } else if (toPrep.length > 0) {
        const preparationResults = await Promise.allSettled(
          toPrep.map((row) => axios.post('/api/etsy/prepare-listing', { etsy_listing_id: row.id }, { headers }))
        );
        const failedPreparations = preparationResults.flatMap((result, index) => {
          if (result.status === 'fulfilled') return [];
          const message = result.reason?.response?.data?.error || 'Preparation failed. You can retry from this listing.';
          return [[toPrep[index].etsy_listing_id, message]];
        });
        if (failedPreparations.length > 0) {
          toast.error(`${failedPreparations.length} imported listing${failedPreparations.length !== 1 ? 's' : ''} still need preparation.`);
        }
        await fetchImported();
      }

      if (!openStudioAfterPreparation) toast.success(`${data.imported} listing${data.imported !== 1 ? 's' : ''} imported`);
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
  const handleScore = async (etsyIds = bulkActionPlan.scoreIds) => {
    const etsyListingUuids = etsyIds
      .map((etsyId) => importedListings.find((l) => l.etsy_listing_id === etsyId))
      .filter((imp) => imp && (imp.scoring_status === 'pending' || imp.scoring_status === 'error'))
      .map((imp) => imp.id);

    if (etsyListingUuids.length === 0) return;
    const scoreCost = etsyListingUuids.length * 3;
    if (!window.confirm(`Score SEO for ${etsyListingUuids.length} listing${etsyListingUuids.length !== 1 ? 's' : ''}? This uses ${scoreCost} credit${scoreCost !== 1 ? 's' : ''}.`)) return;

    setIsScoring(true);
    try {
      const headers = await getAuthHeaders();
      const { data } = await axios.post('/api/etsy/score-listings', {
        etsy_listing_ids: etsyListingUuids,
      }, { headers });
      if (data.scored > 0) {
        toast.success(`${data.scored} listing${data.scored !== 1 ? 's' : ''} scored (${data.tokens_deducted} tokens used)`);
      } else {
        toast.error(data.failed > 0 ? 'Scoring failed. You can retry the listing.' : 'No listing was scored.');
      }
      setSelectedIds((current) => new Set([...current].filter((id) => !etsyIds.includes(id))));
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
  const handleBatchExport = async (etsyIds = bulkActionPlan.reviewIds, mode = 'review') => {
    const selectedEtsyListings = importedListings.filter(el =>
      etsyIds.includes(el.etsy_listing_id) && el.scoring_status === 'scored' && el.listing_id
    );

    if (selectedEtsyListings.length === 0) {
      toast.error('No listings are ready for review');
      return;
    }
    if (selectedEtsyListings.length > 5) {
      toast.error('Review up to 5 listings at a time.');
      return;
    }

    const listingIds = selectedEtsyListings.map(el => el.listing_id);

    try {
      const [{ data: listingsData }, { data: keywordsData }] = await Promise.all([
        supabase.from('listings').select('id, generated_title, generated_description, image_url, etsy_proposal_fields').in('id', listingIds),
        supabase.from('listing_seo_stats').select('listing_id, tag').in('listing_id', listingIds).eq('is_proposal_selected', true),
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
          proposal_fields: listing?.etsy_proposal_fields || {},
          image_url: el.thumbnail_url || listing?.image_url,
          display_title: listing?.generated_title || el.original_title,
        };
      }).filter(item => item.optimized_tags.length > 0 || item.optimized_title || item.optimized_description);

      if (modalListings.length === 0) {
        toast.error('Selected listings have no optimized SEO data. Open them in Studio first.');
        return;
      }

      setExportModalData(modalListings);
      setExportModalMode(mode);
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
      const headers = await getAuthHeaders();
      const { data } = await axios.post('/api/etsy/prepare-listing', {
        etsy_listing_id: etsyRow.id,
      }, { headers });
      await fetchImported();
      navigate('/studio', { state: { listingId: data.listing_id } });
    } catch (error) {
      const message = error.response?.data?.error || error.message || 'Preparation failed. Please try again.';
      await fetchImported();
      toast.error(error.response?.data?.code === 'PREPARATION_IN_PROGRESS'
        ? 'Preparation is already in progress. Refresh My Shop for the latest status.'
        : 'Failed to prepare listing: ' + message);
    } finally {
      setPreparingListingId(null);
    }
  };

  // ─── Direct row actions ──────────────────────────────
  const handleListingAction = async (row, action) => {
    const etsyId = row.etsyListing.etsy_listing_id;
    if (action === 'working') return;
    if (action === 'optimize') {
      if (importLimit < 1) {
        toast.error('Your import limit has been reached.');
        return;
      }
      await handleImport([etsyId], { openStudioAfterPreparation: true });
      return;
    }
    if (['prepare', 'retry_preparation', 'continue', 'view'].includes(action)) {
      await handleOpenInStudio(etsyId);
      return;
    }
    if (['score', 'retry_score'].includes(action)) {
      await handleScore([etsyId]);
      return;
    }
    if (action === 'review') {
      // The modal starts with Etsy preflight. It never publishes until its own explicit confirmation.
      await handleBatchExport([etsyId]);
      return;
    }
    if (action === 'verify') {
      // An unverified publication starts with a fresh Etsy read, not a new publication.
      await handleBatchExport([etsyId], 'verify');
    }
  };

  // ─── Load more ──────────────────────────────────────
  const handleLoadMore = () => {
    fetchEtsyListings({ offset: etsyListings.length, append: true });
  };

  const handleRetryLoad = async () => {
    setConnectionStatus('loading');
    try {
      const [, etsyLoaded] = await Promise.all([
        fetchImported(),
        fetchEtsyListings({ offset: 0, initial: true }),
      ]);
      if (!etsyLoaded) return;
    } catch (error) {
      console.error('[MyShopPage] Failed to retry loading shop data:', error);
      setCatalogError('Failed to load your shop data. Please try again.');
      setConnectionStatus('error');
    }
  };

  const hasMore = etsyListings.length < pagination.count;
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

  if (connectionStatus === 'error') {
    return (
      <Layout>
        <div className="min-h-screen bg-slate-50 px-6 lg:px-8 py-6 flex items-center justify-center">
          <div role="alert" className="max-w-md rounded-xl border border-rose-200 bg-white p-6 text-center shadow-sm">
            <AlertCircle className="mx-auto mb-3 h-8 w-8 text-rose-600" />
            <h1 className="text-lg font-semibold text-slate-800">Unable to load your Etsy shop</h1>
            <p className="mt-2 text-sm text-slate-600">{catalogError || 'Please check your connection and try again.'}</p>
            <button onClick={handleRetryLoad} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          </div>
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
            Refresh catalog
          </button>
        </div>

        {catalogError && (
          <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <span>{catalogError}</span>
            <button onClick={handleSync} disabled={isSyncing} className="shrink-0 font-medium text-rose-700 underline disabled:opacity-50">Try again</button>
          </div>
        )}

        {/* Amorce card — contextual next-action hint */}
        <AmorceCard
          importedCount={importedCount}
          optimizedCount={optimizedCount}
          publishedCount={publishedCount}
          onOpenDocs={handleOpenDocs}
          onOpenStudioWithFirstImported={handleOpenStudioWithFirstImported}
        />

        {/* Stats bar */}
        <ShopStatsBar
          catalogTotal={pagination.count}
          catalogLoaded={etsyListings.length}
          workspaceImported={importedCount}
          workspacePublished={publishedCount}
          loadedReadyToPublish={tabCounts.ready_to_publish}
        />

        {/* Workflow tabs, local filters and search */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-slate-700">
              Your Etsy listings
              {pagination.count > 0 && (
                <span className="ml-2 text-sm font-normal text-slate-400">({etsyListings.length} loaded of {pagination.count})</span>
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

          {etsyListings.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Etsy Workflow</p>
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {tabs.map((tab) => (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${activeTab === tab.key ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-700'}`}>
                    {tab.label} · {tabCounts[tab.key]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {etsyListings.length > 0 && (
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" strokeWidth={2} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${etsyListings.length} loaded titles…`}
                  aria-label="Search loaded listing titles"
                  className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <SlidersHorizontal size={15} className="text-slate-400" />
                <select value={progressFilter} onChange={(event) => setProgressFilter(event.target.value)} aria-label="Filter Etsy workflow" className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"><option value="all">Etsy Workflow</option><option value="not_started">Not started</option><option value="preparation_required">Preparation required</option><option value="ready_to_score">Ready to score</option><option value="scoring">Scoring</option><option value="studio">Continue in Studio</option><option value="proposal">Proposal ready</option><option value="error">Needs retry</option></select>
                <select value={publicationFilter} onChange={(event) => setPublicationFilter(event.target.value)} aria-label="Filter publication status" className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"><option value="all">Publication</option><option value="not_ready">Not ready</option><option value="ready">Ready to review</option><option value="attention">Needs attention</option><option value="published">Published</option></select>
                <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} aria-label="Sort listings" className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"><option value="activity">Latest activity</option><option value="title">Title</option><option value="score">SEO score</option></select>
                {(hasExtraFilters || searchQuery) && <button onClick={clearFilters} className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"><X size={14} /> Clear</button>}
              </div>
            </div>
          )}
          {etsyListings.length > 0 && <p className="text-xs text-slate-500">Search, filters, and tab counts apply to the {etsyListings.length} listings loaded in this browser.</p>}
        </div>

        {/* Listing grid */}
        {isLoading && etsyListings.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          filteredRows.length === 0 && etsyListings.length > 0 ? (
            <EmptyResults
              activeTab={activeTab}
              searchQuery={debouncedSearch}
              hasExtraFilters={hasExtraFilters}
              onClearStatus={() => { setActiveTab('all'); clearFilters(); }}
              onClearAll={() => { setActiveTab('all'); clearFilters(); }}
            />
          ) : (
            <EtsyListingGrid
              rows={filteredRows}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onAction={handleListingAction}
            />
          )
        )}

        {/* Load more */}
        {hasMore && !isLoading && (
          <div className="text-center pt-2 pb-8">
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors disabled:opacity-60"
            >
              {isLoadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoadingMore ? 'Loading listings...' : 'Load more listings'}
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
          plan={bulkActionPlan}
          isImporting={isImporting}
          onImport={handleImport}
          limitRemaining={importLimit}
          isScoring={isScoring}
          onScore={handleScore}
          tokenBalance={tokenBalance}
          onReview={handleBatchExport}
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
          preflightLabel={exportModalMode === 'verify' ? 'Verify with Etsy first' : undefined}
        />
      )}
    </Layout>
  );
}
