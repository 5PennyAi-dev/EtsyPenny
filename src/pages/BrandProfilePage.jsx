import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import { Sparkles, Save, Store, Link as LinkIcon, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

// Internal Auto-Resize Textarea Component
const AutoResizeTextarea = ({ name, value, onChange, placeholder, className, minRows = 1, maxRows = 6 }) => {
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      // Reset height to auto to correctly calculate new scrollHeight
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      
      // Calculate max height based on approximate line height (e.g., 24px per line + padding)
      const maxHeight = maxRows * 24 + 20; 
      
      if (scrollHeight > maxHeight) {
          textareaRef.current.style.height = `${maxHeight}px`;
          textareaRef.current.style.overflowY = 'auto'; // Enable scroll
      } else {
          textareaRef.current.style.height = `${scrollHeight}px`;
          textareaRef.current.style.overflowY = 'hidden'; // Hide scroll
      }
    }
  }, [value, maxRows]);

  return (
    <textarea
      ref={textareaRef}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={minRows}
      className={`${className} resize-none`}
      style={{ minHeight: `${minRows * 24 + 16}px` }} // Approximate min height
    />
  );
};
const BrandProfilePage = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  
  // Section A: Manual Input
  const [formData, setFormData] = useState({
    shop_name: '',
    shop_bio: '',
    target_audience: '',
    brand_tone: '',
    signature_text: '',
    brand_keywords: '' // Stored as comma-separated string for input, array in DB
  });

  // Section B: Magic Sync
  const [etsyUrl, setEtsyUrl] = useState('');

  // Brand Tone Options
  const brandTones = [
    "Funny", "Professional", "Artistic", "Minimalist", 
    "Luxury", "Handmade", "Whimsical", "Rustic", "Modern", "Vintage"
  ];

  // Load Initial Data
  useEffect(() => {
    if (profile) {
      setFormData({
        shop_name: profile.shop_name || '',
        shop_bio: profile.shop_bio || '',
        target_audience: profile.target_audience || '',
        brand_tone: profile.brand_tone || '',
        signature_text: profile.signature_text || '',
        brand_keywords: profile.brand_keywords ? profile.brand_keywords.join(', ') : ''
      });
      setIsDirty(false); // Reset dirty state on initial load
    }
  }, [profile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setIsDirty(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Convert keywords string to array
      const keywordsArray = formData.brand_keywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);

      const updates = {
        id: user.id,
        shop_name: formData.shop_name,
        shop_bio: formData.shop_bio,
        target_audience: formData.target_audience,
        brand_tone: formData.brand_tone,
        signature_text: formData.signature_text,
        brand_keywords: keywordsArray,
        updated_at: new Date()
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(updates);

      if (error) throw error;

      await refreshProfile();
      toast.success("Brand Profile Saved Successfully! 🚀");
      setIsDirty(false); // Reset dirty state after save

    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error("Failed to save profile.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyzeShop = async () => {
    if (!etsyUrl) return toast.error("Please enter your Etsy Shop URL first.");
    
    // Basic URL validation
    try {
        new URL(etsyUrl);
    } catch (_) {
        return toast.error("Please enter a valid URL (e.g. https://www.etsy.com/shop/YourShopName)");
    }

    setIsAnalyzing(true);
    
    try {
        const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL_TEST;

        if (!webhookUrl) {
            throw new Error("Webhook URL not configured");
        }

        // Call N8N Webhook
        const response = await axios.post(webhookUrl, {
            action: 'analyseShop',
            shop_url: etsyUrl
        });

        if (response.data && response.data.length > 0 && response.data[0].output) {
            const data = response.data[0].output;
            
            setFormData(prev => ({
                ...prev,
                shop_name: data.shop_name || prev.shop_name,
                shop_bio: data.shop_bio || prev.shop_bio,
                target_audience: data.target_audience || prev.target_audience,
                brand_tone: data.brand_tone || prev.brand_tone, // Might need mapping if strict select
                signature_text: data.signature_text || prev.signature_text,
                brand_keywords: Array.isArray(data.brand_keywords) 
                    ? data.brand_keywords.join(', ') 
                    : (data.brand_keywords || prev.brand_keywords)
            }));
            
            setIsDirty(true);
            toast.success("Shop analysis applied! Please review the form.");
        } else {
            throw new Error("Invalid response format");
        }

    } catch (error) {
        console.error("Analysis failed:", error);
        toast.error("Failed to start analysis. Please try again.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  return (
    <Layout>
      <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
        
        {/* Header */}
        <div>
           <nav className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <span className="hover:text-slate-900 cursor-pointer">App</span>
              <span className="text-slate-300">/</span>
              <span className="font-medium text-indigo-600">Brand Profile</span>
            </nav>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Store className="text-indigo-600" size={32} />
              Brand Identity
            </h1>
            <p className="text-slate-500 mt-2">
              Define your shop's voice and personality. The AI will use this to write content that sounds exactly like you.
            </p>
        </div>

        {/* Section B: Magic Sync (Card) */}
        <div className="bg-gradient-to-r from-indigo-50 to-violet-50 rounded-2xl border border-indigo-100 p-6 shadow-sm">
            <div className="flex items-start gap-4">
                <div className="p-3 bg-white rounded-full shadow-sm text-indigo-600">
                    <Sparkles size={24} />
                </div>
                <div className="flex-1 space-y-4">
                    <div>
                        <h3 className="text-lg font-bold text-indigo-900">Magic Sync ✨</h3>
                        <p className="text-sm text-indigo-700/80">
                            Paste your Etsy Shop URL and let our AI analyze your existing listings to automatically detect your brand voice.
                        </p>
                    </div>
                    
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                             <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-300" size={16} />
                             <input 
                                type="url" 
                                placeholder="https://www.etsy.com/shop/YourShopName"
                                value={etsyUrl}
                                onChange={(e) => setEtsyUrl(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none placeholder:text-indigo-300 text-indigo-900"
                             />
                        </div>
                        <button
                            onClick={handleAnalyzeShop}
                            disabled={isAnalyzing || !etsyUrl}
                            className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-wait flex items-center gap-2"
                        >
                            {isAnalyzing ? <RefreshCw className="animate-spin" size={16}/> : <Sparkles size={16}/>}
                            {isAnalyzing ? 'Scanning...' : 'Analyze My Shop'}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {/* Section A: Manual Input (Form) */}
        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-bold text-slate-900">Brand Parameters</h3>
            </div>
            
            <div className="p-8 space-y-6">
                
                {/* Row 1 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">Shop Name</label>
                        <input
                            type="text"
                            name="shop_name"
                            value={formData.shop_name}
                            onChange={handleChange}
                            placeholder="e.g. Urban Woodworks"
                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>
                     <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">Brand Tone</label>
                        <AutoResizeTextarea
                            name="brand_tone"
                            value={formData.brand_tone}
                            onChange={handleChange}
                            placeholder="e.g. Funny, Professional, Whimsical..."
                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                            minRows={1}
                        />
                    </div>
                </div>

                {/* Shop Bio */}
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Shop Bio / Mission</label>
                    <AutoResizeTextarea
                        name="shop_bio"
                        value={formData.shop_bio}
                        onChange={handleChange}
                        minRows={3}
                        placeholder="What makes your shop special? e.g. We use only reclaimed wood..."
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    />
                </div>

                {/* Target Audience */}
                 <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Target Audience</label>
                    <AutoResizeTextarea
                        name="target_audience"
                        value={formData.target_audience}
                        onChange={handleChange}
                        minRows={2}
                        placeholder="e.g. Eco-conscious millenials, Pet owners, New moms..."
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    />
                </div>

                {/* Brand Keywords */}
                 <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Brand Keywords (Checklist)</label>
                    <input
                        type="text"
                        name="brand_keywords"
                        value={formData.brand_keywords}
                        onChange={handleChange}
                        placeholder="Comma separated: sustainable, quality, rustic, USA-made..."
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-mono text-sm"
                    />
                    <p className="text-xs text-slate-400">These will be prioritized in your SEO generation.</p>
                </div>

                {/* Signature */}
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Signature / Footer text</label>
                    <AutoResizeTextarea
                        name="signature_text"
                        value={formData.signature_text}
                        onChange={handleChange}
                        minRows={2}
                        placeholder="e.g. Thanks for supporting small business! - Sarah"
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    />
                    <p className="text-xs text-slate-400">This will be appended to every description.</p>
                </div>

            </div>

            {/* Footer Actions */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button
                    type="submit"
                    disabled={isLoading || !isDirty}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0"
                >
                    {isLoading ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                    {isLoading ? 'Saving...' : 'Save Profile'}
                </button>
            </div>
        </form>
      </div>
    </Layout>
  );
};

export default BrandProfilePage;
