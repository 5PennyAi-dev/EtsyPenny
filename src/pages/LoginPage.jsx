import { useState } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import axios from 'axios';
import { Loader2, Mail, Lock, AlertCircle, CheckCircle, ArrowRight, Eye, EyeOff, Sparkles, Camera, Target, TrendingUp, Shield } from 'lucide-react';
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

  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [view, setView] = useState(searchParams.get('mode') === 'sign_up' ? 'sign_up' : 'sign_in');
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
    setSignupSuccess(false);

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
          setSignupSuccess(true);
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
    <div className="min-h-screen bg-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="min-h-screen grid lg:grid-cols-[3fr_2fr]">

        {/* ===== LEFT COLUMN — Brand & Value Proposition ===== */}
        <div className="hidden lg:flex min-h-screen flex-col justify-center p-8 lg:p-12 bg-gradient-to-br from-white via-indigo-50/50 to-white">
          <div className="space-y-6 w-full">
            {/* Logo + Beta pill */}
            <div className="flex items-center gap-3">
              <img src={pennyseoLogo} alt="PennySEO" className="w-40 h-auto" />
              <span className="inline-flex items-center bg-indigo-50 text-indigo-700 text-xs font-medium px-3 py-1 rounded-full">
                Beta — Free to try
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 leading-tight">
              Your listings deserve
              <br />
              <span className="text-indigo-600">to be found.</span>
            </h1>

            {/* Subtitle */}
            <p className="text-base text-slate-600 max-w-md leading-relaxed">
              Upload your product photo. Get scored keywords, optimized titles, and
              descriptions — backed by real search volume and buyer intent data.
            </p>

            {/* Product preview — images scale with column width, safety-capped at 50vh */}
            <div className="relative w-[85%] overflow-hidden rounded-xl border border-slate-200 shadow-sm max-h-[50vh]">
              <div className="flex flex-col gap-1">
                <img
                  src="/login-audit-header.png"
                  alt="PennySEO Listing Audit Header"
                  className="w-full h-auto"
                />
                <img
                  src="/login-keyword-table.png"
                  alt="PennySEO Keyword Performance Table"
                  className="w-full h-auto"
                />
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none bg-gradient-to-t from-white to-transparent" />
            </div>

            {/* Feature badges — single horizontal row */}
            <div className="flex flex-row flex-nowrap gap-4 pt-2 flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <Camera size={16} className="text-indigo-600" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900">Photo analysis</div>
                  <div className="text-xs text-slate-500 truncate">Drop an image, get keywords</div>
                </div>
              </div>
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <Target size={16} className="text-amber-600" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900">Smart scoring</div>
                  <div className="text-xs text-slate-500 truncate">Ranked by buyer intent</div>
                </div>
              </div>
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <TrendingUp size={16} className="text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900">Real Google data</div>
                  <div className="text-xs text-slate-500 truncate">Volume, competition & trends</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== RIGHT COLUMN — Auth Form ===== */}
        <div className="flex items-center justify-center p-8 lg:p-12 bg-white">
          <div className="w-full max-w-sm">

            {/* Mobile logo (hidden on desktop) */}
            <div className="lg:hidden mb-8 flex justify-center">
              <img src={pennyseoLogo} alt="PennySEO" className="h-10 object-contain" />
            </div>

            {/* Tab switcher */}
            <div className="flex border-b border-slate-200 mb-5">
              <button
                onClick={() => { setView('sign_in'); setError(null); setSignupSuccess(false); }}
                className={`pb-3 px-1 mr-6 text-sm font-semibold border-b-2 transition-colors ${
                  view === 'sign_in'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Sign in
              </button>
              <button
                onClick={() => { setView('sign_up'); setError(null); setSignupSuccess(false); }}
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
            <div className="mb-5">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-1.5">
                {view === 'sign_in' ? 'Welcome back' : 'Start for free'}
              </h2>
              <p className="text-sm text-slate-500">
                {view === 'sign_in'
                  ? 'Sign in to your account'
                  : 'No credit card required · 15 tokens included'}
              </p>
            </div>

            {/* Google Auth */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 py-3 px-5 bg-white border-[1.5px] border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50"
            >
              <GoogleIcon />
              Continue with Google
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4 my-4">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-[13px] text-slate-400 whitespace-nowrap">or continue with email</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* Signup Success */}
            {signupSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-start gap-3 text-sm mb-4">
                <CheckCircle size={18} className="shrink-0 mt-0.5" />
                <div>
                  <span>Almost there! Check your inbox for a confirmation link to activate your account.</span>
                  <p className="text-xs text-slate-400 mt-1">Didn't receive it? Check your spam folder.</p>
                </div>
              </div>
            )}

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
                    className="w-full py-3 pl-10 pr-3.5 border-[1.5px] border-slate-200 rounded-xl text-sm text-slate-800 bg-white placeholder-slate-400 outline-none transition-all focus:border-indigo-600 focus:ring-[3px] focus:ring-indigo-600/10"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="mb-4">
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
                    className="w-full py-3 pl-10 pr-10 border-[1.5px] border-slate-200 rounded-xl text-sm text-slate-800 bg-white placeholder-slate-400 outline-none transition-all focus:border-indigo-600 focus:ring-[3px] focus:ring-indigo-600/10"
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
                className="w-full flex items-center justify-center gap-2 py-3 px-5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl border-none tracking-wide disabled:opacity-70 disabled:cursor-not-allowed transition-all"
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
            <p className="text-sm text-slate-500 text-center mt-4">
              {view === 'sign_in' ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => { setView(view === 'sign_in' ? 'sign_up' : 'sign_in'); setError(null); setSignupSuccess(false); }}
                className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
              >
                {view === 'sign_in' ? 'Create one for free' : 'Sign in'}
              </button>
            </p>

            {/* Footer — Terms */}
            <p className="text-xs text-slate-400 text-center mt-4 leading-relaxed">
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
            <div className="flex items-center justify-center gap-6 mt-4">
              <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Shield size={12} /> Secure
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Sparkles size={12} /> 15 free tokens
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <ArrowRight size={12} className="rotate-180" /> No credit card
              </span>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;
