import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import {
  BarChart3,
  Users,
  ShoppingCart,
  Target,
  DollarSign,
  Crown,
  Leaf,
  Flame,
  Award,
  Settings,
  Save,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

export default function UserSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Data catalogs
  const [constants, setConstants] = useState([]);
  
  // Current Live Values (from view)
  const [liveValues, setLiveValues] = useState(null);
  
  // Local state for the form
  const [settings, setSettings] = useState({
    weight_volume_id: null,
    weight_competition_id: null,
    weight_transactional_id: null,
    weight_niche_id: null,
    weight_cpc_id: null,
    
    threshold_evergreen_id: null,
    threshold_trending_id: null,
    threshold_promising_id: null,
    
    // Sub-parameters for Smart Badges
    evergreen_stability_ratio_id: null,
    evergreen_min_id: null,
    evergreen_avg_volume_id: null,
    promising_min_score_id: null,
    promising_competition_id: null,
    trending_dropping_id: null,
    trending_current_month_min_id: null,
    
    ai_selection_count: 13,
    working_pool_count: 40,
    concept_diversity_limit: 3
  });

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch system constants catalog
      const { data: constantsData, error: constantsError } = await supabase
        .from('system_seo_constants')
        .select('*')
        .order('value', { ascending: true }); // Order by value so labels show Low -> High
        
      if (constantsError) throw constantsError;
      setConstants(constantsData || []);

      // 2. Fetch user settings
      const { data: userData, error: userError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
      if (userError && userError.code !== 'PGRST116') { // PGRST116 is 'not found'
        throw userError;
      }
      
      if (userData) {
        setSettings(prev => ({
          ...prev,
          ...userData
        }));
      }

      // 3. Fetch live values preview from the view
      await fetchLiveValues();
      
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveValues = async () => {
    try {
      const { data, error } = await supabase
        .from('v_user_seo_active_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
      if (error && error.code !== 'PGRST116') throw error;
      setLiveValues(data || null);
    } catch (error) {
      console.error('Error fetching live values preview:', error);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Upsert user settings
      const payload = {
        user_id: user.id,
        ...settings,
        updated_at: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('user_settings')
        .upsert(payload, { onConflict: 'user_id' });
        
      if (error) throw error;
      
      toast.success('Configuration saved successfully');
      
      // Refresh live values to show the newly resolved floats
      await fetchLiveValues();
      
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleMultiSettingChange = (paramKey, mainSettingKey, opt) => {
    const cleanLabel = (opt.label || '').trim();
    
    // Reverse lookup: map the subkey used for UI rendering back to its master category key
    const reverseCategoryMap = {
      'evergreen_stability_ratio': 'evergreen',
      'promising_min_score': 'promising',
      'trending_dropping': 'trending'
    };
    
    const masterKey = reverseCategoryMap[paramKey] || paramKey;

    // Define the sub-keys required for each master parameter
    const subKeyMap = {
      'evergreen': ['evergreen_stability_ratio', 'evergreen_min', 'evergreen_avg_volume'],
      'promising': ['promising_min_score', 'promising_competition'],
      'trending': ['trending_dropping', 'trending_current_month_min']
    };

    const subKeys = subKeyMap[masterKey];

    if (!subKeys) {
      // Fallback for simple 1:1 settings (e.g. Strategy Weights) if this is called
      handleSettingChange(mainSettingKey, opt.id);
      return;
    }

    // Find the corresponding constants for this badge sensitivity
    const updates = { [mainSettingKey]: opt.id };
    
    subKeys.forEach(subKey => {
      // Find constant where param_key matches the subKey AND the label matches the selected label
      const matchedConstant = constants.find(c => 
        c.param_key === subKey && (c.label || '').trim() === cleanLabel
      );
      
      if (matchedConstant) {
        updates[`${subKey}_id`] = matchedConstant.id;
      } else {
        console.warn(`Could not find matching constant for sub-key: ${subKey} with label: ${cleanLabel}`);
      }
    });

    setSettings(prev => ({ ...prev, ...updates }));
  };

  // Helper to render Segmented Controls
  const renderSegmentedControl = (paramKey, settingKey, Icon, label, description) => {
    const options = constants.filter(c => c.param_key === paramKey);
    
    if (options.length === 0) return null; // Fallback if no data
    
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm mb-4 transition-all hover:border-indigo-100 hover:shadow-md">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-50 rounded-lg text-slate-500">
              <Icon size={20} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{description}</p>
            </div>
          </div>
        </div>
        
        <div className="flex bg-slate-100/50 p-1 rounded-lg">
          {options.map((opt) => {
            const isActive = settings[settingKey] === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => {
                  if (['evergreen_stability_ratio', 'trending_dropping', 'promising_min_score'].includes(paramKey)) {
                    handleMultiSettingChange(paramKey, settingKey, opt);
                  } else {
                    handleSettingChange(settingKey, opt.id);
                  }
                }}
                className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-all ${
                  isActive
                    ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-slate-50">
          <Loader2 className="animate-spin text-indigo-600 h-8 w-8" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Settings className="text-indigo-600" size={24} />
                Personal SEO Optimizer
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Customize your underlying SEO scoring algorithms and sensitivity thresholds.
              </p>
            </div>
            
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm disabled:opacity-50"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Save Configuration
            </button>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            
            {/* MAIN CONTENT PORTION */}
            <div className="flex-1 space-y-6">
              
              {/* SECTION A: Strategy Weights */}
              <section>
                <div className="mb-4">
                  <h2 className="text-lg font-bold text-slate-900">A. Strategy Weights</h2>
                  <p className="text-sm text-slate-500">Tune the engine's core algorithm multipliers.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
                  {renderSegmentedControl('volume', 'weight_volume_id', BarChart3, 'Market Reach (Volume)', 'Impacts scoring based on search scale.')}
                  {renderSegmentedControl('competition', 'weight_competition_id', Users, 'Ranking Ease (Competition)', 'Rewards keywords with fewer competing listings.')}
                  {renderSegmentedControl('transactional', 'weight_transactional_id', ShoppingCart, 'Buyer Intent (Transactional)', 'Focuses on terms leading to direct sales.')}
                  {renderSegmentedControl('niche', 'weight_niche_id', Target, 'Niche Specificity', 'Rewards highly targeted, long-tail descriptors.')}
                  {renderSegmentedControl('cpc', 'weight_cpc_id', DollarSign, 'Market Value (CPC)', 'Measures the monetary value of a click.')}
                </div>
              </section>

              {/* SECTION B: Smart Badge Sensitivity */}
              <section className="mt-8">
                <div className="mb-4">
                  <h2 className="text-lg font-bold text-slate-900">B. Smart Badge Sensitivity</h2>
                  <p className="text-sm text-slate-500">Define how strictly the system grants visual badges.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
                  {renderSegmentedControl('evergreen_stability_ratio', 'threshold_evergreen_id', Leaf, 'Evergreen Stability', 'Threshold for granting the Evergreen badge.')}
                  {renderSegmentedControl('trending_dropping', 'threshold_trending_id', Flame, 'Trending Growth', 'Threshold for detecting rapid, recent growth.')}
                  {renderSegmentedControl('promising_min_score', 'threshold_promising_id', Award, 'Promising Ratio', 'Threshold for high-opportunity, low-competition tags.')}
                </div>
              </section>

              {/* SECTION C: General Analysis Settings */}
              <section className="mt-8">
                <div className="mb-4 flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    C. General Analysis Settings
                    <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide flex items-center gap-1">
                      <Crown size={10} /> Premium
                    </span>
                  </h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* AI Selection Count */}
                  <div className="bg-white rounded-xl border border-amber-200/60 p-5 shadow-sm">
                    <label className="block text-sm font-semibold text-slate-900 mb-1">AI Selection Count</label>
                    <p className="text-xs text-slate-500 mb-3 line-clamp-2">Keywords to select for AI analysis (default 13).</p>
                    <input 
                      type="number" 
                      min="1"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors"
                      value={settings.ai_selection_count || ''}
                      onChange={(e) => handleSettingChange('ai_selection_count', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  
                  {/* Working Pool Size */}
                  <div className="bg-white rounded-xl border border-amber-200/60 p-5 shadow-sm">
                    <label className="block text-sm font-semibold text-slate-900 mb-1">Working Pool Size</label>
                    <p className="text-xs text-slate-500 mb-3 line-clamp-2">Number of keywords in the workspace (default ~25).</p>
                    <input 
                      type="number"
                      min="10"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors"
                      value={settings.working_pool_count || ''}
                      onChange={(e) => handleSettingChange('working_pool_count', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  
                  {/* Concept Diversity */}
                  <div className="bg-white rounded-xl border border-amber-200/60 p-5 shadow-sm">
                    <label className="block text-sm font-semibold text-slate-900 mb-1">Concept Diversity</label>
                    <p className="text-xs text-slate-500 mb-3 line-clamp-2">Max keywords per initial word concept (default 2).</p>
                    <input 
                      type="number" 
                      min="1"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors"
                      value={settings.concept_diversity_limit || ''}
                      onChange={(e) => handleSettingChange('concept_diversity_limit', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </section>

            </div>

            {/* SIDEBAR PORTION */}
            <div className="lg:w-80 flex-shrink-0">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm sticky top-6">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
                  <h3 className="font-semibold text-slate-900">Current Live Values</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    The active numeric values powering your algorithm. Click 'Save' to update.
                  </p>
                </div>
                
                <div className="p-5 space-y-4">
                  {liveValues ? (
                    <>
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Weights</h4>
                        {[
                          { label: 'volume', key: 'param_volume' },
                          { label: 'competition', key: 'param_competition' },
                          { label: 'transaction', key: 'param_transaction' },
                          { label: 'niche', key: 'param_niche' },
                          { label: 'cpc', key: 'param_cpc' }
                        ].map(({ label, key }) => (
                          <div key={key} className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-lg">
                            <span className="text-xs text-slate-600 capitalize">{label}</span>
                            <span className="text-xs font-mono font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                              {liveValues[key] !== undefined && liveValues[key] !== null ? liveValues[key] : '-'}
                            </span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="pt-2 space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Thresholds</h4>
                        {['evergreen', 'trending', 'promising'].map(key => (
                          <div key={key} className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-lg">
                            <span className="text-xs text-slate-600 capitalize">{key}</span>
                            <span className="text-xs font-mono font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                              {liveValues[`${key}_threshold`] !== undefined && liveValues[`${key}_threshold`] !== null ? liveValues[`${key}_threshold`] : '-'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-6 text-slate-400 text-sm">
                      No live configuration found. Saving your settings will initialize these values.
                    </div>
                  )}
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </Layout>
  );
}
