import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
    Search, Calendar, Filter, MoreHorizontal, Eye, Trash2, ArrowRight, 
    ChevronLeft, ChevronRight, CheckCircle, Clock, FileDown, Loader2 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { pdf } from '@react-pdf/renderer';
import ListingPDFDocument from '../components/pdf/ListingPDFDocument';

const HistoryPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [listings, setListings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [exportingId, setExportingId] = useState(null);
    const ITEMS_PER_PAGE = 9;

    useEffect(() => {
        if (user) {
            fetchListings();
        }
    }, [user]);

    const fetchListings = async () => {
        try {
            const { data, error } = await supabase
                .from('view_listing_scores')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setListings(data || []);
        } catch (err) {
            console.error('Error fetching history:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this optimization?")) return;
        
        try {
             const { error } = await supabase
                .from('listings')
                .delete()
                .eq('id', id);

             if (error) throw error;
             setListings(listings.filter(l => (l.listing_id || l.id) !== id));
        } catch (err) {
            console.error("Error deleting listing:", err);
            alert("Failed to delete listing.");
        }
    };

    const handleExportPDF = async (item) => {
        try {
            const listingId = item.listing_id || item.id;
            setExportingId(listingId);
            
            // 1. Fetch SEO Stats (not in initial list query)
            const { data: stats, error: statsError } = await supabase
                .from('listing_seo_stats')
                .select('*')
                .eq('listing_id', listingId);

            if (statsError) throw statsError;

            // Fetch global strength score from listings
            const { data: listingRecord } = await supabase
                .from('listings')
                .select('global_strength')
                .eq('id', listingId)
                .single();

            // 2. Prepare Data for PDF
            const customData = item.custom_listing ? JSON.parse(item.custom_listing) : {};
            const listingData = {
                title: item.display_title || item.title || "Untitled", // Use display_title from view
                description: item.user_description || "", 
                
                imageUrl: item.image_url,
                global_strength: listingRecord?.global_strength ?? null,
                productName: (item.display_title || item.title || "Untitled").split(' ').slice(0, 5).join(' ') + '...',
                tags: stats.map(s => {
                    // Calculate Trend %
                    let trend = 0;
                    if (s.volume_history && s.volume_history.length > 0) {
                        const first = s.volume_history[0] || 1; 
                        const last = s.volume_history[s.volume_history.length - 1] || 0;
                        trend = Math.round(((last - first) / first) * 100);
                    }

                    return { 
                        keyword: s.tag, 
                        score: s.opportunity_score,
                        volume: s.search_volume,
                        competition: s.competition,
                        trend: trend,
                        volume_history: s.volume_history || [],
                        is_trending: s.is_trending,
                        is_evergreen: s.is_evergreen,
                        is_promising: s.is_promising,
                        insight: s.insight || null,
                        is_top: s.is_top ?? null
                    };
                })
            };

            // Fetch full details if description is missing
            const { data: fullListing, error: listingError } = await supabase
                .from('listings')
                .select('generated_description, user_description')
                .eq('id', listingId)
                .single();
                
            if (listingError) throw listingError;
            
            listingData.description = fullListing.generated_description || fullListing.user_description || "";

            // 3. Generate Blob
            const blob = await pdf(<ListingPDFDocument listing={listingData} />).toBlob();
            
            // 4. Download
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${(item.display_title || "listing").substring(0, 20).replace(/\s+/g, '_')}_SEO.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

        } catch (err) {
            console.error("Error exporting PDF:", err);
            alert("Failed to export PDF.");
        } finally {
            setExportingId(null);
        }
    };

    const handleViewResults = (id) => {
        // Navigate to Studio and auto-load listing?
        // Studio needs to handle a query param or state?
        // Let's use navigation state?
        // navigate('/studio', { state: { loadListingId: id } });
        // But ProductStudio needs to read this state.
        // For now, let's just create the callback to load.
        // Or store it in localStorage? Or just pass as state.
        // ProductStudio checks location.state on mount. Perfect.
        navigate('/studio', { state: { listingId: id } });
    };

    // Filter Logic
    const filteredListings = listings.filter(item => {
        // Adapt to View Fields
        const nicheName = item.niche_full || item.niche_name || "General";
        const typeName = item.product_type_name || "Product";
        const title = item.display_title || item.title || "";

        const matchesSearch = 
            title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            nicheName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            typeName.toLowerCase().includes(searchTerm.toLowerCase());

        // Map View Status to Filter Status
        // View returns: 'Listing completed', 'SEO analysis completed', 'New', etc.
        const normalizedStatus = ['Listing completed', 'SEO analysis completed'].includes(item.status) 
            ? 'completed' 
            : 'processing';
            
        const matchesStatus = statusFilter === 'all' || normalizedStatus === statusFilter;

        return matchesSearch && matchesStatus;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredListings.length / ITEMS_PER_PAGE);
    const paginatedListings = filteredListings.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    return (
        <Layout>
            <div className="p-8 max-w-7xl mx-auto space-y-6">
                
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
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-64 shadow-sm"
                            />
                        </div>
                        
                        <div className="relative">
                            <select 
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
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
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
                    <div className="overflow-x-auto flex-grow">
                        <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                        <tr>
                                            <th className="px-6 py-3 font-semibold w-20"></th> {/* Visuel (Empty Label) */}
                                            <th className="px-4 py-3 font-semibold">Title</th>
                                            <th className="px-4 py-3 font-semibold">Niche</th>
                                            <th className="px-4 py-3 font-semibold w-24 text-center">Score</th>
                                            <th className="px-4 py-3 font-semibold w-32 text-center">Status</th>
                                            <th className="px-4 py-3 font-semibold w-32 text-right">Date</th>
                                            <th className="px-4 py-3 font-semibold text-right w-40">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {isLoading ? (
                                            <tr>
                                                <td colSpan="7" className="px-6 py-12 text-center text-slate-400">Loading history...</td>
                                            </tr>
                                        ) : paginatedListings.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="px-6 py-12 text-center text-slate-400">No optimizations found.</td>
                                            </tr>
                                        ) : (
                                            paginatedListings.map((item) => {
                                                const listingId = item.listing_id || item.id;
                                                // Niche Breadcrumbs: Theme > Niche > Sub-niche
                                                const theme = item.theme_name || "General";
                                                const niche = item.niche_name || "Niche";
                                                const subNiche = item.sub_niche_name || ""; 
                                                
                                                let nicheDisplay = item.niche_full;
                                                if (!nicheDisplay || nicheDisplay === "General") {
                                                     nicheDisplay = `${theme} > ${niche}${subNiche ? ` > ${subNiche}` : ''}`;
                                                }

                                                // Use listing_score as per user instruction. Handle null/0 as N/A.
                                                const rawScore = item.listing_score || item.performance_score;
                                                const score = rawScore ? Math.round(rawScore) : null;
                                                
                                                const displayTitle = item.display_title || item.title || "Untitled Product";
                                                
                                                // Status Logic
                                                const status = item.status || "New";
                                                const statusColor = 
                                                    status === 'Listing completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                    status === 'SEO analysis completed' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                                                    status === 'New' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                    'bg-slate-50 text-slate-600 border-slate-100';

                                                return (
                                                    <tr key={listingId} className="hover:bg-slate-50 transition-colors group">
                                                        <td className="px-6 py-4">
                                                            <div className="w-12 h-12 rounded-lg border border-slate-200 bg-slate-100 overflow-hidden relative group-hover:shadow-md transition-all">
                                                                {item.image_url ? (
                                                                    <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="flex items-center justify-center h-full text-xs text-slate-300">No Img</div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <div className="font-bold text-slate-900 mb-0.5 line-clamp-1">{displayTitle}</div>
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <div className="text-sm text-slate-700 font-medium truncate max-w-[200px]" title={nicheDisplay}>
                                                                {nicheDisplay}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 text-center">
                                                            <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold 
                                                                ${score >= 80 ? 'bg-emerald-100 text-emerald-700' :
                                                                  score >= 50 ? 'bg-amber-100 text-amber-700' :
                                                                  'bg-slate-100 text-slate-500'}`}>
                                                                {score !== null ? score : 'N/A'}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 text-center">
                                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${statusColor}`}>
                                                                {status}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-4 text-right whitespace-nowrap text-sm text-slate-500">
                                                            {format(new Date(item.created_at), 'dd MMM yyyy', { locale: fr })}
                                                        </td>
                                                <td className="px-4 py-4 text-right">
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
                                                            {/* Dropdown Menu (Simple Implementation for now) */}
                                                            <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-slate-100 rounded-lg shadow-xl opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-10 p-1">
                                                                <button 
                                                                    onClick={() => handleExportPDF(item)}
                                                                    disabled={exportingId === listingId}
                                                                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded flex items-center gap-2 mb-1"
                                                                >
                                                                    {exportingId === listingId ? <Loader2 size={12} className="animate-spin text-indigo-600" /> : <FileDown size={12} />}
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
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <span className="text-xs text-slate-500">
                                Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
                            </span>
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
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default HistoryPage;
