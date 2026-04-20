import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Inbox,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import HelpConversationRow from './HelpConversationRow';

const PAGE_SIZE = 25;

const DATE_RANGES = [
  { key: '7',   label: 'Last 7 days',  days: 7 },
  { key: '30',  label: 'Last 30 days', days: 30 },
  { key: 'all', label: 'All time',     days: null },
];

const FILTERS = [
  { key: 'all',           label: 'All' },
  { key: 'with_negative', label: 'With negative feedback' },
  { key: 'with_positive', label: 'With positive feedback' },
  { key: 'no_feedback',   label: 'No feedback yet' },
];

function dateFromKey(key) {
  const range = DATE_RANGES.find((r) => r.key === key) ?? DATE_RANGES[1];
  if (range.days == null) return null;
  const d = new Date();
  d.setDate(d.getDate() - range.days);
  return d.toISOString();
}

function useDebounced(value, ms = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

function Kpi({ label, value, accent }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 px-4 py-3">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold mt-1 ${accent || 'text-slate-900'}`}>{value}</p>
    </div>
  );
}

function SkeletonRows({ count = 6 }) {
  return Array.from({ length: count }).map((_, i) => (
    <tr key={i} className="border-b border-slate-100">
      {[...Array(7)].map((__, j) => (
        <td key={j} className="py-3 px-3">
          <div className="h-3 bg-slate-100 rounded animate-pulse" />
        </td>
      ))}
    </tr>
  ));
}

export default function HelpConversationsPanel({ active }) {
  const [dateKey, setDateKey] = useState('30');
  const [filter, setFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounced(searchInput, 300);
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  // Reset to page 1 when filters/search change
  useEffect(() => {
    setPage(1);
  }, [dateKey, filter, search]);

  const dateFrom = useMemo(() => dateFromKey(dateKey), [dateKey]);

  const loadTokenRef = useRef(0);
  const fetchRows = useCallback(async () => {
    const token = ++loadTokenRef.current;
    setLoading(true);
    const { data, error } = await supabase.rpc('admin_list_help_conversations', {
      p_date_from: dateFrom,
      p_filter: filter,
      p_search: search || null,
      p_limit: PAGE_SIZE,
      p_offset: (page - 1) * PAGE_SIZE,
    });
    // Discard stale responses
    if (token !== loadTokenRef.current) return;
    if (error) {
      console.error('admin_list_help_conversations failed:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      toast.error(`Failed to load conversations: ${error.message || error.code || 'unknown'}`);
      setRows([]);
      setTotal(0);
    } else {
      const list = data ?? [];
      setRows(list);
      setTotal(list[0]?.total_count ? Number(list[0].total_count) : 0);
    }
    setLoading(false);
  }, [dateFrom, filter, search, page]);

  const fetchStats = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_get_help_conversation_stats', {
      p_date_from: dateFrom,
    });
    if (error) {
      console.error('admin_get_help_conversation_stats failed:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      setStats(null);
      return;
    }
    setStats(Array.isArray(data) ? data[0] : data);
  }, [dateFrom]);

  // Lazy: only fetch when the accordion is open (`active`)
  useEffect(() => {
    if (!active) return;
    fetchRows();
    fetchStats();
  }, [active, fetchRows, fetchStats]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const handleToggleRow = (id) => setExpandedId((curr) => (curr === id ? null : id));

  const satisfactionText = (() => {
    if (!stats) return '—';
    if (stats.satisfaction_rate == null) return '—';
    return `${Math.round(Number(stats.satisfaction_rate) * 100)}%`;
  })();

  return (
    <div className="p-6">
      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Kpi label="Conversations" value={stats ? Number(stats.conversations).toLocaleString() : '—'} />
        <Kpi label="Messages" value={stats ? Number(stats.messages).toLocaleString() : '—'} />
        <Kpi
          label="Avg msgs / convo"
          value={stats && stats.avg_msgs_per_convo != null ? Number(stats.avg_msgs_per_convo).toFixed(1) : '—'}
        />
        <Kpi
          label="Satisfaction"
          value={satisfactionText}
          accent={
            stats?.satisfaction_rate == null
              ? undefined
              : Number(stats.satisfaction_rate) >= 0.8
              ? 'text-emerald-600'
              : Number(stats.satisfaction_rate) >= 0.5
              ? 'text-amber-600'
              : 'text-rose-600'
          }
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={14} strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search questions or answers…"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="text-sm rounded-lg border border-slate-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          {FILTERS.map((f) => (
            <option key={f.key} value={f.key}>{f.label}</option>
          ))}
        </select>
        <select
          value={dateKey}
          onChange={(e) => setDateKey(e.target.value)}
          className="text-sm rounded-lg border border-slate-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          {DATE_RANGES.map((r) => (
            <option key={r.key} value={r.key}>{r.label}</option>
          ))}
        </select>
        <span className="text-xs font-medium text-slate-500 px-2 py-1 bg-slate-100 rounded-full">
          {total.toLocaleString()} {total === 1 ? 'conversation' : 'conversations'}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left py-2 px-3 text-xs font-bold text-slate-500 uppercase w-[160px]">Date</th>
              <th className="text-left py-2 px-3 text-xs font-bold text-slate-500 uppercase w-[200px]">User</th>
              <th className="text-left py-2 px-3 text-xs font-bold text-slate-500 uppercase">First question</th>
              <th className="text-center py-2 px-3 text-xs font-bold text-slate-500 uppercase w-[80px]">Msgs</th>
              <th className="text-left py-2 px-3 text-xs font-bold text-slate-500 uppercase w-[120px]">Feedback</th>
              <th className="text-left py-2 px-3 text-xs font-bold text-slate-500 uppercase w-[160px]">Page</th>
              <th className="text-right py-2 px-3 text-xs font-bold text-slate-500 uppercase w-[50px]"></th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <SkeletonRows />
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <Inbox size={32} strokeWidth={1.5} />
                    <p className="text-sm">No conversations match your filters.</p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((c) => (
                <HelpConversationRow
                  key={c.id}
                  conversation={c}
                  expanded={expandedId === c.id}
                  onToggle={() => handleToggleRow(c.id)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-end gap-2 mt-4 text-xs text-slate-500">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={14} strokeWidth={2} />
            Previous
          </button>
          <span className="px-2">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight size={14} strokeWidth={2} />
          </button>
        </div>
      )}

      {/* Footer hint */}
      {stats && (stats.thumbs_up > 0 || stats.thumbs_down > 0) && (
        <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <ThumbsUp size={12} strokeWidth={2} className="text-emerald-500" />
            {Number(stats.thumbs_up)} helpful
          </span>
          <span className="inline-flex items-center gap-1">
            <ThumbsDown size={12} strokeWidth={2} className="text-rose-500" />
            {Number(stats.thumbs_down)} not helpful
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageSquare size={12} strokeWidth={2} className="text-slate-400" />
            in the selected window
          </span>
        </div>
      )}
    </div>
  );
}
