
import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Sparkles, Package, Settings, ChevronRight, ChevronDown, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import ProductTypeCombobox from './ProductTypeCombobox';
// import SmartNicheAutocomplete from './SmartNicheAutocomplete';

const TONE_OPTIONS = [
  { value: 'auto', label: '✨ Auto-detect from image' },
  { value: 'professional', label: 'Professional' },
  { value: 'funny', label: 'Funny' },
  { value: 'sarcastic', label: 'Sarcastic' },
  { value: 'minimalist', label: 'Minimalist' },
  { value: 'emotional', label: 'Emotional' },
];

const MAX_TAGS_LIMIT = 13;

const OptimizationForm = forwardRef(({ onAnalyze, onSaveDraft, isImageSelected, isImageAnalysed, isLoading, onCancel, initialValues }, ref) => {

  // Data State
  const [groupedProductTypes, setGroupedProductTypes] = useState([]);

  // Selection State
  const [tone, setTone] = useState('auto');
  const [tagLimit, setTagLimit] = useState(MAX_TAGS_LIMIT);
  const [seoMode, setSeoMode] = useState('balanced');
  
  // Niche Selection State
  const [themeName, setThemeName] = useState("");
  const [nicheName, setNicheName] = useState("");
  const [subNicheName, setSubNicheName] = useState("");

  // Advanced section toggle
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // Product Type State — name-based with optional ID
  const [productTypeName, setProductTypeName] = useState("");
  const [productTypeId, setProductTypeId] = useState(null);

  const contextRef = useRef(null);

  // Initial Fetch (Product Categories+Types only)
  useEffect(() => {
    const fetchData = async () => {
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


      }

    };
    fetchData();
  }, []); // Run once on mount

  // Initialize from initialValues
  useEffect(() => {
      if (initialValues) {
          // Hydrate Niche Selection - Strings Only
          setThemeName(initialValues.theme_name || initialValues.theme || initialValues.custom_theme || "");
          setNicheName(initialValues.niche_name || initialValues.niche || initialValues.custom_niche || "");
          setSubNicheName(initialValues.sub_niche_name || initialValues.sub_niche || initialValues.custom_sub_niche || "");
          
          // Product Type: hydrate from ID (find name) or from custom text
          if (initialValues.product_type_text) {
            // Custom type — use the stored text
            setProductTypeId(null);
            setProductTypeName(initialValues.product_type_text);
          } else if (initialValues.product_type_id) {
            setProductTypeId(initialValues.product_type_id);
            setProductTypeName(initialValues.product_type_name || "");
          } else if (initialValues.product_type_name) {
            setProductTypeId(null);
            setProductTypeName(initialValues.product_type_name);
          }

          setTone(initialValues.tone_name ? initialValues.tone_name.toLowerCase() : 'auto');
          setTagLimit(initialValues.tag_count ? Math.min(initialValues.tag_count, MAX_TAGS_LIMIT) : MAX_TAGS_LIMIT);
          setSeoMode(initialValues.seo_mode || 'balanced');
          
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

  const handleProductTypeChange = (id, name) => {
      setProductTypeId(id);
      setProductTypeName(name);
  };

  const getFormData = () => {
    if (!productTypeName) {
        toast.error("Please select a Product Type.");
        return null;
    }

    if (!themeName && !nicheName && !subNicheName) {
         toast.error("Please enter at least one categorization field (Theme, Niche, or Sub-niche).");
         return null;
    }

    // Resolve tone label
    const toneOption = TONE_OPTIONS.find(t => t.value === tone);
    const resolvedToneName = tone === 'auto' ? 'Auto-detect' : (toneOption?.label || 'Auto-detect');
    
    return {
      // Categorization (Text for AI & DB)
      theme_name: themeName,
      niche_name: nicheName,
      sub_niche_name: subNicheName,
      
      // Legacy ID support (sending explicit nulls to avoid confusion)
      theme_id: null,
      niche_id: null,
      sub_niche_id: null,

      // Custom Inputs (legacy support - map directly to our new strings)
      custom_theme: themeName, 
      custom_niche: nicheName,
      custom_sub_niche: subNicheName,
      
      // Product Details
      product_type_id: productTypeId,
      product_type_name: productTypeName,
      product_type_text: productTypeId ? null : productTypeName,
      tone_id: null,
      tone_name: resolvedToneName,
      
      ton_name: resolvedToneName, 
      tag_count: Math.min(tagLimit, MAX_TAGS_LIMIT),
      seo_mode: seoMode,
      
      context: contextRef.current.value
    };
  };

  // Expose state to parent via ref
  useImperativeHandle(ref, () => ({
      getCurrentState: () => {
          // Resolve tone label
          const toneOption = TONE_OPTIONS.find(t => t.value === tone);
          const resolvedToneName = tone === 'auto' ? 'Auto-detect' : (toneOption?.label || 'Auto-detect');

          return {
              product_type_id: productTypeId,
              product_type_name: productTypeName,
              product_type_text: productTypeId ? null : productTypeName,
              tone_name: resolvedToneName,
              context: contextRef.current?.value || "",
              
              theme_name: themeName,
              niche_name: nicheName,
              niche_name: nicheName,
              sub_niche_name: subNicheName,
              seo_mode: seoMode
          };
      }
  }));

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
    <form onSubmit={handleSubmit} className="space-y-3">
      
      {/* PRODUCT DETAILS BOX */}
      <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
        <div className="flex items-center gap-2 mb-4">
            <Package size={16} className="text-indigo-500" />
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Product Details</h3>
        </div>

        <div className="space-y-3">
            {/* PRODUCT TYPE */}
            <div>
                <ProductTypeCombobox
                groupedOptions={groupedProductTypes}
                value={productTypeName}
                onChange={handleProductTypeChange}
                disabled={false}
                />
            </div>

            {/* CATEGORIZATION (TEXT INPUTS) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {/* THEME */}
                <div className="space-y-1">
                    <label htmlFor="theme" className="text-sm font-medium text-slate-700">Theme</label>
                    <input
                        type="text"
                        id="theme"
                        value={themeName}
                        onChange={(e) => setThemeName(e.target.value)}
                        placeholder="e.g. Occasions"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 text-sm"
                    />
                </div>

                {/* NICHE */}
                <div className="space-y-1">
                    <label htmlFor="niche" className="text-sm font-medium text-slate-700">Niche</label>
                    <input
                        type="text"
                        id="niche"
                        value={nicheName}
                        onChange={(e) => setNicheName(e.target.value)}
                        placeholder="e.g. Wedding"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 text-sm"
                    />
                </div>

                {/* SUB-NICHE */}
                <div className="space-y-1">
                    <label htmlFor="subNiche" className="text-sm font-medium text-slate-700">Sub-niche</label>
                    <input
                        type="text"
                        id="subNiche"
                        value={subNicheName}
                        onChange={(e) => setSubNicheName(e.target.value)}
                        placeholder="e.g. Bridesmaid Gift"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 text-sm"
                    />
                </div>
            </div>

            {/* DETAILS SECTION */}
            <div className="space-y-1">
                <label htmlFor="context" className="text-sm font-medium text-slate-700">Instructions / Details</label>
                <textarea
                    ref={contextRef}
                    id="context"
                    rows="3"
                    placeholder="ex: Witty and modern tone, for cat lovers..."
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 resize-none text-sm"
                    defaultValue={initialValues?.context || ""}
                />
            </div>
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

      {/* SEO Strategy Selector Removed per User Request */}

      <div className="flex gap-4">




          <button
            type="submit"
            disabled={isLoading || !isImageSelected || !isImageAnalysed || !productTypeName}
            className={`flex-1 py-3 rounded-xl font-bold shadow-lg transition-all transform flex items-center justify-center gap-2
            ${isLoading || !isImageSelected || !isImageAnalysed || !productTypeName
                ? 'bg-indigo-400 cursor-not-allowed shadow-none translate-y-0 opacity-70' 
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-0.5'
            }`}
          >
            <Sparkles size={20} className={isLoading ? 'animate-spin' : ''} />
            {isLoading === 'uploading' && 'UPLOADING...'}
            {isLoading === 'saving' && 'SAVING...'}
            {isLoading === 'triggering' && 'STARTING...'}
            {isLoading === true && 'ANALYZING...'} 
            {!isLoading && (
                !isImageAnalysed ? 'GENERATE SEO DATA' :
                !productTypeName ? 'SELECT PRODUCT TYPE' :
                'ANALYZE (1 Credit)'
            )}
            {!isLoading && isImageAnalysed && productTypeName && <span className="text-indigo-200">🚀</span>}
          </button>
      </div>

    </form>
  );
});

export default OptimizationForm;
