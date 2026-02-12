import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Package } from 'lucide-react';

const ProductTypeCombobox = ({ groupedOptions = [], value = '', onChange, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Build flat list of visible items for keyboard navigation
  const getFilteredItems = () => {
    const query = search.toLowerCase().trim();
    const items = [];

    groupedOptions.forEach((group) => {
      const matchingTypes = group.types.filter((t) =>
        t.name.toLowerCase().includes(query)
      );
      if (matchingTypes.length > 0) {
        items.push({ type: 'header', label: group.category });
        matchingTypes.forEach((t) => {
          items.push({ type: 'item', id: t.id, name: t.name });
        });
      }
    });

    // Custom type option if search doesn't match any type exactly
    if (query.length > 0) {
      const exactMatch = items.some(
        (i) => i.type === 'item' && i.name.toLowerCase() === query
      );
      if (!exactMatch) {
        items.push({ type: 'custom', name: search.trim() });
      }
    }

    return items;
  };

  const filteredItems = getFilteredItems();
  const selectableItems = filteredItems.filter((i) => i.type !== 'header');

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        // Restore display value if user didn't pick
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item) => {
    if (item.type === 'item') {
      onChange(item.id, item.name);
    } else if (item.type === 'custom') {
      onChange(null, item.name);
    }
    setSearch('');
    setIsOpen(false);
    setHighlightIndex(-1);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e) => {
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
          prev < selectableItems.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev > 0 ? prev - 1 : selectableItems.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightIndex >= 0 && highlightIndex < selectableItems.length) {
          handleSelect(selectableItems[highlightIndex]);
        } else if (search.trim() && selectableItems.length > 0) {
          handleSelect(selectableItems[0]);
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
      const highlighted = listRef.current.querySelector('[data-highlighted="true"]');
      if (highlighted) {
        highlighted.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightIndex]);

  const displayValue = isOpen ? search : value;

  return (
    <div ref={containerRef} className="relative">
      <label className="text-sm font-medium text-slate-700 mb-1 flex items-center gap-1.5">
        <Package size={14} className="text-indigo-500" />
        Product Type
      </label>
      <div className="relative">
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
            setHighlightIndex(-1);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            setSearch('');
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Search or type a product type..."
          className={`w-full pl-9 pr-9 py-2.5 bg-white border rounded-lg outline-none transition-all text-sm
            ${disabled
              ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200'
              : isOpen
                ? 'border-indigo-500 ring-2 ring-indigo-500/20 text-slate-900'
                : 'border-slate-200 text-slate-700 hover:border-indigo-300'
            }`}
        />
        <ChevronDown
          size={16}
          className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transition-transform ${
            isOpen ? 'rotate-180 text-indigo-500' : 'text-slate-400'
          }`}
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={listRef}
          className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto"
        >
          {filteredItems.length === 0 && (
            <div className="px-4 py-3 text-sm text-slate-400 text-center">
              No product types found
            </div>
          )}

          {filteredItems.map((item, idx) => {
            if (item.type === 'header') {
              return (
                <div
                  key={`header-${item.label}`}
                  className="px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100 sticky top-0"
                >
                  {item.label}
                </div>
              );
            }

            const selectableIdx = selectableItems.indexOf(item);
            const isHighlighted = selectableIdx === highlightIndex;
            const isSelected = item.type === 'item' && item.name === value;

            if (item.type === 'custom') {
              return (
                <button
                  key="custom-option"
                  type="button"
                  data-highlighted={isHighlighted}
                  onClick={() => handleSelect(item)}
                  className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 border-t border-dashed border-slate-200 transition-colors
                    ${isHighlighted ? 'bg-indigo-50 text-indigo-700' : 'text-indigo-600 hover:bg-indigo-50'}`}
                >
                  <span className="text-indigo-400 font-bold">+</span>
                  Use "<span className="font-semibold">{item.name}</span>" as custom type
                </button>
              );
            }

            return (
              <button
                key={item.id}
                type="button"
                data-highlighted={isHighlighted}
                onClick={() => handleSelect(item)}
                className={`w-full px-4 py-2 text-left text-sm transition-colors
                  ${isHighlighted ? 'bg-indigo-50 text-indigo-700' : ''}
                  ${isSelected && !isHighlighted ? 'bg-indigo-50/50 text-indigo-600 font-medium' : ''}
                  ${!isHighlighted && !isSelected ? 'text-slate-700 hover:bg-slate-50' : ''}`}
              >
                {item.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProductTypeCombobox;
