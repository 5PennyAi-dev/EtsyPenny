import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import Accordion from '../components/ui/Accordion';
import { Settings2, Zap, Edit2, Check, X } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSystemPage() {
  // TODO: Wrap this page with Admin-only Role check. For now, focus on the functionality.
  
  const [constants, setConstants] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Inline editing state
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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
    setEditingId(constant.id);
    setEditValue(constant.value.toString());
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleSave = async (id) => {
    const numericValue = parseFloat(editValue);
    
    if (isNaN(numericValue)) {
      toast.error('Please enter a valid number');
      return;
    }

    try {
      setIsSaving(true);
      
      const { error } = await supabase
        .from('system_seo_constants')
        .update({ value: numericValue, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      // Optimistically update local state
      setConstants(prev => prev.map(c => 
        c.id === id ? { ...c, value: numericValue } : c
      ));
      
      toast.success('Constant updated successfully');
      setEditingId(null);
      
    } catch (error) {
      console.error('Error updating constant:', error);
      toast.error('Failed to update constant');
    } finally {
      setIsSaving(false);
    }
  };

  const weights = constants.filter(c => c.category === 'weight');
  const thresholds = constants.filter(c => c.category === 'threshold');

  const renderTable = (data) => (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="bg-slate-50 border-b border-slate-100">
          <tr>
            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Parameter Key</th>
            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Label</th>
            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-48">Value</th>
            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right w-32">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 focus:outline-none">
          {data.map((item) => {
            const isEditing = editingId === item.id;
            
            return (
              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 font-mono">
                    {item.param_key}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-slate-900">
                  {item.label}
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {item.description || '-'}
                </td>
                <td className="px-6 py-4">
                  {isEditing ? (
                    <input
                      type="number"
                      step="any"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border-2 border-indigo-500 rounded-md focus:outline-none focus:ring-0"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSave(item.id);
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
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
                    <button
                      onClick={() => handleEditClick(item)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                      title="Edit Value"
                    >
                      <Edit2 size={16} />
                    </button>
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
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              System Configuration
            </h1>
            <p className="text-slate-500 mt-2">
              Manage the core SEO weighting constants and logic thresholds used across the app.
            </p>
          </div>

          {/* Table Area 1: SEO Strategy Weights */}
          <Accordion
            defaultOpen={true}
            title={
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                  <Settings2 size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 text-left">SEO Strategy Weights</h2>
                  <p className="text-sm text-slate-500 font-normal mt-0.5 text-left">Tunable multipliers that control the strength calculation algorithms.</p>
                </div>
              </div>
            }
          >
            {weights.length > 0 ? (
              renderTable(weights)
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
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                  <Zap size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 text-left">Intelligence Thresholds</h2>
                  <p className="text-sm text-slate-500 font-normal mt-0.5 text-left">Hard limits defining what constitutes an evergreen, trending, or promising tag.</p>
                </div>
              </div>
            }
          >
            {thresholds.length > 0 ? (
              renderTable(thresholds)
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
