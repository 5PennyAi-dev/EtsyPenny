import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { DEFAULT_STRATEGY_SELECTIONS, getStrategyValues, getSelectionsFromValues } from '../components/studio/StrategyTuner';
import { useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import { Wand2, Sparkles, Shirt, ChevronUp, ChevronRight, Palette, Type, LayoutTemplate, Heart, Target, Save, Zap } from 'lucide-react';
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
    return {
        theme: context.theme_name || context.theme || context.custom_theme || null,
        niche: context.niche_name || context.niche || context.custom_niche || null,
        sub_niche: context.sub_niche_name || context.sub_niche || context.custom_sub_niche || null,
        custom_niche: null, // Legacy field, keeping null for safety
        custom_listing: context.custom_listing || null,
        user_description: context.context || null
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

  const [isSeoLoading, setIsSeoLoading] = useState(false);
  const [isSniperLoading, setIsSniperLoading] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isResettingPool, setIsResettingPool] = useState(false);
  const [isApplyingStrategy, setIsApplyingStrategy] = useState(false);
  const [strategySelections, setStrategySelections] = useState(DEFAULT_STRATEGY_SELECTIONS);
  
  const [analysisContext, setAnalysisContext] = useState(null);
  const [listingName, setListingName] = useState("");
  const [isImageAnalyzedState, setIsImageAnalyzedState] = useState(false);
  const [resetSelectionKey, setResetSelectionKey] = useState(0);
  const [refreshFavoritesKey, setRefreshFavoritesKey] = useState(0);
  const [userDefaults, setUserDefaults] = useState(null);
  
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

  // SEO Analysis Accordion open/close state
  const [isSeoAnalysisOpen, setIsSeoAnalysisOpen] = useState(false);

  // No changes to imports

  // ... (keep useEffect for realtime as a backup or removal? Let's keep it but focusing on the direct response)
  // Actually, if we handle it here, we might double-fetch if realtime also triggers. 
  // But since the Status won't change to 'completed' until WE do it here, the realtime won't fire early.
  // Let's rely on the direct response for speed and reliability if N8N returns data.
  // Auto-resize visual analysis textareas when values change programmatically

  // Ref for OptimizationForm to access its state
  const optimizationFormRef = useRef(null);

  useEffect(() => {
    const fetchUserDefaults = async () => {
      if (!user) return;
        try {
            const { data, error } = await supabase
                .from('v_user_seo_active_settings')
                .select('*')
                .eq('user_id', user.id)
                .single();
                
            if (error && error.code !== 'PGRST116') throw error;
            if (data) {
                setUserDefaults(data);
                // If no listing is loaded, initialize strategy selections with user defaults
                if (!listingId) {
                  setStrategySelections(getSelectionsFromValues({
                    Volume: data.param_volume,
                    Competition: data.param_competition,
                    Transaction: data.param_transaction,
                    Niche: data.param_niche,
                    CPC: data.param_cpc,
                  }));
                }
            }
        } catch (err) {
            console.error("Error fetching user defaults:", err);
        }
    };

    fetchUserDefaults();
  }, [user]);

  // Helper to extract Smart Badge thresholds for payloads
  const getSmartBadgePayload = () => {
    if (!userDefaults) return {};
    return {
      evergreen_stability_ratio: userDefaults.evergreen_stability_ratio,
      evergreen_minimum_volume: userDefaults.evergreen_minimum_volume,
      evergreen_avg_volume: userDefaults.evergreen_avg_volume,
      trending_dropping_threshold: userDefaults.trending_dropping_threshold,
      trending_current_month_min_volume: userDefaults.trending_current_month_min_volume,
      trending_growth_factor: userDefaults.trending_growth_factor,
      promising_min_score: userDefaults.promising_min_score,
      promising_competition: userDefaults.promosing_competition || userDefaults.promising_competition
    };
  };

  // Always-fresh ref for values used inside memoized/async handlers — avoids stale closure issues
  const latestRef = useRef({});
  latestRef.current = {
    listingId,
    results,
    userDefaults,
    strategySelections,
    visualAnalysis,
  };

  // Refs to track background SEO completion (avoids stale closures)
  const isWaitingForSeoRef = useRef(false);
  const seoTriggeredAtRef = useRef(null); // ISO timestamp captured when analysis starts

  const [postSeoTrigger, setPostSeoTrigger] = useState(0); // Incremented to fire post-SEO effect with fresh state
  
  // Refs to track background Image Analysis
  const isWaitingForImageAnalysisRef = useRef(false);
  const imageAnalysisTriggeredAtRef = useRef(null);

  // Listen for background SEO generation completion (Realtime + Polling fallback)
  useEffect(() => {
    if (!listingId) return;

    // Shared handler — called by whichever mechanism detects completion first
    // Uses setPostSeoTrigger to hand off to a fresh-state useEffect, avoiding stale closure issues
    const handleSeoDone = () => {
      if (!isWaitingForSeoRef.current) return; // Already handled
      isWaitingForSeoRef.current = false;
      seoTriggeredAtRef.current = null;
      setPostSeoTrigger(t => t + 1); // Delegate to post-SEO effect (has fresh state)
    };

    // Helper: We now rely on database state resets instead of timestamps to avoid clock skew bugs.
    const isNewerThanTrigger = (updatedAt) => true;

    // 1. Realtime subscription (instant if it works)
    const channel = supabase
      .channel(`listing-${listingId}-seo-done`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'listings',
          filter: `id=eq.${listingId}`,
        },
        async (payload) => {
          if (payload.new.status_id === STATUS_IDS.SEO_DONE && isNewerThanTrigger(payload.new.updated_at)) {
            await handleSeoDone();
          }
          if (payload.new.is_image_analysed === true && isImageNewerThanTrigger(payload.new.updated_at)) {
            await handleImageAnalysisDone(payload.new);
          }
        }
      )
      .subscribe();

    // 2. Polling fallback (every 5s) — catches it if Realtime misses the event
    const pollInterval = setInterval(async () => {
      if (!isWaitingForSeoRef.current && !isWaitingForImageAnalysisRef.current) return; // Not waiting for anything, skip
      try {
        const { data } = await supabase
          .from('listings')
          .select('status_id, updated_at, is_image_analysed, visual_aesthetic, visual_typography, visual_graphics, visual_colors, visual_target_audience, visual_overall_vibe, theme, niche, sub_niche')
          .eq('id', listingId)
          .single();
          
        if (isWaitingForSeoRef.current && data?.status_id === STATUS_IDS.SEO_DONE && isNewerThanTrigger(data.updated_at)) {
          await handleSeoDone();
        }
        if (isWaitingForImageAnalysisRef.current && data?.is_image_analysed === true && isImageNewerThanTrigger(data.updated_at)) {
          await handleImageAnalysisDone(data);
        }
      } catch (e) {
        // Silently ignore poll errors
      }
    }, 5000);

    // Shared handler for Image Analysis completion
    const handleImageAnalysisDone = async (data) => {
        if (!isWaitingForImageAnalysisRef.current) return;
        isWaitingForImageAnalysisRef.current = false;
        imageAnalysisTriggeredAtRef.current = null;
        
        // Update visual fields
        const aiTheme = data.theme || "";
        const aiNiche = data.niche || "";
        const aiSubNiche = data.sub_niche || "";

        setVisualAnalysis({
            aesthetic: data.visual_aesthetic || "",
            typography: data.visual_typography || "",
            graphics: data.visual_graphics || "",
            colors: data.visual_colors || "",
            target_audience: data.visual_target_audience || "",
            overall_vibe: data.visual_overall_vibe || "",
            theme: aiTheme,
            niche: aiNiche,
            sub_niche: aiSubNiche
        });

        // Capture current form state to avoid overwriting typed input
        const currentFormData = optimizationFormRef.current?.getCurrentState() || {};

        // Update form context while preserving user description/type
        setAnalysisContext(prev => ({
            ...(prev || {}),
            ...currentFormData,
            theme_name: aiTheme,
            niche_name: aiNiche,
            sub_niche_name: aiSubNiche
        }));

        setIsImageAnalyzedState(true);
        setIsAnalyzingDesign(false);
        toast.success("Visual analysis complete! ✨");
    };

    // Helper: Compare database 'updated_at' against when we started the analysis to ignore stale read-replicas
    const isImageNewerThanTrigger = (updatedAt) => {
        if (!imageAnalysisTriggeredAtRef.current || !updatedAt) return true;
        // We capture the server's updated_at when we launch the analysis. The final n8n save will definitely be strictly newer.
        return new Date(updatedAt).getTime() > new Date(imageAnalysisTriggeredAtRef.current).getTime();
    };

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [listingId]);

  // Post-SEO completion effect — runs with fresh state (no stale closures)
  // Triggered by handleSeoDone via setPostSeoTrigger
  useEffect(() => {
    if (postSeoTrigger === 0 || !listingId) return;

    const runPostSeoFlow = async () => {
      toast.success("SEO Analysis completed! Loading results...");
      await handleLoadListing(listingId);
      setIsSeoLoading(false);
      setIsLoading(false);
    };

    runPostSeoFlow();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postSeoTrigger]);

  const ensureProductType = async (formData) => {
    if (formData.product_type_id) return formData.product_type_id;
    if (!formData.product_type_name) return null;

    try {
        const { data, error } = await supabase
            .from('user_custom_product_types')
            .insert({ name: formData.product_type_name, user_id: user.id })
            .select('id')
            .single();

        if (error) {
            if (error.code === '23505') { // Unique constraint violation
                const { data: existingData } = await supabase
                    .from('v_combined_product_types')
                    .select('id')
                    .eq('name', formData.product_type_name)
                    .or(`user_id.eq.${user.id},origin.eq.system`)
                    .single();
                return existingData?.id || null;
            }
            console.error("Error inserting custom product type:", error);
            return null;
        }
        return data.id;
    } catch (err) {
        console.error("Exception ensuring product type:", err);
        return null;
    }
  };

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

          // Capture current form state (Product Type, Instructions) to send in payload and save later
          const currentFormData = optimizationFormRef.current?.getCurrentState() || {};

          // Auto-save form data before analyzing image
          let currentListingId = listingId;
          const resolvedProductTypeId = await ensureProductType(currentFormData);

          const savePayload = {
              theme: currentFormData.theme_name || null,
              niche: currentFormData.niche_name || null,
              sub_niche: currentFormData.sub_niche_name || null,
              product_type_id: resolvedProductTypeId,
              user_description: currentFormData.context || null,
              image_url: publicUrl, // Save the image URL immediately
              is_image_analysed: false // Reset flag to prevent instant polling hit on re-runs
          };

          let serverTriggerTime = new Date().toISOString();

          if (currentListingId) {
               // Update existing
               const { data: updatedListing, error: updateError } = await supabase
                  .from('listings')
                  .update({ ...savePayload, updated_at: new Date().toISOString() })
                  .eq('id', currentListingId)
                  .select('updated_at, is_image_analysed')
                  .single();
               if (updateError) console.error("Auto-save before analysis failed:", updateError);
               if (updatedListing?.updated_at) serverTriggerTime = updatedListing.updated_at;
          } else {
               // Insert new
               const { data: newListing, error: insertError } = await supabase
                  .from('listings')
                  .insert({
                      ...savePayload,
                      user_id: user.id,
                      status_id: STATUS_IDS.NEW,
                      title: "Draft SEO Analysis"
                  })
                  .select('id, updated_at')
                  .single();
                  
               if (insertError) {
                   console.error("Auto-save insert failed:", insertError);
               } else {
                   currentListingId = newListing.id;
                   setListingId(newListing.id);
                   setIsNewListingActive(false); // No longer purely new
                   serverTriggerTime = newListing.updated_at;
               }
          }

          // Call local API server (proxied via Vite to Express on :3001)
          const analyzePayload = {
              listing_id: currentListingId,
              user_id: user.id,
              mockup_url: publicUrl,
              product_type: currentFormData.product_type_name || '',
              client_description: currentFormData.context || '',
          };

          // Fire and forget — the Realtime listener will detect completion
          axios.post('/api/seo/analyze-image', analyzePayload).catch(err => {
              console.error("Analyze-image API call failed:", err);
              toast.error("Failed to start analysis. Check your connection.");
              isWaitingForImageAnalysisRef.current = false;
              setIsAnalyzingDesign(false);
          });

          // Signal the Realtime listener to watch for completion
          imageAnalysisTriggeredAtRef.current = serverTriggerTime;
          isWaitingForImageAnalysisRef.current = true;

          toast.success("Design analysis started! This takes about a minute.");
          
          // We intentionally DO NOT set setIsAnalyzingDesign(false) here. 
          // The realtime listener will disable the spinner once the database is updated.

      } catch (error) {
          console.error("Visual Analysis Error:", error);
          toast.error("Failed to analyze design.");
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

          const resolvedProductTypeId = await ensureProductType(formData);

          const commonFields = {
                product_type_id: resolvedProductTypeId,
                tone_id: formData.tone_id,
                theme: formData.theme_name || null,
                niche: formData.niche_name || null,
                sub_niche: formData.sub_niche_name || null,
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
        const preservedCompetitorAnalytics = results?.analytics?.filter(k => k.is_competition) || [];


        
        // Show skeleton immediately — user sees loading from the start
        setIsSeoLoading(true);
        setIsLoading(false);
        setShowResults(true);
        setIsFormCollapsed(true);
        setIsSeoAnalysisOpen(true); // Auto-expand SEO Analysis accordion
        
        
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
        };

        const resolvedProductTypeId = await ensureProductType(formData);

        const commonFields = {
            product_type_id: resolvedProductTypeId,
            tone_id: formData.tone_id,
            theme: formData.theme_name || null,
            niche: formData.niche_name || null,
            sub_niche: formData.sub_niche_name || null,
            user_description: formData.context,
            custom_listing: JSON.stringify(customData),
            image_url: publicUrl,
            title: listingName || "Pending Analysis...",
            status_id: STATUS_IDS.NEW, // Reset status to NEW so polling doesn't immediately succeed
            is_generating_seo: true, // Flag that n8n is actively working on SEO
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

        // 3. Call generate-keywords API directly (synchronous, ~30s — no N8N)
        const keywordsPayload = {
            listing_id: activeListingId,
            user_id: user.id,
            product_type: formData.product_type_name || '',
            theme: formData.theme_name || '',
            niche: formData.niche_name || '',
            sub_niche: formData.sub_niche_name || '',
            client_description: formData.context || '',
            visual_aesthetic: visualAnalysis.aesthetic,
            visual_target_audience: visualAnalysis.target_audience,
            visual_overall_vibe: visualAnalysis.overall_vibe,
            parameters: {
                ...(userDefaults ? {
                    Volume: userDefaults.param_volume,
                    Competition: userDefaults.param_competition,
                    Transaction: userDefaults.param_transaction,
                    Niche: userDefaults.param_niche,
                    CPC: userDefaults.param_cpc
                } : getStrategyValues(strategySelections)),
                ai_selection_count: userDefaults?.ai_selection_count ?? 13,
            },
        };

        await axios.post('/api/seo/generate-keywords', keywordsPayload);

        // Brief pause to let the save-seo edge function's pool reset fully commit to DB
        await new Promise(r => setTimeout(r, 1500));

        // Pipeline complete — load results directly from DB
        toast.success("SEO Analysis completed! Loading results...");
        await handleLoadListing(activeListingId);
        setIsSeoLoading(false);

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
        setIsSeoLoading(false);
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
        // Fetch categorization data fresh from DB to avoid stale state
        const { data: listingMeta } = await supabase
            .from('listings')
            .select('theme, niche, sub_niche, user_description, custom_listing')
            .eq('id', listingId)
            .single();

        const parsedCustom = listingMeta?.custom_listing ? JSON.parse(listingMeta.custom_listing) : {};

        const response = await axios.post('/api/seo/generate-draft', {
            listing_id: listingId,
            keywords: statsToUse.map(k => ({
                keyword: k.keyword,
                avg_volume: k.volume,
                competition: typeof k.competition === 'string' && !isNaN(parseFloat(k.competition)) ? parseFloat(k.competition) : k.competition,
                opportunity_score: k.score,
                status: {
                   trending: k.is_trending,
                   evergreen: k.is_evergreen,
                   promising: k.is_promising
                }
            })),
            image_url: results.imageUrl,
            visual_analysis: {
                aesthetic: visualAnalysis.aesthetic,
                typography: visualAnalysis.typography,
                graphics: visualAnalysis.graphics,
                colors: visualAnalysis.colors,
                target_audience: visualAnalysis.target_audience,
                overall_vibe: visualAnalysis.overall_vibe
            },
            categorization: {
                theme: listingMeta?.theme || parsedCustom.theme || null,
                niche: listingMeta?.niche || parsedCustom.niche || null,
                sub_niche: listingMeta?.sub_niche || parsedCustom.sub_niche || null,
                user_description: listingMeta?.user_description || null
            },
            product_details: {
                product_type: analysisContext.product_type_name || "Product",
                tone: analysisContext.tone_name || "Engaging",
                client_description: listingMeta?.user_description || analysisContext.context || ""
            },
            shop_context: {
                shop_name: profile?.shop_name,
                shop_bio: profile?.shop_bio,
                target_audience: profile?.target_audience,
                brand_tone: profile?.brand_tone,
                brand_keywords: profile?.brand_keywords,
                signature_text: profile?.signature_text
            }
        });

        const { title, description } = response.data;
        if (!title) throw new Error("Incomplete draft received from AI");

        // Update UI
        setResults(prev => ({
            ...prev,
            title,
            description
        }));

        toast.success("Magic Draft generated and listing completed!");

      } catch (err) {
          console.error("Draft generation failed:", err);
          if (err.response) {
               console.error("Server Error Response:", err.response.data);
               toast.error(`Draft generation failed: Server returned ${err.response.status}`);
          } else {
               toast.error("Failed to generate draft. Please try again.");
          }
      } finally {
          setIsGeneratingDraft(false);
      }
  };

  const handleRecalculateScores = async (selectedKeywordsData) => {
      if (!user || !listingId) return;

      setIsRecalculating(true);
      toast.info("Recalculating scores...", { duration: 3000 });

      try {
          const response = await axios.post('/api/seo/recalculate-scores', {
              listing_id: listingId,
              selected_keywords: selectedKeywordsData.map(k => ({
                  keyword: k.keyword,
                  search_volume: k.volume,
                  transactional_score: k.transactional_score,
                  niche_score: k.niche_score,
                  competition: parseFloat(k.competition) || 0,
                  cpc: parseFloat(k.cpc) || 0
              }))
          });

          const { strength } = response.data;
          const selectedTags = selectedKeywordsData.map(k => k.keyword);

          // Build update payload from server response
          const updatePayload = {
              listing_strength: strength.listing_strength,
              global_strength: strength.listing_strength,
              listing_visibility: strength.breakdown.visibility,
              listing_conversion: strength.breakdown.conversion,
              listing_relevance: strength.breakdown.relevance,
              listing_competition: strength.breakdown.competition,
              listing_profit: strength.breakdown.profit,
              listing_raw_visibility_index: strength.stats.raw_visibility_index,
              listing_avg_cpc: strength.stats.avg_cpc,
              listing_avg_competition: strength.stats.best_opportunity_comp,
              listing_est_market_reach: strength.stats.est_market_reach,
              updated_at: new Date().toISOString()
          };

          // Update Local State (Results + Global Evals + Seo Stats)
          setResults(prev => {
              if (!prev || !prev.analytics) return prev;
              const updatedAnalytics = prev.analytics.map(item => ({
                  ...item,
                  is_current_eval: selectedTags.includes(item.keyword)
              }));
              return { ...prev, ...updatePayload, analytics: updatedAnalytics };
          });

          toast.success("Scores successfully recalculated!");
      } catch (error) {
          console.error("Recalculate Scores failed:", error);
          if (error.response) {
               toast.error(`Recalculation failed: Server returned ${error.response.status}`);
          } else {
               toast.error(error.message || "Failed to recalculate scores.");
          }
      } finally {
          setIsRecalculating(false);
      }
  };

  // Reset Keyword Pool Handler
  const handleResetPool = async () => {
    if (!listingId) {
      toast.error('No listing loaded.');
      return;
    }
    setIsResettingPool(true);
    try {
      const payload = {
        listing_id: listingId,
        parameters: {
            ...getStrategyValues(strategySelections),
            ...getSmartBadgePayload(),
            ai_selection_count: userDefaults?.ai_selection_count ?? 13,
            working_pool_count: userDefaults?.working_pool_count ?? 40,
            concept_diversity_limit: userDefaults?.concept_diversity_limit ?? 3,
        }
      };
      await axios.post('/api/seo/reset-pool', payload);
      toast.success('Keywords pool reset successfully!');
      await handleLoadListing(listingId);
      setResetSelectionKey(k => k + 1);
    } catch (err) {
      console.error('handleResetPool error:', err);
      toast.error('Failed to reset keyword pool.');
    } finally {
      setIsResettingPool(false);
    }
  };

  // Apply Strategy Tuner Handler
  const handleApplyStrategy = async (parameters) => {
    if (!listingId) {
      toast.error('No listing loaded.');
      return;
    }

    const pinnedCount = results?.analytics?.filter(k => k.is_pinned).length || 0;

    setIsApplyingStrategy(true);
    try {
      const payload = {
        listing_id: listingId,
        pinned_count: pinnedCount,
        parameters: {
            ...parameters, 
            ...getSmartBadgePayload(),
            ai_selection_count: userDefaults?.ai_selection_count ?? 13,
            working_pool_count: userDefaults?.working_pool_count ?? 40,
            concept_diversity_limit: userDefaults?.concept_diversity_limit ?? 3,
        }
      };
      await axios.post('/api/seo/reset-pool', payload);
      toast.success('Strategy update triggered! Your results will refresh in a few seconds.');
      await handleLoadListing(listingId);
      setResetSelectionKey(k => k + 1);
    } catch (err) {
      console.error('handleApplyStrategy error:', err);
      toast.error('Failed to apply new strategy.');
    } finally {
      setIsApplyingStrategy(false);
    }
  };

  // Inline "Add Keyword" Handler
  const [isAddingKeyword, setIsAddingKeyword] = useState(false);

  const handleAddCustomKeyword = async (newKeyword, onSuccess) => {
      if (!newKeyword) return;

      const currentListingId = listingId || latestRef.current.listingId;
      if (!currentListingId) {
          toast.error("Error: Missing listing ID");
          return;
      }

      // Fetch existing tags directly from DB — avoids stale closure/ref issues entirely
      const { data: existingTags, error: fetchTagsErr } = await supabase
          .from('listing_seo_stats')
          .select('tag')
          .eq('listing_id', currentListingId)
          .eq('is_current_pool', true);
      
      if (fetchTagsErr) {
          console.error("Failed to fetch existing tags:", fetchTagsErr);
          toast.error("Failed to check for duplicates. Please try again.");
          return;
      }

      const normalizedKeyword = newKeyword.toLowerCase();
      const isDuplicate = (existingTags || []).some(row => row.tag.toLowerCase() === normalizedKeyword);
      if (isDuplicate) {
           toast.error(`"${newKeyword}" is already in the performance table.`);
           if (onSuccess) onSuccess();
           return;
      }

      setIsAddingKeyword(true);
      try {
          const response = await axios.post('/api/seo/user-keyword', {
              listing_id: currentListingId,
              keyword: newKeyword
          });
          
          if (response.data.success) {
              // Refresh the listing to load the newly re-ranked pool and global strength
              toast.success(`Keyword "${response.data.keyword?.tag || newKeyword}" added successfully!`);
              await handleLoadListing(currentListingId);
              if (onSuccess) onSuccess();
          } else {
              throw new Error(response.data.error || 'Failed to add keyword');
          }

      } catch (err) {
          console.error("Error adding custom keyword:", err);
          toast.error(err.response?.data?.error || err.message || "Failed to add keyword.");
      } finally {
          setIsAddingKeyword(false);
      }
  };

  // Batch "Add Keywords" Handler — sends all keywords to local /api/seo/add-from-favorite
  const [isAddingBatchKeywords, setIsAddingBatchKeywords] = useState(false);

  const handleAddBatchKeywords = async (keywordsArray) => {
      const {
        listingId: freshListingId,
        results: freshResults,
      } = latestRef.current;

      if (!keywordsArray?.length) return;

      const currentListingId = freshListingId || freshResults?.listing_id;
      if (!currentListingId) {
          toast.error('Error: Missing listing ID');
          return;
      }

      // Filter duplicates against the current pool
      const existingSet = new Set((freshResults?.analytics || []).map(a => a.keyword.toLowerCase()));
      const newKeywordObjects = keywordsArray.filter(kw => !existingSet.has((kw.tag || kw.keyword || '').toLowerCase()));
      if (newKeywordObjects.length === 0) {
          toast.info('All selected keywords are already in the performance table.');
          return;
      }

      setIsAddingBatchKeywords(true);
      try {
          // Forward the keyword objects as-is — the route normalises field names
          // (last_volume, last_competition, last_cpc, volume_history)
          const response = await axios.post('/api/seo/add-from-favorite', {
              listing_id: currentListingId,
              keywords: newKeywordObjects,
          });

          if (response.data.success) {
              toast.success(`${response.data.added_count} keyword${response.data.added_count > 1 ? 's' : ''} added successfully!`);
              // Full reload so the table, strength badge, and pool flags are all in sync
              await handleLoadListing(currentListingId);
              setRefreshFavoritesKey(k => k + 1); // Signal ResultsDisplay to re-sync favorite stars
              return true;
          } else {
              throw new Error(response.data.error || 'Unknown error from server');
          }
      } catch (err) {
          console.error('Error adding batch keywords:', err);
          toast.error(err.response?.data?.error || err.message || 'Failed to add keywords.');
          return false;
      } finally {
          setIsAddingBatchKeywords(false);
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
    setIsImageAnalyzedState(false); // Reset: new listing has no image analysis yet
    setIsAnalyzingDesign(false);    // Also clear any in-progress spinner
    setFormKey(prev => prev + 1);   // Reset form state
    setIsNewListingActive(true);    // Manually activate the form for a new session
    setIsSeoAnalysisOpen(false);    // Collapse SEO Analysis accordion for fresh start
  };

  const handleLoadListing = async (listingId) => {
    try {
        setIsLoading(true);
        // Fetch Listing Details
        const { data: listing, error: listingError } = await supabase
            .from('listings')
            .select(`*, niches(name), themes(name), sub_niches(name), tones(name)`)
            .eq('id', listingId)
            .single();

        if (listingError) throw listingError;

        setListingName(listing.title || "");

        // Fetch Global Eval Data (single row per listing)
        const { data: evalData } = await supabase
            .from('listings_global_eval')
            .select('*')
            .eq('listing_id', listingId)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        // Fetch SEO Stats for this listing (only current pool keywords)
        let statsQuery = supabase
            .from('listing_seo_stats')
            .select('*')
            .eq('listing_id', listingId)
            .eq('is_current_pool', true);
        
        const { data: stats, error: statsError } = await statsQuery;

        if (statsError) throw statsError;
        
        // Fetch product type name dynamically if product_type_id exists
        let fetchedProductTypeName = "";
        if (listing.product_type_id) {
            const { data: ptData, error: ptError } = await supabase
                .from('v_combined_product_types')
                .select('name')
                .eq('id', listing.product_type_id)
                .single();
            if (!ptError && ptData) {
                fetchedProductTypeName = ptData.name;
            } else if (ptError) {
                console.error("Failed to fetch product type name:", ptError);
            }
        }

        // Reconstruct Analysis Context (Handle missing relations gracefully)
        const parsedCustom = listing.custom_listing ? JSON.parse(listing.custom_listing) : {};

        setAnalysisContext({
            theme_name: listing.theme || listing.themes?.name || parsedCustom.theme || "",
            niche_name: listing.niche || listing.niches?.name || parsedCustom.niche || "",
            sub_niche_name: listing.sub_niche || listing.sub_niches?.name || parsedCustom.sub_niche || "",
            
            // Text-based fields
            theme: listing.theme || parsedCustom.theme || listing.themes?.name || "",
            niche: listing.niche || parsedCustom.niche || listing.niches?.name || "",
            sub_niche: listing.sub_niche || parsedCustom.sub_niche || listing.sub_niches?.name || "",

            // Product Type: dynamically fetched from view, with fallback to legacy text
            product_type_name: fetchedProductTypeName || "",
            product_type_id: listing.product_type_id || null,
            tone_name: listing.tones?.name || "Engaging",
            
            // Advanced SEO Settings
            tone: listing.tone || "Auto-detect", 
            max_tags: listing.max_tags || 13,

            context: listing.user_description || parsedCustom.context || ""
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
                     max_tags: listing.max_tags || 13
                 });
             }
        }, 100);

        // Construct Results Object
        const activeEvalData = evalData;

        // All current pool stats are relevant (single eval)
        const relevantStats = stats || [];

        const constructedResults = {
            title: listing.generated_title,
            description: listing.generated_description,
            imageUrl: listing.image_url,
            // Global Eval Data (single source of truth: listings_global_eval)
            global_strength: activeEvalData?.global_strength,
            status_label: activeEvalData?.status_label,
            strategic_verdict: activeEvalData?.strategic_verdict,
            improvement_priority: activeEvalData?.improvement_priority,
            score_explanation: activeEvalData?.score_explanation,

            listing_strength: activeEvalData?.listing_strength,
            listing_visibility: activeEvalData?.listing_visibility,
            listing_conversion: activeEvalData?.listing_conversion,
            listing_relevance: activeEvalData?.listing_relevance,
            listing_competition: activeEvalData?.listing_competition,
            listing_profit: activeEvalData?.listing_profit,
            listing_raw_visibility_index: activeEvalData?.listing_raw_visibility_index,
            listing_avg_cpc: activeEvalData?.listing_avg_cpc,
            listing_avg_competition: activeEvalData?.listing_avg_competition,
            listing_est_market_reach: activeEvalData?.listing_est_market_reach,

            // Dashboard Metrics
            score_justification_visibility: activeEvalData?.score_justification_visibility,
            score_justification_relevance: activeEvalData?.score_justification_relevance,
            score_justification_conversion: activeEvalData?.score_justification_conversion,
            score_justification_strength: activeEvalData?.score_justification_strength,
            improvement_plan_remove: activeEvalData?.improvement_plan_remove,
            improvement_plan_add: activeEvalData?.improvement_plan_add,
            improvement_plan_primary_action: activeEvalData?.improvement_plan_primary_action,

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
                is_user_added: s.is_user_added,
                is_current_eval: s.is_current_eval,
                is_pinned: s.is_pinned,
                cpc: s.cpc
            }))
        };
        
        setResults(constructedResults);

        // Hydrate Strategy Tuner sliders from saved param_* values
        if (activeEvalData?.param_Volume != null || activeEvalData?.param_Competition != null || activeEvalData?.param_Transaction != null || activeEvalData?.param_Niche != null || activeEvalData?.param_cpc != null) {
          setStrategySelections(getSelectionsFromValues({
            Volume: activeEvalData.param_Volume,
            Competition: activeEvalData.param_Competition,
            Transaction: activeEvalData.param_Transaction,
            Niche: activeEvalData.param_Niche,
            CPC: activeEvalData.param_cpc,
          }));
        } else {
          setStrategySelections(DEFAULT_STRATEGY_SELECTIONS);
        }

      // Sync local state for the form button
      const isAnalysed = listing.is_image_analysed || false;
      setIsImageAnalyzedState(isAnalysed);

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
      setIsSeoAnalysisOpen(true); // Auto-expand SEO Analysis accordion when loading a listing
      setIsLoading(false);

      // Check for pending Image Analysis to resume polling and spinner
      if (listing.image_url && !isAnalysed) {
          isWaitingForImageAnalysisRef.current = true;
          // Set to a past date so the > trigger check bypasses safely, or rely on our new 'true' override
          imageAnalysisTriggeredAtRef.current = new Date(Date.now() - 60000).toISOString(); 
          setIsAnalyzingDesign(true);
      } else {
          isWaitingForImageAnalysisRef.current = false;
          setIsAnalyzingDesign(false);
      }

      // Check for pending SEO Analysis to resume polling and skeleton
      if (listing.is_generating_seo) {
          isWaitingForSeoRef.current = true;
          seoTriggeredAtRef.current = new Date(Date.now() - 60000).toISOString();
          setIsSeoLoading(true);
      } else {
          isWaitingForSeoRef.current = false;
          setIsSeoLoading(false);
      }

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
        window.history.replaceState({}, document.title)
    } else if (location.state?.newListing) {
        handleNewAnalysis();
        window.history.replaceState({}, document.title);
    } else if (user?.id) {
        // No explicit navigation state — auto-load the most recent listing
        const loadMostRecent = async () => {
          const { data } = await supabase
            .from('listings')
            .select('id')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })
            .limit(1)
            .single();
          if (data?.id) {
            handleLoadListing(data.id);
          }
        };
        loadMostRecent();
    }
  }, [location.state]);



  // Helper for Breadcrumbs
  const getContextString = () => {
    if (!analysisContext) return "Analysis";
    const { theme_name, niche_name, sub_niche_name, product_type_name } = analysisContext;
    return (
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            {/* Hierarchy */}
            <div className="flex items-center gap-1">
                <span className="font-semibold text-indigo-700 max-w-[120px] sm:max-w-none truncate" title={theme_name}>
                    {theme_name || "Theme"}
                </span>
                
                {niche_name && (
                    <>
                        <ChevronRight size={14} className="text-slate-400 shrink-0" />
                        <span className="max-w-[120px] sm:max-w-none truncate" title={niche_name}>{niche_name}</span>
                    </>
                )}
                
                {sub_niche_name && (
                    <>
                        <ChevronRight size={14} className="text-slate-400 shrink-0" />
                        <span className="max-w-[120px] sm:max-w-none truncate" title={sub_niche_name}>{sub_niche_name}</span>
                    </>
                )}
            </div>

            {/* Product Type Badge */}
            {product_type_name && (
                <span className="px-2 py-0.5 ml-1 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-md text-xs font-medium whitespace-nowrap shadow-sm">
                    {product_type_name}
                </span>
            )}
        </div>
    );
  };

  // --- DELETE KEYWORD FROM PERFORMANCE POOL ---
  const handleDeleteKeyword = async (keywordToRemove) => {
      const currentListingId = listingId || results?.listing_id;
      
      if (!currentListingId) {
          toast.error("Error: Missing listing ID for deletion.");
          return;
      }

      try {
          // Hard delete the keyword row from listing_seo_stats
          const { error } = await supabase
              .from('listing_seo_stats')
              .delete()
              .eq('listing_id', currentListingId)
              .eq('tag', keywordToRemove);

          if (error) {
              console.error("Supabase delete error:", error);
              toast.error(`Failed to delete keyword: ${error.message}`);
              return;
          }

          // Instantly update local UI state so we don't need a full refetch
          setResults(prev => {
              if (!prev || !prev.analytics) return prev;
              return {
                  ...prev,
                  analytics: prev.analytics.filter(item => item.keyword !== keywordToRemove)
              };
          });

          toast.success(`Deleted "${keywordToRemove}" from listing`);
      } catch (err) {
          console.error("Unexpected error in handleDeleteKeyword:", err);
          toast.error("Failed to remove keyword");
      }
  };

  // --- TOGGLE PIN STATUS ---
  const handleTogglePin = async (keyword, newPinStatus) => {
      const currentListingId = listingId || results?.listing_id;
      
      if (!currentListingId) {
          toast.error("Error: Missing listing ID to pin keyword.");
          return;
      }

      try {
          // Update DB (is_pinned)
          const { error } = await supabase
              .from('listing_seo_stats')
              .update({ is_pinned: newPinStatus })
              .eq('listing_id', currentListingId)
              .eq('tag', keyword);

          if (error) {
              console.error("Supabase pin error:", error);
              toast.error(`Failed to pin keyword: ${error.message}`);
              return;
          }

          // Update local UI state
          setResults(prev => {
              if (!prev || !prev.analytics) return prev;
              return {
                  ...prev,
                  analytics: prev.analytics.map(item => 
                      item.keyword === keyword ? { ...item, is_pinned: newPinStatus } : item
                  )
              };
          });

          if (newPinStatus) {
               toast.success(`Pinned "${keyword}"`);
          }

      } catch (err) {
          console.error("Unexpected error in handleTogglePin:", err);
          toast.error("Failed to pin keyword");
      }
  };

  // --- UPDATE SEO SCORE (Intent or Relevance) ---
  const handleScoreUpdate = async (keyword, type, newScore) => {
      const currentListingId = listingId || results?.listing_id;
      
      if (!currentListingId) {
          toast.error("Error: Missing listing ID to update score.");
          return;
      }

      // Determine the column name in the database
      const dbColumn = type === 'intent' ? 'transactional_score' : 'niche_score';

      try {
          // Update DB natively for this listing and keyword. 
          const { error } = await supabase
              .from('listing_seo_stats')
              .update({ [dbColumn]: newScore })
              .eq('listing_id', currentListingId)
              .eq('tag', keyword);

          if (error) {
              console.error("Supabase score update error:", error);
              toast.error(`Failed to update score: ${error.message}`);
              return;
          }

          // Update local UI state
          setResults(prev => {
              if (!prev || !prev.analytics) return prev;
              return {
                  ...prev,
                  analytics: prev.analytics.map(item => 
                      item.keyword === keyword ? { ...item, [dbColumn]: newScore } : item
                  )
              };
          });

      } catch (err) {
          console.error("Unexpected error in handleScoreUpdate:", err);
          toast.error("Failed to update score");
      }
  };

  const handleSEOSniper = async () => {
      setIsSniperLoading(true);
      try {
          const formData = optimizationFormRef.current?.getCurrentState ? optimizationFormRef.current.getCurrentState() : {};
          await handleAnalyze(formData);
      } finally {
          setIsSniperLoading(false);
      }
  };

  const currentListingContext = useMemo(() => ({
    product_type_name: analysisContext?.product_type_name || '',
    theme: analysisContext?.theme_name || analysisContext?.theme || '',
    niche: analysisContext?.niche_name || analysisContext?.niche || '',
    sub_niche: analysisContext?.sub_niche_name || analysisContext?.sub_niche || ''
  }), [analysisContext]);

  // Render ResultsDisplay directly (no useMemo) — ensures all callback props are always fresh
  const MemoizedResultsDisplay = (
    <ResultsDisplay 
      results={results} 
      onGenerateDraft={handleGenerateDraft}
      isGeneratingDraft={isGeneratingDraft}
      onRelaunchSEO={handleRelaunchSEO}
      isSeoLoading={isSeoLoading}
      onSEOSniper={handleSEOSniper}
      isSniperLoading={isSniperLoading}
      onAddCustomKeyword={handleAddCustomKeyword}
      onAddBatchKeywords={handleAddBatchKeywords}
      isAddingKeyword={isAddingKeyword}
      isAddingBatchKeywords={isAddingBatchKeywords}
      onDeleteKeyword={handleDeleteKeyword}
      onTogglePin={handleTogglePin}
      onUpdateScore={handleScoreUpdate}
      onRecalculateScores={handleRecalculateScores}
      isRecalculating={isRecalculating}
      onApplyStrategy={handleApplyStrategy}
      isApplyingStrategy={isApplyingStrategy}
      listingId={listingId}
      strategySelections={strategySelections}
      onStrategySelectionsChange={setStrategySelections}
      resetSelectionKey={resetSelectionKey}
      refreshFavoritesKey={refreshFavoritesKey}
      onSaveListingInfo={handleSaveListingInfo}

      // SEO Analysis Accordion Props
      seoAnalysisOpen={isSeoAnalysisOpen}
      onSeoAnalysisOpenChange={setIsSeoAnalysisOpen}

      // Favorite Keyword Bank Props
      user={user}
      currentListing={currentListingContext}
    >
        <RecentOptimizations onViewResults={handleLoadListing} />
    </ResultsDisplay>
  );

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
