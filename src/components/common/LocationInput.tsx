import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Map, Loader2, Sparkles, X } from 'lucide-react';
import { LocationPickerModal } from './LocationPickerModal';
import { geocodingService, GeocodeResult } from '../../services/geocodingService';

interface LocationInputProps {
  label?: string;
  value: string;
  onChange: (address: string, coords?: { lat: number; lng: number }) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  required?: boolean;
}

export const LocationInput: React.FC<LocationInputProps> = ({
  label,
  value,
  onChange,
  placeholder = 'Nhập địa chỉ hoặc chọn từ bản đồ...',
  className = '',
  inputClassName = '',
  required = false,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search when user types in the input
  useEffect(() => {
    if (!value || value.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await geocodingService.searchAddress(value);
        setSuggestions(results);
        if (results.length > 0) {
          setIsDropdownOpen(true);
        }
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [value]);

  // Click outside listener to close suggestions dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSuggestion = (item: GeocodeResult) => {
    onChange(item.displayName, { lat: item.lat, lng: item.lng });
    setIsDropdownOpen(false);
    setSuggestions([]);
  };

  return (
    <div ref={containerRef} className={`relative space-y-1 ${className}`}>
      {label && (
        <label className="text-xs font-bold text-stone-700 block mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        {/* Left MapPin Icon */}
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-orange-600">
          <MapPin className="w-4 h-4" />
        </div>

        {/* Text Input */}
        <input
          type="text"
          value={value}
          required={required}
          onChange={(e) => {
            onChange(e.target.value);
            setIsDropdownOpen(true);
          }}
          onFocus={() => {
            if (suggestions.length > 0) setIsDropdownOpen(true);
          }}
          placeholder={placeholder}
          className={`w-full pl-9 pr-24 py-2.5 bg-stone-50 border border-stone-200 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 rounded-xl text-xs text-stone-900 transition shadow-2xs ${inputClassName}`}
        />

        {/* Right Button: "Chọn bản đồ" */}
        <div className="absolute right-1.5 flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setSuggestions([]);
                setIsDropdownOpen(false);
              }}
              className="p-1 text-stone-400 hover:text-stone-600 rounded-md transition"
              title="Xóa"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-2.5 py-1.5 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 hover:text-orange-800 font-bold text-[11px] rounded-lg transition active:scale-95 flex items-center gap-1 shadow-2xs"
            title="Mở bản đồ Vietbando"
          >
            <Map className="w-3.5 h-3.5 text-orange-600" />
            <span className="hidden sm:inline">Bản đồ</span>
          </button>
        </div>
      </div>

      {/* Autocomplete Dropdown */}
      {isDropdownOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden max-h-52 overflow-y-auto z-50">
          <div className="px-3 py-1.5 bg-stone-50 text-[10px] font-bold text-stone-500 uppercase tracking-wider flex items-center justify-between border-b border-stone-100">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-orange-500" />
              Gợi ý địa điểm từ bản đồ
            </span>
            {isSearching && <Loader2 className="w-3 h-3 animate-spin text-orange-600" />}
          </div>

          {suggestions.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectSuggestion(item)}
              className="w-full text-left px-3.5 py-2.5 hover:bg-orange-50/80 border-b border-stone-100 last:border-0 flex items-start gap-2 text-xs text-stone-800 transition"
            >
              <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
              <span className="line-clamp-2 leading-relaxed font-medium">{item.displayName}</span>
            </button>
          ))}
        </div>
      )}

      {/* Map Dialog Modal */}
      <LocationPickerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialAddress={value}
        onSelectLocation={(selectedAddr, coords) => {
          onChange(selectedAddr, coords);
          setIsDropdownOpen(false);
        }}
      />
    </div>
  );
};
