import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { Search, Plus, Edit2, Check, X, Trash2, FolderTree, PackageOpen } from 'lucide-react';
import { toast } from 'sonner';

const TABS = [
  { key: 'categories', label: 'Product Categories', table: 'product_categories', icon: FolderTree, accent: 'bg-indigo-50 text-indigo-600' },
  { key: 'product_types', label: 'Product Types', table: 'product_types', icon: PackageOpen, accent: 'bg-teal-50 text-teal-600' },
];

export default function ProductTypeManagement() {
  const [activeTab, setActiveTab] = useState('categories');
  const [categories, setCategories] = useState([]);
  const [productTypes, setProductTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Inline editing
  const [editData, setEditData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Add new row
  const [isAddingMode, setIsAddingMode] = useState(false);
  // Optional category_id for new product types
  const [newItem, setNewItem] = useState({ name: '', category_id: '' });

  const activeTabConfig = TABS.find(t => t.key === activeTab);
  const currentData = activeTab === 'categories' ? categories : productTypes;
  const setCurrentData = activeTab === 'categories' ? setCategories : setProductTypes;

  // --- Data Fetching ---
  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [categoriesRes, productTypesRes] = await Promise.all([
        supabase.from('product_categories').select('*').order('name', { ascending: true }),
        supabase.from('product_types').select('*, product_categories(name)').order('name', { ascending: true }),
      ]);
      
      if (categoriesRes.error) throw categoriesRes.error;
      if (productTypesRes.error) throw productTypesRes.error;
      
      setCategories(categoriesRes.data || []);
      setProductTypes(productTypesRes.data || []);
    } catch (error) {
      console.error('Error fetching product taxonomy:', error);
      toast.error('Failed to load product categories and types');
    } finally {
      setLoading(false);
    }
  };

  // --- Filtered & Sorted Data ---
  const filteredData = useMemo(() => {
    if (!search.trim()) return currentData;
    const q = search.toLowerCase();
    
    return currentData.filter(item => {
      // Search by name
      if (item.name.toLowerCase().includes(q)) return true;
      // Search by category name if it's a product type
      if (activeTab === 'product_types' && item.product_categories?.name?.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [currentData, search, activeTab]);

  // --- CRUD Handlers ---
  const handleAdd = async () => {
    if (!newItem.name.trim()) {
      toast.error('Name is required');
      return;
    }
    
    if (activeTab === 'product_types' && !newItem.category_id) {
        toast.error('Please select a category for this product type');
        return;
    }

    try {
      setIsSaving(true);
      
      const insertPayload = activeTab === 'categories' 
        ? { name: newItem.name.trim() }
        : { name: newItem.name.trim(), category_id: newItem.category_id };
        
      const { data, error } = await supabase
        .from(activeTabConfig.table)
        .insert([insertPayload])
        .select(activeTab === 'product_types' ? '*, product_categories(name)' : '*');

      if (error) {
        if (error.code === '23505') { // unique violation
          toast.error(`A ${activeTab === 'categories' ? 'category' : 'product type'} with this name already exists`);
        } else {
          throw error;
        }
        return;
      }
      
      if (data) {
        setCurrentData(prev => [...prev, data[0]].sort((a, b) => a.name.localeCompare(b.name)));
        toast.success(`${activeTab === 'categories' ? 'Category' : 'Product Type'} created successfully`);
        setIsAddingMode(false);
        setNewItem({ name: '', category_id: '' });
      }
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Failed to create item');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async (id) => {
    if (!editData.name.trim()) {
      toast.error('Name is required');
      return;
    }
    
    if (activeTab === 'product_types' && !editData.category_id) {
        toast.error('Please select a category for this product type');
        return;
    }

    try {
      setIsSaving(true);
      
      const updatePayload = activeTab === 'categories' 
        ? { name: editData.name.trim() }
        : { name: editData.name.trim(), category_id: editData.category_id };
        
      const { data, error } = await supabase
        .from(activeTabConfig.table)
        .update(updatePayload)
        .eq('id', id)
        .select(activeTab === 'product_types' ? '*, product_categories(name)' : '*');

      if (error) {
        if (error.code === '23505') {
          toast.error('This name is already taken');
        } else {
          throw error;
        }
        return;
      }

      if (data) {
          setCurrentData(prev =>
            prev.map(item => item.id === id ? data[0] : item)
              .sort((a, b) => a.name.localeCompare(b.name))
          );
          toast.success('Updated successfully');
          setEditData(null);
      }
    } catch (error) {
      console.error('Error updating:', error);
      toast.error('Failed to update');
    } finally {
      setIsSaving(false);
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

      if (error) {
          // Check for foreign key constraint violation (e.g. deleting a category with product types)
          if (error.code === '23503') {
             toast.error(`Cannot delete "${item.name}" because it is currently in use.`);
          } else {
            throw error;
          }
          return;
      }
      
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
    setNewItem({ name: '', category_id: '' });
  };

  // --- Loading State ---
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const entityLabel = activeTab === 'categories' ? 'Category' : 'Product Type';

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
                {/* Animated underline indicator */}
                {isActive && (
                  <motion.div
                    layoutId="product-type-tab-indicator"
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
            setNewItem({ name: '', category_id: categories.length > 0 ? categories[0].id : '' });
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
                  <th className={`px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider ${activeTab === 'categories' ? 'w-[70%]' : 'w-[40%]'}`}>Name</th>
                  {activeTab === 'product_types' && (
                      <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[40%]">Category</th>
                  )}
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
                    
                    {activeTab === 'product_types' && (
                        <td className="px-6 py-3.5">
                          <select
                            value={newItem.category_id}
                            onChange={(e) => setNewItem({ ...newItem, category_id: e.target.value })}
                            className="w-full px-2.5 py-1.5 text-sm border border-indigo-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                          >
                             <option value="" disabled>Select a Category</option>
                             {categories.map(cat => (
                                 <option key={cat.id} value={cat.id}>{cat.name}</option>
                             ))}
                          </select>
                        </td>
                    )}
                    
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
                          onClick={() => { setIsAddingMode(false); setNewItem({ name: '', category_id: '' }); }}
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
                    <td colSpan={activeTab === 'categories' ? 2 : 3} className="px-6 py-10 text-center text-slate-400 text-sm">
                      {search ? `No ${activeTab} matching "${search}"` : `No ${activeTab} found in database.`}
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

                        {/* Category (if Product Type tab) */}
                        {activeTab === 'product_types' && (
                            <td className="px-6 py-3.5">
                              {isEditing ? (
                                <select
                                    value={editData.category_id || ''}
                                    onChange={(e) => setEditData({ ...editData, category_id: e.target.value })}
                                    className="w-full px-2.5 py-1.5 text-sm border border-indigo-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                                >
                                    <option value="" disabled>Select a Category</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700">
                                   {item.product_categories?.name || 'Uncategorized'}
                                </span>
                              )}
                            </td>
                        )}

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
            {filteredData.length} {activeTab.replace('_', ' ')}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
