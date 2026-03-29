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
import { Plus, Sparkles, Camera, Search, PenLine, ClipboardCopy } from 'lucide-react';

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
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [statusCounts, setStatusCounts] = useState(null);
  const [onboardingStep, setOnboardingStep] = useState('name');
  const [nameInput, setNameInput] = useState('');
  const [listings, setListings] = useState([]);
  const [trending, setTrending] = useState([]);
  const [bankStats, setBankStats] = useState({ keywords: 0, presets: 0, gems: 0 });
  const [lowestScore, setLowestScore] = useState(null);
  const [scoreHistory, setScoreHistory] = useState([]);

  useEffect(() => {
    if (!user) return;
    fetchDashboardData();
  }, [user]);

  async function fetchDashboardData() {
    setLoading(true);
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const [countsRes, listingsRes, trendingRes, bankRes, presetsRes, gemsRes, minScoreRes, scoreHistoryRes] = await Promise.all([
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
        supabase
          .from('listings_global_eval')
          .select('listing_strength')
          .lt('listing_strength', 50)
          .order('listing_strength', { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('listings_global_eval')
          .select('listing_strength, updated_at')
          .not('listing_strength', 'is', null)
          .gte('updated_at', thirtyDaysAgo)
          .order('updated_at', { ascending: true }),
      ]);

      setStatusCounts(countsRes.data || {});
      setListings(listingsRes.data || []);
      setTrending(trendingRes.data || []);
      setBankStats({
        keywords: bankRes.count || 0,
        presets: presetsRes.count || 0,
        gems: gemsRes.count || 0,
      });
      setLowestScore(minScoreRes.data?.listing_strength ?? null);

      // Group score history by day for the evolution chart
      const groups = {};
      (scoreHistoryRes.data || []).forEach(item => {
        const day = item.updated_at.substring(0, 10);
        if (!groups[day]) groups[day] = [];
        groups[day].push(item.listing_strength);
      });
      setScoreHistory(
        Object.entries(groups).map(([date, scores]) => ({
          date,
          avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        }))
      );
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

  const isFirstRun = !loading && (statusCounts?.total_listings || 0) === 0;
  const showNameStep = isFirstRun && !profile?.full_name && onboardingStep === 'name';

  async function handleSaveName() {
    if (nameInput.trim()) {
      await supabase.from('profiles').update({ full_name: nameInput.trim() }).eq('id', user.id);
      await refreshProfile();
    }
    setOnboardingStep('welcome');
  }

  return (
    <Layout>
<div className="min-h-screen bg-slate-50 px-6 lg:px-8 py-6">
        <div className="space-y-5">
          {/* Header */}
          {!isFirstRun && (
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
          )}

          {loading ? (
            <DashboardSkeleton />
          ) : showNameStep ? (
            /* Name collection step */
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="max-w-[400px] w-full">
                <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <Sparkles className="w-8 h-8 text-indigo-600" />
                </div>
                <h1 className="text-2xl font-bold text-slate-800 mb-2">
                  What's your name?
                </h1>
                <p className="text-slate-500 mb-8 text-sm">
                  So we can personalize your experience
                </p>
                <input
                  type="text"
                  placeholder="Your first name"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-center text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none mb-4"
                  autoFocus
                />
                <button
                  onClick={handleSaveName}
                  className="w-full bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors text-sm mb-3"
                >
                  Continue →
                </button>
                <button
                  onClick={() => setOnboardingStep('welcome')}
                  className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Skip for now
                </button>
              </div>
            </div>
          ) : isFirstRun ? (
            /* First-run welcome screen */
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="max-w-[680px] w-full">
                <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <Sparkles className="w-8 h-8 text-indigo-600" />
                </div>
                <h1 className="text-2xl font-bold text-slate-800 mb-2">
                  Welcome to PennySEO{profile?.full_name ? `, ${profile.full_name}` : ''}!
                </h1>
                <p className="text-slate-500 mb-10">
                  Your AI-powered SEO assistant for Etsy
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
                  <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                    <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <Camera className="w-5 h-5 text-indigo-600" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700 mb-1">Upload & analyze</p>
                    <p className="text-xs text-slate-500">Upload your product image and analyze its visual style</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                    <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <Search className="w-5 h-5 text-indigo-600" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700 mb-1">Generate SEO</p>
                    <p className="text-xs text-slate-500">We find the best keywords using real Etsy search data</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                    <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <PenLine className="w-5 h-5 text-indigo-600" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700 mb-1">Generate draft</p>
                    <p className="text-xs text-slate-500">Get an AI-written title and description from your top keywords</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                    <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <ClipboardCopy className="w-5 h-5 text-indigo-600" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700 mb-1">Copy to Etsy</p>
                    <p className="text-xs text-slate-500">Paste your optimized content directly into your listing</p>
                  </div>
                </div>

                <button
                  onClick={handleNewListing}
                  className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors text-sm"
                >
                  Optimize my first listing →
                </button>
              </div>
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
                tokenBalance={(profile?.tokens_monthly_balance || 0) + (profile?.tokens_bonus_balance || 0)}
                avgScore={statusCounts?.avg_seo_score}
                lowestScore={lowestScore}
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
                  scoreHistory={scoreHistory}
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
