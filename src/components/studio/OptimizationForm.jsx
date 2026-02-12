
import { useState, useRef, useEffect } from 'react';
import { Sparkles, ArrowRight, ChevronDown, ChevronRight, Settings, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import ProductTypeCombobox from './ProductTypeCombobox';

const TONE_OPTIONS = [
  { value: 'auto', label: '✨ Auto-detect from image' },
  { value: 'professional', label: 'Professional' },
  { value: 'funny', label: 'Funny' },
  { value: 'sarcastic', label: 'Sarcastic' },
  { value: 'minimalist', label: 'Minimalist' },
  { value: 'emotional', label: 'Emotional' },
];

const MAX_TAGS_LIMIT = 13;

const CustomInput = ({ isVisible, value, onChange, placeholder }) => (
  <div className={`grid transition-all duration-300 ease-in-out ${isVisible ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0'}`}>
    <div className="overflow-hidden">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-indigo-700 placeholder:text-indigo-300 text-sm"
      />
    </div>
  </div>
);

const Select = ({ label, value, onChange, options, disabled, id, loading }) => (
  <div className="space-y-1">
    <label htmlFor={id} className={`text-sm font-medium ${disabled ? 'text-slate-400' : 'text-slate-700'}`}>{label}</label>
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none appearance-none transition-all
          ${disabled ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'text-slate-700 hover:border-indigo-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'}`}
      >
        <option value="">{loading ? 'Loading...' : `Select ${label}...`}</option>
        <option value="custom" className="font-semibold text-indigo-600">+ Custom / Other...</option>
        {options.length > 0 && <hr />}
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>{opt.name}</option>
        ))}
      </select>
      <ChevronDown size={16} className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${disabled ? 'text-slate-300' : 'text-slate-500'}`} />
    </div>
  </div>
);

const OptimizationForm = ({ onAnalyze, onSaveDraft, isImageSelected, isLoading, onCancel, initialValues }) => {
  // Data State
  const [themes, setThemes] = useState([]);
  const [nichesList, setNichesList] = useState([]);
  const [subNichesList, setSubNichesList] = useState([]);
  const [groupedProductTypes, setGroupedProductTypes] = useState([]);

  // Selection State (IDs or 'custom')
  const [theme, setTheme] = useState("");
  const [niche, setNiche] = useState("");
  const [subNiche, setSubNiche] = useState("");
  const [tone, setTone] = useState('auto');
  const [tagLimit, setTagLimit] = useState(MAX_TAGS_LIMIT);

  // Advanced section toggle
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // Product Type State — name-based with optional ID
  const [productTypeName, setProductTypeName] = useState("");
  const [productTypeId, setProductTypeId] = useState(null);

  // Custom Input State
  const [customTheme, setCustomTheme] = useState("");
  const [customNiche, setCustomNiche] = useState("");
  const [customSubNiche, setCustomSubNiche] = useState("");

  const contextRef = useRef(null);

  // Initial Fetch (Themes, Product Categories+Types, Tones)
  useEffect(() => {
    const fetchData = async () => {
      const { data: themesData } = await supabase.from('themes').select('id, name').order('name');
      if (themesData) setThemes(themesData);

      // Fetch product types grouped by category
      const { data: categoriesData } = await supabase
        .from('product_categories')
        .select('id, name, product_types(id, name)')
        .order('name');
      
      if (categoriesData) {
        const grouped = categoriesData
          .map((cat) => ({
            category: cat.name,
            types: (cat.product_types || []).sort((a, b) => a.name.localeCompare(b.name))
          }))
          .filter((g) => g.types.length > 0);
        
        setGroupedProductTypes(grouped);

        // Default to T-Shirt if available and no value set yet
        if (!productTypeName) {
          for (const group of grouped) {
            const tshirt = group.types.find((t) => t.name.toLowerCase().includes('t-shirt'));
            if (tshirt) {
              setProductTypeName(tshirt.name);
              setProductTypeId(tshirt.id);
              break;
            }
          }
        }
      }

    };
    fetchData();
  }, []);

  // Fetch Niches when Theme changes
  useEffect(() => {
    if (theme && theme !== 'custom') {
      const fetchNiches = async () => {
        const { data } = await supabase.from('niches').select('id, name').eq('theme_id', theme).order('name');
        if (data) setNichesList(data);
      };
      fetchNiches();
    } else {
      setNichesList([]);
    }
  }, [theme]);

  // Fetch Sub-niches when Niche changes
  useEffect(() => {
    if (niche && niche !== 'custom') {
      const fetchSubNiches = async () => {
        const { data } = await supabase.from('sub_niches').select('id, name').eq('niche_id', niche).order('name');
        if (data) setSubNichesList(data);
      };
      fetchSubNiches();
    } else {
      setSubNichesList([]);
    }
  }, [niche]);

  // Initialize from initialValues
  useEffect(() => {
      if (initialValues) {
          setTheme(initialValues.theme_id || (initialValues.custom_theme ? 'custom' : ""));
          setCustomTheme(initialValues.custom_theme || "");
          
          setNiche(initialValues.niche_id || (initialValues.custom_niche ? 'custom' : ""));
          setCustomNiche(initialValues.custom_niche || "");

          setSubNiche(initialValues.sub_niche_id || (initialValues.custom_sub_niche ? 'custom' : ""));
          setCustomSubNiche(initialValues.custom_sub_niche || "");

          // Product Type: hydrate from ID (find name) or from name directly
          if (initialValues.product_type_id) {
            setProductTypeId(initialValues.product_type_id);
            // Name will be resolved once groupedProductTypes loads
            setProductTypeName(initialValues.product_type_name || "");
          } else if (initialValues.product_type_name) {
            // Custom type — no ID
            setProductTypeId(null);
            setProductTypeName(initialValues.product_type_name);
          }

          setTone(initialValues.tone_name ? initialValues.tone_name.toLowerCase() : 'auto');
          setTagLimit(initialValues.tag_count ? Math.min(initialValues.tag_count, MAX_TAGS_LIMIT) : MAX_TAGS_LIMIT);
          
          if (contextRef.current) {
              contextRef.current.value = initialValues.context || "";
          }
      }
  }, [initialValues]);

  // Resolve product type name from ID once grouped data loads
  useEffect(() => {
    if (productTypeId && groupedProductTypes.length > 0 && !productTypeName) {
      for (const group of groupedProductTypes) {
        const found = group.types.find((t) => t.id === productTypeId);
        if (found) {
          setProductTypeName(found.name);
          break;
        }
      }
    }
  }, [productTypeId, groupedProductTypes]);

  // Handlers with Reset Logic
  const handleThemeChange = (newTheme) => {
      setTheme(newTheme);
      if (newTheme !== 'custom') {
          setNiche("");
          setSubNiche("");
          setCustomTheme("");
          setCustomNiche("");
          setCustomSubNiche("");
      }
  };

  const handleNicheChange = (newNiche) => {
      setNiche(newNiche);
      if (newNiche !== 'custom') {
          setSubNiche("");
          setCustomNiche("");
          setCustomSubNiche("");
      }
  };

  const handleSubNicheChange = (newSubNiche) => {
      setSubNiche(newSubNiche);
      if (newSubNiche !== 'custom') {
          setCustomSubNiche("");
      }
  };

  const handleProductTypeChange = (id, name) => {
      setProductTypeId(id);
      setProductTypeName(name);
  };


  const getFormData = () => {
    if (!productTypeName) {
        toast.error("Please select a Product Type.");
        return null;
    }

    // Resolve tone label
    const toneOption = TONE_OPTIONS.find(t => t.value === tone);
    const resolvedToneName = tone === 'auto' ? 'Auto-detect' : (toneOption?.label || 'Auto-detect');
    
    // Find Categorization Names (if not custom)
    const selectedTheme = theme !== 'custom' ? themes.find(t => t.id === theme)?.name : customTheme;
    const selectedNiche = niche !== 'custom' ? nichesList.find(t => t.id === niche)?.name : customNiche;
    const selectedSubNiche = subNiche !== 'custom' ? subNichesList.find(t => t.id === subNiche)?.name : customSubNiche;

    return {
      // Categorization (IDs)
      theme_id: (theme === 'custom' || theme === "") ? null : theme,
      niche_id: (niche === 'custom' || niche === "") ? null : niche,
      sub_niche_id: (subNiche === 'custom' || subNiche === "") ? null : subNiche,
      
      // Categorization (Names/Text for AI)
      theme_name: selectedTheme || "None",
      niche_name: selectedNiche || "None",
      sub_niche_name: selectedSubNiche || "None",

      // Custom Inputs
      custom_theme: theme === 'custom' ? customTheme : null,
      custom_niche: niche === 'custom' ? customNiche : null,
      custom_sub_niche: subNiche === 'custom' ? customSubNiche : null,
      
      // Product Details
      product_type_id: productTypeId,
      product_type_name: productTypeName,
      tone_id: null,
      tone_name: resolvedToneName,
      
      ton_name: resolvedToneName,
      tag_count: Math.min(tagLimit, MAX_TAGS_LIMIT),
      
      context: contextRef.current.value
    };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = getFormData();
    if (data) onAnalyze(data);
  };

  const handleSaveClick = (e) => {
    e.preventDefault();
    const data = getFormData();
    if (data && onSaveDraft) onSaveDraft(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      
      {/* PRODUCT TYPE — Prominent position above categorization */}
      <div>
        <ProductTypeCombobox
          groupedOptions={groupedProductTypes}
          value={productTypeName}
          onChange={handleProductTypeChange}
          disabled={false}
        />
      </div>

      {/* CATEGORIZATION SECTION */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">
          Categorization
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* 1. Theme */}
          <div>
            <Select 
              id="theme" 
              label="Theme" 
              value={theme} 
              onChange={handleThemeChange} 
              options={themes} 
              disabled={false} 
            />
            <CustomInput 
              isVisible={theme === 'custom'} 
              value={customTheme} 
              onChange={setCustomTheme} 
              placeholder="Enter custom theme..." 
            />
          </div>

          {/* 2. Niche */}
          <div>
            <Select 
              id="niche" 
              label="Niche" 
              value={niche} 
              onChange={handleNicheChange} 
              options={nichesList} 
              disabled={!theme || (theme === 'custom' && !customTheme)}
            />
             <CustomInput 
              isVisible={niche === 'custom'} 
              value={customNiche} 
              onChange={setCustomNiche} 
              placeholder="Enter custom niche..." 
            />
          </div>

          {/* 3. Sub-niche */}
          <div>
            <Select 
              id="subniche" 
              label="Sub-niche" 
              value={subNiche} 
              onChange={handleSubNicheChange} 
              options={subNichesList} 
              disabled={!niche || (niche === 'custom' && !customNiche)}
            />
             <CustomInput 
              isVisible={subNiche === 'custom'} 
              value={customSubNiche} 
              onChange={setCustomSubNiche} 
              placeholder="Enter custom sub-niche..." 
            />
          </div>

        </div>
      </div>

      {/* DETAILS SECTION */}
      <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">
            Details
          </h3>
          <div className="space-y-1">
              <label htmlFor="context" className="text-sm font-medium text-slate-700">Instructions / Details</label>
              <textarea
                ref={contextRef}
                id="context"
                rows="3"
                placeholder="ex: Witty and modern tone, for cat lovers..."
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 resize-none"
              />
          </div>
      </div>

      {/* ADVANCED SEO SETTINGS — Collapsible */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
          <button
            type="button"
            onClick={() => setIsAdvancedOpen(prev => !prev)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Settings size={14} className="text-slate-400" />
              Advanced SEO Settings
            </span>
            <ChevronRight
              size={16}
              className={`text-slate-400 transition-transform duration-200 ${isAdvancedOpen ? 'rotate-90' : ''}`}
            />
          </button>

          <div
            className={`grid transition-all duration-300 ease-in-out ${isAdvancedOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
          >
            <div className="overflow-hidden">
              <div className="px-4 pb-4 pt-1 space-y-4 border-t border-slate-200">

                {/* Tone Override */}
                <div className="space-y-1">
                  <label htmlFor="tone" className="text-sm font-medium text-slate-700">Tone Override</label>
                  <p className="text-xs text-slate-400">Leave on auto to let AI detect the best tone from your image.</p>
                  <div className="relative">
                    <select
                      id="tone"
                      value={tone}
                      onChange={(e) => setTone(e.target.value)}
                      className={`w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all appearance-none text-sm
                        ${tone === 'auto' ? 'text-slate-400 italic' : 'text-slate-700'}`}
                    >
                      {TONE_OPTIONS.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Max Tags — Locked */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="tagLimit" className="text-sm font-medium text-slate-700">Max Tags</label>
                    <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                      <Lock size={10} />
                      Standard Plan: {MAX_TAGS_LIMIT} tags
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      id="tagLimit"
                      min="5"
                      max={MAX_TAGS_LIMIT}
                      value={tagLimit}
                      onChange={(e) => setTagLimit(parseInt(e.target.value))}
                      className="flex-1 h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-600"
                    />
                    <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg min-w-[44px] text-center">
                      {tagLimit}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">Upgrade to unlock up to 25 tags per listing.</p>
                </div>

              </div>
            </div>
          </div>
      </div>

      <div className="flex gap-4">
          {onCancel && (
             <button
                type="button"
                onClick={onCancel}
                disabled={isLoading}
                className="px-8 py-4 rounded-xl font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors border border-slate-200 hover:border-slate-300"
             >
                Close settings
             </button>
          )}

          {onSaveDraft && (
             <button
                type="button"
                onClick={handleSaveClick}
                disabled={isLoading || !isImageSelected}
                className={`px-6 py-4 rounded-xl font-bold transition-all border shadow-sm
                    ${!isImageSelected || isLoading
                        ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                        : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300'
                    }`}
             >
                Save listing
             </button>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`flex-1 py-4 rounded-xl font-bold shadow-lg transition-all transform flex items-center justify-center gap-2
            ${isLoading 
                ? 'bg-indigo-400 cursor-not-allowed shadow-none translate-y-0' 
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-0.5'
            }`}
          >
            <Sparkles size={20} className={isLoading ? 'animate-spin' : ''} />
            {isLoading === 'uploading' && 'UPLOADING...'}
            {isLoading === 'saving' && 'SAVING...'}
            {isLoading === 'triggering' && 'STARTING...'}
            {isLoading === true && 'ANALYZING...'} 
            {!isLoading && 'ANALYZE (1 Credit)'}
            {!isLoading && <span className="text-indigo-200">🚀</span>}
          </button>
      </div>

    </form>
  );
};

export default OptimizationForm;
