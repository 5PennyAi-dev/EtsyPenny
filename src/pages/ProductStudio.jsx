import { useState } from 'react';
import Layout from '../components/Layout';
import { Zap, Sparkles } from 'lucide-react';
import ImageUpload from '../components/studio/ImageUpload';
import OptimizationForm from '../components/studio/OptimizationForm';
import ResultsDisplay from '../components/studio/ResultsDisplay';
import { supabase } from '../lib/supabase';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const MOCK_RESULTS = {
  title: "Vintage Cat T-Shirt - Retro Bookworm Kitten Graphic Tee, Cozy Book Lover Gift, Indie Aesthetic Apparel, Novelty Animal Shirt",
  description: `Embrace your love for cats and literature with our vintage-inspired graphic tee! Perfect for cozy days reading or casual outings.

Features:
- Soft, high-quality cotton blend
- Unique retro design
- Available in multiple sizes
- Machine washable

This shirt makes a perfect gift for librarians, book club members, and cat moms alike. Pair it with your favorite jeans and a cardigan for the ultimate cozy aesthetic.`,
  tags: [
    "Vintage Cat Shirt", "Retro Graphic Tee", "Book Lover Gift", "Kitten T-Shirt", 
    "Indie Aesthetic", "Novelty Animal Tee", "Cozy Apparel", "Cat Mom Gift", 
    "Bookworm Shirt", "Bookish Shirt", "Quirky Style", "Animal Graphic", "Etsy Finds"
  ],
  analytics: [
    { keyword: "Vintage Cat Shirt", volume: 12500, competition: "Medium", score: 85 },
    { keyword: "Retro Graphic Tee", volume: 45000, competition: "High", score: 72 },
    { keyword: "Book Lover Gift", volume: 28000, competition: "Medium", score: 88 },
    { keyword: "Kitten T-Shirt", volume: 8200, competition: "Low", score: 94 },
    { keyword: "Indie Aesthetic", volume: 18500, competition: "Low", score: 92 },
    { keyword: "Cozy Apparel", volume: 32000, competition: "High", score: 68 },
    { keyword: "Novelty Animal Tee", volume: 5600, competition: "Low", score: 97 },
  ]
};

const ProductStudio = () => {
  const { user, profile } = useAuth();
  const [showResults, setShowResults] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // false | 'uploading' | 'saving' | 'triggering' | true
  const [selectedImage, setSelectedImage] = useState(null);

  const handleAnalyze = async (formData) => {
    if (!selectedImage) {
        alert("Please select an image first.");
        return;
    }
    
    // Auth context ensures user is present via ProtectedRoute, but good safety check
    if (!user) {
        alert("You must be logged in to analyze products.");
        return;
    }

    try {
        setIsLoading('uploading');
        
        // 1. Upload Image
        console.log("Starting upload process...");
        console.log("User ID:", user.id);
        console.log("Selected Image:", selectedImage.name, selectedImage.size, selectedImage.type);

        // Sanitize filename
        const sanitizedFileName = selectedImage.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `${user.id}/${Date.now()}_${sanitizedFileName}`;
        console.log("Generated Filename:", filename);

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('mockups_bucket')
            .upload(filename, selectedImage, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) {
            console.error("Upload Error Details:", uploadError);
            throw uploadError;
        }

        console.log("Upload Success:", uploadData);

        const { data: { publicUrl } } = supabase.storage.from('mockups_bucket').getPublicUrl(filename);
        console.log("Public URL:", publicUrl);
        
        setIsLoading('saving');

        // 2. Database Insert
        const customData = {
            theme: formData.custom_theme,
            niche: formData.custom_niche,
            sub_niche: formData.custom_sub_niche
        };

        const { data: listingData, error: dbError } = await supabase
            .from('listings')
            .insert({
                user_id: user.id, // Use authenticated user ID
                product_type_id: formData.product_type_id,
                tone_id: formData.tone_id,
                theme_id: formData.theme_id,
                niche_id: formData.niche_id,
                sub_niche_id: formData.sub_niche_id,
                user_description: formData.context,
                custom_listing: JSON.stringify(customData), // Store custom text inputs
                image_url: publicUrl, // Now supported by DB schema
                title: "Pending Analysis...",
                status: 'processing' // Good practice
            })
            .select()
            .single();

        if (dbError) throw dbError;

        setIsLoading('triggering');

        // 3. Trigger Webhook (N8N)
        // Construct Payload according to User Schema
        const webhookPayload = {
            action: "generate_seo",
            listing_id: listingData.id,
            user_id: user.id,
            payload: {
                image_url: publicUrl,
                categorization: {
                    theme: formData.theme_name, // Text for AI
                    niche: formData.niche_name, // Text for AI
                    sub_niche: formData.sub_niche_name, // Text for AI
                    custom_listing: formData.custom_theme || formData.custom_niche ? JSON.stringify(customData) : null
                },
                product_details: {
                    product_type: formData.product_type_name, // Text
                    tone: formData.tone_name, // Text
                    client_description: formData.context // Text
                }
            },
            metadata: {
                app_version: "1.0.0",
                timestamp: new Date().toISOString()
            }
        };

        // NOTE: In production, use an Edge Function to hide the n8n URL
        await axios.post(
            'https://n8n.srv840060.hstgr.cloud/webhook-test/9d856f4f-d5ae-4fce-b2da-72f584288dc2', 
            webhookPayload
        );

        // Success!
        setIsLoading(false);
        // alert("Analysis Started! Results will appear shortly.");
        setShowResults(true); // Show mock results for now

    } catch (err) {
        console.error("Error:", err);
        alert("An error occurred: " + err.message);
        setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex justify-between items-center">
          <div>
            <nav className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <span className="hover:text-slate-900 cursor-pointer">App</span>
              <span className="text-slate-300">/</span>
              <span className="font-medium text-indigo-600">Product Studio</span>
            </nav>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Hello, {profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Creator'}! 👋
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 bg-white border border-amber-200 px-4 py-2 rounded-full shadow-sm">
                <div className="p-1 bg-amber-100 rounded-full">
                  <Zap size={16} className="text-amber-600" fill="currentColor" />
                </div>
                <span className="text-sm font-medium text-slate-700">
                  Balance: <span className="font-bold text-slate-900">{profile?.credits_balance ?? 0}</span> / 5 Credits
                </span>
                <button className="text-xs text-indigo-600 hover:text-indigo-700 font-medium ml-2">
                  Top Up
                </button>
             </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="space-y-6">
           
           {/* Generator Section */}
           <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-500 ${showResults ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                 <Sparkles className="text-indigo-600" size={18} />
                 <h2 className="font-bold text-slate-900">NEW OPTIMIZATION</h2>
              </div>
              
              <div className="p-8">
                 <div className="mb-8">
                    <ImageUpload onFileSelect={setSelectedImage} />
                 </div>
                 <OptimizationForm onAnalyze={handleAnalyze} isLoading={isLoading} />
              </div>
           </div>
           
           {/* Loading State or Results */}
           {isLoading && (
             <div className="flex flex-col items-center justify-center py-12 animate-in fade-in">
               <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
               <p className="text-indigo-600 font-medium animate-pulse">Analyzing image and generating SEO...</p>
             </div>
           )}

           {/* Results Section */}
           {showResults && !isLoading && (
             <ResultsDisplay results={MOCK_RESULTS} />
           )}

        </div>

      </div>
    </Layout>
  );
};

export default ProductStudio;
