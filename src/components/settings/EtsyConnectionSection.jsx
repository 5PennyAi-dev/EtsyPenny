import { useEffect, useState, useCallback } from 'react';
import { Store, ExternalLink, Loader2, Unplug } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import { startEtsyConnect, disconnectEtsy } from '@/lib/etsyOAuth';

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

export default function EtsyConnectionSection() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [connection, setConnection] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const fetchConnection = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('etsy_shop_connections')
      .select('id, shop_name, shop_url, etsy_shop_id, connected_at')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('connected_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setConnection(data ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchConnection();
  }, [fetchConnection]);

  const handleConnect = async () => {
    setBusy(true);
    try {
      await startEtsyConnect();
    } catch (err) {
      toast.error(err.message || 'Failed to start Etsy connection');
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    setBusy(true);
    try {
      await disconnectEtsy();
      toast.success('Etsy shop disconnected');
      await fetchConnection();
    } catch (err) {
      toast.error(err.message || 'Failed to disconnect');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-orange-50 rounded-lg">
          <Store className="text-[#F56400]" size={20} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Etsy shop</h2>
          <p className="text-sm text-slate-500">
            Connect your Etsy shop to import and optimize listings.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
          <Loader2 size={16} className="animate-spin" />
          Loading connection…
        </div>
      ) : connection ? (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-900 truncate">
                {connection.shop_name || 'Your Etsy shop'}
              </span>
              {connection.shop_url && (
                <a
                  href={connection.shop_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-400 hover:text-indigo-600 transition-colors"
                  title="Open shop on Etsy"
                >
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Connected on {formatDate(connection.connected_at)}
            </p>
          </div>
          <button
            onClick={() => setShowConfirm(true)}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-rose-600 bg-white border border-rose-200 hover:bg-rose-50 transition-colors disabled:opacity-60"
          >
            <Unplug size={16} />
            Disconnect shop
          </button>
        </div>
      ) : (
        <div className="pt-2">
          <button
            onClick={handleConnect}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#F56400] hover:bg-[#D35400] transition-colors disabled:opacity-60"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Store size={16} />}
            Connect with Etsy
          </button>
        </div>
      )}

      <ConfirmationModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDisconnect}
        title="Disconnect Etsy shop?"
        message="You'll need to reconnect to continue using shop features. Your imported listings stay in PennySEO."
        confirmText="Disconnect"
        cancelText="Keep connected"
        type="warning"
      />
    </div>
  );
}
