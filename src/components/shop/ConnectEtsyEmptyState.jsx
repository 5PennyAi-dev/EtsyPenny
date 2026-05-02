import { useState } from 'react';
import { Store, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { startEtsyConnect } from '@/lib/etsyOAuth';

export default function ConnectEtsyEmptyState({ variant = 'no-connection' }) {
  const [loading, setLoading] = useState(false);

  const headline =
    variant === 'refresh-failed' ? 'Reconnect your Etsy shop' : 'Connect your Etsy shop';
  const body =
    variant === 'refresh-failed'
      ? 'Your Etsy session expired. Reconnect to continue managing your listings.'
      : 'Browse, import, and optimize your Etsy listings — all from PennySEO. Your shop stays in sync as you tune SEO scores.';

  const handleClick = async () => {
    setLoading(true);
    try {
      await startEtsyConnect();
      // page redirects; loading stays true until unload
    } catch (err) {
      toast.error(err.message || 'Failed to start Etsy connection');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-10 max-w-md w-full text-center shadow-sm">
        <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Store className="w-8 h-8 text-[#F56400]" strokeWidth={2} />
        </div>
        <h2 className="text-xl font-semibold text-slate-800 mb-2">{headline}</h2>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">{body}</p>
        <button
          onClick={handleClick}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#F56400] hover:bg-[#D35400] transition-colors disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Redirecting…
            </>
          ) : (
            'Connect with Etsy'
          )}
        </button>
        <p className="text-xs text-slate-400 mt-4 leading-relaxed">
          You'll be redirected to Etsy to authorize PennySEO. We'll never see your password.
        </p>
      </div>
    </div>
  );
}
