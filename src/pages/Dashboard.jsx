import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { 
  Package, 
  Zap, 
  Coins, 
  ArrowRight, 
  Plus, 
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const Dashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [shopStats, setShopStats] = useState({
    total_listings: 0,
    shop_performance_score: 0,
    last_activity: null
  });
  const [recentListings, setRecentListings] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // 1. Fetch Shop Stats from View
        const { data: statsData, error: statsError } = await supabase
          .from('view_shop_stats')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (statsError && statsError.code !== 'PGRST116') { // Ignore "no rows" error for new users
             console.error('Error fetching shop stats:', statsError);
        }

        // 2. Fetch Recent Listings from View
        const { data: listingsData, error: listingsError } = await supabase
          .from('view_listing_scores')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (listingsError) throw listingsError;

        setShopStats(statsData || {
            total_listings: 0,
            shop_performance_score: 0,
            last_activity: null
        });
        setRecentListings(listingsData || []);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
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
                Bonjour, {profile?.shop_name || profile?.full_name || 'Entrepreneur'} ! 👋
              </h1>
              <p className="text-slate-500 mt-1">
                Voici ce qui se passe dans votre boutique aujourd'hui.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 text-slate-600 font-medium hover:bg-white hover:text-indigo-600 transition-colors rounded-lg border border-transparent hover:border-slate-200">
                Acheter des crédits
              </button>
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

          {/* 2. Metrics Row (The Pulse) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Card 1: Inventory */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">
                  <Package size={24} />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Listings Créés</p>
                <h3 className="text-3xl font-bold text-slate-900 mt-1">{shopStats.total_listings}</h3>
              </div>
            </div>

            {/* Card 2: SEO Power */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-110 transition-transform">
                  <Zap size={24} />
                </div>
                 {/* Optional: Add trend if available in future views */}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Performance Shop</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-3xl font-bold text-slate-900">{shopStats.shop_performance_score}</h3>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Pts</span>
                </div>
                <p className="text-xs text-slate-400 mt-2 font-medium">Opportunity Index</p>
              </div>
            </div>

            {/* Card 3: Wallet (Credits) - Restored & Styled */}
            <div className={`p-6 rounded-2xl border shadow-sm hover:shadow-md transition-shadow group ${
                (profile?.credits_balance || 0) < 10 
                    ? 'bg-red-50 border-red-100' 
                    : (profile?.credits_balance || 0) < 25 
                        ? 'bg-orange-50 border-orange-100' 
                        : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl group-hover:scale-110 transition-transform ${
                    (profile?.credits_balance || 0) < 10 
                        ? 'bg-red-100 text-red-600' 
                        : (profile?.credits_balance || 0) < 25 
                            ? 'bg-orange-100 text-orange-600' 
                            : 'bg-indigo-50 text-indigo-600'
                }`}>
                  <Coins size={24} />
                </div>
                <button className={`text-xs font-medium hover:underline ${
                    (profile?.credits_balance || 0) < 10 ? 'text-red-700' : 'text-indigo-600'
                }`}>
                  Recharger
                </button>
              </div>
              <div>
                <p className={`text-sm font-medium ${
                    (profile?.credits_balance || 0) < 10 ? 'text-red-800' : 'text-slate-500'
                }`}>Crédits Restants</p>
                <h3 className={`text-3xl font-bold mt-1 ${
                  (profile?.credits_balance || 0) < 10 ? 'text-red-700' : 'text-slate-900'
                }`}>
                  {profile?.credits_balance || 0}
                </h3>
              </div>
            </div>
          </div>

          {/* 3. Status Statistics Bar */}
          <div className="grid grid-cols-3 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
             <div className="flex items-center justify-center gap-2 border-r border-slate-100">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                <span className="text-sm font-medium text-slate-600">New:</span>
                <span className="text-lg font-bold text-slate-900">{shopStats.count_new || 0}</span>
             </div>
             <div className="flex items-center justify-center gap-2 border-r border-slate-100">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                <span className="text-sm font-medium text-slate-600">SEO Done:</span>
                <span className="text-lg font-bold text-slate-900">{shopStats.count_seo || 0}</span>
             </div>
             <div className="flex items-center justify-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="text-sm font-medium text-slate-600">Complete:</span>
                <span className="text-lg font-bold text-slate-900">{shopStats.count_complete || 0}</span>
             </div>
          </div>

          {/* 4. Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Recent Activity (Col-span 8) */}
            <div className="lg:col-span-8 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Optimisations Récentes</h2>
                <Link to="/history" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                  Voir tout <ArrowRight size={14} />
                </Link>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {shopStats.total_listings > 0 ? (
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
                            <tr key={listing.listing_id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => navigate('/studio', { state: { listingId: listing.listing_id } })}>
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
                                    }`} title={listing.display_title || listing.title}>
                                      {listing.display_title || listing.title || "Untitled Listing"}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                                  {listing.niche_full || listing.niche_name || 'General'}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-sm font-bold 
                                    ${(listing.listing_score || listing.performance_score) >= 80 ? 'bg-emerald-100 text-emerald-700' :
                                      (listing.listing_score || listing.performance_score) >= 50 ? 'bg-indigo-100 text-indigo-700' :
                                      (listing.listing_score || listing.performance_score) > 0 ? 'bg-amber-100 text-amber-700' :
                                      'bg-slate-100 text-slate-500'}`}>
                                    {(listing.listing_score || listing.performance_score) ? Math.round(listing.listing_score || listing.performance_score) : 'N/A'}
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
                    <h3 className="text-lg font-medium text-slate-900">Bienvenue sur StudioDourliac !</h3>
                    <p className="text-slate-500 mt-2 max-w-sm mx-auto">
                      Votre tableau de bord est prêt. Lancez votre première analyse pour voir apparaître vos statistiques.
                    </p>
                    <Link 
                      to="/studio" 
                      state={{ newListing: true }}
                      className="inline-flex items-center gap-2 px-4 py-2 mt-6 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      <Plus size={16} />
                      Créer mon premier listing
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Shop Profile Widget (Sidebar - 1/3) */}
            <div className="lg:col-span-4 space-y-6">
              <h2 className="text-lg font-bold text-slate-900">Identité de Marque</h2>
              
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <ShoppingBag size={120} />
                </div>
                
                <div className="relative z-10 space-y-6">
                    {/* Brand Tone */}
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Ton de Marque</p>
                        {profile?.brand_tone ? (
                            <div className="flex flex-wrap gap-2">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                                    <CheckCircle2 size={14} />
                                    {profile.brand_tone}
                                </span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-amber-600 text-sm bg-amber-50 p-3 rounded-lg border border-amber-100">
                                <AlertCircle size={16} />
                                <span>Non défini</span>
                            </div>
                        )}
                    </div>

                    {/* Target Audience */}
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Cible Client</p>
                        {profile?.target_audience ? (
                            <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                                "{profile.target_audience.length > 100 ? profile.target_audience.substring(0, 100) + '...' : profile.target_audience}"
                            </p>
                        ) : (
                            <p className="text-sm text-slate-400 italic">Aucune cible définie.</p>
                        )}
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <Link 
                            to="/shop" 
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white text-slate-700 font-medium rounded-lg border border-slate-200 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                        >
                            {(!profile?.brand_tone || !profile?.target_audience) ? 'Compléter mon profil' : 'Gérer ma marque'}
                            <ArrowRight size={16} />
                        </Link>
                    </div>
                </div>
              </div>

               {/* Optional: Quick Tips or News */}
               <div className="bg-indigo-900 p-6 rounded-2xl shadow-sm text-white relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="font-bold text-lg mb-2">Astuce Pro 💡</h3>
                        <p className="text-indigo-100 text-sm leading-relaxed mb-4">
                            Les listings avec des descriptions de plus de 150 mots ont 23% de chances en plus d'être en première page.
                        </p>
                        <Link to="/studio" className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/30 hover:border-white pb-0.5 transition-colors">
                            Optimiser maintenant
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
