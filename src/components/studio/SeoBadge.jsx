import React, { useState, useRef, useEffect } from 'react';

const SCORE_OPTIONS = {
  // Unified nomenclature for labels
  labels: {
    10: { value: 10, label: "Very High", classes: "bg-indigo-100 text-indigo-700 border-indigo-200" },
    7:  { value: 7,  label: "High",      classes: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    4:  { value: 4,  label: "Moderate",  classes: "bg-amber-100 text-amber-700 border-amber-200" },
    1:  { value: 1,  label: "Low",       classes: "bg-slate-100 text-slate-600 border-slate-200" }
  },
  
  // Specific educational tooltips
  tooltips: {
    relevance: {
      10: "Elite matching: Specific Style + Subject + Product.",
      7:  "Strong niche focus with clear descriptive style.",
      4:  "Basic product noun. Consider adding a specific style or niche.",
      1:  "Broad buzzword. High competition, low conversion risk."
    },
    intent: {
      10: "Maximum purchase intent: Specific product for a clear occasion/recipient.",
      7:  "Direct intent: Clear product and style combination.",
      4:  "Browsing intent: Focuses on aesthetic but missing the product noun.",
      1:  "Informational: Low buyer intent, likely looking for DIY or inspiration."
    }
  }
};

const SORTED_OPTIONS = [
    SCORE_OPTIONS.labels[10],
    SCORE_OPTIONS.labels[7],
    SCORE_OPTIONS.labels[4],
    SCORE_OPTIONS.labels[1]
];

const SeoBadge = ({ score, type, onUpdate, compact = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Map continuous score to discrete levels initially
  let initialMappedScore = 1;
  const numScore = parseFloat(score);
  
  if (!isNaN(numScore)) {
      if (numScore >= 8.5) initialMappedScore = 10;
      else if (numScore >= 5.5) initialMappedScore = 7;
      else if (numScore >= 2.5) initialMappedScore = 4;
      else initialMappedScore = 1;
  }

  const [currentScore, setCurrentScore] = useState(initialMappedScore);
  const dropdownRef = useRef(null);

  // Sync state if props change (e.g. from parent refresh)
  useEffect(() => {
    let mapped = 1;
    const n = parseFloat(score);
    if (!isNaN(n)) {
        if (n >= 8.5) mapped = 10;
        else if (n >= 5.5) mapped = 7;
        else if (n >= 2.5) mapped = 4;
    }
    setCurrentScore(mapped);
  }, [score]);

  // Close menu if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
        document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleSelectChange = (newValue) => {
    setCurrentScore(newValue);
    setIsOpen(false);
    if (onUpdate) {
        // Only trigger update if the core mapped value actually changed
        if (newValue !== initialMappedScore) {
            onUpdate(newValue);
        }
    }
  };

  const labelConfig = SCORE_OPTIONS.labels[currentScore] || SCORE_OPTIONS.labels[1];
  const tooltipText = SCORE_OPTIONS.tooltips[type]?.[currentScore] || "";

  if ((!score && score !== 0) && !isOpen) {
      // Still allow them to click to edit even if there's no score yet
      return (
          <div className="flex justify-center" onClick={() => setIsOpen(true)}>
             <span className="text-slate-300 cursor-pointer hover:text-indigo-400">-</span>
          </div>
      );
  }

  return (
    <div className={`relative inline-flex items-center justify-center ${compact ? 'min-w-[60px]' : 'min-w-[75px]'} group`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        title={tooltipText}
        className={`w-full rounded-full uppercase tracking-wider font-bold border cursor-pointer transition-all hover:ring-2 hover:ring-offset-1 hover:ring-gray-300 hover:opacity-90 ${compact ? 'px-1.5 py-0 text-[10px]' : 'px-2.5 py-0.5 text-[11px]'} ${labelConfig.classes}`}
      >
        {labelConfig.label}
      </button>

      {isOpen && (
        <div className="absolute z-50 top-full mt-1.5 left-1/2 -translate-x-1/2 min-w-[110px] bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-100">
          {SORTED_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleSelectChange(opt.value)}
              className={`w-full text-left px-3 py-1.5 text-xs font-bold transition-colors ${
                currentScore === opt.value
                  ? "bg-indigo-50 text-indigo-700" 
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SeoBadge;
