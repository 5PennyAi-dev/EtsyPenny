
import { useState, useRef, useEffect } from 'react';
import { Sparkles, ArrowRight, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';

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

const OptimizationForm = ({ onAnalyze, isLoading }) => {
  // Data State
  const [themes, setThemes] = useState([]);
  const [nichesList, setNichesList] = useState([]);
  const [subNichesList, setSubNichesList] = useState([]);
  const [productTypes, setProductTypes] = useState([]);
  const [tones, setTones] = useState([]);

  // Selection State (IDs or 'custom')
  const [theme, setTheme] = useState("");
  const [niche, setNiche] = useState("");
  const [subNiche, setSubNiche] = useState("");
  const [productType, setProductType] = useState("");
  const [tone, setTone] = useState("");

  // Custom Input State
  const [customTheme, setCustomTheme] = useState("");
  const [customNiche, setCustomNiche] = useState("");
  const [customSubNiche, setCustomSubNiche] = useState("");

  const contextRef = useRef(null);

  // Initial Fetch (Themes, Product Types, Tones)
  useEffect(() => {
    const fetchData = async () => {
      const { data: themesData } = await supabase.from('themes').select('id, name').order('name');
      if (themesData) setThemes(themesData);

      const { data: typesData } = await supabase.from('product_types').select('id, name').order('name');
      if (typesData) {
        setProductTypes(typesData);
        if (typesData.length > 0 && !productType) setProductType(typesData[0].id); // Default if not set
      }

      const { data: tonesData } = await supabase.from('tones').select('id, name').order('name');
      if (tonesData) {
        setTones(tonesData);
        if (tonesData.length > 0 && !tone) setTone(tonesData[0].id); // Default if not set
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
    // Reset selections
    if (theme !== 'custom') {
      setNiche("");
      setSubNiche("");
      setCustomTheme("");
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
    // Reset selections
     if (niche !== 'custom') {
      setSubNiche("");
      setCustomNiche("");
    }
  }, [niche]);

  // Reset custom subniche
  useEffect(() => {
    if (subNiche !== 'custom') {
      setCustomSubNiche("");
    }
  }, [subNiche]);


  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate mandatory fields
    if (!productType) {
        alert("Please select a Product Type.");
        return;
    }

    // Find Names for Payload
    const selectedProductType = productTypes.find(t => t.id === productType)?.name || "Unknown";
    const selectedTone = tones.find(t => t.id === tone)?.name || "Default";
    
    // Find Categorization Names (if not custom)
    const selectedTheme = theme !== 'custom' ? themes.find(t => t.id === theme)?.name : customTheme;
    const selectedNiche = niche !== 'custom' ? nichesList.find(t => t.id === niche)?.name : customNiche;
    const selectedSubNiche = subNiche !== 'custom' ? subNichesList.find(t => t.id === subNiche)?.name : customSubNiche;

    onAnalyze({
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
      
      // Product Details (IDs + Names)
      product_type_id: productType || null,
      product_type_name: selectedProductType,
      tone_id: tone || null,
      tone_name: selectedTone,
      
      context: contextRef.current.value
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      
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
              onChange={setTheme} 
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
              onChange={setNiche} 
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
              onChange={setSubNiche} 
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
      <div className="space-y-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">
            Product Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Context (Left 2 cols) */}
            <div className="md:col-span-2 space-y-1">
                <label htmlFor="context" className="text-sm font-medium text-slate-700">Instructions / Details</label>
                <textarea
                  ref={contextRef}
                  id="context"
                  rows="3"
                  placeholder="ex: Witty and modern tone, for cat lovers..."
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 resize-none"
                />
            </div>

            {/* Type & Tone (Right Col) */}
            <div className="space-y-4">
               <div className="space-y-1">
                  <label htmlFor="type" className="text-sm font-medium text-slate-700">Product Type</label>
                  <div className="relative">
                    <select
                      id="type"
                      value={productType}
                      onChange={(e) => setProductType(e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-700 appearance-none"
                    >
                       {productTypes.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                       ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="tone" className="text-sm font-medium text-slate-700">Tone</label>
                  <div className="relative">
                    <select
                      id="tone"
                      value={tone}
                      onChange={(e) => setTone(e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-700 appearance-none"
                    >
                       {tones.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                       ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  </div>
                </div>
            </div>
          </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className={`w-full py-4 rounded-xl font-bold shadow-lg transition-all transform flex items-center justify-center gap-2
          ${isLoading 
            ? 'bg-indigo-400 cursor-not-allowed shadow-none translate-y-0' 
            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-0.5'
          }`}
      >
        <Sparkles size={20} className={isLoading ? 'animate-spin' : ''} />
        {isLoading === 'uploading' && 'UPLOADING IMAGES...'}
        {isLoading === 'saving' && 'SAVING DATA...'}
        {isLoading === 'triggering' && 'STARTING AI...'}
        {isLoading === true && 'ANALYZING...'} 
        {!isLoading && 'ANALYZE AND GENERATE SEO (1 Credit)'}
        {!isLoading && <span className="text-indigo-200">🚀</span>}
      </button>

    </form>
  );
};

export default OptimizationForm;
