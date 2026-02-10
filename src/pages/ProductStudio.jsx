import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Zap, Sparkles } from 'lucide-react';
import ImageUpload from '../components/studio/ImageUpload';
import OptimizationForm from '../components/studio/OptimizationForm';
import ResultsDisplay from '../components/studio/ResultsDisplay';
import { supabase } from '../lib/supabase';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const ProductStudio = () => {
  const { user, profile } = useAuth();
  const [showResults, setShowResults] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // false | 'uploading' | 'saving' | 'triggering' | true
  const [selectedImage, setSelectedImage] = useState(null);
  const [listingId, setListingId] = useState(null);
  const [results, setResults] = useState(null);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [analysisContext, setAnalysisContext] = useState(null);

  // No changes to imports

  // ... (keep useEffect for realtime as a backup or removal? Let's keep it but focusing on the direct response)
  // Actually, if we handle it here, we might double-fetch if realtime also triggers. 
  // But since the Status won't change to 'completed' until WE do it here, the realtime won't fire early.
  // And once we update it, the realtime might fire. 
  // Let's rely on the direct response for speed and reliability if N8N returns data.

  const handleAnalyze = async (formData) => {
    // Save context for drafting phase
    setAnalysisContext(formData);
    
    if (!selectedImage) {
        alert("Please select an image first.");
        return;
    }
    
    if (!user) {
        alert("You must be logged in to analyze products.");
        return;
    }

    try {
        setIsLoading('uploading');
        setListingId(null);
        setResults(null);
        setShowResults(false);
        
        // 1. Upload Image
        console.log("Starting upload process...");
        const sanitizedFileName = selectedImage.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `${user.id}/${Date.now()}_${sanitizedFileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('mockups_bucket')
            .upload(filename, selectedImage, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('mockups_bucket').getPublicUrl(filename);
        
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
                user_id: user.id,
                product_type_id: formData.product_type_id,
                tone_id: formData.tone_id,
                theme_id: formData.theme_id,
                niche_id: formData.niche_id,
                sub_niche_id: formData.sub_niche_id,
                user_description: formData.context,
                custom_listing: JSON.stringify(customData),
                image_url: publicUrl,
                title: "Pending Analysis...",
                status: 'processing'
            })
            .select()
            .single();

        if (dbError) throw dbError;

        setListingId(listingData.id);
        setIsLoading('triggering');

        // 3. Trigger Webhook (N8N)
        const webhookPayload = {
            action: "generate_seo",
            listing_id: listingData.id,
            user_id: user.id,
            payload: {
                image_url: publicUrl,
                categorization: {
                    theme: formData.theme_name,
                    niche: formData.niche_name,
                    sub_niche: formData.sub_niche_name,
                    custom_listing: formData.custom_theme || formData.custom_niche ? JSON.stringify(customData) : null
                },
                product_details: {
                    product_type: formData.product_type_name,
                    tone: formData.tone_name,
                    client_description: formData.context
                }
            },
            metadata: {
                app_version: "1.0.0",
                timestamp: new Date().toISOString()
            }
        };

        // Note: We expect the N8N workflow to return the analysis data in the response
        const response = await axios.post(
            'https://n8n.srv840060.hstgr.cloud/webhook-test/9d856f4f-d5ae-4fce-b2da-72f584288dc2', 
            webhookPayload
        );

        console.log("N8N Response:", response.data);
        const responseData = response.data;
        
        let seoAnalysis = [];
        let generatedTitle = "SEO Analysis Completed";
        let generatedDescription = "Please review the competition analysis below.";

        // Handle different response structures
        if (Array.isArray(responseData)) {
            // Case: Response is just the array of stats
            seoAnalysis = responseData;
        } else if (responseData && responseData.seo_analysis) {
            // Case: Response is an object with metadata
            seoAnalysis = responseData.seo_analysis;
            generatedTitle = responseData.title || generatedTitle;
            generatedDescription = responseData.description || generatedDescription;
        } else {
             throw new Error("Invalid response structure from analysis service");
        }

        // 4. Save Results to Database
        setIsLoading('saving');

        // Update Listing with Title/Desc
        const { error: updateError } = await supabase
            .from('listings')
            .update({
                generated_title: generatedTitle,
                generated_description: generatedDescription,
                status: 'completed',
                title: generatedTitle // Update main title as well?
            })
            .eq('id', listingData.id);

        if (updateError) throw updateError;

        // Insert SEO Stats
        // transform seoAnalysis (array) to db format
        const statsToInsert = seoAnalysis.map(item => ({
            listing_id: listingData.id,
            tag: item.keyword,
            search_volume: item.avg_volume || 0,
            competition: String(item.competition), 
            opportunity_score: item.opportunity_score,
            volume_history: item.volumes_history || [],
            is_trending: item.status?.trending || false,
            is_evergreen: item.status?.evergreen || false,
            is_promising: item.status?.promising || false
        }));

        const { error: statsInsertError } = await supabase
            .from('listing_seo_stats')
            .insert(statsToInsert);

        if (statsInsertError) throw statsInsertError;

        // 5. Update UI
        const formattedResults = {
            title: generatedTitle === "SEO Analysis Completed" ? null : generatedTitle, // Use null to trigger "Ready to Craft" state
            description: generatedDescription === "Please review the competition analysis below." ? null : generatedDescription,
            imageUrl: publicUrl,
            tags: statsToInsert.map(s => s.tag),
            analytics: statsToInsert.map(s => ({
                keyword: s.tag,
                volume: s.search_volume,
                competition: s.competition,
                score: s.opportunity_score,
                volume_history: s.volume_history,
                is_trending: s.is_trending,
                is_evergreen: s.is_evergreen,
                is_promising: s.is_promising
            }))
        };

        setResults(formattedResults);
        setIsLoading(false);
        setShowResults(true);

    } catch (err) {
        console.error("Error:", err);
        alert("An error occurred: " + err.message);
        setIsLoading(false);
    }
  };

  const handleGenerateDraft = async () => {
      if (isGeneratingDraft || !results || !analysisContext) return;
      setIsGeneratingDraft(true);

      try {
        const payload = {
            action: 'drafting_seo',
            keywords: results.analytics.map(k => ({
                keyword: k.keyword,
                avg_volume: k.volume,
                competition: typeof k.competition === 'string' && !isNaN(parseFloat(k.competition)) ? parseFloat(k.competition) : k.competition, 
                opportunity_score: k.score,
                volumes_history: k.volume_history,
                status: {
                   trending: k.is_trending,
                   evergreen: k.is_evergreen,
                   promising: k.is_promising
                }
            })),
            mockups: [results.imageUrl], 
            listing_id: listingId,
            payload: {
                image_url: results.imageUrl, // Added to match generate_seo schema
                categorization: {
                    theme: analysisContext.theme_name || "General",
                    niche: analysisContext.niche_name || "General",
                    sub_niche: analysisContext.sub_niche_name || "General"
                },
                product_details: {
                    product_type: analysisContext.product_type_name || "Product",
                    tone: analysisContext.tone_name || "Engaging",
                    client_description: analysisContext.context || ""
                }
            }
        };

        const response = await axios.post(
            'https://n8n.srv840060.hstgr.cloud/webhook-test/9d856f4f-d5ae-4fce-b2da-72f584288dc2',
            payload
        );

        let title, description;
        
        if (Array.isArray(response.data) && response.data.length > 0) {
            title = response.data[0].title;
            description = response.data[0].description;
        } else {
            title = response.data.title;
            description = response.data.description;
        }
        
        if (!title) throw new Error("Incomplete draft received from AI");

        // Update UI
        setResults(prev => ({
            ...prev,
            title: title,
            description: description
        }));

        // Update Database
        if (listingId) {
             const { error: updateError } = await supabase
                .from('listings')
                .update({ 
                    generated_title: title,
                    generated_description: description
                })
                .eq('id', listingId);
             
             if (updateError) console.error("Failed to save draft:", updateError);
        }

      } catch (err) {
          console.error("Draft generation failed:", err);
          alert("Failed to generate draft. Please try again.");
      } finally {
          setIsGeneratingDraft(false);
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
               <p className="text-indigo-600 font-medium animate-pulse">
                   {isLoading === 'uploading' && 'Uploading image...'}
                   {isLoading === 'saving' && 'Saving Data...'}
                   {isLoading === 'triggering' && 'Running AI Analysis...'}
                   {isLoading === true && 'Analyzing image and generating SEO...'}
               </p>
             </div>
           )}

           {/* Results Section */}
           {showResults && results && !isLoading && (
             <ResultsDisplay 
               results={results} 
               isGeneratingDraft={isGeneratingDraft}
               onGenerateDraft={handleGenerateDraft}
             />
           )}

        </div>

      </div>
    </Layout>
  );
};

export default ProductStudio;
