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
                .from('listings')
                .select(`
                    id,
                    created_at,
                    title,
                    generated_title,
                    image_url,
                    status,
                    user_description,
                    niches ( name ),
                    product_types ( name ),
                    tones ( name ),
                    custom_listing
                `)
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
             setListings(listings.filter(l => l.id !== id));
        } catch (err) {
            console.error("Error deleting listing:", err);
            alert("Failed to delete listing.");
        }
    };

    const handleExportPDF = async (item) => {
        try {
            setExportingId(item.id);
            
            // 1. Fetch SEO Stats (not in initial list query)
            const { data: stats, error: statsError } = await supabase
                .from('listing_seo_stats')
                .select('*')
                .eq('listing_id', item.id);

            if (statsError) throw statsError;

            // 2. Prepare Data for PDF
            const customData = item.custom_listing ? JSON.parse(item.custom_listing) : {};
            const listingData = {
                title: item.generated_title || item.title || "Untitled",
                description: item.user_description || "", // or generated_description if available? 
                // Wait, user_description is the INPUT context. generated_description is the result.
                // In fetchListings, we select user_description. We MISS generated_description.
                // We need to fetch it or update fetchListings. 
                // Let's fetch the full listing details again to be safe and simple.
                
                imageUrl: item.image_url,
                productName: (item.generated_title || item.title || "Untitled").split(' ').slice(0, 5).join(' ') + '...',
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
                        is_trending: s.is_trending,
                        is_evergreen: s.is_evergreen,
                        is_promising: s.is_promising
                    };
                })
            };

            // Fetch full details if description/generated_description is missing from list view
            // The list view query selects: id, created_at, title, generated_title, image_url, status, user_description...
            // It does NOT select generated_description.
            // So we MUST fetch the specific listing.
            
            const { data: fullListing, error: listingError } = await supabase
                .from('listings')
                .select('generated_description')
                .eq('id', item.id)
                .single();
                
            if (listingError) throw listingError;
            
            listingData.description = fullListing.generated_description || item.user_description;


            // 3. Generate Blob
            const blob = await pdf(<ListingPDFDocument listing={listingData} />).toBlob();
            
            // 4. Download
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${(item.generated_title || "listing").substring(0, 20).replace(/\s+/g, '_')}_SEO.pdf`;
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
        const customData = item.custom_listing ? JSON.parse(item.custom_listing) : {};
        const nicheName = item.niches?.name || customData.niche || "";
        const typeName = item.product_types?.name || "";
        const title = item.generated_title || item.title || "";

        const matchesSearch = 
            title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            nicheName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            typeName.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

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
                                    <th className="px-6 py-3 font-semibold w-20">Visuel</th>
                                    <th className="px-4 py-3 font-semibold">Produit</th>
                                    <th className="px-4 py-3 font-semibold">Contexte</th>
                                    <th className="px-4 py-3 font-semibold w-40">Statut/Date</th>
                                    <th className="px-4 py-3 font-semibold text-right w-40">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-slate-400">Loading history...</td>
                                    </tr>
                                ) : paginatedListings.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-slate-400">No optimizations found.</td>
                                    </tr>
                                ) : (
                                    paginatedListings.map((item) => {
                                        const customData = item.custom_listing ? JSON.parse(item.custom_listing) : {};
                                        const nicheName = item.niches?.name || customData.niche || "General";
                                        const typeName = item.product_types?.name || "Product";
                                        const toneName = item.tones?.name || "Standard";
                                        const displayTitle = item.generated_title || item.title || "Untitled Product";

                                        return (
                                            <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
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
                                                    <div className="text-xs text-slate-500 font-mono">Type : {typeName}</div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="text-xs text-slate-700 font-medium">Niche : {nicheName}</div>
                                                    <div className="text-xs text-slate-500">Ton : {toneName}</div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-slate-900 font-medium">
                                                            {format(new Date(item.created_at), 'dd MMM', { locale: fr })}
                                                        </span>
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide w-fit border
                                                            ${item.status === 'completed' 
                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                                                : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
                                                            {item.status === 'completed' ? 'Généré' : 'En cours'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button 
                                                            onClick={() => handleViewResults(item.id)}
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
                                                                    disabled={exportingId === item.id}
                                                                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded flex items-center gap-2 mb-1"
                                                                >
                                                                    {exportingId === item.id ? <Loader2 size={12} className="animate-spin text-indigo-600" /> : <FileDown size={12} />}
                                                                    Export PDF
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleDelete(item.id)}
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
