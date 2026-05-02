import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, AlertCircle, Store } from 'lucide-react';
import { toast } from 'sonner';
import { exchangeEtsyCode } from '@/lib/etsyOAuth';
import { supabase } from '@/lib/supabase';

export default function EtsyCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const hasExchangedRef = useRef(false);

  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const oauthError = searchParams.get('error');

  const [phase, setPhase] = useState('exchanging'); // 'exchanging' | 'cancelled' | 'error' | 'no-session'
  const [errorMsg, setErrorMsg] = useState('');
  const [errorHint, setErrorHint] = useState('');

  useEffect(() => {
    if (hasExchangedRef.current) return;
    hasExchangedRef.current = true;

    if (oauthError) {
      setPhase('cancelled');
      return;
    }

    if (!code || !state) {
      setPhase('error');
      setErrorMsg('Missing code or state in the callback URL.');
      return;
    }

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setPhase('no-session');
        return;
      }

      try {
        await exchangeEtsyCode(code, state);
        toast.success('Etsy shop connected!');
        navigate('/shop', { replace: true });
      } catch (err) {
        setPhase('error');
        setErrorMsg(err.message || 'Failed to complete connection.');
        if (err.status === 400) {
          setErrorHint('The connection link may have expired (links last 10 minutes). Start the connection again from My Shop.');
        }
      }
    })();
  }, [code, state, oauthError, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-10 max-w-md w-full text-center shadow-sm">
        {phase === 'exchanging' && (
          <>
            <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Loader2 className="w-8 h-8 text-[#F56400] animate-spin" strokeWidth={2} />
            </div>
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Connecting your Etsy shop…</h2>
            <p className="text-sm text-slate-500">Hold on a few seconds.</p>
          </>
        )}

        {phase === 'cancelled' && (
          <>
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Store className="w-8 h-8 text-slate-500" strokeWidth={2} />
            </div>
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Connection cancelled</h2>
            <p className="text-sm text-slate-500 mb-6">
              No worries — you can connect your shop any time from the My Shop page.
            </p>
            <Link
              to="/shop"
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              Back to My Shop
            </Link>
          </>
        )}

        {phase === 'no-session' && (
          <>
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <AlertCircle className="w-8 h-8 text-rose-500" strokeWidth={2} />
            </div>
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Please sign in first</h2>
            <p className="text-sm text-slate-500 mb-6">
              Your session expired before we could finish connecting. Sign back in and try again.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              Go to login
            </Link>
          </>
        )}

        {phase === 'error' && (
          <>
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <AlertCircle className="w-8 h-8 text-rose-500" strokeWidth={2} />
            </div>
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Couldn't connect your shop</h2>
            <p className="text-sm text-slate-600 mb-2">{errorMsg}</p>
            {errorHint && <p className="text-xs text-slate-400 mb-6">{errorHint}</p>}
            <Link
              to="/shop"
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              Try again
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
