import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import Accordion from '../components/ui/Accordion';
import { Settings2, Zap, Edit2, Check, X, Trash2, Plus, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSystemPage() {
  // TODO: Wrap this page with Admin-only Role check. For now, focus on the functionality.
  
  const [constants, setConstants] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Inline editing state
  const [editData, setEditData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [newConstant, setNewConstant] = useState({
    param_key: '',
    label: '',
    description: '',
    value: 0,
    category: 'weight'
  });

  const [sortConfig, setSortConfig] = useState({ key: 'param_key', direction: 'asc' });

  useEffect(() => {
    fetchConstants();
  }, []);

  const fetchConstants = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_seo_constants')
        .select('*')
        // We will sort this manually in JavaScript to maintain the Low -> Aggressive order
        // since alphabetical sorting by label won't work perfectly.
        .order('category', { ascending: true })
        .order('param_key', { ascending: true })
        .order('value', { ascending: true });

      if (error) throw error;
      setConstants(data || []);
    } catch (error) {
      console.error('Error fetching constants:', error);
      toast.error('Failed to load SEO constants');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (constant) => {
    setEditData({ ...constant });
  };

  const handleCancelEdit = () => {
    setEditData(null);
  };

  const handleSave = async (id) => {
    const numericValue = parseFloat(editData.value);
    
    if (isNaN(numericValue)) {
      toast.error('Please enter a valid number for the value');
      return;
    }

    if (!editData.param_key || !editData.label) {
      toast.error('Parameter Key and Label are required');
      return;
    }

    try {
      setIsSaving(true);
      
      const { error } = await supabase
        .from('system_seo_constants')
        .update({ 
          param_key: editData.param_key,
          label: editData.label,
          description: editData.description,
          value: numericValue, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', id);

      if (error) throw error;

      // Optimistically update local state
      setConstants(prev => prev.map(c => 
        c.id === id ? { ...editData, value: numericValue } : c
      ));
      
      toast.success('Constant updated successfully');
      setEditData(null);
      
    } catch (error) {
      console.error('Error updating constant:', error);
      toast.error('Failed to update constant');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this constant? This action cannot be undone.')) {
      return;
    }

    try {
      setIsSaving(true);
      const { error } = await supabase
        .from('system_seo_constants')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setConstants(prev => prev.filter(c => c.id !== id));
      toast.success('Constant deleted successfully');
    } catch (error) {
      console.error('Error deleting constant:', error);
      toast.error('Failed to delete constant');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddClick = (category) => {
    setNewConstant({
      param_key: '',
      label: '',
      description: '',
      value: 0,
      category: category
    });
    setIsAddingMode(true);
  };

  const handleCreateNew = async () => {
    const numericValue = parseFloat(newConstant.value);
    
    if (isNaN(numericValue)) {
      toast.error('Please enter a valid number for the value');
      return;
    }

    if (!newConstant.param_key || !newConstant.label) {
      toast.error('Parameter Key and Label are required');
      return;
    }

    try {
      setIsSaving(true);
      const { data, error } = await supabase
        .from('system_seo_constants')
        .insert([{ ...newConstant, value: numericValue }])
        .select();

      if (error) throw error;

      if (data) {
        setConstants(prev => [...prev, data[0]]);
        toast.success('New constant created successfully');
        setIsAddingMode(false);
      }
    } catch (error) {
      console.error('Error creating constant:', error);
      toast.error('Failed to create constant');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortedData = (data) => {
    return [...data].sort((a, b) => {
      if (!sortConfig.key) return 0;
      
      const aVal = (a[sortConfig.key] || '').toLowerCase();
      const bVal = (b[sortConfig.key] || '').toLowerCase();
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const weights = getSortedData(constants.filter(c => c.category === 'weight'));
  const thresholds = getSortedData(constants.filter(c => c.category === 'threshold'));

  const renderTable = (data, category) => (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="bg-slate-50 border-b border-slate-100">
          <tr>
            <th 
              className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/4 cursor-pointer hover:bg-slate-100 transition-colors group"
              onClick={() => handleSort('param_key')}
            >
              <div className="flex items-center gap-2">
                Parameter Key
                {sortConfig.key === 'param_key' ? (
                  sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-indigo-600" /> : <ChevronDown size={14} className="text-indigo-600" />
                ) : (
                  <ArrowUpDown size={14} className="text-slate-300 group-hover:text-slate-400" />
                )}
              </div>
            </th>
            <th 
              className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/4 cursor-pointer hover:bg-slate-100 transition-colors group"
              onClick={() => handleSort('label')}
            >
              <div className="flex items-center gap-2">
                Label
                {sortConfig.key === 'label' ? (
                  sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-indigo-600" /> : <ChevronDown size={14} className="text-indigo-600" />
                ) : (
                  <ArrowUpDown size={14} className="text-slate-300 group-hover:text-slate-400" />
                )}
              </div>
            </th>
            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/4">Description</th>
            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-48">Value</th>
            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right w-32">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 focus:outline-none">
          {/* Add New Row UI */}
          {isAddingMode && newConstant.category === category && (
            <tr className="bg-indigo-50/30">
              <td className="px-6 py-4">
                <input
                  type="text"
                  value={newConstant.param_key}
                  onChange={(e) => setNewConstant({ ...newConstant, param_key: e.target.value })}
                  placeholder="param_name"
                  className="w-full px-2 py-1 text-sm border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </td>
              <td className="px-6 py-4">
                <input
                  type="text"
                  value={newConstant.label}
                  onChange={(e) => setNewConstant({ ...newConstant, label: e.target.value })}
                  placeholder="Display Label"
                  className="w-full px-2 py-1 text-sm border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </td>
              <td className="px-6 py-4">
                <input
                  type="text"
                  value={newConstant.description}
                  onChange={(e) => setNewConstant({ ...newConstant, description: e.target.value })}
                  placeholder="Description"
                  className="w-full px-2 py-1 text-sm border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </td>
              <td className="px-6 py-4">
                <input
                  type="number"
                  step="any"
                  value={newConstant.value}
                  onChange={(e) => setNewConstant({ ...newConstant, value: e.target.value })}
                  className="w-full px-2 py-1 text-sm border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={handleCreateNew}
                    disabled={isSaving}
                    className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-md transition-colors"
                    title="Create"
                  >
                    <Check size={18} />
                  </button>
                  <button
                    onClick={() => setIsAddingMode(false)}
                    disabled={isSaving}
                    className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-md transition-colors"
                    title="Cancel"
                  >
                    <X size={18} />
                  </button>
                </div>
              </td>
            </tr>
          )}
          
          {data.map((item) => {
            const isEditing = editData?.id === item.id;
            
            return (
              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editData.param_key}
                      onChange={(e) => setEditData({ ...editData, param_key: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 font-mono">
                      {item.param_key}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-slate-900">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editData.label}
                      onChange={(e) => setEditData({ ...editData, label: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  ) : (
                    item.label
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editData.description}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  ) : (
                    item.description || '-'
                  )}
                </td>
                <td className="px-6 py-4">
                  {isEditing ? (
                    <input
                      type="number"
                      step="any"
                      value={editData.value}
                      onChange={(e) => setEditData({ ...editData, value: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      autoFocus
                    />
                  ) : (
                    <span className="text-sm font-bold text-slate-900">
                      {item.value}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  {isEditing ? (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleSave(item.id)}
                        disabled={isSaving}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors disabled:opacity-50"
                        title="Save"
                      >
                        <Check size={18} />
                      </button>
                      <button
                        onClick={handleCancelEdit}
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
                        onClick={() => handleEditClick(item)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                        title="Edit Row"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                        title="Delete Constant"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-slate-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                System Configuration
              </h1>
              <p className="text-slate-500 mt-2">
                Manage the core SEO weighting constants and logic thresholds used across the app.
              </p>
            </div>
          </div>

          {/* Table Area 1: SEO Strategy Weights */}
          <Accordion
            defaultOpen={true}
            title={
              <div className="flex items-center justify-between w-full pr-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                    <Settings2 size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 text-left">SEO Strategy Weights</h2>
                    <p className="text-sm text-slate-500 font-normal mt-0.5 text-left">Tunable multipliers that control the strength calculation algorithms.</p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddClick('weight');
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm"
                >
                  <Plus size={14} /> Add Constant
                </button>
              </div>
            }
          >
            {weights.length > 0 || (isAddingMode && newConstant.category === 'weight') ? (
              renderTable(weights, 'weight')
            ) : (
              <div className="p-6 text-center text-slate-500 text-sm">
                No strategy weights found in database.
              </div>
            )}
          </Accordion>

          {/* Table Area 2: Intelligence Thresholds */}
          <Accordion
            defaultOpen={false}
            title={
              <div className="flex items-center justify-between w-full pr-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                    <Zap size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 text-left">Intelligence Thresholds</h2>
                    <p className="text-sm text-slate-500 font-normal mt-0.5 text-left">Hard limits defining what constitutes an evergreen, trending, or promising tag.</p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddClick('threshold');
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm"
                >
                  <Plus size={14} /> Add Constant
                </button>
              </div>
            }
          >
            {thresholds.length > 0 || (isAddingMode && newConstant.category === 'threshold') ? (
              renderTable(thresholds, 'threshold')
            ) : (
              <div className="p-6 text-center text-slate-500 text-sm">
                No intelligence thresholds found in database.
              </div>
            )}
          </Accordion>

        </div>
      </div>
    </Layout>
  );
}
