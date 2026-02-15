import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { BarChart2, MoreVertical, ExternalLink, History } from 'lucide-react';
import { formatRelative } from 'date-fns';
import { fr } from 'date-fns/locale';
import Accordion from '../ui/Accordion';

const RecentOptimizations = ({ onViewResults }) => {
    const { user } = useAuth();
    const [recentListings, setRecentListings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchRecentListings();
        }
    }, [user]);

    const fetchRecentListings = async () => {
        try {
            const { data, error } = await supabase
                .from('view_listing_scores')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(5);

            if (error) throw error;
            setRecentListings(data || []);
        } catch (err) {
            console.error('Error fetching recent listings:', err);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) return <div className="text-center py-4 text-slate-400">Loading recent optimizations...</div>;
    if (recentListings.length === 0) return null; // Or a placeholder

    return (
        <div className="mt-8">
            <Accordion
                defaultOpen={true}
                title={
                    <div className="flex items-center gap-2">
                        <History size={16} className="text-indigo-600" />
                        <span className="text-sm font-bold text-slate-900">Recent History</span>
                    </div>
                }
                headerActions={
                    <a href="/history" className="text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1">
                        Voir tout l'historique
                        <ExternalLink size={12} />
                    </a>
                }
            >
                <div className="overflow-x-auto border-t border-slate-100">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3 font-semibold">Image</th>
                                <th className="px-4 py-3 font-semibold">Nom du Produit</th>
                                <th className="px-4 py-3 font-semibold">Date</th>
                                <th className="px-4 py-3 font-semibold">Niche</th>
                                <th className="px-4 py-3 font-semibold text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {recentListings.map((listing) => {
                                const listingId = listing.listing_id || listing.id; 
                                const nicheName = listing.niche_full || listing.niche_name || "General";
                                const productName = listing.display_title || listing.title || "Untitled";
                                // Try to get product type if available in view, else skip
                                const productType = listing.product_type_name || listing.product_type || "";

                                return (
                                    <tr key={listingId} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-3">
                                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                                                {listing.image_url ? (
                                                    <img 
                                                        src={listing.image_url} 
                                                        alt={productName} 
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">No Img</div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-medium text-slate-700">
                                            {productName}
                                            {productType && <div className="text-xs text-slate-400 font-normal">{productType}</div>}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500">
                                            {formatRelative(new Date(listing.created_at), new Date(), { locale: fr })}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                                {nicheName}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button 
                                                onClick={() => onViewResults(listingId)}
                                                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100 transition-colors"
                                            >
                                                SHOW SEO ↗
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Accordion>
        </div>
    );
};

export default RecentOptimizations;
