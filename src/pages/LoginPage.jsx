import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, Mail, Lock, AlertCircle, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/studio';
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [view, setView] = useState('sign_in'); // 'sign_in' | 'sign_up'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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
        // Check if user is created but session is null (email confirm required)
        if (data.user && !data.session) {
           setError("Please check your email for the confirmation link.");
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
    <div className="min-h-screen bg-white flex">
      {/* Left Panel - Branding & Testimonial (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-indigo-900 relative overflow-hidden flex-col justify-between p-12 text-white">
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
            <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-indigo-600/30 blur-3xl"></div>
            <div className="absolute top-[40%] -right-[10%] w-[60%] h-[60%] rounded-full bg-indigo-500/20 blur-3xl"></div>
            <div className="absolute -bottom-[10%] left-[20%] w-[50%] h-[50%] rounded-full bg-purple-500/20 blur-3xl"></div>
        </div>

        <div className="relative z-10">
            <div className="flex items-center gap-2 mb-12">
                <div className="w-8 h-8 bg-white/10 backdrop-blur-md rounded-lg flex items-center justify-center border border-white/20">
                    <span className="text-lg">🟣</span>
                </div>
                <span className="font-bold text-xl tracking-tight">EtsyPenny</span>
            </div>

            <h1 className="text-5xl font-extrabold leading-tight mb-6">
                Turn your product photos into <span className="text-indigo-300">bestsellers.</span>
            </h1>
            <p className="text-indigo-100 text-lg max-w-md">
                AI-powered listing optimization that helps you rank higher and sell more on Etsy.
            </p>
        </div>

        <div className="relative z-10 space-y-8">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                <div className="flex gap-1 text-amber-400 mb-3">
                    {[1,2,3,4,5].map(i => <Sparkles key={i} size={16} fill="currentColor" />)}
                </div>
                <p className="text-lg font-medium mb-4">"It's like having a full-time SEO expert on my team. My traffic doubled in the first week!"</p>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-400/30 flex items-center justify-center font-bold text-indigo-100">SJ</div>
                    <div>
                        <div className="font-bold">Sarah Jenkins</div>
                        <div className="text-sm text-indigo-300">Top 1% Etsy Seller</div>
                    </div>
                </div>
            </div>

            <div className="flex gap-6 text-sm text-indigo-300 font-medium">
                <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-indigo-400" />
                    <span>AI Analysis</span>
                </div>
                <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-indigo-400" />
                    <span>Keyword Research</span>
                </div>
                 <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-indigo-400" />
                    <span>Competitor Spy</span>
                </div>
            </div>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              {view === 'sign_in' ? 'Welcome back' : 'Create an account'}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {view === 'sign_in' ? "Don't have an account? " : "Already have an account? "}
              <button 
                onClick={() => {
                    setView(view === 'sign_in' ? 'sign_up' : 'sign_in');
                    setError(null);
                }} 
                className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
              >
                {view === 'sign_in' ? 'Sign up for free' : 'Sign in'}
              </button>
            </p>
          </div>

          <div className="mt-10">
            {/* Social Login */}
            <div>
                 <button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-slate-200 rounded-xl shadow-sm bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 transition-all disabled:opacity-50"
                  >
                    <svg className="h-5 w-5 mr-3" aria-hidden="true" viewBox="0 0 24 24">
                      <path
                        d="M12.0003 20.45c4.656 0 8.16-3.192 8.16-7.908 0-.828-.108-1.548-.228-2.22H12.0003v4.188h4.728c-.288 1.632-1.896 4.776-4.728 4.776-2.772 0-5.112-2.22-5.112-5.28s2.34-5.28 5.112-5.28c1.392 0 2.652.516 3.636 1.344l3.18-3.18C16.944 5.316 14.676 4.2 12.0003 4.2 7.6923 4.2 4.2003 7.692 4.2003 12s3.492 7.8 8.16 7.8"
                        fill="currentColor"
                      />
                    </svg>
                    Continue with Google
                  </button>
            </div>

            <div className="mt-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-slate-500">Or continue with email</span>
                </div>
              </div>

              <div className="mt-8 space-y-6">
                
                {/* Error Alert */}
                {error && (
                    <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg flex items-start gap-3 text-sm animate-in fade-in slide-in-from-top-1">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleEmailAuth} className="space-y-5">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Email address
                    </label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        </div>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all sm:text-sm"
                            placeholder="you@example.com"
                        />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Password
                    </label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        </div>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all sm:text-sm"
                            placeholder="••••••••"
                        />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-indigo-500/20 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-[0.98]"
                  >
                    {loading ? (
                        <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    ) : (
                        <>
                            {view === 'sign_in' ? 'Sign in' : 'Create account'}
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
