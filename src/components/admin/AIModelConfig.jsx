import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Edit2, Check, X, Eye } from 'lucide-react';
import { toast } from 'sonner';

const PROVIDERS = ['gemini', 'anthropic', 'openai'];

const PROVIDER_COLORS = {
  gemini: 'bg-orange-400',
  anthropic: 'bg-blue-500',
  openai: 'bg-emerald-500',
};

const COST_TIER_STYLES = {
  budget: 'bg-emerald-100 text-emerald-700',
  standard: 'bg-amber-100 text-amber-700',
  premium: 'bg-rose-100 text-rose-700',
};

export default function AIModelConfig() {
  const [taskConfigs, setTaskConfigs] = useState([]);
  const [availableModels, setAvailableModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editData, setEditData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [configResult, modelsResult] = await Promise.all([
        supabase.from('system_ai_config').select('*').order('task_key'),
        supabase.from('system_ai_models').select('*').eq('is_active', true).order('sort_order'),
      ]);

      if (configResult.error) throw configResult.error;
      if (modelsResult.error) throw modelsResult.error;

      setTaskConfigs(configResult.data || []);
      setAvailableModels(modelsResult.data || []);
    } catch (error) {
      console.error('Error fetching AI config:', error);
      toast.error('Failed to load AI configuration');
    } finally {
      setLoading(false);
    }
  };

  const getModelsForProvider = (provider, isVision) => {
    return availableModels.filter(m => {
      if (m.provider !== provider) return false;
      if (isVision && !m.supports_vision) return false;
      return true;
    });
  };

  const handleEditClick = (config) => {
    setEditingTaskId(config.id);
    setEditData({
      provider: config.provider,
      model_id: config.model_id,
      temperature: config.temperature,
      max_tokens: config.max_tokens,
    });
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setEditData(null);
  };

  const handleProviderChange = (provider) => {
    const task = taskConfigs.find(t => t.id === editingTaskId);
    const models = getModelsForProvider(provider, task?.is_vision);
    const firstModel = models[0]?.id || '';
    setEditData(prev => ({ ...prev, provider, model_id: firstModel }));
  };

  const handleModelChange = (modelId) => {
    const task = taskConfigs.find(t => t.id === editingTaskId);
    const model = availableModels.find(m => m.id === modelId);
    if (task?.is_vision && model && !model.supports_vision) {
      toast.warning('This task requires vision support. Selected model does not support images.');
    }
    setEditData(prev => ({ ...prev, model_id: modelId }));
  };

  const handleSave = async () => {
    if (!editData.model_id) {
      toast.error('Please select a model');
      return;
    }

    try {
      setIsSaving(true);
      const { error } = await supabase
        .from('system_ai_config')
        .update({
          provider: editData.provider,
          model_id: editData.model_id,
          temperature: editData.temperature,
          max_tokens: editData.max_tokens,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingTaskId);

      if (error) throw error;

      setTaskConfigs(prev =>
        prev.map(c =>
          c.id === editingTaskId ? { ...c, ...editData, updated_at: new Date().toISOString() } : c
        )
      );
      toast.success('AI configuration updated');
      setEditingTaskId(null);
      setEditData(null);
    } catch (error) {
      console.error('Error updating AI config:', error);
      toast.error('Failed to update configuration');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="bg-slate-50 border-b border-slate-100">
          <tr>
            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[25%]">Task</th>
            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[15%]">Provider</th>
            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[25%]">Model</th>
            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[12%]">Temperature</th>
            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[12%]">Max Tokens</th>
            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right w-[11%]">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {taskConfigs.map((config) => {
            const isEditing = editingTaskId === config.id;
            const currentProvider = isEditing ? editData.provider : config.provider;
            const modelsForProvider = getModelsForProvider(currentProvider, false);
            const currentModel = availableModels.find(m => m.id === (isEditing ? editData.model_id : config.model_id));

            return (
              <tr key={config.id} className="hover:bg-slate-50/50 transition-colors">
                {/* Task */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {config.is_vision && (
                      <Eye size={14} className="text-indigo-400 flex-shrink-0" title="Vision task" />
                    )}
                    <div>
                      <div className="text-sm font-medium text-slate-900">{config.task_label}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{config.task_description}</div>
                    </div>
                  </div>
                </td>

                {/* Provider */}
                <td className="px-6 py-4">
                  {isEditing ? (
                    <select
                      value={editData.provider}
                      onChange={(e) => handleProviderChange(e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                    >
                      {PROVIDERS.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${PROVIDER_COLORS[config.provider] || 'bg-slate-400'}`}></span>
                      <span className="text-sm text-slate-700 capitalize">{config.provider}</span>
                    </div>
                  )}
                </td>

                {/* Model */}
                <td className="px-6 py-4">
                  {isEditing ? (
                    <select
                      value={editData.model_id}
                      onChange={(e) => handleModelChange(e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                    >
                      {modelsForProvider.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.display_name} ({m.cost_tier})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-700">{currentModel?.display_name || config.model_id}</span>
                      {currentModel?.cost_tier && (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${COST_TIER_STYLES[currentModel.cost_tier] || ''}`}>
                          {currentModel.cost_tier}
                        </span>
                      )}
                    </div>
                  )}
                </td>

                {/* Temperature */}
                <td className="px-6 py-4">
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="2"
                      value={editData.temperature}
                      onChange={(e) => setEditData(prev => ({ ...prev, temperature: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-2 py-1.5 text-sm border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  ) : (
                    <span className="text-sm font-bold text-slate-900">{config.temperature}</span>
                  )}
                </td>

                {/* Max Tokens */}
                <td className="px-6 py-4">
                  {isEditing ? (
                    <input
                      type="number"
                      step="1024"
                      min="1024"
                      value={editData.max_tokens}
                      onChange={(e) => setEditData(prev => ({ ...prev, max_tokens: parseInt(e.target.value) || 8192 }))}
                      className="w-full px-2 py-1.5 text-sm border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  ) : (
                    <span className="text-sm font-bold text-slate-900">{config.max_tokens?.toLocaleString()}</span>
                  )}
                </td>

                {/* Action */}
                <td className="px-6 py-4 text-right">
                  {isEditing ? (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={handleSave}
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
                      onClick={() => handleEditClick(config)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                      title="Edit"
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
}
