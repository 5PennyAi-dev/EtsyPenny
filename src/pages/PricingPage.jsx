import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Zap, Crown, Rocket, Sparkles, ChevronDown, Shield, Package, Coins } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/pennyseo-logo.png';

const PLANS = [
  {
    id: 'free', name: 'Free', monthlyPrice: 0, yearlyPrice: 0,
    tokens: 30, icon: Zap, priceIdMonthly: null, priceIdYearly: null,
    features: [
      '30 tokens/month (3 complete listings)',
      'AI image analysis',
      '130+ keywords per listing',
      'AI title & description',
      '10 custom keywords/month',
      '20 favorites/month',
    ],
  },
  {
    id: 'starter', name: 'Starter', monthlyPrice: 9, yearlyPrice: 90,
    tokens: 100, icon: Sparkles,
    priceIdMonthly: 'price_1TF0cxGxl45RKlyAP21opNxV',
    priceIdYearly: 'price_1TF0dqGxl45RKlyALp605XNZ',
    features: [
      '100 tokens/month (10 complete listings)',
      'Everything in Free',
      '50 custom keywords/month',
      '100 favorites/month',
      'SEO Lab & Keyword Bank',
    ],
  },
  {
    id: 'growth', name: 'Growth', monthlyPrice: 19, yearlyPrice: 190,
    tokens: 250, icon: Rocket, popular: true,
    priceIdMonthly: 'price_1TF0ePGxl45RKlyA8F1P5Xo0',
    priceIdYearly: 'price_1TF0eiGxl45RKlyAPKRgNgxg',
    features: [
      '250 tokens/month (25 complete listings)',
      'Everything in Starter',
      '150 custom keywords/month',
      '300 favorites/month',
      'Strategy Tuner',
      'Priority support',
    ],
  },
  {
    id: 'pro', name: 'Pro', monthlyPrice: 39, yearlyPrice: 390,
    tokens: 700, icon: Crown,
    priceIdMonthly: 'price_1TF0fjGxl45RKlyARuGw7Qi0',
    priceIdYearly: 'price_1TF0fSGxl45RKlyAJOSBzYrV',
    features: [
      '700 tokens/month (70 complete listings)',
      'Everything in Growth',
      '500 custom keywords/month',
      'Unlimited favorites',
      'Early access to new features',
    ],
  },
];

const PACKS = [
  { name: '50 tokens', tokens: 50, price: 5, priceId: 'price_1TF0gQGxl45RKlyAsXzyORjo', perToken: '0.10' },
  { name: '150 tokens', tokens: 150, price: 12, priceId: 'price_1TF0gvGxl45RKlyAQqgFwnRW', popular: true, perToken: '0.08' },
  { name: '500 tokens', tokens: 500, price: 35, priceId: 'price_1TF0iEGxl45RKlyAsANZkvst', perToken: '0.07' },
];

const FAQ_ITEMS = [
  {
    q: 'What are tokens and how do they work?',
    a: 'Tokens are the currency of PennySEO. Each action costs a specific number of tokens: image analysis costs 1 token, full keyword generation costs 8 tokens (4 for re-runs), and draft generation costs 1 token. A complete listing optimization uses about 10 tokens total.',
  },
  {
    q: 'How does billing work?',
    a: 'Subscriptions are billed monthly or annually through Stripe. Your token balance resets each billing cycle with your plan\'s allocation. Unused tokens from your monthly balance do not roll over, but bonus tokens from packs never expire.',
  },
  {
    q: 'Can I change or cancel my plan?',
    a: 'Yes, you can upgrade, downgrade, or cancel anytime from your billing settings. Upgrades take effect immediately. Downgrades apply at the end of your current billing period. There are no cancellation fees.',
  },
  {
    q: 'Do token packs expire?',
    a: 'No. Bonus tokens purchased through token packs never expire and remain in your account regardless of your subscription plan. They\'re consumed only after your monthly subscription tokens are used up.',
  },
];

const PricingPage = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [isYearly, setIsYearly] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [loadingPack, setLoadingPack] = useState(null);
  const [openFaq, setOpenFaq] = useState(null);

  const currentPlan = profile?.subscription_plan || 'free';

  async function handleCheckout(priceId) {
    if (!user) {
      navigate('/login');
      return;
    }
    setLoadingPlan(priceId);
    try {
      const res = await axios.post('/api/stripe/create-checkout', {
        priceId,
        userId: user.id,
        mode: 'subscription',
      });
      window.location.href = res.data.url;
    } catch (err) {
      console.error('Checkout error:', err);
      setLoadingPlan(null);
    }
  }

  async function handleBuyPack(priceId) {
    if (!user) {
      navigate('/login');
      return;
    }
    setLoadingPack(priceId);
    try {
      const res = await axios.post('/api/stripe/create-checkout', {
        priceId,
        userId: user.id,
        mode: 'payment',
      });
      window.location.href = res.data.url;
    } catch (err) {
      console.error('Pack purchase error:', err);
      setLoadingPack(null);
    }
  }

  function getCtaProps(plan) {
    const priceId = isYearly ? plan.priceIdYearly : plan.priceIdMonthly;

    if (plan.id === 'free') {
      return { label: 'Get started free', onClick: () => navigate('/login'), disabled: false, variant: 'secondary' };
    }

    if (!user) {
      return { label: `Start with ${plan.name}`, onClick: () => navigate('/login'), disabled: false, variant: plan.popular ? 'primary' : 'secondary' };
    }

    if (currentPlan === plan.id) {
      return { label: 'Current plan', onClick: () => {}, disabled: true, variant: 'disabled' };
    }

    return {
      label: `Upgrade to ${plan.name}`,
      onClick: () => handleCheckout(priceId),
      disabled: loadingPlan === priceId,
      loading: loadingPlan === priceId,
      variant: plan.popular ? 'primary' : 'secondary',
    };
  }

  const planOrder = ['free', 'starter', 'growth', 'pro'];
  const currentIndex = planOrder.indexOf(currentPlan);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* ── Navigation ─────────────────────────────── */}
      <nav className="px-6 py-4 max-w-7xl mx-auto flex justify-between items-center">
        <Link to="/" className="flex items-center h-14 overflow-hidden">
          <img src={logo} alt="PennySEO" style={{ width: '200px', maxWidth: 'none', marginLeft: '-12px' }} className="object-cover" />
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/pricing" className="text-sm font-semibold text-indigo-600">Pricing</Link>
          {user ? (
            <Link to="/dashboard" className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
              Dashboard
            </Link>
          ) : (
            <Link to="/login" className="px-4 py-2 text-sm font-semibold text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors">
              Sign in
            </Link>
          )}
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
          Simple pricing,{' '}
          <span className="text-indigo-600" style={{ fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontStyle: 'italic' }}>
            serious results
          </span>
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-10">
          Start free and scale as you grow. Every plan includes AI-powered image analysis,
          keyword generation, and listing optimization.
        </p>

        {/* Monthly / Yearly Toggle */}
        <div className="inline-flex items-center gap-3 bg-white border border-slate-200 rounded-full p-1.5 shadow-sm">
          <button
            onClick={() => setIsYearly(false)}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
              !isYearly ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setIsYearly(true)}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${
              isYearly ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Yearly
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-700">
              Save 17%
            </span>
          </button>
        </div>
      </section>

      {/* ── Plan Cards ─────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLANS.map((plan) => {
            const cta = getCtaProps(plan);
            const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
            const monthlyEquivalent = isYearly && plan.yearlyPrice > 0 ? Math.round(plan.yearlyPrice / 12) : null;
            const Icon = plan.icon;
            const isPlanBelow = user && planOrder.indexOf(plan.id) <= currentIndex && plan.id !== 'free';

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col bg-white rounded-2xl border p-6 transition-all ${
                  plan.popular
                    ? 'border-indigo-400 shadow-lg shadow-indigo-100 ring-1 ring-indigo-400'
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                }`}
              >
                {/* Popular badge */}
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 text-xs font-bold text-white bg-indigo-600 rounded-full shadow-md">
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Header */}
                <div className="flex items-center gap-3 mb-4 mt-1">
                  <div className={`p-2 rounded-xl ${plan.popular ? 'bg-indigo-100' : 'bg-slate-100'}`}>
                    <Icon size={20} className={plan.popular ? 'text-indigo-600' : 'text-slate-500'} strokeWidth={2} />
                  </div>
                  <h3 className="text-lg font-bold">{plan.name}</h3>
                </div>

                {/* Price */}
                <div className="mb-1">
                  {price === 0 ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold">$0</span>
                      <span className="text-slate-400 text-sm">/month</span>
                    </div>
                  ) : isYearly ? (
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-extrabold">${monthlyEquivalent}</span>
                        <span className="text-slate-400 text-sm">/month</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">Billed annually (${price}/yr)</p>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold">${price}</span>
                      <span className="text-slate-400 text-sm">/month</span>
                    </div>
                  )}
                </div>

                {/* Token count */}
                <div className="flex items-center gap-1.5 mt-3 mb-5">
                  <Coins size={14} className="text-amber-500" />
                  <span className="text-sm font-semibold text-slate-700">{plan.tokens} tokens/month</span>
                </div>

                {/* CTA Button */}
                <button
                  onClick={cta.onClick}
                  disabled={cta.disabled}
                  className={`w-full py-2.5 px-4 rounded-xl text-sm font-bold transition-all mb-6 ${
                    cta.variant === 'primary'
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200'
                      : cta.variant === 'disabled'
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-white text-indigo-600 border-2 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50'
                  }`}
                >
                  {cta.loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Redirecting...
                    </span>
                  ) : cta.label}
                </button>

                {/* Features */}
                <ul className="space-y-2.5 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
                      <Check size={16} className="text-emerald-500 mt-0.5 shrink-0" strokeWidth={2.5} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Token Packs ────────────────────────────── */}
      <section className="bg-white border-y border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold mb-3">Need more tokens?</h2>
            <p className="text-slate-500">Top up anytime. Bonus tokens never expire.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PACKS.map((pack) => (
              <div
                key={pack.priceId}
                className={`relative flex flex-col items-center bg-slate-50 rounded-2xl border p-8 text-center transition-all hover:shadow-md ${
                  pack.popular ? 'border-indigo-300 ring-1 ring-indigo-300' : 'border-slate-200'
                }`}
              >
                {pack.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-0.5 text-xs font-bold text-white bg-indigo-600 rounded-full">
                      Best Value
                    </span>
                  </div>
                )}

                <Package size={28} className="text-indigo-500 mb-3" strokeWidth={1.5} />
                <div className="text-3xl font-extrabold mb-1">{pack.tokens}</div>
                <div className="text-sm text-slate-500 mb-4">tokens</div>
                <div className="text-2xl font-bold mb-1">${pack.price}</div>
                <div className="text-xs text-slate-400 mb-4">${pack.perToken}/token</div>

                <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full mb-5">
                  <Shield size={12} />
                  Never expires
                </span>

                <button
                  onClick={() => handleBuyPack(pack.priceId)}
                  disabled={loadingPack === pack.priceId}
                  className="w-full py-2.5 px-4 rounded-xl text-sm font-bold bg-white text-indigo-600 border-2 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all"
                >
                  {loadingPack === pack.priceId ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                      Redirecting...
                    </span>
                  ) : 'Buy tokens'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-extrabold text-center mb-10">Frequently asked questions</h2>
        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-4 text-left"
              >
                <span className="text-sm font-semibold text-slate-800">{item.q}</span>
                <ChevronDown
                  size={18}
                  className={`text-slate-400 transition-transform shrink-0 ml-4 ${openFaq === i ? 'rotate-180' : ''}`}
                />
              </button>
              {openFaq === i && (
                <div className="px-6 pb-4">
                  <p className="text-sm text-slate-500 leading-relaxed">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-slate-400">&copy; {new Date().getFullYear()} PennySEO. All rights reserved.</p>
          <div className="flex gap-6 text-sm text-slate-400">
            <Link to="/privacy" className="hover:text-slate-600 transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-slate-600 transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PricingPage;
