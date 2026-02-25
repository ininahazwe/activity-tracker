import { useState, useRef, useEffect } from "react";
import { ChevronDown, X } from "lucide-react";

interface MultiSelectProps {
  // Support both naming conventions
  items?: string[];
  options?: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function MultiSelect({
                                      items,
                                      options,
                                      selected,
                                      onChange,
                                      placeholder = "Select items...",
                                      disabled = false,
                                    }: MultiSelectProps) {
  // Support both items and options props
  const availableItems = items || options || [];

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
          containerRef.current &&
          !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredItems = availableItems.filter((item) =>
      item.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleItem = (item: string) => {
    if (selected.includes(item)) {
      onChange(selected.filter((s) => s !== item));
    } else {
      onChange([...selected, item]);
    }
  };

  const removeItem = (item: string) => {
    onChange(selected.filter((s) => s !== item));
  };

  return (
      <div ref={containerRef} className="relative">
        {/* Input field */}
        <div
            onClick={() => !disabled && setIsOpen(!isOpen)}
            className={`input-field flex items-center justify-between cursor-pointer ${
                disabled ? "opacity-50 cursor-not-allowed" : ""
            }`}
        >
          <div className="flex items-center gap-2 flex-wrap">
            {selected.length > 0 ? (
                selected.map((item) => (
                    <span
                        key={item}
                        className="bg-accent/20 text-accent px-2 py-1 rounded text-xs font-medium flex items-center gap-1"
                    >
                {item}
                      <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeItem(item);
                          }}
                          className="hover:text-accent/80 transition-colors"
                      >
                  <X size={14} />
                </button>
              </span>
                ))
            ) : (
                <span className="text-gray-500 text-xs">{placeholder}</span>
            )}
          </div>
          <ChevronDown
              size={16}
              className={`text-gray-500 transition-transform ${
                  isOpen ? "rotate-180" : ""
              }`}
          />
        </div>

        {/* Dropdown */}
        {isOpen && !disabled && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-lg z-50 animate-[fadeIn_0.2s_ease]">
              {/* Search input */}
              <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border-b border-border text-xs bg-transparent text-gray-200 placeholder-gray-600 focus:outline-none"
                  onClick={(e) => e.stopPropagation()}
              />

              {/* Items list */}
              <div className="max-h-64 overflow-y-auto">
                {filteredItems.length > 0 ? (
                    filteredItems.map((item) => (
                        <button
                            key={item}
                            onClick={() => toggleItem(item)}
                            className={`w-full text-left px-3 py-2.5 text-xs font-medium transition-colors flex items-center gap-2
                    ${
                                selected.includes(item)
                                    ? "bg-accent/10 text-accent"
                                    : "text-gray-300 hover:bg-surface-hover"
                            }`}
                        >
                          <input
                              type="checkbox"
                              checked={selected.includes(item)}
                              onChange={() => {}}
                              className="w-3 h-3 cursor-pointer"
                          />
                          {item}
                        </button>
                    ))
                ) : (
                    <div className="px-3 py-4 text-center text-gray-500 text-xs">
                      No items found
                    </div>
                )}
              </div>
            </div>
        )}
      </div>
  );
}