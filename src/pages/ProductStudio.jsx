import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import { Wand2, History, RotateCcw, AlertTriangle, ArrowRight, Loader2, Sparkles, Shirt, ChevronUp, ChevronRight, Palette, Type, LayoutTemplate, Heart, Target, Save, Zap } from 'lucide-react';
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
 
 const AutoResizeTextarea = ({ value, onChange, placeholder, className, ...props }) => {
   const textareaRef = useRef(null); // useRef is imported in the file? Yes line 1 says import { useState, useEffect }... wait check line 1.
 
   useEffect(() => {
     if (textareaRef.current) {
       textareaRef.current.style.height = 'auto';
       textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
     }
   }, [value]);
 
   return (
     <textarea
       ref={textareaRef}
       value={value}
       onChange={onChange}
       placeholder={placeholder}
       className={`resize-none overflow-hidden ${className}`}
       rows={1}
       {...props}
     />
   );
 };
 
 const formatCategorizationPayload = (context) => {
    // Simplified payload for text-based system
    return {
        theme: context.theme_name || null,
        niche: context.niche_name || null,
        sub_niche: context.sub_niche_name || null,
        custom_niche: null, // Legacy field, keeping null for safety
        custom_listing: context.custom_listing || null
    };
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

  const [isInsightLoading, setIsInsightLoading] = useState(false); // false | 'seo' | 'insight'
  const [isCompetitionLoading, setIsCompetitionLoading] = useState(false);
  const [isSniperLoading, setIsSniperLoading] = useState(false);
  
  // Strategy Switcher State
  const [activeMode, setActiveMode] = useState('balanced');
  const [globalEvals, setGlobalEvals] = useState([]); // Stores all loaded evaluations
  const [allSeoStats, setAllSeoStats] = useState([]); // Stores all loaded stats
  const [analysisContext, setAnalysisContext] = useState(null);
  const [listingName, setListingName] = useState("");
  const [isImageAnalyzedState, setIsImageAnalyzedState] = useState(false);
  
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

  // Active Session State for "New Listing" flow
  const [isNewListingActive, setIsNewListingActive] = useState(false);

  // No changes to imports

  // ... (keep useEffect for realtime as a backup or removal? Let's keep it but focusing on the direct response)
  // Actually, if we handle it here, we might double-fetch if realtime also triggers. 
  // But since the Status won't change to 'completed' until WE do it here, the realtime won't fire early.
  // Let's rely on the direct response for speed and reliability if N8N returns data.
  // Auto-resize visual analysis textareas when values change programmatically

  // Ref for OptimizationForm to access its state
  const optimizationFormRef = useRef(null);

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

               // IMMEDIATELY update results with the new URL so it persists across re-renders
               setResults(prev => ({ ...(prev || {}), imageUrl: newUrl }));
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

          
          // Handle n8n array structure: [{ output: { visual_analysis: { ... } } }]
          // Or direct object if changed later
          const responseData = Array.isArray(response.data) ? response.data[0] : response.data;
          const data = responseData?.output?.visual_analysis || responseData?.visual_analysis || responseData;

          if (data) {
              // Extract new categorization fields from AI response
              const aiTheme = data.theme || "";
              const aiNiche = data.niche || "";
              const aiSubNiche = data["sub-niche"] || data.sub_niche || "";

              // Capture current form state (Product Type, Instructions) to preserve/save
              const currentFormData = optimizationFormRef.current?.getCurrentState() || {};

              setVisualAnalysis({
                  aesthetic: data.aesthetic_style || "",
                  typography: data.typography_details || "",
                  graphics: data.graphic_elements || "",
                  colors: data.color_palette || "",
                  target_audience: data.target_audience || "",
                  overall_vibe: data.overall_vibe || "",
                  // Add these to state so we can pass them to form via a prop or context update
                  theme: aiTheme,
                  niche: aiNiche,
                  sub_niche: aiSubNiche
              });

              // Force update form initialValues by updating analysisContext or a specific state
              // We'll use a new state or force re-render by updating key
              setAnalysisContext(prev => ({
                    ...prev,
                    theme_name: aiTheme,
                    niche_name: aiNiche,
                    sub_niche_name: aiSubNiche,
                    // Ensure other fields are preserved if they exist
              }));
              
              // Also update formKey to force re-initialization of OptimizationForm with new values
              // setFormKey(prev => prev + 1); // REMOVED: Prevent form reset (keeps Product Type)


              setIsImageAnalyzedState(true);

              const dbPayload = {
                  is_image_analysed: true,
                  visual_aesthetic: data.aesthetic_style,
                  visual_typography: data.typography_details,
                  visual_graphics: data.graphic_elements,
                  visual_colors: data.color_palette,
                  visual_target_audience: data.target_audience,
                  visual_overall_vibe: data.overall_vibe,
                  
                  // Save categorization (AI Priority)
                  theme: aiTheme,
                  niche: aiNiche,
                  sub_niche: aiSubNiche,
                  
                  // Save Manual Fields (User Priority)
                  product_type_id: currentFormData.product_type_id,
                  user_description: currentFormData.context, // Instructions/Details
                  
                  // We could also save product_type_name if we stored it, but ID is usually enough. 
                  // If product_type_id is null/custom, maybe we need validation?
                  // For now, save what we have. It might be null if not selected.
                  
                  image_url: publicUrl
              };

              if (listingId) {
                  const { error: updateError } = await supabase
                      .from('listings')
                      .update(dbPayload)
                      .eq('id', listingId);
                  
                  if (updateError) console.error("Failed to update visual analysis stats:", updateError);
              } else {
                  // INSERT new listing if none exists
                   const { data: newListing, error: insertError } = await supabase
                      .from('listings')
                      .insert({
                          ...dbPayload,
                          user_id: user.id,
                          status_id: STATUS_IDS.NEW,
                          title: "New Visual Analysis"
                      })
                      .select()
                      .single();

                   if (insertError) {
                       console.error("Failed to insert new listing for visual analysis:", insertError);
                       toast.error("Failed to save analysis results.");
                   } else {
                       setListingId(newListing.id);
                   }
              }

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
              theme: formData.theme_name,
              niche: formData.niche_name,
              sub_niche: formData.sub_niche_name
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
    setAnalysisContext({
        ...formData,
        is_custom: true // Always treat as custom text now
    });
    // Fallback: Use existing result image if valid and no new image selected
    if (!selectedImage && !formData.existingImageUrl && results?.imageUrl) {

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

        
        // Preserve existing competitor data before clearing state
        const preservedCompetitorSeed = results?.competitor_seed;
        const preservedCompetitorAnalytics = results?.analytics?.filter(k => k.is_competition) || [];


        
        // Show skeleton immediately — user sees loading from the start
        setIsInsightLoading('seo');
        setIsLoading(false);
        setShowResults(true);
        setIsFormCollapsed(true);
        
        
        let publicUrl = formData.existingImageUrl;

        if (formData.existingImageUrl) {

             // Skip upload, use existing URL
        } else {
            // 1. Upload Image

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
            theme: formData.theme_name,
            niche: formData.niche_name,
            sub_niche: formData.sub_niche_name,
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
                categorization: formatCategorizationPayload(formData),
                product_details: {
                    product_type: formData.product_type_name,
                    tone: formData.tone_name,
                    client_description: formData.context,
                    tag_count: formData.tag_count,
                    seo_mode: formData.seo_mode || 'balanced'
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


        const response = await axios.post(
            webhookUrl, 
            webhookPayload
        );


        const responseData = response.data;
        
        let seoAnalysis = [];
        let generatedTitle = results?.title || "SEO Analysis Completed";
        let generatedDescription = results?.description || "Please review the competition analysis below.";

        // Handle different response structures
        // N8N wraps the response in an array: [{global_listing_strength, keywords: [...]}]
        const unwrapped = Array.isArray(responseData) ? responseData[0] : responseData;

        // --- NEW: Multi-Mode Response Handling ---
        const modes = ['broad', 'balanced', 'sniper'];
        const isMultiMode = unwrapped && modes.some(m => unwrapped[m]);

        const keywordArray = unwrapped?.keywords || unwrapped?.seo_analysis;
        
        // Validation Logic: Only throw if NEITHER Multi-Mode NOR Legacy structure is found
        if (!isMultiMode) {
             if (keywordArray && Array.isArray(keywordArray)) {
                 seoAnalysis = keywordArray;
                 // Only update title/desc if explicitly returned by AI
                 if (unwrapped.title) generatedTitle = unwrapped.title;
                 if (unwrapped.description) generatedDescription = unwrapped.description;
             } else if (Array.isArray(responseData) && responseData.length > 0 && responseData[0]?.keyword) {
                 // Case: Response is a flat array of keyword objects directly
                 seoAnalysis = responseData;
             } else {
                 console.warn("Unexpected response structure:", unwrapped);
                 throw new Error("Invalid response structure from analysis service");
             }
        } else {
             // Multi-Mode specific title/desc handling (optional, if N8N provides them at top level)
             if (unwrapped.title) generatedTitle = unwrapped.title;
             if (unwrapped.description) generatedDescription = unwrapped.description;
        }
        
        // Update Listing with Title/Desc
        const { error: updateError } = await supabase
            .from('listings')
            .update({
                generated_title: generatedTitle,
                generated_description: generatedDescription,
                status_id: STATUS_IDS.SEO_DONE,
                title: listingName || generatedTitle, // Use generated title if listing had no name
            })
            .eq('id', activeListingId);

        if (updateError) throw updateError;
        
        let finalFormattedResults = null;
        let newGlobalEvals = [];
        let newSeoStats = [];

        if (isMultiMode) {
            console.log("Processing Internal Multi-Mode Response...");
            
            // Iterate through each mode and save data
            for (const mode of modes) {
                const modeData = unwrapped[mode];
                if (!modeData) continue;

                // Extract fields
                const globalStrength = modeData.listing_strength ?? modeData.global_strength;
                const breakdown = modeData.breakdown || {};
                const stats = modeData.stats || {};
                const keywords = modeData.keywords || [];

                // 1. Upsert Global Eval Data
                let evaluationId = null;
                const globalEvalPayloadInit = {
                    listing_id: activeListingId,
                    seo_mode: mode,
                    global_strength: globalStrength,
                    listing_strength: globalStrength,
                    listing_visibility: breakdown.visibility,
                    listing_conversion: breakdown.conversion,
                    listing_relevance: breakdown.relevance,
                    listing_raw_visibility_index: stats.raw_visibility_index,
                    status_label: modeData.status_label ?? null,
                    strategic_verdict: modeData.strategic_verdict ?? null,
                    updated_at: new Date().toISOString()
                };

                try {
                    const { data: existingRows } = await supabase
                        .from('listings_global_eval')
                        .select('id')
                        .eq('listing_id', globalEvalPayloadInit.listing_id)
                        .eq('seo_mode', globalEvalPayloadInit.seo_mode);

                    if (existingRows?.length > 0) {
                         evaluationId = existingRows[0].id;
                         await supabase
                            .from('listings_global_eval')
                            .update(globalEvalPayloadInit)
                            .eq('id', evaluationId);
                    } else {
                         const { data: newEval, error: insertError } = await supabase
                            .from('listings_global_eval')
                            .insert(globalEvalPayloadInit)
                            .select('id')
                            .single();
                         
                         if (insertError) throw insertError;
                         evaluationId = newEval.id;
                    }
                    
                    // Track for local state update
                    newGlobalEvals.push({ ...globalEvalPayloadInit, id: evaluationId });

                } catch (manualErr) {
                    console.error(`Global eval save failed for ${mode}:`, manualErr);
                    continue; // Skip stats if eval failed
                }

                // 2. Insert SEO Stats
                const statsToInsert = keywords.map(item => ({
                    listing_id: activeListingId,
                    tag: item.keyword,
                    search_volume: item.search_volume || 0,
                    competition: String(item.competition), 
                    opportunity_score: item.opportunity_score,
                    volume_history: item.monthly_searches 
                        ? item.monthly_searches.map(m => m.search_volume).reverse() 
                        : (item.volumes_history || []),
                    is_trending: item.status?.trending || false,
                    is_evergreen: item.status?.evergreen || false,
                    is_promising: item.status?.promising || false,
                    insight: item.insight || null,
                    is_top: item.is_top ?? null,
                    transactional_score: item.transactional_score || null,
                    intent_label: item.intent_label || null,
                    niche_score: item.niche_score || null,
                    relevance_label: item.relevance_label || null,
                    is_selection_ia: item.is_selection_ia || false,
                    is_competition: false,
                    evaluation_id: evaluationId
                }));

                try {
                    // Delete old stats for this evaluation
                    if (evaluationId) {
                         await supabase
                            .from('listing_seo_stats')
                            .delete()
                            .eq('evaluation_id', evaluationId) 
                            .eq('is_competition', false);
                    }

                    // Insert new stats
                    if (statsToInsert.length > 0) {
                        const { error: statsInsertError } = await supabase
                            .from('listing_seo_stats')
                            .insert(statsToInsert);
                        if (statsInsertError) throw statsInsertError;
                    }

                    // Track for local state
                    newSeoStats.push(...statsToInsert);

                } catch (statsErr) {
                    console.error(`Stats save failed for ${mode}:`, statsErr);
                }

                // 3. Prepare Formatted Results (Only if Balanced)
                if (mode === 'balanced') {
                    finalFormattedResults = {
                        title: generatedTitle,
                        description: generatedDescription,
                        imageUrl: publicUrl,
                        global_strength: globalStrength,
                        status_label: globalEvalPayloadInit.status_label,
                        strategic_verdict: globalEvalPayloadInit.strategic_verdict,
                        listing_strength: globalStrength,
                        listing_visibility: breakdown.visibility,
                        listing_conversion: breakdown.conversion,
                        listing_relevance: breakdown.relevance,
                        listing_raw_visibility_index: stats.raw_visibility_index,
                        tags: statsToInsert.map(s => s.tag),
                        analytics: [
                            ...statsToInsert.map(s => ({
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
                                transactional_score: s.transactional_score,
                                intent_label: s.intent_label,
                                niche_score: s.niche_score,
                                relevance_label: s.relevance_label,
                                is_selection_ia: s.is_selection_ia,
                                is_competition: false
                            })),
                            ...preservedCompetitorAnalytics
                        ]
                    };
                }
            } // End Loop

            // If "balanced" was missing for some reason, fallback to first available mode for formattedResults?
            // Expectation is balanced always exists. If not, formattedResults stays null and UI might break.
            // Let's ensure strict fallback if balanced is missing but others exist.
            if (!finalFormattedResults && newGlobalEvals.length > 0) {
                 // Fallback to the first processed mode (e.g. broad) simply to show *something*
                 // Note: Ideally we want balanced. check warnings.
                 console.warn("Balanced mode missing in response, falling back to available data.");
            }

        } else {
            // --- Legacy Single-Mode Handling ---
            
            // Extract global audit fields from the unwrapped response
            const globalStrength = unwrapped?.listing_strength ?? unwrapped?.global_listing_strength ?? unwrapped?.global_strength ?? null;
            const statusLabel = unwrapped?.global_status_label ?? unwrapped?.status_label ?? null;
            const strategicVerdict = unwrapped?.global_strategic_verdict ?? unwrapped?.strategic_verdict ?? null;
            const improvementPriority = unwrapped?.improvement_priority ?? null;
            const scoreExplanation = unwrapped?.score_explanation ?? null; 

            const listingVisibility = unwrapped?.breakdown?.visibility ?? unwrapped?.listing_visibility ?? null;
            const listingConversion = unwrapped?.breakdown?.conversion ?? unwrapped?.listing_conversion ?? null;
            const listingRelevance = unwrapped?.breakdown?.relevance ?? unwrapped?.listing_relevance ?? null;
            const listingRawVisibilityIndex = unwrapped?.stats?.raw_visibility_index ?? unwrapped?.listing_raw_visibility_index ?? null;

            let evaluationId = null;
            const globalEvalPayloadInit = {
                listing_id: activeListingId,
                seo_mode: formData.seo_mode || 'balanced',
                global_strength: globalStrength,
                status_label: statusLabel, 
                global_status_label: statusLabel,
                strategic_verdict: strategicVerdict,
                global_strategic_verdict: strategicVerdict,
                improvement_priority: improvementPriority,
                score_explanation: scoreExplanation,
                listing_strength: globalStrength,
                listing_visibility: listingVisibility,
                listing_conversion: listingConversion,
                listing_relevance: listingRelevance,
                listing_raw_visibility_index: listingRawVisibilityIndex,
                updated_at: new Date().toISOString()
            };

            // Manual Upsert
            try {
                const { data: existingRows } = await supabase
                    .from('listings_global_eval')
                    .select('id')
                    .eq('listing_id', globalEvalPayloadInit.listing_id)
                    .eq('seo_mode', globalEvalPayloadInit.seo_mode);

                if (existingRows?.length > 0) {
                     evaluationId = existingRows[0].id;
                     await supabase
                        .from('listings_global_eval')
                        .update(globalEvalPayloadInit)
                        .eq('id', evaluationId);
                } else {
                     const { data: newEval, error: insertError } = await supabase
                        .from('listings_global_eval')
                        .insert(globalEvalPayloadInit)
                        .select('id')
                        .single();
                     if (insertError) throw insertError;
                     evaluationId = newEval.id;
                }
                newGlobalEvals.push({ ...globalEvalPayloadInit, id: evaluationId });
            } catch (manualErr) {
                console.error("Global eval save failed (Legacy):", manualErr);
            }

            // Insert SEO Stats
            const statsToInsert = seoAnalysis.filter(item => item.keyword).map(item => ({
                listing_id: activeListingId,
                tag: item.keyword,
                search_volume: item.search_volume || 0,
                competition: String(item.competition), 
                opportunity_score: item.opportunity_score,
                volume_history: item.monthly_searches 
                    ? item.monthly_searches.map(m => m.search_volume).reverse() 
                    : (item.volumes_history || []),
                is_trending: item.status?.trending || false,
                is_evergreen: item.status?.evergreen || false,
                is_promising: item.status?.promising || false,
                insight: item.insight || null,
                is_top: item.is_top ?? null,
                transactional_score: item.transactional_score || null,
                intent_label: item.intent_label || null,
                niche_score: item.niche_score || null,
                relevance_label: item.relevance_label || null,
                is_selection_ia: item.is_selection_ia || false,
                is_competition: false,
                evaluation_id: evaluationId
            }));

            if (evaluationId) {
                 await supabase
                    .from('listing_seo_stats')
                    .delete()
                    .eq('evaluation_id', evaluationId) 
                    .eq('is_competition', false);
            }

            const { error: statsInsertError } = await supabase
                .from('listing_seo_stats')
                .insert(statsToInsert);

            if (statsInsertError) throw statsInsertError;
            
            newSeoStats.push(...statsToInsert);

            finalFormattedResults = {
                title: generatedTitle,
                description: generatedDescription,
                imageUrl: publicUrl,
                global_strength: globalStrength,
                status_label: statusLabel,
                strategic_verdict: strategicVerdict,
                improvement_priority: improvementPriority,
                score_explanation: scoreExplanation,
                listing_strength: globalStrength,
                listing_visibility: listingVisibility,
                listing_conversion: listingConversion,
                listing_relevance: listingRelevance,
                listing_raw_visibility_index: listingRawVisibilityIndex,
                tags: statsToInsert.map(s => s.tag),
                analytics: [
                    ...statsToInsert.map(s => ({
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
                        transactional_score: s.transactional_score,
                        intent_label: s.intent_label,
                        niche_score: s.niche_score,
                        relevance_label: s.relevance_label,
                        is_selection_ia: s.is_selection_ia,
                        is_competition: false
                    })),
                    ...preservedCompetitorAnalytics
                ]
            };
        }

        // --- Common Post-Processing ---

        // Update Local State with accumulated changes
        setGlobalEvals(prev => {
            // Remove any evals that we just updated (by ID) to avoid duplicates, then prepend new ones
            const updatedIds = newGlobalEvals.map(e => e.id);
            const filtered = prev.filter(e => !updatedIds.includes(e.id));
            return [...newGlobalEvals, ...filtered];
        });
        
        setAllSeoStats(prev => {
            // We need to be careful with removal. 
            // Better to remove based on the evaluation_ids we touched.
            const touchedEvalIds = newGlobalEvals.map(e => e.id);
            const filtered = prev.filter(s => !touchedEvalIds.includes(s.evaluation_id));
            return [...filtered, ...newSeoStats];
        });

        // Force switch to Balanced mode if multi-mode, or just use whatever mode we processed
        if (isMultiMode) {
             setActiveMode('balanced');
        } else {
             setActiveMode(formData.seo_mode || 'balanced');
        }

        // 6. Switch skeleton phase to 'insight' and set results
        setIsInsightLoading('insight');
        if (finalFormattedResults) {
            setResults(finalFormattedResults);
            // Auto-trigger Insight generation
            handleGenerateInsight(finalFormattedResults, formData, activeListingId);
        } else {
            console.error("No formatted results generated.");
            toast.error("Failed to process analysis results.");
        }

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




  const handleSaveListingInfo = async (title, description) => {
    if (!listingId) {
        toast.error("No active listing to save.");
        return;
    }

    try {
        const { error } = await supabase
            .from('listings')
            .update({
                generated_title: title,
                generated_description: description
            })
            .eq('id', listingId);

        if (error) throw error;
        
        // Update local state to reflect saved changes
        setResults(prev => ({
            ...prev,
            title: title,
            description: description
        }));

        toast.success("Listing saved successfully!");
    } catch (err) {
        console.error("Error saving listing info:", err);
        toast.error("Failed to save changes.");
    }
  };

  const handleGenerateDraft = async (selectedTags = []) => {

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
                categorization: formatCategorizationPayload(analysisContext),
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

  // Inline "Add Keyword" Handler
  const [isAddingKeyword, setIsAddingKeyword] = useState(false);

  const handleAddCustomKeyword = async (newKeyword, onSuccess) => {
      if (!newKeyword || !results || !results.analytics) return;
      
      const currentListingId = listingId || results?.listing_id;
      if (!currentListingId) {
          toast.error("Error: Missing listing ID");
          return;
      }

      const normalizedKeyword = newKeyword.toLowerCase();
      // 1. Check for duplicates in current analytics table
      const isDuplicate = results.analytics.some(a => a.keyword.toLowerCase() === normalizedKeyword);
      if (isDuplicate) {
           toast.error(`"${newKeyword}" is already in the performance table.`);
           if (onSuccess) onSuccess(); // close row anyway
           return;
      }

      setIsAddingKeyword(true);
      try {
          const formData = optimizationFormRef.current?.getCurrentState ? optimizationFormRef.current.getCurrentState() : {};
          
          // 2. N8N Webhook Call - using same payload structure as generate_seo plus the custom keyword
          const payload = {
              action: 'userKeyword',
              keyword: newKeyword,
              listing_id: currentListingId,
              user_id: user?.id,
              payload: {
                  image_url: results?.imageUrl,
                  // Visual analysis fields
                  visual_aesthetic: visualAnalysis.aesthetic,
                  visual_typography: visualAnalysis.typography,
                  visual_graphics: visualAnalysis.graphics,
                  visual_colors: visualAnalysis.colors,
                  visual_target_audience: visualAnalysis.target_audience,
                  visual_overall_vibe: visualAnalysis.overall_vibe,
                  categorization: formatCategorizationPayload(formData),
                  product_details: {
                      product_type: formData.product_type_name || "Product",
                      tone: formData.tone_name || "Engaging",
                      client_description: formData.context || "",
                      tag_count: formData.tag_count,
                      seo_mode: formData.seo_mode || activeMode || 'balanced'
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
          const response = await axios.post(webhookUrl, payload);
          
          // Unwrap array if returned
          let rawData = Array.isArray(response.data) ? response.data[0] : response.data;
          
          // Check for multi-mode format (e.g. data is nested under 'balanced', 'broad', etc.)
          const defaultMode = activeMode || 'balanced';
          if (rawData && typeof rawData === 'object' && rawData[defaultMode]) {
              // Extract the first keyword from the mode stack array
              rawData = Array.isArray(rawData[defaultMode]) ? rawData[defaultMode][0] : rawData[defaultMode];
          } else if (rawData && typeof rawData === 'object' && !rawData.keyword && Object.values(rawData).length > 0) {
              // Fallback just in case they sent a different key
              const firstValue = Object.values(rawData)[0];
              if (Array.isArray(firstValue)) rawData = firstValue[0];
          }

          const responseData = rawData;
          
          if (!responseData || (responseData.volume === undefined && responseData.search_volume === undefined)) {
               console.error("Malformed response from server:", responseData);
               throw new Error("Invalid keyword data returned from server.");
          }

          // 3. Shape the data
          const newStat = {
              tag: responseData.keyword || newKeyword,
              search_volume: responseData.search_volume !== undefined ? responseData.search_volume : (responseData.volume || 0),
              competition: responseData.competition !== undefined ? String(responseData.competition) : "0",
              opportunity_score: responseData.opportunity_score !== undefined ? responseData.opportunity_score : (responseData.score || 0),
              volume_history: Array.isArray(responseData.monthly_searches) 
                  ? responseData.monthly_searches.map(m => m.search_volume || 0)
                  : (responseData.volume_history || []),
              is_trending: responseData.status?.trending || false,
              is_evergreen: responseData.status?.evergreen || false,
              is_promising: responseData.status?.promising || false,
              insight: responseData.insight || null,
              is_top: responseData.is_top || null,
              transactional_score: responseData.transactional_score || null,
              intent_label: responseData.intent_label || null,
              niche_score: responseData.niche_score || null,
              relevance_label: responseData.relevance_label || null,
              is_selection_ia: responseData.is_selection_ia !== undefined ? responseData.is_selection_ia : true, // Map from response if present
              is_user_added: true,   // Flag as user added per requirement
              is_competition: false, // It's standard, not competitor
              listing_id: currentListingId
          };

          // We need the current active evaluation_id to link it properly in the DB
          let currentEvalId = null;
          if (globalEvals && globalEvals.length > 0) {
               const activeEval = globalEvals.find(e => e.seo_mode === activeMode) || globalEvals[0];
               currentEvalId = activeEval.id;
               newStat.evaluation_id = currentEvalId;
          }

          // 4. Save to DB
          const { error: insertError } = await supabase
              .from('listing_seo_stats')
              .insert([newStat]);
              
          if (insertError) {
              console.error("Insert Error (handleAddCustomKeyword):", insertError);
              throw new Error("Failed to save keyword to database.");
          }

          // 5. Update Local State (`allSeoStats`)
          setAllSeoStats(prev => [...prev, newStat]);

          // 6. Update UI State (`results`)
          const formattedNewStat = {
             keyword: newStat.tag,
             volume: newStat.search_volume,
             competition: newStat.competition,
             score: newStat.opportunity_score,
             volume_history: newStat.volume_history,
             is_trending: newStat.is_trending,
             is_evergreen: newStat.is_evergreen,
             is_promising: newStat.is_promising,
             insight: newStat.insight,
             is_top: newStat.is_top,
             transactional_score: newStat.transactional_score,
             intent_label: newStat.intent_label,
             niche_score: newStat.niche_score,
             relevance_label: newStat.relevance_label,
             is_selection_ia: newStat.is_selection_ia,
             is_competition: newStat.is_competition,
             is_user_added: newStat.is_user_added
          };

          setResults(prev => {
              if (!prev) return prev;
              const newAnalytics = [...(prev.analytics || [])];
              // Insert before competition keywords (at the end of primary keywords)
              const firstCompIndex = newAnalytics.findIndex(k => k.is_competition);
              if (firstCompIndex !== -1) {
                  newAnalytics.splice(firstCompIndex, 0, formattedNewStat);
              } else {
                  newAnalytics.push(formattedNewStat);
              }
              return { ...prev, analytics: newAnalytics };
          });

          toast.success(`Keyword "${formattedNewStat.keyword}" added successfully!`);
          
          if (onSuccess) onSuccess();

      } catch (err) {
          console.error("Error adding custom keyword:", err);
          toast.error(err.message || "Failed to add keyword.");
      } finally {
          setIsAddingKeyword(false);
      }
  };

  // Generate Insight Handler (auto-triggered after generate_seo or seo_sniper)
  const handleGenerateInsight = async (formattedResults, formData, activeListingId, fromSniper = false) => {
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
          is_sniper_seo: fromSniper,
          transactional_score: k.transactional_score,
          intent_label: k.intent_label,
          niche_score: k.niche_score,
          relevance_label: k.relevance_label
        })),
        mockups: [formattedResults.imageUrl],
        global_audit: {
           global_strength: formattedResults.global_strength,
           status_label: formattedResults.status_label,
           strategic_verdict: formattedResults.strategic_verdict,
           improvement_priority: formattedResults.improvement_priority,
           // New metrics
           listing_strength: formattedResults.listing_strength,
           listing_visibility: formattedResults.listing_visibility,
           listing_conversion: formattedResults.listing_conversion,
           listing_relevance: formattedResults.listing_relevance,
           listing_raw_visibility_index: formattedResults.listing_raw_visibility_index
        },
        payload: {
          image_url: formattedResults.imageUrl,
          visual_aesthetic: visualAnalysis.aesthetic,
          visual_typography: visualAnalysis.typography,
          visual_graphics: visualAnalysis.graphics,
          visual_colors: visualAnalysis.colors,
          visual_target_audience: visualAnalysis.target_audience,
          visual_overall_vibe: visualAnalysis.overall_vibe,
          categorization: formatCategorizationPayload(formData),
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


      const response = await axios.post(webhookUrl, payload);


      // Parse response (n8n wraps in array)
      const unwrapped = Array.isArray(response.data) ? response.data[0] : response.data;
      if (!unwrapped) {
        console.warn("generateInsight: Empty response");
        return;
      }

      const insightListingId = activeListingId || listingId;

      // 1. Get SEO Mode 
      // PRIORITY: Use valid mode from payload (formData) if available. Failsafe to Ref or 'balanced'.
      const currentState = optimizationFormRef.current?.getCurrentState ? optimizationFormRef.current.getCurrentState() : {};
      const seoMode = formData?.seo_mode || currentState.seo_mode || 'balanced';

      // 1.1 Update listings table (legacy columns + new metrics for easy access)
      // Legacy columns update removed - data is now saved to listings_global_eval
      // We keep the variable extraction if needed for listings_global_eval payload construction
      
      // PRIORITY: Use formattedResults (arg1) for fields that come from the FIRST webhook (handleAnalyze)
      // Fallback to unwrapped (current webhook) if formattedResults is missing them, but strictly prefer formattedResults
      // because the second webhook often returns these as null/undefined.
      const globalStrength = formattedResults?.global_strength ?? unwrapped.global_strength ?? unwrapped.global_listing_strength; 
      const statusLabel = formattedResults?.status_label ?? unwrapped.status_label ?? unwrapped.global_status_label;
      const strategicVerdict = formattedResults?.strategic_verdict ?? unwrapped.strategic_verdict ?? unwrapped.global_strategic_verdict;
      const improvementPriority = formattedResults?.improvement_priority ?? unwrapped.improvement_priority;
      const scoreExplanation = formattedResults?.score_explanation ?? unwrapped.score_explanation;

      // Extract new metric fields (Same priority logic)
      const listingStrength = formattedResults?.listing_strength ?? unwrapped.listing_strength ?? unwrapped?.global_listing_strength;
      const listingVisibility = formattedResults?.listing_visibility ?? unwrapped?.breakdown?.visibility ?? unwrapped.listing_visibility;
      const listingConversion = formattedResults?.listing_conversion ?? unwrapped?.breakdown?.conversion ?? unwrapped.listing_conversion;
      const listingRelevance = formattedResults?.listing_relevance ?? unwrapped?.breakdown?.relevance ?? unwrapped.listing_relevance;
      const listingRawVisibilityIndex = formattedResults?.listing_raw_visibility_index ?? unwrapped?.stats?.raw_visibility_index ?? unwrapped.listing_raw_visibility_index;


      // 1.2 Upsert to listings_global_eval with SEO Mode
      // This is the new source of truth for multi-strategy evaluation
      const scoreJustificationVisibility = unwrapped.score_justification_visibility;
      const scoreJustificationRelevance = unwrapped.score_justification_relevance;
      const scoreJustificationConversion = unwrapped.score_justification_conversion;
      const scoreJustificationStrength = unwrapped.score_justification_strength;
      const improvementPlanRemove = unwrapped.improvement_plan_remove || [];
      const improvementPlanAdd = unwrapped.improvement_plan_add || [];
      const improvementPlanPrimaryAction = unwrapped.improvement_plan_primary_action;











      const globalEvalPayload = {
          listing_id: insightListingId,
          seo_mode: seoMode, // NEW: Save the mode
          // Persist the fields we (likely) got from Step 1
          global_strength: globalStrength,
          // Double-write to legacy and new columns
          status_label: statusLabel,
          global_status_label: statusLabel,
          strategic_verdict: strategicVerdict,
          global_strategic_verdict: strategicVerdict,
          improvement_priority: improvementPriority,
          score_explanation: scoreExplanation,
          
          listing_strength: listingStrength,
          listing_visibility: listingVisibility,
          listing_conversion: listingConversion,
          listing_relevance: listingRelevance,
          listing_raw_visibility_index: listingRawVisibilityIndex,

          // Add the new fields from Step 2
          score_justification_visibility: scoreJustificationVisibility,
          score_justification_relevance: scoreJustificationRelevance,
          score_justification_conversion: scoreJustificationConversion,
          score_justification_strength: scoreJustificationStrength,
          improvement_plan_remove: improvementPlanRemove,
          improvement_plan_add: improvementPlanAdd,
          improvement_plan_primary_action: improvementPlanPrimaryAction,
          
          updated_at: new Date().toISOString()
      };
      
      // Manual Upsert Logic (Inline)
      try {
          const { data: existingRows } = await supabase
              .from('listings_global_eval')
              .select('id')
              .eq('listing_id', globalEvalPayload.listing_id)
              .eq('seo_mode', globalEvalPayload.seo_mode);

          if (existingRows?.length > 0) {
               await supabase
                  .from('listings_global_eval')
                  .update(globalEvalPayload)
                  .eq('id', existingRows[0].id);
          } else {
               await supabase
                  .from('listings_global_eval')
                   .insert(globalEvalPayload);
          }

          // Sync with local globalEvals state
          setGlobalEvals(prev => {
              const updatedList = prev.map(e => {
                  if (e.seo_mode === seoMode && e.listing_id === insightListingId) {
                      return { ...e, ...globalEvalPayload };
                  }
                  return e;
              });
              // If not found (new mode created in this flow?), append it
              if (!updatedList.find(e => e.seo_mode === seoMode && e.listing_id === insightListingId)) {
                   return [{...globalEvalPayload, id: existingRows?.[0]?.id || Date.now() }, ...prev]; // Mock ID if insert didn't return it
              }
              return updatedList;
          });
      } catch (manualErr) {
          console.error("Manual upsert failed (handleGenerateInsight):", manualErr);
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

      // Sync with local allSeoStats state
      setAllSeoStats(prev => {
           return prev.map(s => {
               // Find matching update
               const update = keywordsData.find(k => k.keyword === s.tag && s.listing_id === insightListingId);
               if (update && (s.evaluation_id === undefined || s.seo_mode === seoMode || true)) { // Simplified matching
                   // We really should match by evaluation_id but we might not have it here easily without a lookup
                   // However, s.tag is unique per evaluation. And we know we are updating the current mode.
                   // Actually, we should try to match the stats that belong to the current mode's evaluation.
                   // But for now, tag + listing_id is reasonably safe if we assume we just updated the latest one.
                   return {
                       ...s,
                       insight: update.insight ?? s.insight,
                       is_top: update.is_top ?? s.is_top
                   };
               }
               return s;
           });
      });

      // 3. Update UI — use formattedResults as base (works for both normal and sniper flows)
      const base = formattedResults;
      const updatedAnalytics = base.analytics.map(existing => {
        const match = keywordsData.find(kw => kw.keyword === existing.keyword);
        if (match) {
          return {
            ...existing,
            insight: match.insight ?? existing.insight,
            is_top: match.is_top ?? existing.is_top,
            transactional_score: match.transactional_score ?? existing.transactional_score,
            intent_label: match.intent_label ?? existing.intent_label,
            niche_score: match.niche_score ?? existing.niche_score,
            relevance_label: match.relevance_label ?? existing.relevance_label
          };
        }
        return existing;
      });

      const mergedResults = {
        ...base,
        global_strength: globalStrength ?? base.global_strength,
        status_label: statusLabel ?? base.status_label,
        strategic_verdict: strategicVerdict ?? base.strategic_verdict,
        improvement_priority: improvementPriority ?? base.improvement_priority,
        score_explanation: scoreExplanation ?? base.score_explanation,
        // Update new metrics in local state
        listing_strength: listingStrength ?? base.listing_strength,
        listing_visibility: listingVisibility ?? base.listing_visibility,
        listing_conversion: listingConversion ?? base.listing_conversion,
        listing_relevance: listingRelevance ?? base.listing_relevance,

        listing_raw_visibility_index: listingRawVisibilityIndex ?? base.listing_raw_visibility_index,
        // Global Eval Fields
        score_justification_visibility: scoreJustificationVisibility,
        score_justification_relevance: scoreJustificationRelevance,
        score_justification_conversion: scoreJustificationConversion,
        score_justification_strength: scoreJustificationStrength,
        improvement_plan_remove: improvementPlanRemove,
        improvement_plan_add: improvementPlanAdd,
        improvement_plan_primary_action: improvementPlanPrimaryAction,
        analytics: updatedAnalytics
      };

      // Atomic swap — for sniper flow this is the first time results update
      setResults(mergedResults);
      toast.success("Insights generated ✨");

    } catch (err) {
      console.error("handleGenerateInsight error:", err);
      toast.error("Insight generation failed.");
    } finally {
      // Clear the correct loading state based on caller
      if (fromSniper) {
        setIsSniperLoading(false);
      } else {
        setIsInsightLoading(false);
      }
    }
  };

  // Competition Analysis Handler (same payload as generateInsight, different action)
  const handleCompetitionAnalysis = async () => {
    if (isCompetitionLoading || !results || !analysisContext) {
      console.error("Competition Analysis Aborted: Missing prerequisites.");
      return;
    }
    setIsCompetitionLoading(true);

    try {
      // Only send primary (non-competition) keywords in the payload
      const primaryStats = (results.analytics || []).filter(k => !k.is_competition);

      const payload = {
        action: 'competitionAnalysis',
        listing_id: listingId,
        keywords: primaryStats.map(k => ({
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
          is_sniper_seo: k.is_sniper_seo ?? false,
          transactional_score: k.transactional_score,
          intent_label: k.intent_label,
          niche_score: k.niche_score,
          relevance_label: k.relevance_label
        })),
        mockups: [results.imageUrl],
        payload: {
          image_url: results.imageUrl,
          visual_aesthetic: visualAnalysis.aesthetic,
          visual_typography: visualAnalysis.typography,
          visual_graphics: visualAnalysis.graphics,
          visual_colors: visualAnalysis.colors,
          visual_target_audience: visualAnalysis.target_audience,
          visual_overall_vibe: visualAnalysis.overall_vibe,
          categorization: formatCategorizationPayload(analysisContext),
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


      const response = await axios.post(webhookUrl, payload);



      // Robust parsing: handle multiple n8n response formats
      let rawData = response.data;
      if (typeof rawData === 'string') {
        try { rawData = JSON.parse(rawData); } catch (e) { console.error("Failed to parse competition response string:", e); }
      }

      const unwrapped = Array.isArray(rawData) ? rawData[0] : rawData;


      if (!unwrapped) {
        toast.error("Competition Analysis: Empty response");
        return;
      }

      // Extract competition keywords — handle multiple response formats
      // Format 1 (current): [{ competitor_seed: "...", selectedTags: [...] }]
      // Format 2 (legacy wrapped): [{ keywords: [...] }]
      // Format 3 (legacy flat): [{keyword: "...", ...}, ...]
      let competitionKeywords = unwrapped.selectedTags || unwrapped.keywords || [];
      const competitorSeed = unwrapped.competitor_seed || null;



      // If unwrapped itself is a keyword object (flat array response), use the full rawData array
      if (competitionKeywords.length === 0 && unwrapped.keyword && Array.isArray(rawData)) {
        competitionKeywords = rawData;

      }

      // Handle double-wrapped: unwrapped is itself an array
      if (competitionKeywords.length === 0 && Array.isArray(unwrapped)) {
        competitionKeywords = unwrapped;

      }



      if (competitionKeywords.length === 0) {
        toast.error("Competition Analysis: No keywords returned");
        console.error("Competition Analysis: Could not extract keywords. Full response:", rawData);
        return;
      }

      // Save competitor_seed to listings table
      if (competitorSeed && listingId) {
        const { error: seedError } = await supabase
          .from('listings')
          .update({ competitor_seed: competitorSeed })
          .eq('id', listingId);
        if (seedError) console.error("Failed to save competitor_seed:", seedError);
      }

      // Delete old competition keywords for this listing (keep primary keywords intact)
      const { error: deleteCompError } = await supabase
        .from('listing_seo_stats')
        .delete()
        .eq('listing_id', listingId)
        .eq('is_competition', true);
      if (deleteCompError) console.error("Failed to delete old competition stats:", deleteCompError);

      // Insert new competition keywords
      const compStatsToInsert = competitionKeywords.filter(item => item.keyword).map(item => ({
        listing_id: listingId,
        tag: item.keyword,
        search_volume: item.search_volume || 0,
        competition: String(item.competition),
        opportunity_score: item.opportunity_score,
        volume_history: item.monthly_searches 
            ? item.monthly_searches.map(m => m.search_volume).reverse() 
            : (item.volumes_history || []),
        is_trending: item.status?.trending || false,
        is_evergreen: item.status?.evergreen || false,
        is_promising: item.status?.promising || false,
        insight: item.insight || null,
        is_top: item.is_top ?? null,
        transactional_score: item.transactional_score || null,
        intent_label: item.intent_label || null,
        niche_score: item.niche_score || null,
        relevance_label: item.relevance_label || null,
        is_competition: true
      }));

      if (compStatsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('listing_seo_stats')
          .insert(compStatsToInsert);
        if (insertError) console.error("Failed to insert competition stats:", insertError);
      }

      // Build competition analytics for UI
      const competitionAnalytics = compStatsToInsert.map(s => ({
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
        transactional_score: s.transactional_score,
        intent_label: s.intent_label,
        niche_score: s.niche_score,
        relevance_label: s.relevance_label,
        is_competition: true
      }));

      // Keep existing primary keywords, replace old competition keywords
      const existingPrimary = (results.analytics || []).filter(k => !k.is_competition);

      setResults(prev => ({
        ...prev,
        competitor_seed: competitorSeed,
        analytics: [...existingPrimary, ...competitionAnalytics]
      }));

      toast.success("Competition analysis complete! 📊");

    } catch (err) {
      console.error("Competition Analysis failed:", err);
      toast.error("Competition analysis failed. Please try again.");
    } finally {
      setIsCompetitionLoading(false);
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
    setVisualAnalysis({
        aesthetic: "",
        typography: "",
        graphics: "",
        colors: "",
        target_audience: "",
        overall_vibe: ""
    });
    setFormKey(prev => prev + 1); // Reset form state
    setIsNewListingActive(true); // Manually activate the form for a new session
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

        // Fetch Global Eval Data (Fetch all versions)
        const { data: globalEvalsData } = await supabase
            .from('listings_global_eval')
            .select('*')
            .eq('listing_id', listingId)
            .order('updated_at', { ascending: false });

        setGlobalEvals(globalEvalsData || []);

        // Determine active eval (latest updated or fallback to balanced)
        // Logic: Try to find the last used mode, or default to balanced
        const latestEval = globalEvalsData && globalEvalsData.length > 0 ? globalEvalsData[0] : null;
        let initialMode = latestEval?.seo_mode || 'balanced';
        setActiveMode(initialMode);

        // Fetch ALL SEO Stats for this listing (we will filter in memory/UI)
        let statsQuery = supabase
            .from('listing_seo_stats')
            .select('*')
            .eq('listing_id', listingId);
        
        const { data: stats, error: statsError } = await statsQuery;
        setAllSeoStats(stats || []);

        if (statsError) throw statsError;
        
        // Reconstruct Analysis Context (Handle missing relations gracefully)
        const parsedCustom = listing.custom_listing ? JSON.parse(listing.custom_listing) : {};

        setAnalysisContext({
            theme_name: listing.themes?.name || "",
            niche_name: listing.niches?.name || "",
            sub_niche_name: listing.sub_niches?.name || "",
            
            // Text-based overrides (New approach)
            theme: listing.theme || "",
            niche: listing.niche || "",
            sub_niche: listing.sub_niche || "",

            product_type_name: listing.product_types?.name || "T-Shirt", // Default fallback
            tone_name: listing.tones?.name || "Engaging",
            custom_product_type: listing.custom_product_type, // Persist custom type
            
            // Advanced SEO Settings
            tone: listing.tone || "Auto-detect", 
            max_tags: listing.max_tags || 13,

            context: parsedCustom.context || ""
        });
        
        // Load Visual Analysis from listing columns (New source of truth)
        if (listing.visual_aesthetic) {
             setVisualAnalysis({
                 aesthetic: listing.visual_aesthetic || "",
                 typography: listing.visual_typography || "",
                 graphics: listing.visual_graphics || "",
                 colors: listing.visual_colors || "",
                 target_audience: listing.visual_target_audience || "",
                 overall_vibe: listing.visual_overall_vibe || ""
             });
        }
        
        // Hydrate visual fields in form if empty
        // (Optional: depending on verify logic)

        // Hydrate Form State (Refs)
        // We use a small timeout to let the form mount if it wasn't
        setTimeout(() => {
             if (optimizationFormRef.current) {
                 optimizationFormRef.current.setFormState({
                     theme: listing.theme || listing.themes?.name || "",
                     niche: listing.niche || listing.niches?.name || "",
                     sub_niche: listing.sub_niche || listing.sub_niches?.name || "",
                     tone: listing.tone || "Auto-detect",
                     max_tags: listing.max_tags || 13,
                     seo_mode: initialMode // Set form mode to match loaded data
                 });
             }
        }, 100);

        // Construct Results Object for the ACTIVE mode
        // Find specific eval for the initial mode
        const activeEvalData = globalEvalsData?.find(e => e.seo_mode === initialMode) || latestEval; // Fallback to latest if explicit mode missing
        const activeEvalId = activeEvalData?.id;

        // Filter stats for this eval
        const relevantStats = (stats || []).filter(s => activeEvalId ? s.evaluation_id === activeEvalId : true); // Fallback to all if no eval ID (legacy)

        const constructedResults = {
            title: listing.generated_title,
            description: listing.generated_description,
            imageUrl: listing.image_url,
            // Mode-specific Global Data
            global_strength: activeEvalData?.global_strength ?? listing.global_strength,
            status_label: activeEvalData?.status_label ?? listing.status_label,
            strategic_verdict: activeEvalData?.strategic_verdict ?? listing.strategic_verdict,
            improvement_priority: activeEvalData?.improvement_priority ?? listing.improvement_priority,
            score_explanation: activeEvalData?.score_explanation ?? listing.score_explanation,
            
            listing_strength: activeEvalData?.listing_strength ?? listing.listing_strength,
            listing_visibility: activeEvalData?.listing_visibility ?? listing.listing_visibility,
            listing_conversion: activeEvalData?.listing_conversion ?? listing.listing_conversion,
            listing_relevance: activeEvalData?.listing_relevance ?? listing.listing_relevance,
            listing_raw_visibility_index: activeEvalData?.listing_raw_visibility_index ?? listing.listing_raw_visibility_index,

            // Dashboard Metrics
            score_justification_visibility: activeEvalData?.score_justification_visibility,
            score_justification_relevance: activeEvalData?.score_justification_relevance,
            score_justification_conversion: activeEvalData?.score_justification_conversion,
            score_justification_strength: activeEvalData?.score_justification_strength,
            improvement_plan_remove: activeEvalData?.improvement_plan_remove,
            improvement_plan_add: activeEvalData?.improvement_plan_add,
            improvement_plan_primary_action: activeEvalData?.improvement_plan_primary_action,

            tags: relevantStats.map(s => s.tag),
            competitor_seed: listing.competitor_seed,
            analytics: relevantStats.map(s => ({
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
                transactional_score: s.transactional_score,
                intent_label: s.intent_label,
                niche_score: s.niche_score,
                relevance_label: s.relevance_label,
                is_competition: s.is_competition,
                is_sniper_seo: s.is_sniper_seo, // Preserve sniper flag
                is_selection_ia: s.is_selection_ia,
                is_user_added: s.is_user_added
            }))
        };
        
        setResults(constructedResults);
        // Sync local state for the form button
        setIsImageAnalyzedState(listing.is_image_analysed || listing.is_imageAnalysed || listing.is_imageanalysed || false);

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
    } else if (location.state?.newListing) {
        handleNewAnalysis();
        window.history.replaceState({}, document.title);
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

  // --- ADD COMPETITOR KEYWORD TO PERFORMANCE ---
  const handleAddKeywordToPerformance = async (keywordData) => {
    // Fix: Use state listingId instead of results.listing_id which might be missing
    const currentListingId = listingId || results?.listing_id;
    
    if (!currentListingId) {
        console.error("Missing listing ID. State:", { listingId, results });
        toast.error("Error: Missing listing ID");
        return;
    }

    try {
        const statsToInsert = {
            listing_id: currentListingId,
            tag: keywordData.keyword,
            search_volume: keywordData.volume,
            competition: keywordData.competition,
            opportunity_score: keywordData.score,
            is_competition: false,
            volume_history: keywordData.volume_history || [],
            is_trending: keywordData.is_trending,
            is_evergreen: keywordData.is_evergreen,
            is_promising: keywordData.is_promising
        };



        const { error } = await supabase
            .from('listing_seo_stats')
            .insert(statsToInsert);

        if (error) {
            console.error("Supabase insert error:", error);
            toast.error(`Failed to add keyword: ${error.message}`);
            return;
        }

        toast.success(`Keyword "${keywordData.keyword}" added!`);
        
        // Refresh data
        await handleLoadListing(currentListingId);

    } catch (err) {
        console.error("Unexpected error in handleAddKeywordToPerformance:", err);
        toast.error("An unexpected error occurred");
    }
  };

  const handleSEOSniper = async () => {
      setIsSniperLoading(true);
      try {
          // Trigger analysis with 'sniper' mode
          if (optimizationFormRef.current?.setFormState) {
              const current = optimizationFormRef.current.getCurrentState ? optimizationFormRef.current.getCurrentState() : {};
              optimizationFormRef.current.setFormState({ ...current, seo_mode: 'sniper' });
          }
          
          const formData = optimizationFormRef.current?.getCurrentState ? optimizationFormRef.current.getCurrentState() : {};
          await handleAnalyze({ ...formData, seo_mode: 'sniper' });
      } finally {
          setIsSniperLoading(false);
      }
  };

  const handleModeChange = (newMode) => {
      if (newMode === activeMode) return;
      setActiveMode(newMode);

      // Filter results based on the new mode
      // Find specific eval for this mode
      const activeEvalData = globalEvals.find(e => e.seo_mode === newMode);
      
      if (!activeEvalData) {
          console.warn("Attempted to switch to unavailable mode:", newMode);
          return;
      }
      const activeEvalId = activeEvalData.id;

      // Filter stats for this eval
      const relevantStats = allSeoStats.filter(s => s.evaluation_id === activeEvalId);

      const constructedResults = {
          ...results, // Keep standard fields
          
          // Mode-specific Global Data
          global_strength: activeEvalData.global_strength,
          status_label: activeEvalData.status_label,
          strategic_verdict: activeEvalData.strategic_verdict,
          improvement_priority: activeEvalData.improvement_priority,
          score_explanation: activeEvalData.score_explanation,
          
          listing_strength: activeEvalData.listing_strength,
          listing_visibility: activeEvalData.listing_visibility,
          listing_conversion: activeEvalData.listing_conversion,
          listing_relevance: activeEvalData.listing_relevance,
          listing_raw_visibility_index: activeEvalData.listing_raw_visibility_index,

          // Dashboard Metrics
          score_justification_visibility: activeEvalData.score_justification_visibility,
          score_justification_relevance: activeEvalData.score_justification_relevance,
          score_justification_conversion: activeEvalData.score_justification_conversion,
          score_justification_strength: activeEvalData.score_justification_strength,
          improvement_plan_remove: activeEvalData.improvement_plan_remove,
          improvement_plan_add: activeEvalData.improvement_plan_add,
          improvement_plan_primary_action: activeEvalData.improvement_plan_primary_action,

          tags: relevantStats.map(s => s.tag),
          analytics: relevantStats.map(s => ({
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
              transactional_score: s.transactional_score,
              intent_label: s.intent_label,
              niche_score: s.niche_score,
              relevance_label: s.relevance_label,
              is_competition: s.is_competition,
              is_sniper_seo: s.is_sniper_seo,
              is_selection_ia: s.is_selection_ia,
              is_user_added: s.is_user_added
          }))
      };
      
      setResults(constructedResults);
      
      // Also update the form visual state to match
      if (optimizationFormRef.current?.setFormState) {
         const currentForm = optimizationFormRef.current.getCurrentState ? optimizationFormRef.current.getCurrentState() : {};
         optimizationFormRef.current.setFormState({
             ...currentForm,
             seo_mode: newMode
         });
      }
  };

  const MemoizedResultsDisplay = useMemo(() => (
    <ResultsDisplay 
      results={results} 
      onGenerateDraft={handleGenerateDraft}
      isGeneratingDraft={isGeneratingDraft}
      onRelaunchSEO={handleRelaunchSEO}
      isInsightLoading={isInsightLoading}
      onSEOSniper={handleSEOSniper}
      isSniperLoading={isSniperLoading}
      onCompetitionAnalysis={handleCompetitionAnalysis}
      isCompetitionLoading={isCompetitionLoading}
      onAddCustomKeyword={handleAddCustomKeyword}
      isAddingKeyword={isAddingKeyword}
      
      // Strategy Switcher Props
      activeMode={activeMode}
      onModeChange={handleModeChange}
      availableModes={globalEvals.map(e => e.seo_mode).filter(Boolean)}        
    >
        <RecentOptimizations onViewResults={handleLoadListing} />
    </ResultsDisplay>
  ), [results, isGeneratingDraft, isInsightLoading, isSniperLoading, isCompetitionLoading, isAddingKeyword, activeMode, globalEvals]);

  return (
    <Layout>
      <div className="p-8 space-y-8">
        
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
                    </motion.div>
                  )}
              </AnimatePresence>

              {/* Header - Always visible & Clickable */}
              <div 
                  onClick={() => setIsFormCollapsed(!isFormCollapsed)}
                  className="px-4 py-3 border-b border-indigo-50 bg-indigo-50/50 flex justify-between items-center cursor-pointer hover:bg-indigo-100/50 transition-colors group select-none"
              >
                  <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg transition-all ${isFormCollapsed ? 'bg-indigo-100 text-indigo-600' : 'bg-white text-indigo-600 shadow-sm'}`}>
                        <Shirt size={18} />
                      </div>
                      <div className="flex flex-col">
                        <h2 className="font-bold text-slate-900 flex items-center gap-2">
                            SEO LISTING
                            <ChevronUp size={16} className={`text-slate-400 transition-transform duration-300 ${isFormCollapsed ? 'rotate-180' : ''}`} />
                        </h2>
                        {isFormCollapsed && <span className="text-xs text-slate-500 font-medium animate-in fade-in slide-in-from-left-2">Click to expand & edit</span>}
                      </div>
                  </div>

                   <div className="flex items-center gap-2">
                       {/* Save Listing Button (Ghost Style) */}
                       {/* Save Listing Button (Ghost Style) */}
                       <button
                           onClick={(e) => {
                               e.stopPropagation();
                               if (optimizationFormRef.current) {
                                    const data = optimizationFormRef.current.getCurrentState();
                                    if (data) handleSaveDraft(data);
                               }
                           }}
                           disabled={isLoading}
                           className="bg-transparent border border-slate-300 text-slate-600 hover:bg-slate-50 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                       >
                           <Save size={14} />
                           Save
                       </button>

                       {/* New Listing Button */}
                   <button
                      onClick={(e) => { e.stopPropagation(); handleNewAnalysis(); }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm z-10"
                  >
                      <Sparkles size={16} />
                      New listing
                  </button>
                   </div>
              </div>

              {/* Form Content - Collapsible */}
              <motion.div
                  animate={{
                      height: isFormCollapsed ? 0 : 'auto',
                      opacity: isFormCollapsed ? 0 : 1,
                      pointerEvents: isFormCollapsed ? 'none' : 'auto'
                  }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  style={{ overflow: 'hidden' }}
              >
                    <div className={`p-4 transition-all duration-300 ${!isNewListingActive && !listingId && !selectedImage && !results ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
                       <div className="mb-3">
                           <label htmlFor="listingName" className="block text-xs font-medium text-slate-700 mb-1">Listing name</label>
                           <input
                              type="text"
                              id="listingName"
                              value={listingName}
                              onChange={(e) => setListingName(e.target.value)}
                              placeholder="e.g. Vintage Floral T-Shirt"
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 text-slate-900 text-sm"
                           />
                        </div>

                        {/* NEW 2-Column Grid Layout */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            
                            {/* Left Column: Image Area */}
                            <div className="md:col-span-1 flex flex-col gap-4">
                                <div className={`relative rounded-xl overflow-hidden transition-all flex-1 ${isAnalyzingDesign ? 'ring-4 ring-indigo-500/20' : ''}`}>
                                    <ImageUpload 
                                        key={`img-${formKey}`} 
                                        onFileSelect={setSelectedImage} 
                                        initialImage={results?.imageUrl}
                                        className="h-full"
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
                            <div className="md:col-span-2 bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
                                <div className="flex items-center gap-2 mb-3">
                                    <Wand2 size={16} className="text-indigo-500" />
                                    <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Visual Analysis</h3>
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div className="group">
                                        <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                                            <Palette size={12} />
                                            Aesthetic Style
                                        </label>
                                        <AutoResizeTextarea 
                                            value={visualAnalysis.aesthetic}
                                            onChange={(e) => setVisualAnalysis({...visualAnalysis, aesthetic: e.target.value})}
                                            placeholder="e.g. Minimalist, Boho..."
                                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                                        />
                                    </div>
                                    
                                    <div className="group">
                                        <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                                            <Type size={12} />
                                            Typography
                                        </label>
                                        <AutoResizeTextarea 
                                            value={visualAnalysis.typography}
                                            onChange={(e) => setVisualAnalysis({...visualAnalysis, typography: e.target.value})}
                                            placeholder="e.g. Bold Serif..."
                                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                                        />
                                    </div>

                                    <div className="group">
                                        <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                                            <LayoutTemplate size={12} />
                                            Graphic Elements
                                        </label>
                                        <AutoResizeTextarea 
                                            value={visualAnalysis.graphics}
                                            onChange={(e) => setVisualAnalysis({...visualAnalysis, graphics: e.target.value})}
                                            placeholder="e.g. Geometric shapes..."
                                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                                        />
                                    </div>

                                    <div className="group">
                                        <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                                            <Palette size={12} />
                                            Color Palette
                                        </label>
                                        <AutoResizeTextarea 
                                            value={visualAnalysis.colors}
                                            onChange={(e) => setVisualAnalysis({...visualAnalysis, colors: e.target.value})}
                                            placeholder="e.g. Earth tones..."
                                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                                        />
                                    </div>
                                    
                                    {/* Full width items */}
                                    <div className="sm:col-span-2">
                                        <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                                            <Target size={12} />
                                            Target Audience
                                        </label>
                                        <AutoResizeTextarea 
                                            value={visualAnalysis.target_audience}
                                            onChange={(e) => setVisualAnalysis({...visualAnalysis, target_audience: e.target.value})}
                                            placeholder="Who is this for? e.g. Gen Z..."
                                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                                        />
                                    </div>
                                    
                                     <div className="sm:col-span-2">
                                        <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                                            <Heart size={12} />
                                            Overall Vibe
                                        </label>
                                        <AutoResizeTextarea 
                                            value={visualAnalysis.overall_vibe}
                                            onChange={(e) => setVisualAnalysis({...visualAnalysis, overall_vibe: e.target.value})}
                                            placeholder="e.g. Cozy, energetic, professional..."
                                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
   <OptimizationForm 
       ref={optimizationFormRef}
       key={`form-${formKey}`} 
       onAnalyze={handleAnalyze} 
       onSaveDraft={handleSaveDraft}
       isImageSelected={!!selectedImage || (!!results && !!results.imageUrl)}
       isImageAnalysed={results?.is_imageAnalysed || isImageAnalyzedState}
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

           {/* Results Section (Always show unless main loader is active, to display empty/inactive tables initially) */}
           {!isLoading && MemoizedResultsDisplay}



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
