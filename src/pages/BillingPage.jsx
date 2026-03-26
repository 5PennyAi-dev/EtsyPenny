import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CreditCard, Coins, Package, Shield, ArrowUpRight, ChevronLeft, ChevronRight, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';

const PACKS = [
  { name: '50 tokens', tokens: 50, price: 5, priceId: 'price_1TF0gQGxl45RKlyAsXzyORjo', perToken: '0.10' },
  { name: '150 tokens', tokens: 150, price: 12, priceId: 'price_1TF0gvGxl45RKlyAQqgFwnRW', popular: true, perToken: '0.08' },
  { name: '500 tokens', tokens: 500, price: 35, priceId: 'price_1TF0iEGxl45RKlyAsANZkvst', perToken: '0.07' },
];

const STATUS_COLORS = {
  active: 'bg-emerald-100 text-emerald-700',
  past_due: 'bg-amber-100 text-amber-700',
  canceled: 'bg-rose-100 text-rose-700',
};

const BillingPage = () => {
  const { user, profile, refreshProfile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [plan, setPlan] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [showPackModal, setShowPackModal] = useState(false);
  const [loadingPack, setLoadingPack] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const perPage = 10;

  // Handle Stripe redirect params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('success')) {
      toast.success('Payment successful! Your tokens have been credited.');
      refreshProfile();
    }
    if (params.get('canceled')) toast.info('Payment canceled.');
    // Clean URL params
    if (params.get('success') || params.get('canceled')) {
      window.history.replaceState({}, '', '/billing');
    }
  }, []);

  // Fetch billing data
  useEffect(() => {
    if (!user) return;
    async function load() {
      setLoading(true);
      const [planRes, txRes] = await Promise.all([
        supabase.from('plans').select('*').eq('id', profile?.subscription_plan || 'free').single(),
        supabase.from('token_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
      ]);
      if (planRes.data) setPlan(planRes.data);
      if (txRes.data) setTransactions(txRes.data);
      setLoading(false);
    }
    load();
  }, [user, profile?.subscription_plan]);

  async function handleOpenPortal() {
    setPortalLoading(true);
    try {
      const res = await axios.post('/api/stripe/create-portal', { userId: user.id });
      window.location.href = res.data.url;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to open billing portal');
      setPortalLoading(false);
    }
  }

  async function handleBuyPack(priceId) {
    setLoadingPack(priceId);
    try {
      const res = await axios.post('/api/stripe/create-checkout', {
        priceId,
        userId: user.id,
        mode: 'payment',
      });
      window.location.href = res.data.url;
    } catch (err) {
      toast.error('Failed to start checkout');
      setLoadingPack(null);
    }
  }

  if (loading || !profile) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        </div>
      </Layout>
    );
  }

  const subscriptionPlan = profile.subscription_plan || 'free';
  const subscriptionStatus = profile.subscription_status || 'active';
  const monthlyBalance = profile.tokens_monthly_balance ?? 0;
  const bonusBalance = profile.tokens_bonus_balance ?? 0;
  const tokensPerMonth = plan?.tokens_per_month ?? 30;
  const monthlyUsed = tokensPerMonth - monthlyBalance;
  const monthlyPercent = tokensPerMonth > 0 ? Math.min((monthlyUsed / tokensPerMonth) * 100, 100) : 0;

  const resetDate = profile.tokens_reset_at ? new Date(profile.tokens_reset_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;
  const renewalDate = profile.subscription_end_at ? new Date(profile.subscription_end_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;

  const paginatedTx = transactions.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(transactions.length / perPage);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-6">Billing</h1>

        {/* Plan + Token Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Current Plan */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <CreditCard size={20} className="text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Current Plan</h2>
              </div>
              <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full capitalize ${STATUS_COLORS[subscriptionStatus] || STATUS_COLORS.active}`}>
                {subscriptionStatus.replace('_', ' ')}
              </span>
            </div>
            <p className="text-2xl font-bold mb-1 capitalize">{subscriptionPlan}</p>
            {renewalDate && subscriptionPlan !== 'free' && (
              <p className="text-sm text-slate-400 mb-4">Renews {renewalDate}</p>
            )}
            {subscriptionPlan === 'free' && (
              <p className="text-sm text-slate-400 mb-4">Free forever</p>
            )}
            <div className="flex gap-3">
              {subscriptionPlan !== 'free' && (
                <button
                  onClick={handleOpenPortal}
                  disabled={portalLoading}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
                >
                  {portalLoading ? <Loader2 size={14} className="animate-spin" /> : <ArrowUpRight size={14} />}
                  Manage subscription
                </button>
              )}
              <button
                onClick={() => navigate('/pricing')}
                className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                {subscriptionPlan === 'free' ? 'Upgrade' : 'Change plan'}
              </button>
            </div>
          </div>

          {/* Token Balance */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Coins size={20} className="text-amber-500" />
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Token Balance</h2>
              </div>
            </div>

            {/* Monthly tokens progress */}
            <div className="mb-3">
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-slate-600">Monthly tokens</span>
                <span className="font-semibold">{monthlyBalance} / {tokensPerMonth}</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${monthlyPercent > 80 ? 'bg-rose-500' : monthlyPercent > 50 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                  style={{ width: `${100 - monthlyPercent}%` }}
                />
              </div>
            </div>

            {/* Bonus tokens */}
            <div className="flex justify-between text-sm mb-3">
              <span className="text-slate-600">Bonus tokens</span>
              <span className="font-semibold">{bonusBalance}</span>
            </div>

            {resetDate && (
              <p className="text-xs text-slate-400 mb-4">Resets on {resetDate}</p>
            )}

            <button
              onClick={() => setShowPackModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              <Package size={14} />
              Buy tokens
            </button>
          </div>
        </div>

        {/* Usage Stats */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
            <span className="text-sm text-slate-600">Custom keywords used</span>
            <span className="text-sm font-bold">{profile.add_custom_used ?? 0} / {plan?.add_custom_limit ?? 10}</span>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
            <span className="text-sm text-slate-600">Favorites added</span>
            <span className="text-sm font-bold">
              {profile.add_favorite_used ?? 0} / {plan?.add_favorite_limit === null ? 'Unlimited' : (plan?.add_favorite_limit ?? 20)}
            </span>
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Transaction History</h2>
          </div>

          {transactions.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-slate-400">No transactions yet</div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100">
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Action</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                    <th className="px-6 py-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTx.map((tx) => (
                    <tr key={tx.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                      <td className="px-6 py-3 text-slate-500">
                        {new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-6 py-3 text-slate-700">{tx.description || tx.action || tx.type}</td>
                      <td className={`px-6 py-3 text-right font-semibold ${tx.amount > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount}
                      </td>
                      <td className="px-6 py-3 text-right text-slate-500">{tx.balance_after}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 disabled:opacity-40"
                  >
                    <ChevronLeft size={14} /> Previous
                  </button>
                  <span className="text-xs text-slate-400">Page {page + 1} of {totalPages}</span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 disabled:opacity-40"
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Buy Tokens Modal */}
      {showPackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">Buy Token Pack</h3>
              <button onClick={() => setShowPackModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X size={18} className="text-slate-400" />
              </button>
            </div>

            <div className="space-y-3">
              {PACKS.map((pack) => (
                <button
                  key={pack.priceId}
                  onClick={() => handleBuyPack(pack.priceId)}
                  disabled={loadingPack === pack.priceId}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all hover:shadow-md ${
                    pack.popular ? 'border-indigo-300 bg-indigo-50/50' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-xl font-extrabold">{pack.tokens}</div>
                    <div className="text-left">
                      <div className="text-sm font-semibold flex items-center gap-2">
                        tokens
                        {pack.popular && <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">Best Value</span>}
                      </div>
                      <div className="text-xs text-slate-400">${pack.perToken}/token</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full">
                      <Shield size={10} /> Never expires
                    </span>
                    <span className="text-lg font-bold">${pack.price}</span>
                    {loadingPack === pack.priceId && <Loader2 size={16} className="animate-spin text-indigo-500" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default BillingPage;
