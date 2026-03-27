import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, Mail, Lock, AlertCircle, ArrowRight, Eye, EyeOff, Sparkles, Target, TrendingUp } from 'lucide-react';
import pennyseoLogo from '../assets/pennyseo-logo.png';

function StatCard({ icon: Icon, label, value, color, delay }) {
  return (
    <div
      className="flex items-center gap-3.5 rounded-xl px-4 py-3.5 border animate-login-slide-up"
      style={{
        background: 'rgba(255,255,255,0.08)',
        backdropFilter: 'blur(12px)',
        borderColor: 'rgba(255,255,255,0.12)',
        animationDelay: `${delay}s`,
      }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0"
        style={{ background: color }}
      >
        <Icon size={18} />
      </div>
      <div>
        <div className="text-[13px] text-white/60 tracking-wide">{label}</div>
        <div className="text-xl font-bold text-white tracking-tight">{value}</div>
      </div>
    </div>
  );
}

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

        {/* ===== LEFT PANEL — Brand Story ===== */}
        <div className="hidden lg:flex lg:w-1/2 min-h-screen relative overflow-hidden flex-col items-start justify-center px-[60px] py-0"
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #3730a3 50%, #4f46e5 100%)',
          }}
        >
          {/* Grid pattern overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
          {/* Soft glow accent */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: '20%', left: '-20%', width: '60%', height: '60%',
              background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
            }}
          />

          <div className="relative z-10">
            {/* Logo */}
            <div className="mb-8 animate-login-fade-in">
              <img
                src={pennyseoLogo}
                alt="PennySEO"
                className="w-auto brightness-0 invert"
                style={{ height: '52px', marginLeft: '-8px' }}
              />
            </div>

            {/* Headline */}
            <h1
              className="leading-tight mb-5 animate-login-slide-up"
              style={{
                fontSize: 'clamp(32px, 3.5vw, 44px)',
                fontFamily: "'Instrument Serif', serif",
                fontWeight: 400,
                color: 'white',
                lineHeight: 1.15,
                animationDelay: '0.1s',
              }}
            >
              Your listings deserve
              <br />
              <span
                className="italic"
                style={{
                  background: 'linear-gradient(90deg, #f97316, #fbbf24)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                to be found.
              </span>
            </h1>

            {/* Subtitle */}
            <p
              className="text-base leading-relaxed max-w-[400px] mb-8 animate-login-slide-up"
              style={{ color: 'rgba(255,255,255,0.6)', animationDelay: '0.2s' }}
            >
              AI-powered SEO that analyzes your product mockups
              and generates optimized tags, titles, and descriptions
              for Etsy.
            </p>

            {/* Value prop stat cards */}
            <div className="flex flex-col gap-3 max-w-[360px]">
              <StatCard
                icon={Sparkles}
                label="Vision AI Analysis"
                value="In seconds"
                color="rgba(99,102,241,0.8)"
                delay={0.4}
              />
              <StatCard
                icon={Target}
                label="Keywords generated"
                value="130+ per listing"
                color="rgba(249,115,22,0.8)"
                delay={0.5}
              />
              <StatCard
                icon={TrendingUp}
                label="Enriched with"
                value="Live market data"
                color="rgba(16,185,129,0.8)"
                delay={0.6}
              />
            </div>
          </div>
        </div>

        {/* ===== RIGHT PANEL — Auth Form ===== */}
        <div className="flex-1 flex items-center justify-center bg-slate-50 px-6 py-10 lg:px-10">
          <div className="w-full max-w-[400px] animate-login-fade-in" style={{ animationDelay: '0.2s' }}>

            {/* Header */}
            <div className="mb-9">
              <h2 className="text-[26px] font-bold text-slate-900 tracking-tight mb-2">
                {view === 'sign_in' ? 'Welcome back' : 'Create your account'}
              </h2>
              <p className="text-sm text-slate-500">
                {view === 'sign_in' ? "Don't have an account? " : 'Already have an account? '}
                <button
                  onClick={() => { setView(view === 'sign_in' ? 'sign_up' : 'sign_in'); setError(null); }}
                  className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
                >
                  {view === 'sign_in' ? 'Sign up for free' : 'Sign in'}
                </button>
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
                <div className="relative group">
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
                <div className="relative group">
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

            {/* Footer */}
            <p className="text-xs text-slate-400 text-center mt-8 leading-relaxed">
              By continuing, you agree to PennySEO's{' '}
              <Link to="/terms" className="text-slate-500 underline hover:text-slate-700">
                Terms of Service
              </Link>
              {' '}and{' '}
              <Link to="/privacy" className="text-slate-500 underline hover:text-slate-700">
                Privacy Policy
              </Link>
            </p>

          </div>
        </div>

      </div>
    </>
  );
};

export default LoginPage;
