import React, { useState } from 'react';
// Note: J'ai retiré l'icône 'Info' pour gagner de la place dans la description
import { Megaphone, Scale, Target } from 'lucide-react';

const SEOStrategySelector = ({ value, onChange }) => {
  // Use value prop for controlled behavior, fallback to 'balanced'
  const selected = value || 'balanced';

  const modes = [
    {
      id: 'broad',
      label: 'Broad',
      badge: 'Max Volume',
      // Icônes légèrement plus petites (w-3.5 h-3.5)
      icon: <Megaphone className="w-3.5 h-3.5" />,
      // Descriptions raccourcies pour tenir sur une ligne si possible
      description: 'Prioritizes high visibility and mass traffic.',
      color: 'text-blue-600',
    },
    {
      id: 'balanced',
      label: 'Balanced',
      badge: 'Recommended',
      icon: <Scale className="w-3.5 h-3.5" />,
      description: 'Optimal mix of search volume and niche precision.',
      color: 'text-indigo-600',
    },
    {
      id: 'sniper',
      label: 'Sniper',
      badge: 'Niche Expert',
      icon: <Target className="w-3.5 h-3.5" />,
      description: 'Aggressively targets low-competition micro-niches.',
      color: 'text-emerald-600',
    },
  ];

  const handleSelect = (id) => {
    if (onChange) onChange(id);
  };

  return (
    // Réduction drastique du padding global et de l'espacement vertical (p-2 space-y-2)
    <div className="w-full">
      {/* Label plus petit (text-xs) */}
      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider pl-1 mb-1 block">
        SEO Strategy
      </label>
      
      {/* Conteneur plus fin (p-0.5 rounded-xl) */}
      <div className="relative flex p-0.5 bg-slate-100 rounded-xl border border-slate-200 shadow-inner mb-2">
        {modes.map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => handleSelect(mode.id)}
            // LE GROS CHANGEMENT : py-1.5 au lieu de py-3. C'est moitié moins haut.
            className={`flex-1 relative flex flex-col items-center justify-center py-1.5 px-1 rounded-lg transition-all duration-200 z-10 ${
              selected === mode.id 
                ? 'bg-white shadow-sm' 
                : 'hover:bg-slate-200/50 text-slate-500'
            }`}
          >
            {/* Espace réduit entre icône et texte (space-x-1) */}
            <div className={`flex items-center space-x-1 mb-0.5 ${selected === mode.id ? mode.color : ''}`}>
              {mode.icon}
              {/* Font size réduite (text-xs md:text-sm) */}
              <span className="font-semibold text-xs md:text-sm leading-none">{mode.label}</span>
            </div>
            {/* Badge collé au texte (mt-0.5) et minuscule (text-[9px]) */}
            <span className={`text-[9px] uppercase font-bold mt-0.5 leading-none opacity-80 ${selected === mode.id ? 'text-slate-600' : 'text-slate-400'}`}>
              {mode.badge}
            </span>
          </button>
        ))}
      </div>

      {/* Description ultra-compacte : plus d'icône info, padding minimal (p-1.5), texte minuscule (text-xs) */}
      <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100 text-center">
        <p className="text-xs text-slate-500 italic leading-tight">
          {modes.find(m => m.id === selected)?.description}
        </p>
      </div>
    </div>
  );
};

export default SEOStrategySelector;
