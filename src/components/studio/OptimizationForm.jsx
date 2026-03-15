
import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Sparkles, Package, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import ProductTypeCombobox from './ProductTypeCombobox';
// import SmartNicheAutocomplete from './SmartNicheAutocomplete';

const MAX_TAGS_LIMIT = 13;

const OptimizationForm = forwardRef(({ onAnalyze, onSaveDraft, isImageSelected, isImageAnalysed, isLoading, onCancel, initialValues }, ref) => {

  const { user } = useAuth();
  // Data State
  const [groupedProductTypes, setGroupedProductTypes] = useState([]);

  // Selection State
  const [seoMode, setSeoMode] = useState('balanced');
  
  // Niche Selection State
  const [themeName, setThemeName] = useState("");
  const [themeId, setThemeId] = useState("");
  
  const [nicheName, setNicheName] = useState("");
  const [nicheId, setNicheId] = useState("");
  
  const [subNicheName, setSubNicheName] = useState("");

  // System/Custom Taxonomy State
  const [themes, setThemes] = useState([]);
  const [niches, setNiches] = useState([]);


  // Product Type State — name-based with optional ID
  const [productTypeName, setProductTypeName] = useState("");
  const [productTypeId, setProductTypeId] = useState(null);

  const contextRef = useRef(null);

  // Initial Fetch (Product Types and System Taxonomy)
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      // Fetch product types and combined taxonomy concurrently
      const [categoriesRes, customTypesRes, themesRes, nichesRes] = await Promise.all([
        supabase.from('product_categories').select('id, name, product_types(id, name)').order('name'),
        supabase.from('user_custom_product_types').select('id, name').eq('user_id', user.id).order('name'),
        supabase.from('v_combined_themes')
            .select('id, name, description, origin, user_id, is_active')
            .or(`user_id.eq.${user.id},origin.eq.system`)
            .eq('is_active', true)
            .order('origin', { ascending: false }) // 'custom' comes before 'system'
            .order('name', { ascending: true }),
        supabase.from('v_combined_niches')
            .select('id, name, description, origin, user_id, is_active')
            .or(`user_id.eq.${user.id},origin.eq.system`)
            .eq('is_active', true)
            .order('origin', { ascending: false }) // 'custom' comes before 'system'
            .order('name', { ascending: true })
      ]);
      
      let allGrouped = [];

      // Maps custom types first for visibility
      if (customTypesRes.data && customTypesRes.data.length > 0) {
        allGrouped.push({
          category: 'My Custom Types',
          isCustomGroup: true,
          types: customTypesRes.data.map(t => ({ ...t, origin: 'custom' }))
        });
      }

      if (categoriesRes.data) {
        const systemGrouped = categoriesRes.data
          .map((cat) => ({
            category: cat.name,
            isCustomGroup: false,
            types: (cat.product_types || [])
              .map(t => ({ ...t, origin: 'system' }))
              .sort((a, b) => a.name.localeCompare(b.name))
          }))
          .filter((g) => g.types.length > 0);
        
        allGrouped = [...allGrouped, ...systemGrouped];
      }

      setGroupedProductTypes(allGrouped);

      if (themesRes.data) setThemes(themesRes.data);
      if (nichesRes.data) setNiches(nichesRes.data);

    };
    fetchData();
  }, [user]); // Run when user is available

  // Initialize from initialValues
  useEffect(() => {
      if (initialValues) {
          // Hydrate Niche Selection - Strings Only
          setThemeName(initialValues.theme_name || initialValues.theme || initialValues.custom_theme || "");
          setNicheName(initialValues.niche_name || initialValues.niche || initialValues.custom_niche || "");
          setSubNicheName(initialValues.sub_niche_name || initialValues.sub_niche || initialValues.custom_sub_niche || "");
          
          // Product Type: hydrate from ID (find name) or fallback legacy text
          if (initialValues.product_type_id) {
            setProductTypeId(initialValues.product_type_id);
            setProductTypeName(initialValues.product_type_name || "");
          } else if (initialValues.product_type_text || initialValues.product_type_name) {
            setProductTypeId(null);
            setProductTypeName(initialValues.product_type_text || initialValues.product_type_name);
          }

          setSeoMode(initialValues.seo_mode || 'balanced');
          
          if (contextRef.current) {
              contextRef.current.value = initialValues.context || "";
          }
      }
  }, [initialValues]);

  // Resolve product type name from ID once data loads
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

  // Resolve dynamic IDs when name or lists change (for backwards compat and initial load)
  useEffect(() => {
     if (themeName && themes.length > 0 && !themeId) {
         const found = themes.find(t => t.name === themeName);
         if (found) setThemeId(found.id);
     }
  }, [themeName, themes, themeId]);
  
  useEffect(() => {
     if (nicheName && niches.length > 0 && !nicheId) {
         const found = niches.find(n => n.name === nicheName);
         if (found) setNicheId(found.id);
     }
  }, [nicheName, niches, nicheId]);

  const handleProductTypeChange = (id, name) => {
      setProductTypeId(id);
      setProductTypeName(name);
  };
  
  const handleThemeChange = (e) => {
      const selectedId = e.target.value;
      setThemeId(selectedId);
      const themeObj = themes.find(t => t.id === selectedId);
      setThemeName(themeObj ? themeObj.name : selectedId); // fallback back to string if it's a legacy saved value
  };

  const handleNicheChange = (e) => {
      const selectedId = e.target.value;
      setNicheId(selectedId);
      const nicheObj = niches.find(n => n.id === selectedId);
      setNicheName(nicheObj ? nicheObj.name : selectedId); // fallback back to string if it's a legacy saved value
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

    const resolvedToneName = 'Auto-detect';
    
    return {
      // Categorization (Text for AI & DB)
      theme_name: themeName,
      niche_name: nicheName,
      sub_niche_name: subNicheName,
      
      // Custom text aliases (for backwards compat in formatCategorizationPayload)
      custom_theme: themeName, 
      custom_niche: nicheName,
      custom_sub_niche: subNicheName,
      
      // Product Details
      product_type_id: productTypeId,
      product_type_name: productTypeName,
      tone_id: null,
      tone_name: resolvedToneName,
      
      ton_name: resolvedToneName, 
      tag_count: MAX_TAGS_LIMIT,
      seo_mode: seoMode,
      
      context: contextRef.current.value
    };
  };

  // Expose state to parent via ref
  useImperativeHandle(ref, () => ({
      getCurrentState: () => {
          const resolvedToneName = 'Auto-detect';

          return {
              product_type_id: productTypeId,
              product_type_name: productTypeName,
              tone_name: resolvedToneName,
              context: contextRef.current?.value || "",
              
              theme_name: themeName,
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

            {/* CATEGORIZATION */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {/* THEME (Dropdown) */}
                <div className="space-y-1 relative">
                    <label htmlFor="theme" className="text-sm font-medium text-slate-700">Theme</label>
                    <div className="relative">
                        <select
                            id="theme"
                            value={themeId || themeName} // fallback to text for custom history
                            onChange={handleThemeChange}
                            className={`w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all appearance-none text-sm ${!themeId && !themeName ? 'text-slate-400' : 'text-slate-700'}`}
                        >
                            <option value="">Select a Theme...</option>
                            
                            {/* Group: User Custom */}
                            {themes.some(t => t.origin === 'custom') && (
                                <optgroup label="My Themes">
                                    {themes.filter(t => t.origin === 'custom').map(t => (
                                        <option key={t.id} value={t.id} title={t.description || ''}>
                                            {t.name}
                                        </option>
                                    ))}
                                </optgroup>
                            )}

                            {/* Group: PennySEO Themes */}
                            {themes.some(t => t.origin === 'system') && (
                                <optgroup label="PennySEO Themes">
                                    {themes.filter(t => t.origin === 'system').map(t => (
                                        <option key={t.id} value={t.id} title={t.description || ''}>
                                            {t.name}
                                        </option>
                                    ))}
                                </optgroup>
                            )}

                            {/* Allow preserving a custom value not in the list (e.g., from history) */}
                            {themeName && !themes.some(t => t.name === themeName) && (
                                <option value={themeName}>{themeName}</option>
                            )}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                {/* NICHE (Dropdown) */}
                <div className="space-y-1 relative">
                    <label htmlFor="niche" className="text-sm font-medium text-slate-700">Niche</label>
                    <div className="relative">
                        <select
                            id="niche"
                            value={nicheId || nicheName} // fallback to text for custom history
                            onChange={handleNicheChange}
                            className={`w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all appearance-none text-sm ${!nicheId && !nicheName ? 'text-slate-400' : 'text-slate-700'}`}
                        >
                            <option value="">Select a Niche...</option>
                            
                            {/* Group: User Custom */}
                            {niches.some(n => n.origin === 'custom') && (
                                <optgroup label="My Niches">
                                    {niches.filter(n => n.origin === 'custom').map(n => (
                                        <option key={n.id} value={n.id} title={n.description || ''}>
                                            {n.name}
                                        </option>
                                    ))}
                                </optgroup>
                            )}

                            {/* Group: PennySEO Niches */}
                            {niches.some(n => n.origin === 'system') && (
                                <optgroup label="PennySEO Niches">
                                    {niches.filter(n => n.origin === 'system').map(n => (
                                        <option key={n.id} value={n.id} title={n.description || ''}>
                                            {n.name}
                                        </option>
                                    ))}
                                </optgroup>
                            )}

                            {/* Allow preserving a custom value not in the list (e.g., from history) */}
                            {nicheName && !niches.some(n => n.name === nicheName) && (
                                <option value={nicheName}>{nicheName}</option>
                            )}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
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
                <label htmlFor="context" className="text-sm font-medium text-slate-700">Description/Info</label>
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
                !isImageSelected ? 'SELECT AN IMAGE FIRST' :
                !isImageAnalysed ? 'ANALYZE IMAGE FIRST ↑' :
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
