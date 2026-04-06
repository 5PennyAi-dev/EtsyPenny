import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, PartyPopper, Compass } from 'lucide-react';

const STEPS = [
  {
    id: 'upload-photo',
    target: 'image-upload',
    title: 'Upload your product photo',
    body: 'Drag & drop or click to upload a photo of your product. This is what our AI will analyze.',
    advance: 'auto',
  },
  {
    id: 'select-product-type',
    target: 'product-type',
    title: 'Select your product type',
    body: 'Choose the type of product you\'re selling. This helps our AI generate more relevant SEO keywords.',
    advance: 'auto',
  },
  {
    id: 'add-description',
    target: 'product-description',
    title: 'Add a brief description (optional)',
    body: 'Describe your product in a few words. This gives extra context to the AI for better results.',
    advance: 'skip',
  },
  {
    id: 'analyze-design',
    target: 'analyze-button',
    title: 'Analyze your design',
    body: 'Click this button to let our AI analyze your product photo. It will detect the style, colors, and target audience.',
    advance: 'auto',
  },
  {
    id: 'review-classification',
    target: 'ai-classification',
    title: 'Review the AI classification',
    body: 'Our AI has classified your product. You can adjust the theme, niche, or sub-niche if needed. These inform the SEO keywords.',
    advance: 'manual',
  },
  {
    id: 'generate-seo',
    target: 'generate-button',
    title: 'Generate your SEO keywords',
    body: 'Click Generate to create optimized tags, titles, and descriptions based on real Etsy search data.',
    advance: 'auto',
  },
  {
    id: 'explore-results',
    target: 'results-display',
    title: 'Explore your results',
    body: 'Your SEO keywords are ready! Select your best tags and review scores before generating your listing draft.',
    advance: 'manual',
  },
  {
    id: 'optimize-draft',
    target: 'optimize-button',
    title: 'Optimize with AI',
    body: 'Click to generate your optimized title and description. This is the final step — your listing is ready to copy to Etsy!',
    advance: 'finish',
  },
];

const CUTOUT_PADDING = 8;
const TOOLTIP_MARGIN = 12;
const VIEWPORT_PAD = 16;

function getFirstIncompleteStep({ imageUrl, productType, isImageAnalyzed, hasResults }) {
  if (!imageUrl) return 0;
  if (!productType) return 1;
  // Step 2 (description) is optional — always skip past it on resume
  if (!isImageAnalyzed) return 3;
  // Step 4 (review) requires manual advance — if analyzed but no results, show review
  if (!hasResults) return 4;
  // If we have results, go to the final step
  return 6;
}

function computePosition(targetRect, tooltipEl) {
  if (!targetRect || !tooltipEl) return { top: 0, left: 0, placement: 'bottom' };

  const tRect = {
    width: tooltipEl.offsetWidth,
    height: tooltipEl.offsetHeight,
  };

  const isMobile = window.innerWidth < 768;
  const placements = isMobile ? ['bottom'] : ['bottom', 'top', 'right', 'left'];

  for (const placement of placements) {
    let top, left;
    switch (placement) {
      case 'bottom':
        top = targetRect.bottom + TOOLTIP_MARGIN;
        left = targetRect.left + targetRect.width / 2 - tRect.width / 2;
        break;
      case 'top':
        top = targetRect.top - tRect.height - TOOLTIP_MARGIN;
        left = targetRect.left + targetRect.width / 2 - tRect.width / 2;
        break;
      case 'right':
        top = targetRect.top + targetRect.height / 2 - tRect.height / 2;
        left = targetRect.right + TOOLTIP_MARGIN;
        break;
      case 'left':
        top = targetRect.top + targetRect.height / 2 - tRect.height / 2;
        left = targetRect.left - tRect.width - TOOLTIP_MARGIN;
        break;
    }

    // Clamp to viewport
    left = Math.max(VIEWPORT_PAD, Math.min(left, window.innerWidth - tRect.width - VIEWPORT_PAD));
    top = Math.max(VIEWPORT_PAD, Math.min(top, window.innerHeight - tRect.height - VIEWPORT_PAD));

    // Check fits in viewport
    if (top >= VIEWPORT_PAD && top + tRect.height <= window.innerHeight - VIEWPORT_PAD) {
      return { top, left, placement };
    }
  }

  // Fallback
  return {
    top: targetRect.bottom + TOOLTIP_MARGIN,
    left: Math.max(VIEWPORT_PAD, Math.min(targetRect.left, window.innerWidth - tRect.width - VIEWPORT_PAD)),
    placement: 'bottom',
  };
}

export default function OnboardingGuide({
  imageUrl,
  productType,
  contextRef,
  isAnalyzing,
  isImageAnalyzed,
  isGeneratingSEO,
  hasResults,
  onComplete,
  onActivateForm,
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0, placement: 'bottom' });
  const [isReady, setIsReady] = useState(false);

  const tooltipRef = useRef(null);
  const prevHighlightedRef = useRef(null);
  const advanceTimerRef = useRef(null);

  const step = STEPS[currentStep];

  // Activate the form on mount so the user can interact
  useEffect(() => {
    onActivateForm?.();
  }, []);

  // On mount, skip to first incomplete step
  useEffect(() => {
    const firstIncomplete = getFirstIncompleteStep({ imageUrl, productType, isImageAnalyzed, hasResults });
    if (firstIncomplete >= STEPS.length) {
      onComplete?.();
      return;
    }
    setCurrentStep(firstIncomplete);
    setIsReady(true);
  }, []);

  // Find and track target element rect
  const updateTargetRect = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(`[data-onboarding="${step.target}"]`);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [step]);

  // Update rect on step change, and set up observers
  useEffect(() => {
    updateTargetRect();

    // Scroll target into view
    const el = document.querySelector(`[data-onboarding="${step?.target}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Recompute after scroll settles
      const t = setTimeout(updateTargetRect, 500);
      return () => clearTimeout(t);
    }
  }, [currentStep, step, updateTargetRect]);

  // Poll for target element when it doesn't exist yet (conditional rendering)
  useEffect(() => {
    if (targetRect) return;
    const interval = setInterval(() => {
      const el = document.querySelector(`[data-onboarding="${step?.target}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(updateTargetRect, 500);
        clearInterval(interval);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [targetRect, step, updateTargetRect]);

  // Recompute position on resize/scroll
  useEffect(() => {
    const handler = () => updateTargetRect();
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, true);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler, true);
    };
  }, [updateTargetRect]);

  // Manage z-index on highlighted element
  useEffect(() => {
    // Restore previous element
    if (prevHighlightedRef.current) {
      prevHighlightedRef.current.style.position = '';
      prevHighlightedRef.current.style.zIndex = '';
      prevHighlightedRef.current = null;
    }

    if (!step) return;
    const el = document.querySelector(`[data-onboarding="${step.target}"]`);
    if (el) {
      el.style.position = 'relative';
      el.style.zIndex = '55';
      prevHighlightedRef.current = el;
    }

    return () => {
      if (prevHighlightedRef.current) {
        prevHighlightedRef.current.style.position = '';
        prevHighlightedRef.current.style.zIndex = '';
        prevHighlightedRef.current = null;
      }
    };
  }, [currentStep, step]);

  // Compute tooltip position after render
  useLayoutEffect(() => {
    if (targetRect && tooltipRef.current) {
      const pos = computePosition(targetRect, tooltipRef.current);
      setTooltipPos(pos);
    }
  }, [targetRect, currentStep]);

  // Auto-advance: Step 0 — image uploaded
  useEffect(() => {
    if (currentStep !== 0 || !imageUrl) return;
    advanceTimerRef.current = setTimeout(() => setCurrentStep(1), 400);
    return () => clearTimeout(advanceTimerRef.current);
  }, [currentStep, imageUrl]);

  // Auto-advance: Step 1 — product type selected
  useEffect(() => {
    if (currentStep !== 1 || !productType) return;
    advanceTimerRef.current = setTimeout(() => setCurrentStep(2), 400);
    return () => clearTimeout(advanceTimerRef.current);
  }, [currentStep, productType]);

  // Auto-advance: Step 2 (optional) — blur on description textarea
  useEffect(() => {
    if (currentStep !== 2) return;
    const textarea = contextRef?.current;
    if (!textarea) return;

    const handleBlur = () => {
      if (textarea.value.trim()) {
        advanceTimerRef.current = setTimeout(() => setCurrentStep(3), 400);
      }
    };

    textarea.addEventListener('blur', handleBlur);
    return () => {
      textarea.removeEventListener('blur', handleBlur);
      clearTimeout(advanceTimerRef.current);
    };
  }, [currentStep, contextRef]);

  // Auto-advance: Step 3 — analyze started
  useEffect(() => {
    if (currentStep !== 3 || !isAnalyzing) return;
    advanceTimerRef.current = setTimeout(() => setCurrentStep(4), 400);
    return () => clearTimeout(advanceTimerRef.current);
  }, [currentStep, isAnalyzing]);

  // Auto-advance: Step 4 — wait for analysis to complete, then show review
  // (This step requires manual "Next" click — no auto-advance here)
  // But if isImageAnalyzed was already true when entering step 4, the user already sees the classification.

  // Auto-advance: Step 5 — SEO generation started
  useEffect(() => {
    if (currentStep !== 5 || !isGeneratingSEO) return;
    advanceTimerRef.current = setTimeout(() => setCurrentStep(6), 400);
    return () => clearTimeout(advanceTimerRef.current);
  }, [currentStep, isGeneratingSEO]);

  const handleSkipTour = useCallback(() => {
    onComplete?.();
  }, [onComplete]);

  const handleNext = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep]);

  const handleFinish = useCallback(() => {
    onComplete?.();
  }, [onComplete]);

  // Don't render until ready or if no step
  if (!isReady || !step) return null;

  return createPortal(
    <AnimatePresence mode="wait">
      <div key={step.id}>
        {/* Spotlight cutout overlay */}
        {targetRect && (
          <div
            className="fixed pointer-events-none"
            style={{
              zIndex: 50,
              top: targetRect.top - CUTOUT_PADDING,
              left: targetRect.left - CUTOUT_PADDING,
              width: targetRect.width + CUTOUT_PADDING * 2,
              height: targetRect.height + CUTOUT_PADDING * 2,
              borderRadius: 12,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.4)',
              transition: 'top 0.3s ease, left 0.3s ease, width 0.3s ease, height 0.3s ease',
            }}
          />
        )}

        {/* Tooltip */}
        <motion.div
          ref={tooltipRef}
          key={`tooltip-${step.id}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed bg-white shadow-xl rounded-xl border border-slate-200 p-4 max-w-sm w-full pointer-events-auto"
          style={{
            zIndex: 60,
            top: tooltipPos.top,
            left: tooltipPos.left,
            maxWidth: window.innerWidth < 768 ? 'calc(100vw - 32px)' : '360px',
          }}
        >
          {/* Step indicator */}
          <div className="flex items-center justify-between mb-2">
            <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              Step {currentStep + 1} of {STEPS.length}
            </span>
            <button
              onClick={handleSkipTour}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              Skip tour
            </button>
          </div>

          {/* Title */}
          <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-1.5">
            <Compass size={15} className="text-indigo-500" />
            {step.title}
          </h3>

          {/* Body */}
          <p className="text-sm text-slate-600 leading-relaxed mb-3">
            {step.body}
          </p>

          {/* Action buttons based on step type */}
          <div className="flex items-center justify-end gap-2">
            {step.advance === 'skip' && (
              <button
                onClick={handleNext}
                className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors px-2 py-1"
              >
                Skip
                <ArrowRight size={12} />
              </button>
            )}

            {step.advance === 'manual' && (
              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Next
                <ArrowRight size={13} />
              </button>
            )}

            {step.advance === 'finish' && (
              <button
                onClick={handleFinish}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Finish tour
                <PartyPopper size={13} />
              </button>
            )}

            {step.advance === 'auto' && (
              <span className="text-[11px] text-slate-400 italic">
                Waiting for your action...
              </span>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
