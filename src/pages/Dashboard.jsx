import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import Layout from '@/components/Layout';
import QuickStats from '@/components/dashboard/QuickStats';
import PipelineBar from '@/components/dashboard/PipelineBar';
import NextActions from '@/components/dashboard/NextActions';
import ShopHealth from '@/components/dashboard/ShopHealth';
import KeywordBankStats from '@/components/dashboard/KeywordBankStats';
import ListingsTable from '@/components/dashboard/ListingsTable';
import TrendingKeywords from '@/components/dashboard/TrendingKeywords';
import { Plus, Sparkles } from 'lucide-react';

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="h-3 bg-slate-200 rounded animate-pulse w-20 mb-2" />
            <div className="h-6 bg-slate-200 rounded animate-pulse w-12" />
          </div>
        ))}
      </div>
      {/* Pipeline bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="h-6 bg-slate-200 rounded-lg animate-pulse mb-3" />
        <div className="flex gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-5 bg-slate-200 rounded-full animate-pulse w-16" />
          ))}
        </div>
      </div>
      {/* Next actions */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-7 h-7 bg-slate-200 rounded-lg animate-pulse" />
            <div className="h-4 bg-slate-200 rounded animate-pulse flex-1" />
            <div className="h-6 bg-slate-200 rounded animate-pulse w-16" />
          </div>
        ))}
      </div>
      {/* Two-col */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl p-6 h-48 animate-pulse" />
        <div className="bg-white border border-slate-200 rounded-xl p-6 h-48 animate-pulse" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [statusCounts, setStatusCounts] = useState(null);
  const [listings, setListings] = useState([]);
  const [trending, setTrending] = useState([]);
  const [bankStats, setBankStats] = useState({ keywords: 0, presets: 0, gems: 0 });

  useEffect(() => {
    if (!user) return;
    fetchDashboardData();
  }, [user]);

  async function fetchDashboardData() {
    setLoading(true);
    try {
      const [countsRes, listingsRes, trendingRes, bankRes, presetsRes, gemsRes] = await Promise.all([
        supabase
          .from('v_dashboard_status_counts')
          .select('*')
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('v_dashboard_listings')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(10),
        supabase
          .from('v_dashboard_trending')
          .select('*')
          .eq('user_id', user.id)
          .limit(6),
        supabase
          .from('user_keyword_bank')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('keyword_presets')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('user_keyword_bank')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('last_volume', 1000)
          .lte('last_competition', 0.4)
          .gte('last_cpc', 1.0),
      ]);

      setStatusCounts(countsRes.data || {});
      setListings(listingsRes.data || []);
      setTrending(trendingRes.data || []);
      setBankStats({
        keywords: bankRes.count || 0,
        presets: presetsRes.count || 0,
        gems: gemsRes.count || 0,
      });
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleListingAction(listingId, status) {
    if (listingId) {
      navigate('/studio', { state: { listingId, fromDashboard: true } });
    } else {
      navigate('/studio');
    }
  }

  function handleNewListing() {
    navigate('/studio', { state: { newListing: true } });
  }

  return (
    <Layout>
      {/* TODO: remove after Sentry test */}
      <button
        onClick={() => { throw new Error('Sentry test error — safe to delete'); }}
        style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 9999,
                 background: 'red', color: 'white', padding: '8px 12px',
                 borderRadius: 6, fontSize: 12, cursor: 'pointer', border: 'none' }}
      >
        Test Sentry
      </button>
      <div className="min-h-screen bg-slate-50 px-6 lg:px-8 py-6">
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-sm text-slate-500">Dashboard</p>
              <h1 className="text-2xl font-medium text-slate-800">
                Hello, {(profile?.full_name || 'there').replace(/\s*\(Test\)\s*/, '')}!
              </h1>
            </div>
            <button
              onClick={handleNewListing}
              className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New listing
            </button>
          </div>

          {loading ? (
            <DashboardSkeleton />
          ) : (statusCounts?.total_listings || 0) === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-indigo-600" />
              </div>
              <h2 className="text-xl font-medium text-slate-800 mb-2">Welcome to PennySEO</h2>
              <p className="text-slate-500 mb-6 max-w-md">
                Upload your first product mockup to get AI-powered SEO keywords,
                optimized titles, and descriptions for your Etsy listings.
              </p>
              <button
                onClick={handleNewListing}
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
              >
                Create your first listing
              </button>
            </div>
          ) : (
            <>
              {/* Etsy connection banner */}
              <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-sm text-slate-600">Etsy shop not connected</span>
                <span className="ml-auto text-sm text-slate-400 font-medium">
                  Coming soon
                </span>
              </div>

              <QuickStats
                totalListings={statusCounts?.total_listings || 0}
                createdThisMonth={statusCounts?.created_this_month || 0}
                avgScore={statusCounts?.avg_seo_score}
                optimizedCount={statusCounts?.count_optimized || 0}
                tokensMonthly={profile?.tokens_monthly_balance || 0}
                tokensBonus={profile?.tokens_bonus_balance || 0}
                subscriptionPlan={profile?.subscription_plan || 'free'}
              />

              <PipelineBar
                counts={{
                  NEW: statusCounts?.count_new || 0,
                  ANALYZED: statusCounts?.count_analyzed || 0,
                  SEO_READY: statusCounts?.count_seo_ready || 0,
                  DRAFT_READY: statusCounts?.count_draft_ready || 0,
                  OPTIMIZED: statusCounts?.count_optimized || 0,
                }}
                total={statusCounts?.total_listings || 0}
              />

              <NextActions
                counts={statusCounts}
                onNavigate={handleListingAction}
                onNewListing={handleNewListing}
              />

              {/* Two-column row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <ShopHealth
                  avgScore={statusCounts?.avg_seo_score}
                  avgVisibility={statusCounts?.avg_visibility}
                  avgRelevance={statusCounts?.avg_relevance}
                  avgConversion={statusCounts?.avg_conversion}
                  avgCompetition={statusCounts?.avg_competition}
                  listingsBelow50={statusCounts?.listings_below_50 || 0}
                />
                <KeywordBankStats
                  keywords={bankStats.keywords}
                  presets={bankStats.presets}
                  gems={bankStats.gems}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 24 }}>
                <ListingsTable
                  listings={listings}
                  onAction={handleListingAction}
                />
                <TrendingKeywords keywords={trending} />
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
