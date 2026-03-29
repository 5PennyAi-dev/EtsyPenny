import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import axios from 'axios';
import { Loader2, Mail, Lock, AlertCircle, ArrowRight, Eye, EyeOff, Sparkles, Target, TrendingUp, Shield } from 'lucide-react';
import pennyseoLogo from '../assets/pennyseo-logo.png';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/studio';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [view, setView] = useState('sign_in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${from}`,
        },
      });
      if (error) throw error;
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (view === 'sign_up') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;

        // Send welcome email regardless of confirmation flow (fire-and-forget)
        if (data.user?.email) {
          axios.post('/api/emails/welcome', {
            email: data.user.email,
            name: data.user.user_metadata?.full_name || '',
          }).catch(() => {});
        }

        if (data.session) {
          navigate(from, { replace: true });
          return;
        }
        if (data.user) {
          setError('Please check your email for the confirmation link.');
          setLoading(false);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate(from, { replace: true });
      }
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes login-slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes login-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-login-slide-up {
          animation: login-slide-up 0.6s ease both;
        }
        .animate-login-fade-in {
          animation: login-fade-in 0.5s ease both;
        }
      `}</style>

      <div className="flex min-h-screen" style={{ fontFamily: "'DM Sans', sans-serif" }}>

        {/* ===== LEFT PANEL — Marketing (60%) ===== */}
        <div
          className="hidden lg:flex lg:w-[60%] min-h-screen relative overflow-hidden flex-col justify-between px-10 py-8"
          style={{ background: 'linear-gradient(160deg, #0f0e2a 0%, #1e1b4b 40%, #312e81 100%)' }}
        >
          {/* Grid pattern overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />
          {/* Soft glow accent */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: '15%', right: '-10%', width: '50%', height: '50%',
              background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
            }}
          />

          {/* TOP — Logo + Headline + Subtitle */}
          <div className="relative z-10">
            {/* Logo + Beta badge */}
            <div className="flex items-center gap-3 animate-login-fade-in">
              <img
                src={pennyseoLogo}
                alt="PennySEO"
                className="w-36 h-auto brightness-0 invert"
              />
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30 tracking-wide">
                Beta — Free to try
              </span>
            </div>

            {/* Headline */}
            <h1
              className="text-3xl font-bold text-white mt-6 mb-3 animate-login-slide-up"
              style={{ lineHeight: 1.2, animationDelay: '0.1s' }}
            >
              Your listings deserve
              <br />
              <span className="text-amber-400">to be found.</span>
            </h1>

            {/* Subtitle */}
            <p
              className="text-sm text-indigo-200 max-w-xs leading-relaxed animate-login-slide-up"
              style={{ animationDelay: '0.2s' }}
            >
              AI-powered SEO that analyzes your product photos and generates
              optimized tags, titles, and descriptions backed by real Etsy search data.
            </p>
          </div>

          {/* MIDDLE — Screenshot */}
          <div
            className="relative z-10 mx-auto w-[75%] mt-6 animate-login-slide-up"
            style={{ animationDelay: '0.3s' }}
          >
            <img
              src="/keyword-performance-preview.png"
              alt="PennySEO Keyword Performance"
              className="w-full rounded-lg shadow-xl border border-white/10"
              style={{ transform: 'rotate(-1.5deg)' }}
            />
            {/* Bottom fade */}
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#1e1b4b] to-transparent rounded-b-lg pointer-events-none" />
          </div>

          {/* BOTTOM — Features + Trust line */}
          <div className="relative z-10 mt-8">
            <div
              className="grid grid-cols-3 gap-8 animate-login-slide-up"
              style={{ animationDelay: '0.5s' }}
            >
              <div>
                <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold">
                  <Sparkles size={18} /> Vision AI
                </div>
                <div className="text-indigo-300/70 text-xs mt-1">Analysis in seconds</div>
              </div>
              <div>
                <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold">
                  <Target size={18} /> 130+ keywords
                </div>
                <div className="text-indigo-300/70 text-xs mt-1">Real search volume</div>
              </div>
              <div>
                <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold">
                  <TrendingUp size={18} /> Live data
                </div>
                <div className="text-indigo-300/70 text-xs mt-1">CPC, competition & trends</div>
              </div>
            </div>

            <p
              className="text-sm text-indigo-400/60 mt-5 animate-login-fade-in"
              style={{ animationDelay: '0.7s' }}
            >
              Trusted by Etsy sellers during beta
            </p>
          </div>
        </div>

        {/* ===== RIGHT PANEL — Auth Form (40%) ===== */}
        <div className="flex-1 lg:w-[40%] flex items-center justify-center bg-slate-50 px-6 py-12 lg:px-12">
          <div className="w-full max-w-xs animate-login-fade-in" style={{ animationDelay: '0.15s' }}>

            {/* Mobile logo (hidden on desktop) */}
            <div className="lg:hidden mb-8 flex justify-center">
              <img src={pennyseoLogo} alt="PennySEO" className="h-10 object-contain" />
            </div>

            {/* Tab switcher */}
            <div className="flex border-b border-slate-200 mb-8">
              <button
                onClick={() => { setView('sign_in'); setError(null); }}
                className={`pb-3 px-1 mr-6 text-sm font-semibold border-b-2 transition-colors ${
                  view === 'sign_in'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Sign in
              </button>
              <button
                onClick={() => { setView('sign_up'); setError(null); }}
                className={`pb-3 px-1 text-sm font-semibold border-b-2 transition-colors ${
                  view === 'sign_up'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Create account
              </button>
            </div>

            {/* Header */}
            <div className="mb-8">
              <h2 className="text-[26px] font-bold text-slate-900 tracking-tight mb-1.5">
                {view === 'sign_in' ? 'Welcome back' : 'Start for free'}
              </h2>
              <p className="text-sm text-slate-500">
                {view === 'sign_in'
                  ? 'Sign in to your account'
                  : 'No credit card required · 30 tokens included'}
              </p>
            </div>

            {/* Google Auth */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 py-3 px-5 bg-white border-[1.5px] border-slate-200 rounded-[10px] text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400 hover:-translate-y-px hover:shadow-md transition-all disabled:opacity-50"
            >
              <GoogleIcon />
              Continue with Google
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-[13px] text-slate-400 whitespace-nowrap">or continue with email</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* Error Alert */}
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg flex items-start gap-3 text-sm mb-4">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleEmailAuth}>
              {/* Email */}
              <div className="mb-4">
                <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 flex items-center pointer-events-none">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full py-3 pl-10 pr-3.5 border-[1.5px] border-slate-200 rounded-[10px] text-sm text-slate-800 bg-white placeholder-slate-400 outline-none transition-all focus:border-indigo-600 focus:ring-[3px] focus:ring-indigo-600/10"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[13px] font-semibold text-slate-700">
                    Password
                  </label>
                  {view === 'sign_in' && (
                    <a href="#" className="text-[13px] text-indigo-600 font-medium hover:text-indigo-800 no-underline">
                      Forgot password?
                    </a>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 flex items-center pointer-events-none">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full py-3 pl-10 pr-10 border-[1.5px] border-slate-200 rounded-[10px] text-sm text-slate-800 bg-white placeholder-slate-400 outline-none transition-all focus:border-indigo-600 focus:ring-[3px] focus:ring-indigo-600/10"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 flex items-center"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-5 bg-indigo-600 text-white text-[15px] font-semibold rounded-[10px] border-none tracking-wide hover:bg-indigo-800 hover:-translate-y-px hover:shadow-lg hover:shadow-indigo-500/30 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none transition-all"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    {view === 'sign_in' ? 'Sign in' : 'Create account'}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {/* Contextual link below form */}
            <p className="text-sm text-slate-500 text-center mt-5">
              {view === 'sign_in' ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => { setView(view === 'sign_in' ? 'sign_up' : 'sign_in'); setError(null); }}
                className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
              >
                {view === 'sign_in' ? 'Create one for free' : 'Sign in'}
              </button>
            </p>

            {/* Footer — Terms */}
            <p className="text-xs text-slate-400 text-center mt-6 leading-relaxed">
              By {view === 'sign_up' ? 'creating an account' : 'continuing'}, you agree to our{' '}
              <Link to="/terms" className="text-slate-500 underline hover:text-slate-700">
                Terms of Service
              </Link>
              {' '}and{' '}
              <a href="https://www.iubenda.com/privacy-policy/39387054" target="_blank" rel="noopener noreferrer" className="text-slate-500 underline hover:text-slate-700">
                Privacy Policy
              </a>
            </p>

            {/* Reassurance badges */}
            <div className="flex items-center justify-center gap-6 mt-6">
              <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Shield size={12} /> Secure
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Sparkles size={12} /> 30 free tokens
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <ArrowRight size={12} className="rotate-180" /> No credit card
              </span>
            </div>

          </div>
        </div>

      </div>
    </>
  );
};

export default LoginPage;
