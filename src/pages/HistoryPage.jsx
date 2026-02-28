import { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
    Search, Filter, MoreHorizontal, Eye, Trash2,
    ChevronLeft, ChevronRight, FileDown, Loader2,
    ChevronUp, ChevronDown, ChevronsUpDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { pdf } from '@react-pdf/renderer';
import ListingPDFDocument from '../components/pdf/ListingPDFDocument';

// Numeric metric columns that default to descending (highest first)
const NUMERIC_COLS = [
    'listing_strength', 'listing_visibility', 'listing_raw_visibility_index',
    'listing_relevance', 'listing_conversion', 'listing_competition', 'listing_profit'
];

// Color-coded metric cell helper (0-100 scale, higher = better)
const MetricCell = ({ value, inverted = false }) => {
    if (value == null) return <span className="text-slate-300 text-xs">—</span>;
    const v = Math.round(value);
    const good = inverted ? v <= 30 : v >= 80;
    const mid  = inverted ? (v > 30 && v <= 60) : (v >= 50 && v < 80);
    const color = good ? 'text-emerald-600' : mid ? 'text-amber-600' : 'text-slate-400';
    return <span className={`text-xs font-semibold ${color}`}>{v}</span>;
};

// Sortable column header — receives the whole sort object for zero-stale-closure risk
const SortableHeader = ({ label, column, sort, onSort, className = '', style }) => {
    const isActive = sort.column === column;
    return (
        <th
            className={`px-2 py-3 font-semibold cursor-pointer select-none group/th ${className}`}
            style={style}
            onClick={() => onSort(column)}
        >
            <div className="inline-flex items-center gap-1">
                <span className={isActive ? 'text-indigo-600' : ''}>{label}</span>
                <span className={`transition-colors ${isActive ? 'text-indigo-500' : 'text-slate-300 group-hover/th:text-slate-400'}`}>
                    {isActive
                        ? (sort.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
                        : <ChevronsUpDown size={12} />
                    }
                </span>
            </div>
        </th>
    );
};

const HistoryPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [listings, setListings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [exportingId, setExportingId] = useState(null);
    // Single atomic sort state — avoids two-setState race conditions
    const [sort, setSort] = useState({ column: 'listing_created_at', direction: 'desc' });
    const ITEMS_PER_PAGE = 20;

    useEffect(() => {
        if (user) fetchListings();
    }, [user]);

    const fetchListings = async () => {
        try {
            const { data, error } = await supabase
                .from('listings_global_info')
                .select('*')
                .eq('user_id', user.id)
                .order('listing_created_at', { ascending: false });
            if (error) throw error;
            // listings_global_info may return multiple rows per listing (one per SEO mode).
            // Deduplicate by listing_id, keeping only the first (highest-scored) row.
            const seen = new Set();
            const deduped = (data || []).filter(item => {
                if (seen.has(item.listing_id)) return false;
                seen.add(item.listing_id);
                return true;
            });
            setListings(deduped);
        } catch (err) {
            console.error('Error fetching history:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Atomic toggle — column + direction updated in one setState call
    const handleSort = (column) => {
        setSort(prev => {
            if (prev.column === column) {
                return { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { column, direction: NUMERIC_COLS.includes(column) ? 'desc' : 'asc' };
        });
        setCurrentPage(1);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this optimization?')) return;
        try {
            const { error } = await supabase.from('listings').delete().eq('id', id);
            if (error) throw error;
            setListings(prev => prev.filter(l => (l.listing_id || l.id) !== id));
        } catch (err) {
            console.error('Error deleting listing:', err);
            alert('Failed to delete listing.');
        }
    };

    const handleExportPDF = async (item) => {
        try {
            const listingId = item.listing_id || item.id;
            setExportingId(listingId);

            const { data: stats, error: statsError } = await supabase
                .from('listing_seo_stats')
                .select('*')
                .eq('listing_id', listingId)
                .eq('is_current_pool', true);
            if (statsError) throw statsError;

            const { data: listingRecord } = await supabase
                .from('listings')
                .select('global_strength')
                .eq('id', listingId)
                .single();

            const pdfTitle = item.original_title || 'Untitled';
            const listingData = {
                title: pdfTitle,
                description: '',
                imageUrl: item.image_url,
                global_strength: item.listing_strength ?? listingRecord?.global_strength ?? null,
                productName: pdfTitle.split(' ').slice(0, 5).join(' ') + '...',
                tags: stats.map(s => {
                    let trend = 0;
                    if (s.volume_history?.length > 0) {
                        const first = s.volume_history[0] || 1;
                        const last  = s.volume_history[s.volume_history.length - 1] || 0;
                        trend = Math.round(((last - first) / first) * 100);
                    }
                    return {
                        keyword: s.tag,
                        score: s.opportunity_score,
                        volume: s.search_volume,
                        competition: s.competition,
                        trend,
                        volume_history: s.volume_history || [],
                        is_trending: s.is_trending,
                        is_evergreen: s.is_evergreen,
                        is_promising: s.is_promising,
                        insight: s.insight || null,
                        is_top: s.is_top ?? null,
                    };
                }),
            };

            const { data: fullListing, error: listingError } = await supabase
                .from('listings')
                .select('generated_description, user_description')
                .eq('id', listingId)
                .single();
            if (listingError) throw listingError;
            listingData.description = fullListing.generated_description || fullListing.user_description || '';

            const blob = await pdf(<ListingPDFDocument listing={listingData} />).toBlob();
            const url  = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href  = url;
            link.download = `${(item.original_title || 'listing').substring(0, 20).replace(/\s+/g, '_')}_SEO.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Error exporting PDF:', err);
            alert('Failed to export PDF.');
        } finally {
            setExportingId(null);
        }
    };

    const handleViewResults = (id) => navigate('/studio', { state: { listingId: id } });

    // 1. Filter
    const filteredListings = useMemo(() => listings.filter(item => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
            (item.original_title  || '').toLowerCase().includes(searchLower) ||
            (item.theme           || '').toLowerCase().includes(searchLower) ||
            (item.niche           || '').toLowerCase().includes(searchLower) ||
            (item.product_type_text || '').toLowerCase().includes(searchLower);

        const status = item.status_name || 'New';
        const normalized = ['Listing completed', 'SEO analysis completed'].includes(status) ? 'completed' : 'processing';
        const matchesStatus = statusFilter === 'all' || normalized === statusFilter;

        return matchesSearch && matchesStatus;
    }), [listings, searchTerm, statusFilter]);

    // 2. Sort — depends on a single `sort` object, no split-state risk
    const sortedListings = useMemo(() => {
        const { column, direction } = sort;
        return [...filteredListings].sort((a, b) => {
            const aVal = a[column];
            const bVal = b[column];
            if (aVal == null && bVal == null) return 0;
            if (aVal == null) return 1;   // nulls last
            if (bVal == null) return -1;
            const cmp = (typeof aVal === 'number' && typeof bVal === 'number')
                ? aVal - bVal
                : String(aVal).localeCompare(String(bVal));
            return direction === 'asc' ? cmp : -cmp;
        });
    }, [filteredListings, sort]);

    // 3. Paginate
    const totalPages      = Math.ceil(sortedListings.length / ITEMS_PER_PAGE);
    const paginatedListings = sortedListings.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    return (
        <Layout>
            <div className="h-screen flex flex-col p-8 gap-6 overflow-hidden w-[85%] mx-auto">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Historique des Optimisations</h1>
                        <p className="text-slate-500 text-sm mt-1">Retrouvez et gérez toutes vos générations IA.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Rechercher..."
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-64 shadow-sm"
                            />
                        </div>
                        <div className="relative">
                            <select
                                value={statusFilter}
                                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                                className="pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none shadow-sm cursor-pointer"
                            >
                                <option value="all">Tous les status</option>
                                <option value="completed">Terminé</option>
                                <option value="processing">En cours</option>
                            </select>
                            <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
                    <div className="overflow-auto flex-1 min-h-0">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 text-xs sticky top-0 z-10">
                                <tr>
                                    {/* Image thumbnail — not sortable */}
                                    <th className="pl-4 pr-2 py-3 font-semibold w-14" />

                                    <SortableHeader label="Title"            column="original_title"                sort={sort} onSort={handleSort} style={{ width: '15%' }} />
                                    <SortableHeader label="Theme"            column="theme"                         sort={sort} onSort={handleSort} style={{ width: '18%' }} />
                                    <SortableHeader label="Score"            column="listing_strength"              sort={sort} onSort={handleSort} className="text-center" />
                                    <SortableHeader label="Visibility"       column="listing_visibility"            sort={sort} onSort={handleSort} className="text-center" />
                                    <SortableHeader label="Visibility index" column="listing_raw_visibility_index"  sort={sort} onSort={handleSort} className="text-center whitespace-nowrap" />
                                    <SortableHeader label="Relevance"        column="listing_relevance"             sort={sort} onSort={handleSort} className="text-center" />
                                    <SortableHeader label="Conversion"       column="listing_conversion"            sort={sort} onSort={handleSort} className="text-center" />
                                    <SortableHeader label="Competition"      column="listing_competition"           sort={sort} onSort={handleSort} className="text-center" />
                                    <SortableHeader label="Market index"     column="listing_profit"                sort={sort} onSort={handleSort} className="text-center whitespace-nowrap" />
                                    <SortableHeader label="Status"           column="status_name"                   sort={sort} onSort={handleSort} className="text-center" />
                                    <SortableHeader label="Date"             column="listing_created_at"            sort={sort} onSort={handleSort} className="text-right" />

                                    {/* Actions — not sortable */}
                                    <th className="px-2 py-3 font-semibold text-right" style={{ width: '10%' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {isLoading ? (
                                    <tr><td colSpan="13" className="px-6 py-12 text-center text-slate-400">Loading history...</td></tr>
                                ) : paginatedListings.length === 0 ? (
                                    <tr><td colSpan="13" className="px-6 py-12 text-center text-slate-400">No optimizations found.</td></tr>
                                ) : paginatedListings.map((item) => {
                                    const listingId = item.listing_id;
                                    const theme = item.theme || '';
                                    const niche = item.niche || '';
                                    const themeDisplay = theme ? (niche ? `${theme} > ${niche}` : theme) : (niche || '—');
                                    const score = item.listing_strength ? Math.round(item.listing_strength) : null;
                                    const displayTitle = item.original_title || 'Untitled Product';
                                    const status = item.status_name || 'New';
                                    const statusColor =
                                        status === 'Listing completed'      ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                        status === 'SEO analysis completed' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                                        status === 'New'                    ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                                              'bg-slate-50 text-slate-600 border-slate-100';
                                    return (
                                        <tr key={listingId} className="hover:bg-slate-50 transition-colors group">
                                            <td className="pl-4 pr-2 py-3">
                                                <div className="w-10 h-10 rounded-lg border border-slate-200 bg-slate-100 overflow-hidden relative group-hover:shadow-md transition-all">
                                                    {item.image_url
                                                        ? <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                                                        : <div className="flex items-center justify-center h-full text-xs text-slate-300">—</div>
                                                    }
                                                </div>
                                            </td>
                                            <td className="px-2 py-3">
                                                <div className="font-semibold text-slate-900 text-sm line-clamp-1">{displayTitle}</div>
                                            </td>
                                            <td className="px-2 py-3">
                                                <div className="text-xs text-slate-600 font-medium line-clamp-1" title={themeDisplay}>{themeDisplay}</div>
                                            </td>
                                            <td className="px-2 py-3 text-center">
                                                <div className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold 
                                                    ${score >= 80 ? 'bg-emerald-100 text-emerald-700' :
                                                      score >= 50 ? 'bg-amber-100 text-amber-700' :
                                                                    'bg-slate-100 text-slate-500'}`}>
                                                    {score !== null ? score : 'N/A'}
                                                </div>
                                            </td>
                                            <td className="px-2 py-3 text-center"><MetricCell value={item.listing_visibility} /></td>
                                            <td className="px-2 py-3 text-center"><MetricCell value={item.listing_raw_visibility_index} /></td>
                                            <td className="px-2 py-3 text-center"><MetricCell value={item.listing_relevance} /></td>
                                            <td className="px-2 py-3 text-center"><MetricCell value={item.listing_conversion} /></td>
                                            <td className="px-2 py-3 text-center"><MetricCell value={item.listing_competition} inverted /></td>
                                            <td className="px-2 py-3 text-center"><MetricCell value={item.listing_profit} /></td>
                                            <td className="px-2 py-3 text-center">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${statusColor}`}>
                                                    {status}
                                                </span>
                                            </td>
                                            <td className="px-2 py-3 text-right whitespace-nowrap text-xs text-slate-500">
                                                {format(new Date(item.listing_created_at), 'dd MMM yyyy', { locale: fr })}
                                            </td>
                                            <td className="px-2 py-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleViewResults(listingId)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors shadow-sm hover:shadow whitespace-nowrap"
                                                    >
                                                        SHOW SEO <Eye size={12} />
                                                    </button>
                                                    <div className="relative group/menu">
                                                        <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors">
                                                            <MoreHorizontal size={16} />
                                                        </button>
                                                        <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-slate-100 rounded-lg shadow-xl opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-10 p-1">
                                                            <button
                                                                onClick={() => handleExportPDF(item)}
                                                                disabled={exportingId === listingId}
                                                                className="w-full text-left px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded flex items-center gap-2 mb-1"
                                                            >
                                                                {exportingId === listingId
                                                                    ? <Loader2 size={12} className="animate-spin text-indigo-600" />
                                                                    : <FileDown size={12} />}
                                                                Export PDF
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(listingId)}
                                                                className="w-full text-left px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded flex items-center gap-2"
                                                            >
                                                                <Trash2 size={12} />
                                                                Supprimer
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination — always visible */}
                    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between flex-shrink-0">
                        <span className="text-xs text-slate-500">
                            {sortedListings.length === 0
                                ? 'No results'
                                : <><strong>{sortedListings.length}</strong> listings — Page <strong>{currentPage}</strong> / <strong>{Math.max(1, totalPages)}</strong></>
                            }
                        </span>
                        {totalPages > 1 && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                {Array.from({ length: totalPages }).map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setCurrentPage(i + 1)}
                                        className={`w-8 h-8 flex items-center justify-center text-xs font-medium rounded-md border transition-all
                                            ${currentPage === i + 1
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default HistoryPage;
