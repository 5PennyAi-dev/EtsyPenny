import React from 'react';
import { Radar, Scale, Target } from 'lucide-react';

const StrategySwitcher = ({ activeMode, onModeChange, availableModes = [] }) => {
  const modes = [
    { id: 'broad', label: 'Broad', icon: Radar },
    { id: 'balanced', label: 'Balanced', icon: Scale },
    { id: 'sniper', label: 'Sniper', icon: Target },
  ];

  return (
    <div className="flex justify-center w-full mb-6">
      <div className="bg-slate-100/80 p-1 rounded-xl flex items-center shadow-inner border border-slate-200/50">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isActive = activeMode === mode.id;
          const isAvailable = availableModes.includes(mode.id);
          
          return (
            <button
              key={mode.id}
              onClick={() => isAvailable && onModeChange(mode.id)}
              disabled={!isAvailable}
              className={`
                relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ease-out
                ${isActive 
                  ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' 
                  : 'text-slate-500 hover:text-slate-700'
                }
                ${!isAvailable ? 'opacity-50 cursor-not-allowed hover:text-slate-500' : 'cursor-pointer'}
              `}
            >
              <Icon size={16} className={isActive ? "stroke-[2.5px]" : "stroke-2"} />
              <span>{mode.label}</span>
              
              {/* Optional: Lock icon for unavailable modes? For now just disabled state */}
              {/* {!isAvailable && <Lock size={12} className="ml-1 opacity-40" />} */}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default StrategySwitcher;
