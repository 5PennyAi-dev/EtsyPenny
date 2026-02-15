import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Plus } from 'lucide-react';

const SearchableSelect = ({ 
  label, 
  icon: Icon, 
  value = '', 
  onChange, 
  options = [], 
  placeholder = "Search...", 
  disabled = false,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Filter items based on search
  const getFilteredItems = () => {
    const query = search.toLowerCase().trim();
    
    // Convert options to items with type
    let items = options.map(opt => ({ type: 'item', ...opt }));
    
    // Filter if searching
    if (query) {
      items = items.filter(opt => 
        opt.name.toLowerCase().includes(query)
      );
    }

    // Custom option if search text exists and no exact match
    if (query.length > 0) {
      const exactMatch = items.some(
        (i) => i.name.toLowerCase() === query
      );
      if (!exactMatch) {
         // Add at the end
        items.push({ type: 'custom', name: search.trim() });
      }
    }

    return items;
  };

  const filteredItems = getFilteredItems();

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearch(''); 
        setHighlightIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item) => {
    if (item.type === 'item') {
      onChange(item.id, item.name);
    } else if (item.type === 'custom') {
      onChange(null, item.name); // Custom items have no ID
    }
    setSearch('');
    setIsOpen(false);
    setHighlightIndex(-1);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev < filteredItems.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev > 0 ? prev - 1 : filteredItems.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        e.stopPropagation(); // Prevent form submission
        if (highlightIndex >= 0 && highlightIndex < filteredItems.length) {
          handleSelect(filteredItems[highlightIndex]);
        } else if (filteredItems.length > 0 && search) {
          // If searching and hit enter, select first match
          handleSelect(filteredItems[0]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearch('');
        setHighlightIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const highlighted = listRef.current.children[highlightIndex];
      if (highlighted) {
        highlighted.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightIndex]);

  // Display value logic
  const displayValue = isOpen ? search : value || '';

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className={`text-sm font-medium mb-1.5 flex items-center gap-1.5 ${disabled ? 'text-slate-400' : 'text-slate-700'}`}>
          {Icon && <Icon size={14} className={disabled ? 'text-slate-300' : 'text-indigo-500'} />}
          {label}
        </label>
      )}
      
      <div className="relative group">
        <Search
          size={16}
          className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${
            isOpen ? 'text-indigo-500' : 'text-slate-400'
          }`}
        />
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={(e) => {
            setSearch(e.target.value);
            setHighlightIndex(0); // Highlight first item on type
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            setSearch(''); 
            setHighlightIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full pl-9 pr-9 py-2.5 bg-white border rounded-lg outline-none transition-all text-sm
            ${disabled
              ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200'
              : isOpen
                ? 'border-indigo-500 ring-2 ring-indigo-500/20 text-slate-900 bg-white'
                : 'border-slate-200 text-slate-700 hover:border-indigo-300 group-hover:bg-slate-50/50'
            }`}
        />
        <ChevronDown
          size={16}
          className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-indigo-500' : 'text-slate-400'
          }`}
        />
      </div>

      {/* Dropdown List */}
      {isOpen && (
        <div
            ref={listRef}
            className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl shadow-slate-200/50 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100 custom-scrollbar"
        >
          {filteredItems.length === 0 && (
            <div className="px-4 py-8 text-sm text-slate-400 text-center italic flex flex-col items-center gap-2">
                <Search size={16} className="opacity-50" />
                <span>No matching options</span>
            </div>
          )}

          {filteredItems.map((item, idx) => {
            const isHighlighted = idx === highlightIndex;
            const isSelected = item.name === value;

            if (item.type === 'custom') {
                return (
                    <button
                        key="custom-option"
                        type="button"
                        onClick={() => handleSelect(item)}
                        className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 border-t border-dashed border-slate-100 transition-colors
                            ${isHighlighted ? 'bg-indigo-50 text-indigo-700' : 'text-indigo-600 hover:bg-indigo-50'}`}
                    >
                        <Plus size={14} className="text-indigo-500 font-bold" />
                        <span>Use <span className="font-bold">"{item.name}"</span> as custom</span>
                    </button>
                );
            }

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item)}
                className={`w-full px-4 py-2.5 text-left text-sm transition-colors truncate flex items-center justify-between group
                  ${isHighlighted ? 'bg-indigo-50 text-indigo-700' : ''}
                  ${isSelected && !isHighlighted ? 'bg-indigo-50/50 text-indigo-600 font-medium' : ''}
                  ${!isHighlighted && !isSelected ? 'text-slate-700 hover:bg-slate-50' : ''}`}
              >
                <span>{item.name}</span>
                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
