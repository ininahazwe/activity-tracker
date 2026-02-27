import { useState, useRef, useEffect } from "react";
import { ChevronDown, X } from "lucide-react";

interface Option {
    label: string;
    value: string;
}

interface MultiSelectProps {
    // Support both naming conventions and both formats
    items?: (string | Option)[];
    options?: (string | Option)[];
    selected?: (string | Option)[];
    value?: (string | Option)[];
    onChange: (selected: (string | Option)[]) => void;
    placeholder?: string;
    disabled?: boolean;
}

export default function MultiSelect({
                                        items,
                                        options,
                                        selected,
                                        value,
                                        onChange,
                                        placeholder = "Select items...",
                                        disabled = false,
                                    }: MultiSelectProps) {
    // Support both items and options props
    const availableItems = items || options || [];

    // Support both selected and value props, prefer value
    const selectedItems = value || selected || [];

    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);

    // Helper function to get display text from item
    const getLabel = (item: string | Option): string => {
        return typeof item === "string" ? item : item.label;
    };

    // Helper function to get value from item
    const getValue = (item: string | Option): string => {
        return typeof item === "string" ? item : item.value;
    };

    // Helper function to check if item is selected
    const isSelected = (item: string | Option): boolean => {
        const itemValue = getValue(item);
        return selectedItems.some((sel) => getValue(sel) === itemValue);
    };

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
        getLabel(item).toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleItem = (item: string | Option) => {
        if (isSelected(item)) {
            const itemValue = getValue(item);
            onChange(selectedItems.filter((s) => getValue(s) !== itemValue));
        } else {
            onChange([...selectedItems, item]);
        }
    };

    const removeItem = (item: string | Option) => {
        const itemValue = getValue(item);
        onChange(selectedItems.filter((s) => getValue(s) !== itemValue));
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
                    {selectedItems.length > 0 ? (
                        selectedItems.map((item) => (
                            <span
                                key={getValue(item)}
                                className="bg-accent/20 text-accent px-2 py-1 rounded text-xs font-medium flex items-center gap-1"
                            >
                {getLabel(item)}
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
                                    key={getValue(item)}
                                    onClick={() => toggleItem(item)}
                                    className={`w-full text-left px-3 py-2.5 text-xs font-medium transition-colors flex items-center gap-2
                  ${
                                        isSelected(item)
                                            ? "bg-accent/10 text-accent"
                                            : "text-gray-300 hover:bg-surface-hover"
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={isSelected(item)}
                                        onChange={() => {}}
                                        className="w-3 h-3 cursor-pointer"
                                    />
                                    {getLabel(item)}
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