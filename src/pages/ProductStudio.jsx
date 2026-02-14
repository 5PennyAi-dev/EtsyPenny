import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import { Zap, Sparkles, Edit3, RefreshCw, ChevronRight, ChevronUp, Wand2, Palette, Type, LayoutTemplate, Target, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ImageUpload from '../components/studio/ImageUpload';
import OptimizationForm from '../components/studio/OptimizationForm';
import ResultsDisplay from '../components/studio/ResultsDisplay';
import RecentOptimizations from '../components/studio/RecentOptimizations';
import { supabase } from '../lib/supabase';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { toast } from 'sonner';

const STATUS_IDS = {
  NEW: 'ac083a90-43fa-4ff5-a62d-5cd6bb5edbcc',
  SEO_DONE: '35660e24-94bb-4586-aa5a-a5027546b4a1',
  COMPLETE: '28a11ca0-bcfc-42e0-971d-efc320f78424'
};

const ProductStudio = () => {
  const { user, profile } = useAuth();
  const location = useLocation();
  const [showResults, setShowResults] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // false | 'uploading' | 'saving' | 'triggering' | true
  const [selectedImage, setSelectedImage] = useState(null);
  const [listingId, setListingId] = useState(null);
  const [results, setResults] = useState(null);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [isSniperLoading, setIsSniperLoading] = useState(false);
  const [isInsightLoading, setIsInsightLoading] = useState(false); // false | 'seo' | 'insight'
  const [analysisContext, setAnalysisContext] = useState(null);
  const [listingName, setListingName] = useState("");
  
  // Visual Analysis State
  const [isAnalyzingDesign, setIsAnalyzingDesign] = useState(false);
  const [visualAnalysis, setVisualAnalysis] = useState({
      aesthetic: "",
      typography: "",
      graphics: "",
      colors: "",
      target_audience: "",
      overall_vibe: ""
  });

  // UI State for Form Collapse
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);
  const [formKey, setFormKey] = useState(0); // For resetting the form
  
  // Confirmation Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingRelaunchData, setPendingRelaunchData] = useState(null);

  // No changes to imports

  // ... (keep useEffect for realtime as a backup or removal? Let's keep it but focusing on the direct response)
  // Actually, if we handle it here, we might double-fetch if realtime also triggers. 
  // But since the Status won't change to 'completed' until WE do it here, the realtime won't fire early.
  // Let's rely on the direct response for speed and reliability if N8N returns data.
  // Auto-resize visual analysis textareas when values change programmatically
  useEffect(() => {
      document.querySelectorAll('[data-visual-field]').forEach(el => {
          el.style.height = 'auto';
          el.style.height = el.scrollHeight + 'px';
      });
  }, [visualAnalysis]);

  // Visual Analysis Handler
  const handleAnalyzeDesign = async () => {
      // 1. Check if image selected
      if (!selectedImage && !results?.imageUrl) {
          toast.error("Please select an image first.");
          return;
      }

      setIsAnalyzingDesign(true);

      try {
          // Upload if fresh image
          let publicUrl = results?.imageUrl; 
          if (!publicUrl && selectedImage) {
               // Reuse upload logic or separate it? 
               // For now, let's assume we need to upload if it's a file
               const sanitizedFileName = selectedImage.name.replace(/[^a-zA-Z0-9.-]/g, '_');
               const filename = `${user.id}/${Date.now()}_temp_${sanitizedFileName}`; // temp prefix? 
               
               const { error: uploadError } = await supabase.storage
                    .from('mockups_bucket')
                    .upload(filename, selectedImage, { upsert: false });
               if (uploadError) throw uploadError;
               
               const { data: { publicUrl: newUrl } } = supabase.storage.from('mockups_bucket').getPublicUrl(filename);
               publicUrl = newUrl;
          }

          // Trigger n8n webhook
          const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL_TEST || 'https://n8n.srv840060.hstgr.cloud/webhook-test/9d856f4f-d5ae-4fce-b2da-72f584288dc2';
          
          const payload = {
              action: "analyseImage", // As requested
              user_id: user.id,
              payload: {
                  image_url: publicUrl
              }
          };

          const response = await axios.post(webhookUrl, payload);
          console.log("Visual Analysis Response:", response.data);
          
          // Handle n8n array structure: [{ output: { visual_analysis: { ... } } }]
          // Or direct object if changed later
          const responseData = Array.isArray(response.data) ? response.data[0] : response.data;
          const data = responseData?.output?.visual_analysis || responseData?.visual_analysis || responseData;

          if (data) {
              setVisualAnalysis({
                  aesthetic: data.aesthetic_style || "",
                  typography: data.typography_details || "",
                  graphics: data.graphic_elements || "",
                  colors: data.color_palette || "",
                  target_audience: data.target_audience || "",
                  overall_vibe: data.overall_vibe || ""
              });
              toast.success("Visual analysis complete! ✨");
          }

      } catch (error) {
          console.error("Visual Analysis Error:", error);
          toast.error("Failed to analyze design.");
      } finally {
          setIsAnalyzingDesign(false);
      }
  };

  const handleSaveDraft = async (formData) => {
      // Logic similar to handleAnalyze but stops after DB insert
      // Fallback: Use existing result image if valid and no new image selected
      if (!selectedImage && !formData.existingImageUrl && results?.imageUrl) {
          formData.existingImageUrl = results.imageUrl;
      }
  
      if (!selectedImage && !formData.existingImageUrl) {
          toast.error("Please select an image first.");
          return;
      }
      
      if (!user) {
          toast.error("You must be logged in to save drafts.");
          return;
      }
  
      try {
          setIsLoading('saving');
          // Removing setListingId(null) to allow updates
          
          let publicUrl = formData.existingImageUrl;
  
          if (!formData.existingImageUrl) {
              // 1. Upload Image (Duplicate logic slightly for safety/isolation)
              const sanitizedFileName = selectedImage.name.replace(/[^a-zA-Z0-9.-]/g, '_');
              const filename = `${user.id}/${Date.now()}_${sanitizedFileName}`;
  
              const { error: uploadError } = await supabase.storage
                  .from('mockups_bucket')
                  .upload(filename, selectedImage, {
                      cacheControl: '3600',
                      upsert: false
                  });
  
              if (uploadError) throw uploadError;
  
              const { data: { publicUrl: newUrl } } = supabase.storage.from('mockups_bucket').getPublicUrl(filename);
              publicUrl = newUrl;
          }
          
          // 2. Database Operation
          const customData = {
              theme: formData.custom_theme,
              niche: formData.custom_niche,
              sub_niche: formData.custom_sub_niche
          };

          const commonFields = {
                product_type_id: formData.product_type_id,
                tone_id: formData.tone_id,
                theme_id: formData.theme_id,
                niche_id: formData.niche_id,
                sub_niche_id: formData.sub_niche_id,
                user_description: formData.context,
                custom_listing: JSON.stringify(customData),
                image_url: publicUrl,
                title: listingName || "Draft Listing",
                // Visual Fields
                visual_aesthetic: visualAnalysis.aesthetic,
                visual_typography: visualAnalysis.typography,
                visual_graphics: visualAnalysis.graphics,
                visual_colors: visualAnalysis.colors,
                visual_target_audience: visualAnalysis.target_audience,
                visual_overall_vibe: visualAnalysis.overall_vibe
          };

          if (listingId) {
            // UPDATE existing listing
            const { error: dbError } = await supabase
              .from('listings')
              .update(commonFields)
              .eq('id', listingId);

            if (dbError) throw dbError;
            toast.success("Listing updated");

          } else {
            // INSERT new listing
            const { data: listingData, error: dbError } = await supabase
              .from('listings')
              .insert({
                  ...commonFields,
                  user_id: user.id,
                  status_id: STATUS_IDS.NEW
              })
              .select()
              .single();
  
            if (dbError) throw dbError;
            setListingId(listingData.id);
            toast.success("Listing saved");
          }

          setIsLoading(false);
  
      } catch (err) {
          console.error("Error saving draft:", err);
          toast.error("Failed to save draft: " + err.message);
          setIsLoading(false);
      }
  };


  const handleAnalyze = async (formData) => {
    // Save context for drafting phase
    setAnalysisContext(formData);
    // Fallback: Use existing result image if valid and no new image selected
    if (!selectedImage && !formData.existingImageUrl && results?.imageUrl) {
        console.log("Restoring existing image URL from results");
        formData.existingImageUrl = results.imageUrl;
    }

    if (!selectedImage && !formData.existingImageUrl) {
        toast.error("Please select an image first.");
        return;
    }
    
    if (!user) {
        toast.error("You must be logged in to analyze products.");
        return;
    }

    try {
        let activeListingId = listingId;
        setResults(null);
        
        // Show skeleton immediately — user sees loading from the start
        setIsInsightLoading('seo');
        setIsLoading(false);
        setShowResults(true);
        setIsFormCollapsed(true);
        
        
        let publicUrl = formData.existingImageUrl;

        if (formData.existingImageUrl) {
            console.log("Using existing image:", formData.existingImageUrl);
             // Skip upload, use existing URL
        } else {
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

            const { data: { publicUrl: newUrl } } = supabase.storage.from('mockups_bucket').getPublicUrl(filename);
            publicUrl = newUrl;
        }
        
        // 2. Database Operation (silently while skeleton shows)
        const customData = {
            theme: formData.custom_theme,
            niche: formData.custom_niche,
            sub_niche: formData.custom_sub_niche,
            product_type: formData.product_type_id ? null : formData.product_type_name
        };

        const commonFields = {
            product_type_id: formData.product_type_id || null,
            tone_id: formData.tone_id,
            theme_id: formData.theme_id,
            niche_id: formData.niche_id,
            sub_niche_id: formData.sub_niche_id,
            user_description: formData.context,
            custom_listing: JSON.stringify(customData),
            image_url: publicUrl,
            title: listingName || "Pending Analysis...",
             // Visual Fields
            visual_aesthetic: visualAnalysis.aesthetic,
            visual_typography: visualAnalysis.typography,
            visual_graphics: visualAnalysis.graphics,
            visual_colors: visualAnalysis.colors,
            visual_target_audience: visualAnalysis.target_audience,
            visual_overall_vibe: visualAnalysis.overall_vibe
        };

        if (activeListingId) {
             // UPDATE
             const { error: dbError } = await supabase
                .from('listings')
                .update(commonFields)
                .eq('id', activeListingId);
             
             if (dbError) throw dbError;
        } else {
             // INSERT
             const { data: listingData, error: dbError } = await supabase
                .from('listings')
                .insert({
                    ...commonFields,
                    user_id: user.id,
                    status_id: STATUS_IDS.NEW
                })
                .select()
                .single();
    
             if (dbError) throw dbError;
             activeListingId = listingData.id;
             setListingId(activeListingId);
        }

        // 3. Trigger Webhook (N8N)
        const webhookPayload = {
            action: "generate_seo",
            listing_id: activeListingId,
            user_id: user.id,
            payload: {
                image_url: publicUrl,
                // Visual analysis fields
                visual_aesthetic: visualAnalysis.aesthetic,
                visual_typography: visualAnalysis.typography,
                visual_graphics: visualAnalysis.graphics,
                visual_colors: visualAnalysis.colors,
                visual_target_audience: visualAnalysis.target_audience,
                visual_overall_vibe: visualAnalysis.overall_vibe,
                categorization: {
                    theme: formData.theme_name || null,
                    niche: formData.niche_name || null,
                    sub_niche: formData.sub_niche_name || null,
                    custom_listing: formData.custom_theme || formData.custom_niche ? JSON.stringify(customData) : null
                },
                product_details: {
                    product_type: formData.product_type_name,
                    tone: formData.tone_name,
                    client_description: formData.context,
                    tag_count: formData.tag_count
                },
                shop_context: {
                    shop_name: profile?.shop_name,
                    shop_bio: profile?.shop_bio,
                    target_audience: profile?.target_audience,
                    brand_tone: profile?.brand_tone,
                    brand_keywords: profile?.brand_keywords,
                    signature_text: profile?.signature_text
                }
            },
            metadata: {
                app_version: "1.0.0",
                timestamp: new Date().toISOString()
            }
        };

        // Note: We expect the N8N workflow to return the analysis data in the response
        const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL_TEST || 'https://n8n.srv840060.hstgr.cloud/webhook-test/9d856f4f-d5ae-4fce-b2da-72f584288dc2';
        console.log("Calling Webhook:", webhookUrl);

        const response = await axios.post(
            webhookUrl, 
            webhookPayload
        );

        console.log("N8N Response:", response.data);
        const responseData = response.data;
        
        let seoAnalysis = [];
        let generatedTitle = "SEO Analysis Completed";
        let generatedDescription = "Please review the competition analysis below.";

        // Handle different response structures
        // N8N wraps the response in an array: [{global_listing_strength, keywords: [...]}]
        const unwrapped = Array.isArray(responseData) ? responseData[0] : responseData;
        
        // The keyword array can be under "keywords" or "seo_analysis"
        const keywordArray = unwrapped?.keywords || unwrapped?.seo_analysis;
        
        if (keywordArray && Array.isArray(keywordArray)) {
            seoAnalysis = keywordArray;
            generatedTitle = unwrapped.title || generatedTitle;
            generatedDescription = unwrapped.description || generatedDescription;
        } else if (Array.isArray(responseData) && responseData.length > 0 && responseData[0]?.keyword) {
            // Case: Response is a flat array of keyword objects directly
            seoAnalysis = responseData;
        } else {
            console.warn("Unexpected response structure:", unwrapped);
            throw new Error("Invalid response structure from analysis service");
        }

        // Extract global audit fields from the unwrapped response
        const globalStrength = unwrapped?.global_listing_strength ?? null;
        const statusLabel = unwrapped?.global_status_label ?? null;
        const strategicVerdict = unwrapped?.global_strategic_verdict ?? null;
        const improvementPriority = unwrapped?.improvement_priority ?? null;
        console.log("Global Audit extracted:", { globalStrength, statusLabel, strategicVerdict, improvementPriority });

        // 4. Save Results to Database (silently, skeleton stays visible)

        // Update Listing with Title/Desc
        const { error: updateError } = await supabase
            .from('listings')
            .update({
                generated_title: generatedTitle,
                generated_description: generatedDescription,
                status_id: STATUS_IDS.SEO_DONE,
                title: listingName || generatedTitle,
                global_strength: globalStrength,
                status_label: statusLabel,
                strategic_verdict: strategicVerdict,
                improvement_priority: improvementPriority
            })
            .eq('id', activeListingId);

        if (updateError) throw updateError;

        // Insert SEO Stats
        // transform seoAnalysis (array) to db format
        const statsToInsert = seoAnalysis.filter(item => item.keyword).map(item => ({
            listing_id: activeListingId,
            tag: item.keyword,
            search_volume: item.avg_volume || 0,
            competition: String(item.competition), 
            opportunity_score: item.opportunity_score,
            volume_history: item.volumes_history || [],
            is_trending: item.status?.trending || false,
            is_evergreen: item.status?.evergreen || false,
            is_promising: item.status?.promising || false,
            insight: item.insight || null,
            is_top: item.is_top ?? null
        }));

        // Delete old stats before inserting fresh ones (handles re-analysis / Refresh Data)
        const { error: statsDeleteError } = await supabase
            .from('listing_seo_stats')
            .delete()
            .eq('listing_id', activeListingId);

        if (statsDeleteError) throw statsDeleteError;

        const { error: statsInsertError } = await supabase
            .from('listing_seo_stats')
            .insert(statsToInsert);

        if (statsInsertError) throw statsInsertError;

        // 5. Update UI
        const formattedResults = {
            title: generatedTitle === "SEO Analysis Completed" ? null : generatedTitle, // Use null to trigger "Ready to Craft" state
            description: generatedDescription === "Please review the competition analysis below." ? null : generatedDescription,
            imageUrl: publicUrl,
            global_strength: globalStrength,
            status_label: statusLabel,
            strategic_verdict: strategicVerdict,
            improvement_priority: improvementPriority,
            tags: statsToInsert.map(s => s.tag),
            analytics: statsToInsert.map(s => ({
                keyword: s.tag,
                volume: s.search_volume,
                competition: s.competition,
                score: s.opportunity_score,
                volume_history: s.volume_history,
                is_trending: s.is_trending,
                is_evergreen: s.is_evergreen,
                is_promising: s.is_promising,
                insight: s.insight,
                is_top: s.is_top
            }))
        };

        // 6. Switch skeleton phase to 'insight' and set results
        setIsInsightLoading('insight');
        setResults(formattedResults);

        // Auto-trigger Insight generation
        handleGenerateInsight(formattedResults, formData, activeListingId);

    } catch (err) {
        console.error("Error in handleAnalyze:", err);
        if (err.response) {
            console.error("Webhook Error Response:", err.response.data);
            toast.error(`Analysis failed: Server returned ${err.response.status}. Check console for details.`);
        } else if (err.request) {
            console.error("Webhook No Response:", err.request);
            toast.error("Analysis failed: No response from analysis server. Check your connection.");
        } else {
             toast.error("An error occurred: " + err.message);
        }
        setIsLoading(false);
        setIsInsightLoading(false);
    }
  };

  const handleRelaunchSEO = () => {
      if (!analysisContext || !results?.imageUrl) return;
      
      const relaunchData = {
          ...analysisContext,
          existingImageUrl: results.imageUrl
      };
      
      setPendingRelaunchData(relaunchData);
      setShowConfirmModal(true);
  };

  const executeRelaunch = () => {
      if (pendingRelaunchData) {
          handleAnalyze(pendingRelaunchData);
          setPendingRelaunchData(null);
      }
  };



  const handleGenerateDraft = async (selectedTags = []) => {
      console.log("Draft Gen: Context Check", { isGeneratingDraft, hasResults: !!results, hasContext: !!analysisContext });
      if (isGeneratingDraft || !results || !analysisContext) {
          console.error("Draft Generation Aborted: Missing prerequisites.");
          return;
      }
      setIsGeneratingDraft(true);

      const statsToUse = selectedTags.length > 0 
          ? results.analytics.filter(k => selectedTags.includes(k.keyword))
          : results.analytics;

      try {
        const payload = {
            action: 'drafting_seo',
            keywords: statsToUse.map(k => ({
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
                image_url: results.imageUrl,
                // Visual analysis fields
                visual_aesthetic: visualAnalysis.aesthetic,
                visual_typography: visualAnalysis.typography,
                visual_graphics: visualAnalysis.graphics,
                visual_colors: visualAnalysis.colors,
                visual_target_audience: visualAnalysis.target_audience,
                visual_overall_vibe: visualAnalysis.overall_vibe,
                categorization: {
                    theme: analysisContext.theme_name || null,
                    niche: analysisContext.niche_name || null,
                    sub_niche: analysisContext.sub_niche_name || null
                },
                product_details: {
                    product_type: analysisContext.product_type_name || "Product",
                    tone: analysisContext.tone_name || "Engaging",
                    client_description: analysisContext.context || ""
                },
                shop_context: {
                    shop_name: profile?.shop_name,
                    shop_bio: profile?.shop_bio,
                    target_audience: profile?.target_audience,
                    brand_tone: profile?.brand_tone,
                    brand_keywords: profile?.brand_keywords,
                    signature_text: profile?.signature_text
                }
            }
        };

        const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL_TEST || 'https://n8n.srv840060.hstgr.cloud/webhook-test/9d856f4f-d5ae-4fce-b2da-72f584288dc2';
        console.log("Calling Draft Webhook:", webhookUrl);

        const response = await axios.post(
            webhookUrl,
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
                    generated_description: description,
                    status_id: STATUS_IDS.COMPLETE
                })
                .eq('id', listingId);
             
             if (updateError) {
                 console.error("Failed to save draft status:", updateError);
                 toast.error("Draft generated but failed to update status.");
             } else {
                 console.log("Listing status updated to COMPLETE");
                 toast.success("Magic Draft generated and listing completed!");
             }
        }

      } catch (err) {
          console.error("Draft generation failed:", err);
          if (err.response) {
               console.error("Webhook Error Response:", err.response.data);
               toast.error(`Draft generation failed: Server returned ${err.response.status}`);
          } else {
               toast.error("Failed to generate draft. Please try again.");
          }
      } finally {
          setIsGeneratingDraft(false);
      }
  };

  // Generate Insight Handler (auto-triggered after generate_seo)
  const handleGenerateInsight = async (formattedResults, formData, activeListingId) => {
    try {
      const statsToUse = formattedResults.analytics || [];

      const payload = {
        action: 'generateInsight',
        listing_id: activeListingId || listingId,
        keywords: statsToUse.map(k => ({
          keyword: k.keyword,
          avg_volume: k.volume,
          competition: typeof k.competition === 'string' && !isNaN(parseFloat(k.competition)) ? parseFloat(k.competition) : k.competition,
          opportunity_score: k.score,
          volumes_history: k.volume_history,
          status: {
            trending: k.is_trending,
            evergreen: k.is_evergreen,
            promising: k.is_promising
          },
          is_sniper_seo: true
        })),
        mockups: [formattedResults.imageUrl],
        payload: {
          image_url: formattedResults.imageUrl,
          visual_aesthetic: visualAnalysis.aesthetic,
          visual_typography: visualAnalysis.typography,
          visual_graphics: visualAnalysis.graphics,
          visual_colors: visualAnalysis.colors,
          visual_target_audience: visualAnalysis.target_audience,
          visual_overall_vibe: visualAnalysis.overall_vibe,
          categorization: {
            theme: formData.theme_name || null,
            niche: formData.niche_name || null,
            sub_niche: formData.sub_niche_name || null
          },
          product_details: {
            product_type: formData.product_type_name || "Product",
            tone: formData.tone_name || "Engaging",
            client_description: formData.context || ""
          },
          shop_context: {
            shop_name: profile?.shop_name,
            shop_bio: profile?.shop_bio,
            target_audience: profile?.target_audience,
            brand_tone: profile?.brand_tone,
            brand_keywords: profile?.brand_keywords,
            signature_text: profile?.signature_text
          }
        },
        metadata: {
          app_version: "1.0.0",
          timestamp: new Date().toISOString()
        }
      };

      const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL_TEST || 'https://n8n.srv840060.hstgr.cloud/webhook-test/9d856f4f-d5ae-4fce-b2da-72f584288dc2';
      console.log("Auto-triggering generateInsight:", webhookUrl);

      const response = await axios.post(webhookUrl, payload);
      console.log("generateInsight Response:", response.data);

      // Parse response (n8n wraps in array)
      const unwrapped = Array.isArray(response.data) ? response.data[0] : response.data;
      if (!unwrapped) {
        console.warn("generateInsight: Empty response");
        return;
      }

      const insightListingId = activeListingId || listingId;

      // 1. Save global audit fields to listings table
      const globalStrength = unwrapped.global_listing_strength ?? null;
      const statusLabel = unwrapped.global_status_label ?? null;
      const strategicVerdict = unwrapped.global_strategic_verdict ?? null;
      const improvementPriority = unwrapped.improvement_priority ?? null;

      const { error: listingUpdateError } = await supabase
        .from('listings')
        .update({
          global_strength: globalStrength,
          status_label: statusLabel,
          strategic_verdict: strategicVerdict,
          improvement_priority: improvementPriority
        })
        .eq('id', insightListingId);

      if (listingUpdateError) {
        console.error("Failed to save insight global fields:", listingUpdateError);
      }

      // 2. Update listing_seo_stats with insight/is_top per keyword
      const keywordsData = unwrapped.keywords || [];
      for (const kw of keywordsData) {
        if (kw.insight !== undefined || kw.is_top !== undefined) {
          const updateFields = {};
          if (kw.insight !== undefined) updateFields.insight = kw.insight;
          if (kw.is_top !== undefined) updateFields.is_top = kw.is_top;

          const { error: kwError } = await supabase
            .from('listing_seo_stats')
            .update(updateFields)
            .eq('listing_id', insightListingId)
            .eq('tag', kw.keyword);

          if (kwError) {
            console.error(`Failed to update insight for "${kw.keyword}":`, kwError);
          }
        }
      }

      // 3. Update UI state for live refresh
      setResults(prev => {
        if (!prev) return prev;
        const updatedAnalytics = prev.analytics.map(existing => {
          const match = keywordsData.find(kw => kw.keyword === existing.keyword);
          if (match) {
            return {
              ...existing,
              insight: match.insight ?? existing.insight,
              is_top: match.is_top ?? existing.is_top
            };
          }
          return existing;
        });
        return {
          ...prev,
          global_strength: globalStrength ?? prev.global_strength,
          status_label: statusLabel ?? prev.status_label,
          strategic_verdict: strategicVerdict ?? prev.strategic_verdict,
          improvement_priority: improvementPriority ?? prev.improvement_priority,
          analytics: updatedAnalytics
        };
      });

      toast.success("Insights generated ✨");

    } catch (err) {
      console.error("handleGenerateInsight error:", err);
      toast.error("Insight generation failed.");
    } finally {
      setIsInsightLoading(false);
    }
  };

  // SEO Sniper Handler
  const handleSEOSniper = async () => {
    if (isSniperLoading || !results || !analysisContext) {
      console.error("SEO Sniper Aborted: Missing prerequisites.");
      return;
    }
    setIsSniperLoading(true);

    try {
      const statsToUse = results.analytics || [];

      const payload = {
        action: 'seo_sniper',
        listing_id: listingId,
        keywords: statsToUse.map(k => ({
          keyword: k.keyword,
          avg_volume: k.volume,
          competition: typeof k.competition === 'string' && !isNaN(parseFloat(k.competition)) ? parseFloat(k.competition) : k.competition,
          opportunity_score: k.score,
          volumes_history: k.volume_history,
          status: {
            trending: k.is_trending,
            evergreen: k.is_evergreen,
            promising: k.is_promising
          },
          insight: k.insight || null,
          is_top: k.is_top ?? null
        })),
        mockups: [results.imageUrl],
        global_audit: {
          global_strength: results.global_strength,
          status_label: results.status_label,
          strategic_verdict: results.strategic_verdict,
          improvement_priority: results.improvement_priority
        },
        payload: {
          image_url: results.imageUrl,
          visual_aesthetic: visualAnalysis.aesthetic,
          visual_typography: visualAnalysis.typography,
          visual_graphics: visualAnalysis.graphics,
          visual_colors: visualAnalysis.colors,
          visual_target_audience: visualAnalysis.target_audience,
          visual_overall_vibe: visualAnalysis.overall_vibe,
          categorization: {
            theme: analysisContext.theme_name || null,
            niche: analysisContext.niche_name || null,
            sub_niche: analysisContext.sub_niche_name || null
          },
          product_details: {
            product_type: analysisContext.product_type_name || "Product",
            tone: analysisContext.tone_name || "Engaging",
            client_description: analysisContext.context || ""
          },
          shop_context: {
            shop_name: profile?.shop_name,
            shop_bio: profile?.shop_bio,
            target_audience: profile?.target_audience,
            brand_tone: profile?.brand_tone,
            brand_keywords: profile?.brand_keywords,
            signature_text: profile?.signature_text
          }
        },
        metadata: {
          app_version: "1.0.0",
          timestamp: new Date().toISOString()
        }
      };

      const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL_TEST || 'https://n8n.srv840060.hstgr.cloud/webhook-test/9d856f4f-d5ae-4fce-b2da-72f584288dc2';
      console.log("Calling SEO Sniper Webhook:", webhookUrl);

      const response = await axios.post(webhookUrl, payload);
      console.log("SEO Sniper Raw Response:", JSON.stringify(response.data).substring(0, 500));
      console.log("SEO Sniper response.data type:", typeof response.data, "isArray:", Array.isArray(response.data));

      // Robust unwrapping: handle string, double-array, or object responses
      let rawData = response.data;
      
      // If response is a string, parse it
      if (typeof rawData === 'string') {
        try { rawData = JSON.parse(rawData); } catch (e) { console.error("Failed to parse sniper response string:", e); }
      }
      
      // Unwrap array (n8n wraps in array)
      let unwrapped = Array.isArray(rawData) ? rawData[0] : rawData;
      
      // Handle double-wrapped arrays: [[{...}]]
      if (Array.isArray(unwrapped)) {
        unwrapped = unwrapped[0];
      }

      console.log("SEO Sniper unwrapped:", unwrapped ? Object.keys(unwrapped) : 'null/undefined');

      if (!unwrapped) {
        toast.error("SEO Sniper: Empty response");
        return;
      }

      // 1. Extract sniper keywords (n8n returns under "listing_seo_stats" or "keywords")
      const sniperKeywords = unwrapped.listing_seo_stats || unwrapped.keywords || [];
      if (sniperKeywords.length === 0) {
        toast.error("SEO Sniper: No keywords returned");
        return;
      }

      // 2. Replace listing_seo_stats in DB with sniper keywords
      const statsToInsert = sniperKeywords.filter(item => item.keyword).map(item => ({
        listing_id: listingId,
        tag: item.keyword,
        search_volume: item.avg_volume || 0,
        competition: String(item.competition),
        opportunity_score: item.opportunity_score,
        volume_history: item.volumes_history || [],
        is_trending: item.status?.trending || false,
        is_evergreen: item.status?.evergreen || false,
        is_promising: item.status?.promising || false,
        insight: item.insight || null,
        is_top: item.is_top ?? null,
        is_sniper_seo: item.is_sniper_seo ?? true
      }));

      // Delete old stats
      const { error: deleteError } = await supabase
        .from('listing_seo_stats')
        .delete()
        .eq('listing_id', listingId);
      if (deleteError) console.error("Failed to delete old stats:", deleteError);

      // Insert new sniper stats
      const { error: insertError } = await supabase
        .from('listing_seo_stats')
        .insert(statsToInsert);
      if (insertError) console.error("Failed to insert sniper stats:", insertError);

      // 3. Update UI state (preserve existing global fields — generateInsight will update them)
      const formattedResults = {
        ...results,
        tags: statsToInsert.map(s => s.tag),
        analytics: statsToInsert.map(s => ({
          keyword: s.tag,
          volume: s.search_volume,
          competition: s.competition,
          score: s.opportunity_score,
          volume_history: s.volume_history,
          is_trending: s.is_trending,
          is_evergreen: s.is_evergreen,
          is_promising: s.is_promising,
          insight: s.insight,
          is_top: s.is_top,
          is_sniper_seo: s.is_sniper_seo
        }))
      };

      setResults(formattedResults);
      toast.success("SEO Sniper keywords updated! 🎯");

      // 5. Auto-trigger generateInsight with new sniper data
      handleGenerateInsight(formattedResults, analysisContext, listingId);

    } catch (err) {
      console.error("SEO Sniper failed:", err);
      if (err.response) {
        toast.error(`SEO Sniper failed: Server returned ${err.response.status}`);
      } else {
        toast.error("SEO Sniper failed. Please try again.");
      }
    } finally {
      setIsSniperLoading(false);
    }
  };

  const handleModifySettings = () => {
    setIsFormCollapsed(prev => !prev);
  };
  
  const handleCancel = () => {
     setIsFormCollapsed(true);
  };

  const handleNewAnalysis = () => {
    setIsFormCollapsed(false);
    setShowResults(false);
    setResults(null);
    setListingId(null);
    setSelectedImage(null);
    setAnalysisContext(null);
    setListingName("");
    setFormKey(prev => prev + 1); // Reset form state
  };

  const handleLoadListing = async (listingId) => {
    try {
        setIsLoading(true);
        // Fetch Listing Details
        const { data: listing, error: listingError } = await supabase
            .from('listings')
            .select(`*, niches(name), themes(name), sub_niches(name), product_types(name), tones(name)`)
            .eq('id', listingId)
            .single();

        if (listingError) throw listingError;

        setListingName(listing.title || "");

        // Fetch SEO Stats
        const { data: stats, error: statsError } = await supabase
            .from('listing_seo_stats')
            .select('*')
            .eq('listing_id', listingId);

        if (statsError) throw statsError;

        // Reconstruct Analysis Context (Handle missing relations gracefully)
        const parsedCustom = listing.custom_listing ? JSON.parse(listing.custom_listing) : {};

        setAnalysisContext({
            theme_name: listing.themes?.name || "",
            niche_name: listing.niches?.name || "",
            sub_niche_name: listing.sub_niches?.name || "", 
            product_type_name: listing.product_types?.name || parsedCustom.product_type || "",
            tone_name: listing.tones?.name || "",
            context: listing.user_description,
            // ID mappings for relaunch
            product_type_id: listing.product_type_id,
            tone_id: listing.tone_id,
            theme_id: listing.theme_id,
            niche_id: listing.niche_id,
            sub_niche_id: listing.sub_niche_id,
            custom_theme: parsedCustom.theme || null,
            custom_niche: parsedCustom.niche || null,
            custom_sub_niche: parsedCustom.sub_niche || null,
            tag_count: 15
        });

        // Set Results
        setResults({
            title: listing.generated_title,
            description: listing.generated_description,
            imageUrl: listing.image_url,
            global_strength: listing.global_strength ?? null,
            status_label: listing.status_label ?? null,
            strategic_verdict: listing.strategic_verdict ?? null,
            improvement_priority: listing.improvement_priority ?? null,
            analytics: stats.map(s => ({
                keyword: s.tag,
                volume: s.search_volume,
                competition: s.competition,
                score: s.opportunity_score,
                volume_history: s.volume_history,
                is_trending: s.is_trending,
                is_evergreen: s.is_evergreen,
                is_promising: s.is_promising,
                insight: s.insight || null,
                is_top: s.is_top ?? null,
                is_sniper_seo: s.is_sniper_seo ?? false
            }))
        });

        setListingId(listingId);
      
      // Hydrate Visual Analysis fields
      setVisualAnalysis({
          aesthetic: listing.visual_aesthetic || "",
          typography: listing.visual_typography || "",
          graphics: listing.visual_graphics || "",
          colors: listing.visual_colors || "",
          target_audience: listing.visual_target_audience || "",
          overall_vibe: listing.visual_overall_vibe || ""
      });

      setShowResults(true);
        setIsFormCollapsed(true);
        setIsLoading(false);

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err) {
        console.error("Error loading listing:", err);
        toast.error("Failed to load listing.");
        setIsLoading(false);
    }
  };

  useEffect(() => {
    if (location.state?.listingId) {
        handleLoadListing(location.state.listingId);
        // Clear state to prevent reload loop (optional, but good practice)
        window.history.replaceState({}, document.title)
    }
  }, [location.state]);



  // Helper for Breadcrumbs
  const getContextString = () => {
    if (!analysisContext) return "Analysis";
    const { theme_name, niche_name, product_type_name, tone_name } = analysisContext;
    return (
        <div className="flex items-center gap-1 text-sm text-slate-600">
            <span className="font-semibold text-indigo-700">{theme_name}</span>
            <ChevronRight size={14} className="text-slate-400" />
            <span>{niche_name}</span>
            <span className="text-slate-300 mx-2">|</span>
            <span>{product_type_name}</span>
            <span className="text-slate-300 mx-2">|</span>
            <span className="italic">{tone_name}</span>
        </div>
    );
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
           {/* Generator Section (Collapsible) */}
           <motion.div 
             className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
             animate={{ 
                height: isFormCollapsed ? 'auto' : 'auto', // We let inner content drive height, but wrapper adapts
             }}
             layout
           >
              {/* Header or Banner */}
              <AnimatePresence initial={false}>
                  {isFormCollapsed && (
                    <motion.div 
                        key="banner"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex items-center justify-between p-4 bg-white border-b border-indigo-50"
                    >
                         <div className="flex items-center gap-4">
                            {/* Tiny Thumbnail */}
                            {results?.imageUrl && (
                                <img 
                                    src={results.imageUrl} 
                                    alt="Product" 
                                    className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-sm"
                                />
                            )}
                            
                            {/* Breadcrumbs */}
                            {getContextString()}
                         </div>

                         {/* Actions */}
                         <div className="flex items-center gap-2">
                             <motion.button
                                onClick={handleModifySettings}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                animate={isFormCollapsed 
                                    ? { boxShadow: ["0 0 0 0 rgba(79, 70, 229, 0)", "0 0 0 4px rgba(79, 70, 229, 0.1)"] }
                                    : { boxShadow: "none" }
                                }
                                transition={{ boxShadow: { duration: 2, repeat: Infinity, active: isFormCollapsed } }}
                                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors
                                   ${!isFormCollapsed 
                                       ? 'text-slate-500 bg-slate-50 border-slate-200 hover:bg-slate-100 hover:text-slate-700' 
                                       : 'text-indigo-600 bg-indigo-50 border-indigo-200 hover:bg-indigo-100'
                                   }`}
                             >
                                {isFormCollapsed ? (
                                    <>
                                        <Edit3 size={14} />
                                        Modify Settings
                                    </>
                                ) : (
                                    <>
                                        <ChevronUp size={14} />
                                        Close
                                    </>
                                )}
                             </motion.button>

                             <button
                                onClick={handleNewAnalysis}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                             >
                                <RefreshCw size={14} />
                                New Analysis
                             </button>
                         </div>
                    </motion.div>
                  )}
              </AnimatePresence>

              {/* Form Content - Always Mounted to Preserve State */}
              <motion.div
                  animate={{
                      height: isFormCollapsed ? 0 : 'auto',
                      opacity: isFormCollapsed ? 0 : 1,
                      pointerEvents: isFormCollapsed ? 'none' : 'auto'
                  }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  style={{ overflow: 'hidden' }}
              >
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                        <Sparkles className="text-indigo-600" size={18} />
                        <h2 className="font-bold text-slate-900">NEW OPTIMIZATION</h2>
                    </div>
                    
                    <div className="p-8">
                        <div className="mb-6">
                           <label htmlFor="listingName" className="block text-sm font-medium text-slate-700 mb-1">Listing name</label>
                           <input
                              type="text"
                              id="listingName"
                              value={listingName}
                              onChange={(e) => setListingName(e.target.value)}
                              placeholder="e.g. Vintage Floral T-Shirt"
                              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 text-slate-900"
                           />
                        </div>

                        {/* NEW 2-Column Grid Layout */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                            
                            {/* Left Column: Image Area */}
                            <div className="md:col-span-1 flex flex-col gap-4">
                                <div className={`relative rounded-xl overflow-hidden transition-all ${isAnalyzingDesign ? 'ring-4 ring-indigo-500/20' : ''}`}>
                                    <ImageUpload 
                                        key={`img-${formKey}`} 
                                        onFileSelect={setSelectedImage} 
                                        initialImage={results?.imageUrl}
                                        compact={true} 
                                    />
                                    {isAnalyzingDesign && (
                                        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-10">
                                             <div className="flex flex-col items-center">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2"></div>
                                                <span className="text-xs font-bold text-indigo-700 animate-pulse">Analyzing...</span>
                                             </div>
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={handleAnalyzeDesign}
                                    disabled={!selectedImage && !results?.imageUrl || isAnalyzingDesign}
                                    className="w-full py-2.5 px-4 rounded-xl border-2 border-indigo-600 text-indigo-600 font-bold text-sm hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
                                >
                                    <Sparkles size={16} className="group-hover:animate-pulse" />
                                    Analyze Design
                                </button>
                            </div>

                            {/* Right Column: Visual Analysis Fields */}
                            <div className="md:col-span-2 bg-slate-50/50 rounded-2xl p-6 border border-slate-100">
                                <div className="flex items-center gap-2 mb-4">
                                    <Wand2 size={16} className="text-indigo-500" />
                                    <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Visual Analysis</h3>
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="group">
                                        <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                                            <Palette size={12} />
                                            Aesthetic Style
                                        </label>
                                        <textarea 
                                            data-visual-field
                                            rows={1}
                                            value={visualAnalysis.aesthetic}
                                            onChange={(e) => setVisualAnalysis({...visualAnalysis, aesthetic: e.target.value})}
                                            onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                                            placeholder="e.g. Minimalist, Boho..."
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none overflow-hidden"
                                        />
                                    </div>
                                    
                                    <div className="group">
                                        <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                                            <Type size={12} />
                                            Typography
                                        </label>
                                        <textarea 
                                            data-visual-field
                                            rows={1}
                                            value={visualAnalysis.typography}
                                            onChange={(e) => setVisualAnalysis({...visualAnalysis, typography: e.target.value})}
                                            onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                                            placeholder="e.g. Bold Serif..."
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none overflow-hidden"
                                        />
                                    </div>

                                    <div className="group">
                                        <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                                            <LayoutTemplate size={12} />
                                            Graphic Elements
                                        </label>
                                        <textarea 
                                            data-visual-field
                                            rows={1}
                                            value={visualAnalysis.graphics}
                                            onChange={(e) => setVisualAnalysis({...visualAnalysis, graphics: e.target.value})}
                                            onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                                            placeholder="e.g. Geometric shapes..."
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none overflow-hidden"
                                        />
                                    </div>

                                    <div className="group">
                                        <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                                            <Palette size={12} />
                                            Color Palette
                                        </label>
                                        <textarea 
                                            data-visual-field
                                            rows={1}
                                            value={visualAnalysis.colors}
                                            onChange={(e) => setVisualAnalysis({...visualAnalysis, colors: e.target.value})}
                                            onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                                            placeholder="e.g. Earth tones..."
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none overflow-hidden"
                                        />
                                    </div>
                                    
                                    {/* Full width items */}
                                    <div className="sm:col-span-2">
                                        <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                                            <Target size={12} />
                                            Target Audience
                                        </label>
                                        <textarea 
                                            data-visual-field
                                            rows={1}
                                            value={visualAnalysis.target_audience}
                                            onChange={(e) => setVisualAnalysis({...visualAnalysis, target_audience: e.target.value})}
                                            onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                                            placeholder="Who is this for? e.g. Gen Z..."
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none overflow-hidden"
                                        />
                                    </div>
                                    
                                     <div className="sm:col-span-2">
                                        <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                                            <Heart size={12} />
                                            Overall Vibe
                                        </label>
                                        <textarea 
                                            data-visual-field
                                            rows={1}
                                            value={visualAnalysis.overall_vibe}
                                            onChange={(e) => setVisualAnalysis({...visualAnalysis, overall_vibe: e.target.value})}
                                            onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                                            placeholder="e.g. Cozy, energetic, professional..."
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none overflow-hidden"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
   <OptimizationForm 
       key={`form-${formKey}`} 
       onAnalyze={handleAnalyze} 
       onSaveDraft={handleSaveDraft}
       isImageSelected={!!selectedImage || (!!results && !!results.imageUrl)}
       isLoading={isLoading} 
       onCancel={results ? handleCancel : null} 
       initialValues={analysisContext}
   />
                    </div>
              </motion.div>
           </motion.div>
           
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

           {/* Results Section (show skeleton even without results during loading phases) */}
           {(showResults && !isLoading && (results || isInsightLoading)) && (
             <ResultsDisplay 
               results={results} 
               isGeneratingDraft={isGeneratingDraft}
               onGenerateDraft={handleGenerateDraft}
               onRelaunchSEO={handleRelaunchSEO}
               onSEOSniper={handleSEOSniper}
               isSniperLoading={isSniperLoading}
               isInsightLoading={isInsightLoading}
              />
           )}

           <RecentOptimizations onViewResults={handleLoadListing} />

        </div>

      </div>
      <ConfirmationModal 
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={executeRelaunch}
        title="Relaunch Analysis?"
        message="This action will consume 1 credit to re-analyze the current image with the updated settings. Do you want to continue?"
        confirmText="Yes, Relaunch"
      />

    </Layout>
  );
};

export default ProductStudio;
