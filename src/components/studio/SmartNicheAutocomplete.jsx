import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Plus, MapPin, Grid, Layers, List } from 'lucide-react'; // Using icons for badges
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';

// Helper for type badges
const getTypeBadge = (type) => {
    switch(type) {
        case 'Theme': return { color: 'bg-purple-100 text-purple-700', icon: Grid };
        case 'Niche': return { color: 'bg-blue-100 text-blue-700', icon: Layers };
        case 'Sub-niche': return { color: 'bg-indigo-100 text-indigo-700', icon: MapPin };
        default: return { color: 'bg-slate-100 text-slate-700', icon: List };
    }
};

const SmartNicheAutocomplete = ({ 
  label = "Niche / Context",
  value = null, // Expects { id, name, type, theme_name, niche_name, ... }
  onChange,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [highlightIndex, setHighlightIndex] = useState(0); 
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Fetch Data Once
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        let query = supabase
          .from('unified_niche_search')
          .select('*')
          .order('name');
          
        if (user) {
            // Filter by user_id is null (official) OR user_id equals current user
            query = query.or(`user_id.is.null,user_id.eq.${user.id}`);
        } else {
            query = query.is('user_id', null);
        }

        const { data, error } = await query;
        
        if (data && !error) {
           const processed = data.map(item => {
               // Parse context for names if not explicit
               let themeName = 'Custom';
               let nicheName = 'Custom';
               
               if (item.type === 'Theme') {
                   themeName = item.name;
               } else if (item.type === 'Niche') {
                   themeName = item.parent_context; // "Theme Name"
                   nicheName = item.name;
               } else if (item.type === 'Sub-niche') {
                   // context: "Niche Name > Theme Name"
                   if (item.parent_context) {
                       const parts = item.parent_context.split(' > ');
                       if (parts.length >= 2) {
                           nicheName = parts[0];
                           themeName = parts[1];
                       }
                   }
               }

               return {
                   ...item,
                   theme_name: themeName,
                   niche_name: nicheName,
                   // Ensure ID fields are present for selection (view has them)
                   full_text: item.search_text ? item.search_text.toLowerCase() : item.name.toLowerCase(),
                   context: item.parent_context // Use view's context for display
               };
           });
           setItems(processed);
        } else {
             console.error("Error fetching unified niches:", error);
             setItems([]);
        }
      } catch (e) {
        console.error("Exception fetching data:", e);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter Items
  const filteredItems = useMemo(() => {
      const query = search.toLowerCase().trim();
      if (!query) return items; // Show all (virtualized list might be fast enough for 1000 items, let's see)

      // Priority Sort: Exact match > Starts with > Includes
      return items.filter(item => item.full_text.includes(query)).sort((a, b) => {
          const aStarts = a.name.toLowerCase().startsWith(query);
          const bStarts = b.name.toLowerCase().startsWith(query);
          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;
          return 0; // standard sort
      });
  }, [items, search]);

  // Handle Selection
  const handleSelect = async (item) => {
    if (item.id === 'custom_entry') {
        // Create custom niche — use item._searchTerm (passed explicitly) to avoid
        // race condition where outside-click mousedown clears search before onClick fires
        const newName = (item._searchTerm || search).trim();
        if (!newName) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error("You must be logged in to create custom niches.");
                return;
            }

            // Insert into user_custom_niches
            const { data, error } = await supabase
                .from('user_custom_niches')
                .insert([{ 
                    name: newName, 
                    user_id: user.id 
                    // ai_category_prediction might be null initially
                }])
                .select()
                .single();

            if (error) {
                console.error("Error creating custom niche:", error);
                toast.error("Failed to create custom niche.");
                return;
            }

            // Construct the unified object
            const customObj = {
                id: data.id, // The new ID from DB
                name: data.name,
                type: 'Custom', 
                is_custom: true,
                theme_name: 'Custom',
                niche_name: 'Custom',
                context: 'Custom Niche',
                search_text: data.name,
                user_id: user.id
            };

            // Add to local items state so it appears in future searches immediately
            setItems(prev => [...prev, {
                ...customObj,
                full_text: customObj.name.toLowerCase()
            }]);

            onChange(customObj);
            toast.success(`Custom niche "${newName}" created!`);

        } catch (e) {
            console.error("Exception creating custom niche:", e);
            toast.error("An error occurred while creating the niche.");
        }
    } else {
        onChange({ ...item, is_custom: false });
    }
    setSearch('');
    setIsOpen(false);
    setHighlightIndex(0);
  };
  
  // Outside Click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearch(''); 
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll logic
  useEffect(() => {
    if (isOpen && listRef.current && listRef.current.children[highlightIndex]) {
        listRef.current.children[highlightIndex].scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIndex, isOpen]);


  const handleKeyDown = (e) => {
    if (!isOpen) {
        if (e.key === 'ArrowDown' || e.key === 'Enter') setIsOpen(true);
        return;
    }

    const maxIndex = filteredItems.length + (search ? 1 : 0) - 1; 

    switch (e.key) {
        case 'ArrowDown':
            e.preventDefault();
            setHighlightIndex(prev => (prev < maxIndex ? prev + 1 : 0));
            break;
        case 'ArrowUp':
            e.preventDefault();
            setHighlightIndex(prev => (prev > 0 ? prev - 1 : maxIndex));
            break;
        case 'Enter':
            e.preventDefault();
            if (highlightIndex < filteredItems.length) {
                handleSelect(filteredItems[highlightIndex]);
            } else if (search.trim()) {
                handleSelect({ id: 'custom_entry', name: search, _searchTerm: search });
            }
            break;
        case 'Escape':
            setIsOpen(false);
            setSearch('');
            break;
    }
  };

  // Display text logic: Show name or hierarchy context
  const getDisplayText = () => {
      if (isOpen) return search;
      if (!value?.name) return '';
      
      if (value.is_custom) return value.name;

      // Depend on type
      if (value.type === 'Theme') return value.name;
      if (value.type === 'Niche') return `${value.theme_name} > ${value.name}`;
      
      // Sub-niche
      return `${value.theme_name} > ${value.niche_name} > ${value.name}`;
  };

  const displayText = getDisplayText();

  return (
    <div ref={containerRef} className={`relative ${className}`}>
        <label className="text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
            <MapPin size={14} className="text-indigo-500" />
            {label}
        </label>
        
        <div className="relative group">
            <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${isOpen ? 'text-indigo-500' : 'text-slate-400'}`} />
            
            <input
                ref={inputRef}
                type="text"
                value={displayText}
                onChange={e => {
                    setSearch(e.target.value);
                    if (!isOpen) setIsOpen(true);
                    setHighlightIndex(0);
                }}
                onFocus={() => {
                    setIsOpen(true);
                    setSearch('');
                }}
                onKeyDown={handleKeyDown}
                placeholder={loading ? "Loading..." : "Search Theme, Niche, or Sub-niche..."}
                disabled={loading}
                className={`w-full pl-9 pr-9 py-2.5 bg-white border rounded-lg outline-none transition-all text-sm
                ${isOpen 
                    ? 'border-indigo-500 ring-2 ring-indigo-500/20 text-slate-900' 
                    : 'border-slate-200 text-slate-700 hover:border-indigo-300'
                }`}
            />

            <ChevronDown size={16} className={`absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-indigo-500' : ''}`} />
        </div>

        {isOpen && (
            <div ref={listRef} className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl shadow-slate-200/50 max-h-80 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
                {filteredItems.map((item, idx) => {
                    const badge = getTypeBadge(item.type);
                    const BadgeIcon = badge.icon;
                    
                    return (
                        <button
                            key={`${item.type}-${item.id}`}
                            type="button"
                            onClick={() => handleSelect(item)}
                            className={`w-full px-4 py-2.5 text-left border-b border-slate-50 last:border-0 transition-colors flex items-center justify-between group
                                ${idx === highlightIndex ? 'bg-indigo-50' : 'hover:bg-slate-50'}
                            `}
                        >
                            <div className="flex flex-col flex-1 min-w-0 mr-3">
                                <span className={`text-sm font-medium truncate ${idx === highlightIndex ? 'text-indigo-700' : 'text-slate-700'}`}>
                                    {item.name}
                                </span>
                                <span className="text-xs text-slate-400 truncate">
                                    {item.context}
                                </span>
                            </div>
                            
                            <span className={`flex-shrink-0 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 ${badge.color}`}>
                                {BadgeIcon && <BadgeIcon size={10} />}
                                {item.type}
                            </span>
                        </button>
                    );
                })}

                {search.trim().length > 0 && !filteredItems.some(i => i.name.toLowerCase() === search.toLowerCase()) && (
                     <button
                        type="button"
                        onClick={() => handleSelect({ id: 'custom_entry', _searchTerm: search })}
                        className={`w-full px-4 py-3 text-left border-t border-dashed border-slate-200 transition-colors flex items-center gap-2
                             ${highlightIndex === filteredItems.length ? 'bg-indigo-50 text-indigo-700' : 'text-indigo-600 hover:bg-indigo-50'}
                        `}
                    >
                        <Plus size={16} />
                        <span className="text-sm font-medium">Use "<span className="font-bold">{search}</span>" as custom</span>
                    </button>
                )}

                {filteredItems.length === 0 && !search && (
                    <div className="p-4 text-center text-slate-400 text-sm italic">
                        Start typing to search Themes, Niches, or Sub-niches...
                    </div>
                )}
            </div>
        )}
    </div>
  );
};

export default SmartNicheAutocomplete;
