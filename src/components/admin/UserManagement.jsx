import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, ChevronLeft, Plus, Minus, Ban, RefreshCw, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showTokenModal, setShowTokenModal] = useState(null); // 'add' | 'remove'
  const [tokenAmount, setTokenAmount] = useState('');
  const [tokenNote, setTokenNote] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, subscription_plan, subscription_status, tokens_monthly_balance, tokens_bonus_balance, add_custom_used, add_favorite_used, stripe_customer_id, is_blocked, tokens_reset_at, updated_at')
      .order('updated_at', { ascending: false });

    if (error) { toast.error('Failed to load users'); setLoading(false); return; }
    setUsers(data || []);
    setLoading(false);
  };

  const filteredUsers = useMemo(() =>
    users.filter(u => {
      const q = search.toLowerCase();
      return u.full_name?.toLowerCase().includes(q) || u.id.includes(q) || u.subscription_plan?.toLowerCase().includes(q);
    }),
  [users, search]);

  const planCounts = useMemo(() => {
    const counts = { free: 0, starter: 0, growth: 0, pro: 0 };
    users.forEach(u => { if (counts[u.subscription_plan] !== undefined) counts[u.subscription_plan]++; });
    return counts;
  }, [users]);

  // ─── Token Adjustment ───────────────────────────────────────────
  const handleTokenAdjustment = async (type) => {
    if (!tokenAmount || !tokenNote || !selectedUser) return;
    setAdjusting(true);

    const amount = parseInt(tokenAmount);
    if (isNaN(amount) || amount <= 0) { toast.error('Enter a valid amount'); setAdjusting(false); return; }

    const isAdd = type === 'add';
    const currentBonus = selectedUser.tokens_bonus_balance ?? 0;
    const currentMonthly = selectedUser.tokens_monthly_balance ?? 0;

    let newBonus = currentBonus;
    let newMonthly = currentMonthly;

    if (isAdd) {
      newBonus = currentBonus + amount;
    } else {
      const fromBonus = Math.min(amount, currentBonus);
      const fromMonthly = amount - fromBonus;
      newBonus = currentBonus - fromBonus;
      newMonthly = Math.max(0, currentMonthly - fromMonthly);
    }

    const { error } = await supabase
      .from('profiles')
      .update({ tokens_bonus_balance: newBonus, tokens_monthly_balance: newMonthly })
      .eq('id', selectedUser.id);

    if (error) { toast.error('Failed to update tokens'); setAdjusting(false); return; }

    await supabase.from('token_transactions').insert({
      user_id: selectedUser.id,
      type: 'admin_adjustment',
      amount: isAdd ? amount : -amount,
      balance_after: newBonus + newMonthly,
      description: `Admin ${isAdd ? 'credit' : 'debit'}: ${tokenNote}`,
    });

    setSelectedUser(prev => ({ ...prev, tokens_bonus_balance: newBonus, tokens_monthly_balance: newMonthly }));
    setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, tokens_bonus_balance: newBonus, tokens_monthly_balance: newMonthly } : u));

    toast.success(`${isAdd ? 'Added' : 'Removed'} ${amount} tokens`);
    setShowTokenModal(null);
    setTokenAmount('');
    setTokenNote('');
    setAdjusting(false);
  };

  // ─── Reset Counters ─────────────────────────────────────────────
  const handleResetCounters = async (userId) => {
    const { error } = await supabase
      .from('profiles')
      .update({ add_custom_used: 0, add_favorite_used: 0 })
      .eq('id', userId);

    if (error) { console.error('Reset counters error:', error); toast.error('Failed to reset counters'); return; }
    setSelectedUser(prev => ({ ...prev, add_custom_used: 0, add_favorite_used: 0 }));
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, add_custom_used: 0, add_favorite_used: 0 } : u));
    toast.success('Monthly counters reset');
  };

  // ─── Block / Unblock ────────────────────────────────────────────
  const handleBlockUser = async (userId, block) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_blocked: block })
      .eq('id', userId);

    if (error) { toast.error('Failed to update user'); return; }
    setSelectedUser(prev => ({ ...prev, is_blocked: block }));
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_blocked: block } : u));
    toast.success(block ? 'User blocked' : 'User unblocked');
  };

  // ─── Loading State ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  USER DETAIL VIEW
  // ═══════════════════════════════════════════════════════════════
  if (selectedUser) {
    return (
      <div className="space-y-4">
        {/* Back */}
        <button
          onClick={() => setSelectedUser(null)}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ChevronLeft size={14} /> Back to list
        </button>

        {/* Header */}
        <div className="bg-slate-50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-base font-bold text-slate-900 flex items-center gap-2">
                {selectedUser.full_name || 'No name'}
                {selectedUser.is_blocked && (
                  <span className="text-[10px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full font-semibold">Blocked</span>
                )}
              </div>
              <div className="text-xs text-slate-400 font-mono mt-0.5">{selectedUser.id}</div>
            </div>
            {selectedUser.stripe_customer_id && (
              <a
                href={`https://dashboard.stripe.com/customers/${selectedUser.stripe_customer_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                <ExternalLink size={12} /> Stripe
              </a>
            )}
          </div>
          <div className="flex gap-4 mt-3 text-xs text-slate-500 flex-wrap">
            <span>Plan: <strong className="text-slate-700 capitalize">{selectedUser.subscription_plan}</strong></span>
            <span>Status: <strong className={selectedUser.subscription_status === 'active' ? 'text-emerald-600' : 'text-amber-600'}>{selectedUser.subscription_status}</strong></span>
            <span>Last active: <strong className="text-slate-700">{selectedUser.updated_at ? new Date(selectedUser.updated_at).toLocaleDateString() : 'N/A'}</strong></span>
          </div>
        </div>

        {/* Token cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-[11px] text-slate-400 mb-1">Monthly tokens</div>
            <div className="text-2xl font-bold text-slate-900">{selectedUser.tokens_monthly_balance}</div>
            <div className="text-[11px] text-slate-400 mt-1">
              Resets: {selectedUser.tokens_reset_at ? new Date(selectedUser.tokens_reset_at).toLocaleDateString() : 'N/A'}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-[11px] text-slate-400 mb-1">Bonus tokens</div>
            <div className="text-2xl font-bold text-slate-900">{selectedUser.tokens_bonus_balance}</div>
            <div className="text-[11px] text-slate-400 mt-1">Never expires</div>
          </div>
        </div>

        {/* Usage stats */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-sm font-semibold text-slate-900 mb-2">Monthly usage</div>
          <div className="flex gap-6">
            <div>
              <div className="text-[11px] text-slate-400">Custom keywords</div>
              <div className="text-base font-semibold text-slate-900">{selectedUser.add_custom_used ?? 0}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Favorites added</div>
              <div className="text-base font-semibold text-slate-900">{selectedUser.add_favorite_used ?? 0}</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowTokenModal('add')}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-100 transition-colors"
          >
            <Plus size={14} /> Add tokens
          </button>
          <button
            onClick={() => setShowTokenModal('remove')}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 text-rose-600 rounded-lg text-xs font-medium hover:bg-rose-100 transition-colors"
          >
            <Minus size={14} /> Remove tokens
          </button>
          <button
            onClick={() => handleResetCounters(selectedUser.id)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors"
          >
            <RefreshCw size={14} /> Reset counters
          </button>
          <button
            onClick={() => handleBlockUser(selectedUser.id, !selectedUser.is_blocked)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              selectedUser.is_blocked
                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
            }`}
          >
            <Ban size={14} /> {selectedUser.is_blocked ? 'Unblock user' : 'Block user'}
          </button>
        </div>

        {/* Token modal */}
        {showTokenModal && createPortal(
          <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/40" onClick={() => { setShowTokenModal(null); setTokenAmount(''); setTokenNote(''); }} />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative bg-white rounded-xl shadow-xl p-6 w-[360px] z-10"
              >
                <h3 className="text-base font-bold text-slate-900 mb-4">
                  {showTokenModal === 'add' ? '+ Add tokens' : '− Remove tokens'}
                </h3>

                <div className="space-y-3 mb-4">
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Amount (bonus tokens)</label>
                    <input
                      type="number"
                      min="1"
                      value={tokenAmount}
                      onChange={e => setTokenAmount(e.target.value)}
                      placeholder="e.g. 50"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Admin note (required)</label>
                    <input
                      value={tokenNote}
                      onChange={e => setTokenNote(e.target.value)}
                      placeholder="e.g. Bug compensation, beta reward..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => { setShowTokenModal(null); setTokenAmount(''); setTokenNote(''); }}
                    className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleTokenAdjustment(showTokenModal)}
                    disabled={!tokenAmount || !tokenNote || adjusting}
                    className={`px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors ${
                      showTokenModal === 'add' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {adjusting ? 'Saving...' : 'Confirm'}
                  </button>
                </div>
              </motion.div>
            </div>
          </AnimatePresence>,
          document.body
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  USER LIST VIEW
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, ID or plan..."
          className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
        />
      </div>

      {/* Plan stats */}
      <div className="flex gap-3">
        {['free', 'starter', 'growth', 'pro'].map(plan => (
          <div key={plan} className="bg-slate-50 rounded-lg px-4 py-2 text-center flex-1">
            <div className="text-lg font-bold text-slate-900">{planCounts[plan]}</div>
            <div className="text-[11px] text-slate-400 capitalize">{plan}</div>
          </div>
        ))}
        <div className="bg-slate-50 rounded-lg px-4 py-2 text-center flex-1">
          <div className="text-lg font-bold text-slate-900">{users.length}</div>
          <div className="text-[11px] text-slate-400">Total</div>
        </div>
      </div>

      {/* Table */}
      <div className="border border-slate-100 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_90px_70px_70px_80px_60px] gap-3 px-4 py-2 bg-slate-50 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
          <div>Name / ID</div>
          <div>Plan</div>
          <div>Monthly</div>
          <div>Bonus</div>
          <div>Status</div>
          <div></div>
        </div>

        {/* Rows */}
        {filteredUsers.map(user => (
          <div
            key={user.id}
            className={`grid grid-cols-[1fr_90px_70px_70px_80px_60px] gap-3 px-4 py-2.5 border-t border-slate-100 items-center hover:bg-slate-50/50 transition-colors ${user.is_blocked ? 'opacity-50' : ''}`}
          >
            <div>
              <div className="text-sm font-medium text-slate-900 flex items-center gap-1.5">
                {user.full_name || 'No name'}
                {user.is_blocked && (
                  <span className="text-[10px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full font-semibold">Blocked</span>
                )}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">{user.id.substring(0, 16)}...</div>
            </div>
            <div>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                user.subscription_plan === 'pro' ? 'bg-violet-100 text-violet-700'
                : user.subscription_plan === 'growth' ? 'bg-emerald-100 text-emerald-700'
                : user.subscription_plan === 'starter' ? 'bg-blue-100 text-blue-700'
                : 'bg-slate-100 text-slate-500'
              }`}>
                {user.subscription_plan}
              </span>
            </div>
            <div className="text-sm text-slate-700">{user.tokens_monthly_balance}</div>
            <div className="text-sm text-slate-700">{user.tokens_bonus_balance}</div>
            <div className={`text-[11px] font-medium ${user.subscription_status === 'active' ? 'text-emerald-600' : 'text-amber-500'}`}>
              {user.subscription_status}
            </div>
            <button
              onClick={() => setSelectedUser(user)}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium text-right transition-colors"
            >
              View →
            </button>
          </div>
        ))}

        {filteredUsers.length === 0 && (
          <div className="py-8 text-center text-sm text-slate-400">No users found</div>
        )}
      </div>
    </div>
  );
}
