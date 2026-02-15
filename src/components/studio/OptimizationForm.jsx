
import { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Package, Settings, ChevronRight, ChevronDown, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import ProductTypeCombobox from './ProductTypeCombobox';
import SmartNicheAutocomplete from './SmartNicheAutocomplete';

const TONE_OPTIONS = [
  { value: 'auto', label: '✨ Auto-detect from image' },
  { value: 'professional', label: 'Professional' },
  { value: 'funny', label: 'Funny' },
  { value: 'sarcastic', label: 'Sarcastic' },
  { value: 'minimalist', label: 'Minimalist' },
  { value: 'emotional', label: 'Emotional' },
];

const MAX_TAGS_LIMIT = 13;

const OptimizationForm = ({ onAnalyze, onSaveDraft, isImageSelected, isImageAnalysed, isLoading, onCancel, initialValues }) => {

  // Data State
  const [groupedProductTypes, setGroupedProductTypes] = useState([]);

  // Selection State
  const [tone, setTone] = useState('auto');
  const [tagLimit, setTagLimit] = useState(MAX_TAGS_LIMIT);
  
  // Smart Niche Selection State (Flat Object)
  // Expected structure: { id, name, theme_name, niche_name, is_custom }
  const [nicheSelection, setNicheSelection] = useState(null);

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
  }, []); // Run once on mount

  // Initialize from initialValues
  useEffect(() => {
      if (initialValues) {
          // Hydrate Niche Selection
          // If we have IDs or Names
          if (initialValues.sub_niche_name || initialValues.custom_sub_niche) {
              setNicheSelection({
                  id: initialValues.sub_niche_id || null,
                  name: initialValues.sub_niche_name || initialValues.custom_sub_niche,
                  theme_name: initialValues.theme_name || initialValues.custom_theme || 'Unknown Theme',
                  niche_name: initialValues.niche_name || initialValues.custom_niche || 'Unknown Niche',
                  is_custom: !initialValues.sub_niche_id
              });
          }
          
          // Product Type: hydrate from ID (find name) or from name directly
          if (initialValues.product_type_id) {
            setProductTypeId(initialValues.product_type_id);
            setProductTypeName(initialValues.product_type_name || "");
          } else if (initialValues.product_type_name) {
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

  const handleProductTypeChange = (id, name) => {
      setProductTypeId(id);
      setProductTypeName(name);
  };

  const getFormData = () => {
    if (!productTypeName) {
        toast.error("Please select a Product Type.");
        return null;
    }

    if (!nicheSelection || !nicheSelection.name) {
         toast.error("Please select a target Niche.");
         return null;
    }

    // Resolve tone label
    const toneOption = TONE_OPTIONS.find(t => t.value === tone);
    const resolvedToneName = tone === 'auto' ? 'Auto-detect' : (toneOption?.label || 'Auto-detect');
    
    // Categorization from unified state
    const { id, name, type, theme_name, niche_name, theme_id, niche_id, is_custom } = nicheSelection;
    
    // Default nulls
    let final_theme_id = null;
    let final_niche_id = null;
    let final_sub_niche_id = null;

    let final_theme_name = "None";
    let final_niche_name = "None";
    let final_sub_niche_name = "None";

    // Logic based on Type
    if (is_custom) {
        // Custom niche: sub_niche_id must stay null (FK constraint to sub_niches table)
        // Custom data is persisted via the custom_listing JSON field
        final_theme_name = "Custom Theme";
        final_niche_name = "Custom Niche";
        final_sub_niche_name = name;
    } else {
        if (type === 'Theme') {
            final_theme_id = id;
            final_theme_name = name;
        } else if (type === 'Niche') {
            final_theme_id = theme_id;
            final_theme_name = theme_name;
            final_niche_id = id; // The selected item ID is the Niche ID
            final_niche_name = name;
        } else if (type === 'Sub-niche') {
            final_theme_id = theme_id;
            final_theme_name = theme_name;
            final_niche_id = niche_id;
            final_niche_name = niche_name;
            final_sub_niche_id = id; // The selected item ID is the Sub-niche ID
            final_sub_niche_name = name;
        }
    }

    return {
      // Categorization (IDs)
      theme_id: final_theme_id,
      niche_id: final_niche_id,
      sub_niche_id: final_sub_niche_id,
      
      // Categorization (Names/Text for AI)
      theme_name: final_theme_name,
      niche_name: final_niche_name,
      sub_niche_name: final_sub_niche_name,

      // Custom Inputs (legacy support)
      custom_theme: is_custom ? final_theme_name : null, 
      custom_niche: is_custom ? final_niche_name : null,
      custom_sub_niche: is_custom ? final_sub_niche_name : null,
      
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
      
      {/* PRODUCT DETAILS BOX */}
      <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100">
        <div className="flex items-center gap-2 mb-4">
            <Package size={16} className="text-indigo-500" />
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Product Details</h3>
        </div>

        <div className="space-y-6">
            {/* PRODUCT TYPE */}
            <div>
                <ProductTypeCombobox
                groupedOptions={groupedProductTypes}
                value={productTypeName}
                onChange={handleProductTypeChange}
                disabled={false}
                />
            </div>

            {/* NICHE SELECTION (NEW SMART AUTOCOMPLETE) */}
            <div>
                <SmartNicheAutocomplete 
                    label="Target Niche (Sub-niche)"
                    value={nicheSelection}
                    onChange={setNicheSelection}
                />
                <p className="text-xs text-slate-400 mt-1.5 ml-1">
                    Search for specific niches like "Cat Lover" or "Minimalist Decor".
                </p>
            </div>

            {/* DETAILS SECTION */}
            <div className="space-y-1">
                <label htmlFor="context" className="text-sm font-medium text-slate-700">Instructions / Details</label>
                <textarea
                    ref={contextRef}
                    id="context"
                    rows="3"
                    placeholder="ex: Witty and modern tone, for cat lovers..."
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 resize-none"
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

      <div className="flex gap-4">


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
            disabled={isLoading || !isImageSelected || !isImageAnalysed || !productTypeName}
            className={`flex-1 py-4 rounded-xl font-bold shadow-lg transition-all transform flex items-center justify-center gap-2
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
};

export default OptimizationForm;
