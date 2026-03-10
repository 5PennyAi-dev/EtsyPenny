import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Search, Plus, Edit2, Check, X, Trash2, Layers, Tags, Star } from 'lucide-react';
import { toast } from 'sonner';

const TABS = [
  { key: 'themes', label: 'My Themes', table: 'user_custom_themes', icon: Layers, accent: 'bg-blue-50 text-blue-600' },
  { key: 'niches', label: 'My Niches', table: 'user_custom_niches', icon: Tags, accent: 'bg-orange-50 text-orange-600' },
];

export default function UserTaxonomyManagement() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('themes');
  const [themes, setThemes] = useState([]);
  const [niches, setNiches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Inline editing
  const [editData, setEditData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Add new row
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', description: '' });

  const activeTabConfig = TABS.find(t => t.key === activeTab);
  const currentData = activeTab === 'themes' ? themes : niches;
  const setCurrentData = activeTab === 'themes' ? setThemes : setNiches;

  // --- Data Fetching ---
  useEffect(() => {
    if (user) fetchAll();
  }, [user]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [themesRes, nichesRes] = await Promise.all([
        supabase.from('user_custom_themes').select('*').eq('user_id', user.id).order('name', { ascending: true }),
        supabase.from('user_custom_niches').select('*').eq('user_id', user.id).order('name', { ascending: true }),
      ]);
      if (themesRes.error) throw themesRes.error;
      if (nichesRes.error) throw nichesRes.error;
      setThemes(themesRes.data || []);
      setNiches(nichesRes.data || []);
    } catch (error) {
      console.error('Error fetching custom taxonomy:', error);
      toast.error('Failed to load your custom taxonomy');
    } finally {
      setLoading(false);
    }
  };

  // --- Filtered Data ---
  const filteredData = useMemo(() => {
    if (!search.trim()) return currentData;
    const q = search.toLowerCase();
    return currentData.filter(item => item.name.toLowerCase().includes(q));
  }, [currentData, search]);

  // --- CRUD Handlers ---
  const handleAdd = async () => {
    if (!newItem.name.trim()) {
      toast.error('Name is required');
      return;
    }
    try {
      setIsSaving(true);
      const { data, error } = await supabase
        .from(activeTabConfig.table)
        .insert([{ user_id: user.id, name: newItem.name.trim(), description: newItem.description.trim() || null, is_favorite: true }])
        .select();

      if (error) {
        if (error.code === '23505') {
          toast.error(`This ${activeTab === 'themes' ? 'theme' : 'niche'} already exists`);
        } else {
          throw error;
        }
        return;
      }
      if (data) {
        setCurrentData(prev => [...prev, data[0]].sort((a, b) => a.name.localeCompare(b.name)));
        toast.success(`${activeTab === 'themes' ? 'Theme' : 'Niche'} added`);
        setIsAddingMode(false);
        setNewItem({ name: '', description: '' });
      }
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Failed to add item');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async (id) => {
    if (!editData.name.trim()) {
      toast.error('Name is required');
      return;
    }
    try {
      setIsSaving(true);
      const { error } = await supabase
        .from(activeTabConfig.table)
        .update({ name: editData.name.trim(), description: editData.description?.trim() || null })
        .eq('id', id);

      if (error) {
        if (error.code === '23505') {
          toast.error('This name is already taken');
        } else {
          throw error;
        }
        return;
      }

      setCurrentData(prev =>
        prev.map(item => item.id === id ? { ...item, name: editData.name.trim(), description: editData.description?.trim() || null } : item)
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      toast.success('Updated');
      setEditData(null);
    } catch (error) {
      console.error('Error updating:', error);
      toast.error('Failed to update');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleFavorite = async (item) => {
    const newValue = !item.is_favorite;
    // Optimistic update
    setCurrentData(prev => prev.map(i => i.id === item.id ? { ...i, is_favorite: newValue } : i));

    try {
      const { error } = await supabase
        .from(activeTabConfig.table)
        .update({ is_favorite: newValue })
        .eq('id', item.id);

      if (error) throw error;
    } catch (error) {
      // Revert on failure
      setCurrentData(prev => prev.map(i => i.id === item.id ? { ...i, is_favorite: !newValue } : i));
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update');
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.name}"? This action cannot be undone.`)) return;

    try {
      setIsSaving(true);
      const { error } = await supabase
        .from(activeTabConfig.table)
        .delete()
        .eq('id', item.id);

      if (error) throw error;
      setCurrentData(prev => prev.filter(i => i.id !== item.id));
      toast.success(`"${item.name}" deleted`);
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Failed to delete');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset transient states on tab switch
  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setSearch('');
    setEditData(null);
    setIsAddingMode(false);
    setNewItem({ name: '', description: '' });
  };

  // --- Loading State ---
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const entityLabel = activeTab === 'themes' ? 'Theme' : 'Niche';

  return (
    <div className="p-0">
      {/* --- Tabs --- */}
      <div className="border-b border-slate-200 px-6">
        <div className="flex gap-0 relative">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`
                  relative flex items-center gap-2 px-5 py-3.5 text-sm font-semibold transition-colors
                  ${isActive ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}
                `}
              >
                <div className={`p-1 rounded-md ${isActive ? tab.accent : 'bg-slate-100 text-slate-400'}`}>
                  <Icon size={14} />
                </div>
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="user-taxonomy-tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* --- Search + Add Bar --- */}
      <div className="px-6 py-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => {
            setIsAddingMode(true);
            setNewItem({ name: '', description: '' });
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-all shadow-sm"
        >
          <Plus size={16} /> Add {entityLabel}
        </button>
      </div>

      {/* --- Table --- */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[30%]">Name</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider w-28 text-center">Favorite</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider w-28 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* --- Add New Row --- */}
                {isAddingMode && (
                  <tr className="bg-indigo-50/30">
                    <td className="px-6 py-3.5">
                      <input
                        type="text"
                        value={newItem.name}
                        onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                        placeholder={`New ${entityLabel.toLowerCase()} name`}
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                        className="w-full px-2.5 py-1.5 text-sm border border-indigo-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-6 py-3.5">
                      <input
                        type="text"
                        value={newItem.description}
                        onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                        placeholder="Optional description"
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                        className="w-full px-2.5 py-1.5 text-sm border border-indigo-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <Star size={16} className="mx-auto text-amber-500" fill="currentColor" />
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={handleAdd}
                          disabled={isSaving}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-md transition-colors disabled:opacity-50"
                          title="Create"
                        >
                          <Check size={18} />
                        </button>
                        <button
                          onClick={() => { setIsAddingMode(false); setNewItem({ name: '', description: '' }); }}
                          disabled={isSaving}
                          className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-md transition-colors disabled:opacity-50"
                          title="Cancel"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )}

                {/* --- Data Rows --- */}
                {filteredData.length === 0 && !isAddingMode ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-slate-400 text-sm">
                      {search ? `No ${activeTab} matching "${search}"` : `No custom ${activeTab} yet. Add one to get started.`}
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item) => {
                    const isEditing = editData?.id === item.id;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        {/* Name */}
                        <td className="px-6 py-3.5">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editData.name}
                              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                              onKeyDown={(e) => e.key === 'Enter' && handleSave(item.id)}
                              autoFocus
                              className="w-full px-2.5 py-1.5 text-sm border border-indigo-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          ) : (
                            <span className="text-sm font-medium text-slate-900">{item.name}</span>
                          )}
                        </td>

                        {/* Description */}
                        <td className="px-6 py-3.5">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editData.description || ''}
                              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                              onKeyDown={(e) => e.key === 'Enter' && handleSave(item.id)}
                              placeholder="Description"
                              className="w-full px-2.5 py-1.5 text-sm border border-indigo-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          ) : (
                            <span className="text-sm text-slate-500">{item.description || '—'}</span>
                          )}
                        </td>

                        {/* Favorite Toggle */}
                        <td className="px-6 py-3.5 text-center">
                          <button
                            onClick={() => handleToggleFavorite(item)}
                            disabled={isSaving}
                            className={`p-1 rounded-md transition-colors mx-auto ${
                              item.is_favorite
                                ? 'text-amber-500 hover:bg-amber-50'
                                : 'text-slate-300 hover:text-amber-400 hover:bg-amber-50'
                            } disabled:opacity-50`}
                            title={item.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            <Star size={18} fill={item.is_favorite ? 'currentColor' : 'none'} />
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-3.5 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleSave(item.id)}
                                disabled={isSaving}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors disabled:opacity-50"
                                title="Save"
                              >
                                <Check size={18} />
                              </button>
                              <button
                                onClick={() => setEditData(null)}
                                disabled={isSaving}
                                className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-md transition-colors disabled:opacity-50"
                                title="Cancel"
                              >
                                <X size={18} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setEditData({ ...item })}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                                title="Edit"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(item)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer count */}
          <div className="px-6 py-3 border-t border-slate-100 text-xs text-slate-400">
            {filteredData.length} {activeTab} · {filteredData.filter(i => i.is_favorite).length} favorites
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
