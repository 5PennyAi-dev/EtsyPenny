import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import PerformanceCard from '../components/dashboard/PerformanceCard';
import MarketInsights from '../components/dashboard/MarketInsights';
import { 
  Plus, 
  ShoppingBag,
  ArrowRight,
  Package
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [recentListings, setRecentListings] = useState([]);
  const [performanceStats, setPerformanceStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // Fetch Recent Listings
        const { data: listingsData, error: listingsError } = await supabase
          .from('view_listing_scores')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (listingsError) throw listingsError;
        setRecentListings(listingsData || []);

        // Fetch Performance Stats
        const { data: statsData, error: statsError } = await supabase
          .from('view_user_performance_stats')
          .select('avg_strength, avg_visibility, avg_relevance, avg_conversion, avg_competition, avg_competition_all, avg_competition2, avg_profit, avg_cpc, avg_raw_visibility_index, listings_needing_fix, total_listings')
          .eq('user_id', user.id)
          .single();

        if (statsError && statsError.code !== 'PGRST116') {
          console.error('Error fetching performance stats:', statsError);
        }
        setPerformanceStats(statsData);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
        setStatsLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen bg-slate-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* 1. Welcome Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                Welcome back, {profile?.shop_name || profile?.full_name || 'Entrepreneur'} ! 👋
              </h1>
              <p className="text-slate-500 mt-1">
                Here's how your shop is performing today.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link 
                to="/studio" 
                state={{ newListing: true }}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-lg shadow-sm hover:bg-indigo-700 hover:shadow-md transition-all active:scale-95"
              >
                <Plus size={18} />
                New Listing ✨
              </Link>
            </div>
          </div>

          {/* 2. Performance Card (Shop Health) */}
          <PerformanceCard stats={performanceStats} loading={statsLoading} />

          {/* 3. Market Insights */}
          <MarketInsights stats={performanceStats} />

          {/* 3. Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Recent Activity (Col-span 8) */}
            <div className="lg:col-span-8 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Recent Optimizations</h2>
                <Link to="/history" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                  View all <ArrowRight size={14} />
                </Link>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {recentListings.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Listing</th>
                          <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Niche</th>
                          <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Score</th>
                          <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {recentListings.map((listing) => (
                          <tr 
                            key={listing.listing_id} 
                            className="hover:bg-slate-50/50 transition-colors group cursor-pointer" 
                            onClick={() => navigate('/studio', { state: { listingId: listing.listing_id } })}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                {listing.image_url ? (
                                  <img src={listing.image_url} alt="" className="w-10 h-10 rounded-lg object-cover bg-slate-100 border border-slate-200" />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                                    <ShoppingBag size={18} />
                                  </div>
                                )}
                                <div>
                                  <p className={`text-sm font-medium max-w-[200px] truncate ${
                                    listing.status === 'New' ? 'text-slate-500' : 'text-slate-900'
                                  }`} title={listing.title}>
                                    {listing.title || 'Untitled Listing'}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                                {listing.niche_name || 'General'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-sm font-bold 
                                ${(listing.listing_score || 0) >= 80 ? 'bg-emerald-100 text-emerald-700' :
                                  (listing.listing_score || 0) >= 50 ? 'bg-indigo-100 text-indigo-700' :
                                  (listing.listing_score || 0) > 0 ? 'bg-amber-100 text-amber-700' :
                                  'bg-slate-100 text-slate-500'}`}>
                                {listing.listing_score ? Math.round(listing.listing_score) : 'N/A'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                listing.status === 'Listing completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                listing.status === 'SEO analysis completed' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                'bg-slate-100 text-slate-600 border-slate-200'
                              }`}>
                                {listing.status || 'New'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 text-slate-400 mb-4">
                      <Package size={32} />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900">Welcome to PennySEO!</h3>
                    <p className="text-slate-500 mt-2 max-w-sm mx-auto">
                      Your dashboard is ready. Launch your first analysis to see your stats appear.
                    </p>
                    <Link 
                      to="/studio" 
                      state={{ newListing: true }}
                      className="inline-flex items-center gap-2 px-4 py-2 mt-6 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      <Plus size={16} />
                      Create my first listing
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Pro Tip Sidebar (Col-span 4) */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-indigo-900 p-6 rounded-2xl shadow-sm text-white relative overflow-hidden">
                <div className="relative z-10">
                  <h3 className="font-bold text-lg mb-2">Pro Tip 💡</h3>
                  <p className="text-indigo-100 text-sm leading-relaxed mb-4">
                    Listings with descriptions over 150 words are 23% more likely to appear on the first page of Etsy search results.
                  </p>
                  <Link to="/studio" className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/30 hover:border-white pb-0.5 transition-colors">
                    Optimize now
                  </Link>
                </div>
                {/* Decorative Blob */}
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-indigo-500 rounded-full blur-2xl opacity-50"></div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
