import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Navigation, Search, Check, X, Loader2, Sparkles } from 'lucide-react';
import { geocodingService, GeocodeResult } from '../../services/geocodingService';

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (address: string, coords?: { lat: number; lng: number }) => void;
  initialAddress?: string;
  initialCoords?: { lat: number; lng: number };
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectLocation,
  initialAddress = '',
  initialCoords,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [selectedAddress, setSelectedAddress] = useState(initialAddress);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number }>(
    initialCoords || { lat: 9.8189, lng: 106.2081 }
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  // Debounced search when typing query inside map modal
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await geocodingService.searchAddress(searchQuery);
        setSuggestions(results);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Update marker and map position helper
  const setMapLocation = async (lat: number, lng: number, addressText?: string, zoom = 15) => {
    setSelectedCoords({ lat, lng });

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], zoom, { animate: true });

      // Create or move Marker
      const customPinIcon = L.divIcon({
        className: 'custom-location-pin',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
            <div style="width: 36px; height: 36px; border-radius: 50%; background: #ea580c; color: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(234, 88, 12, 0.5); border: 2.5px solid white;">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
            <div style="width: 8px; height: 4px; background: rgba(0,0,0,0.3); border-radius: 50%; margin-top: -2px;"></div>
          </div>
        `,
        iconSize: [36, 40],
        iconAnchor: [18, 38],
      });

      if (!markerRef.current) {
        markerRef.current = L.marker([lat, lng], { icon: customPinIcon }).addTo(mapInstanceRef.current);
      } else {
        markerRef.current.setLatLng([lat, lng]);
      }
    }

    if (addressText) {
      setSelectedAddress(addressText);
    } else {
      setIsReverseGeocoding(true);
      try {
        const rev = await geocodingService.reverseGeocode(lat, lng);
        setSelectedAddress(rev);
      } finally {
        setIsReverseGeocoding(false);
      }
    }
  };

  // Initialize Map
  useEffect(() => {
    if (!isOpen) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
      return;
    }

    let isMounted = true;

    // Small delay to allow modal animation to complete layout calculations
    const timeout = setTimeout(async () => {
      if (!mapContainerRef.current || !isMounted) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }

      const defaultCenter: [number, number] = [selectedCoords.lat, selectedCoords.lng];

      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 14,
        zoomControl: false,
      });

      // Lớp bản đồ MapTiler Streets v2 HD cao cấp
      const mapTilerUrl =
        'https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=odL8F5mMYH7APbT24t4Q';

      L.tileLayer(mapTilerUrl, {
        maxZoom: 20,
        attribution: '© MapTiler © OpenStreetMap contributors',
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Handle Map Click: Pick location anywhere on the map
      map.on('click', (e: L.LeafletMouseEvent) => {
        setMapLocation(e.latlng.lat, e.latlng.lng);
      });

      mapInstanceRef.current = map;

      // Automatically focus on current GPS location if no explicit initialCoords provided
      if (!initialCoords) {
        setIsLocating(true);
        try {
          const currentPos = await geocodingService.getCurrentPosition();
          if (isMounted) {
            setMapLocation(currentPos.lat, currentPos.lng, initialAddress || undefined, 15);
          }
        } catch {
          if (isMounted) {
            setMapLocation(9.8189, 106.2081, initialAddress || 'Tiểu Cần, Vĩnh Long', 15);
          }
        } finally {
          if (isMounted) setIsLocating(false);
        }
      } else {
        setMapLocation(initialCoords.lat, initialCoords.lng, initialAddress || undefined, 15);
      }

      // Ensure map tiles calculate correct dimensions
      setTimeout(() => {
        if (isMounted && mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 100);
    }, 120);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      markerRef.current = null;
    };
  }, [isOpen]);

  // Handle click on "Vị trí hiện tại" button
  const handleLocateCurrent = async () => {
    setIsLocating(true);
    try {
      const pos = await geocodingService.getCurrentPosition();
      await setMapLocation(pos.lat, pos.lng, undefined, 16);
    } catch {
      await setMapLocation(9.8189, 106.2081, 'Tiểu Cần, Vĩnh Long', 15);
    } finally {
      setIsLocating(false);
    }
  };

  // Handle select from search suggestion
  const handleSelectSuggestion = (item: GeocodeResult) => {
    setSearchQuery('');
    setSuggestions([]);
    setMapLocation(item.lat, item.lng, item.displayName, 16);
  };

  // Handle Confirm
  const handleConfirm = () => {
    onSelectLocation(selectedAddress || `Vị trí (${selectedCoords.lat.toFixed(4)}, ${selectedCoords.lng.toFixed(4)})`, selectedCoords);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-lg h-[85vh] max-h-[680px] flex flex-col shadow-2xl overflow-hidden border border-stone-200">
        {/* Modal Header */}
        <div className="px-4 py-3 border-b border-stone-200/80 flex items-center justify-between bg-stone-50/90">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900 leading-tight">
                Chọn vị trí trên bản đồ
              </h3>
              <p className="text-[10px] text-stone-500">Chạm trên bản đồ hoặc tìm kiếm địa chỉ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-stone-200/60 hover:bg-stone-200 flex items-center justify-center text-stone-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Suggestions Bar */}
        <div className="p-3 bg-white border-b border-stone-100 relative z-30">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nhập tên đường, quận/huyện, địa danh..."
              className="w-full pl-9 pr-8 py-2 bg-stone-100 hover:bg-stone-50 focus:bg-white border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500/30"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSuggestions([]);
                }}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-stone-400 hover:text-stone-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown List */}
          {suggestions.length > 0 && (
            <div className="absolute left-3 right-3 top-full mt-1 bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden max-h-48 overflow-y-auto z-50">
              <div className="px-3 py-1.5 bg-stone-50 text-[10px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1 border-b border-stone-100">
                <Sparkles className="w-3 h-3 text-orange-500" />
                Gợi ý địa điểm tìm thấy
              </div>
              {suggestions.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSuggestion(item)}
                  className="w-full text-left px-3 py-2 hover:bg-orange-50/70 border-b border-stone-100 last:border-0 flex items-start gap-2 text-xs text-stone-800 transition"
                >
                  <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                  <span className="line-clamp-2 leading-relaxed">{item.displayName}</span>
                </button>
              ))}
            </div>
          )}

          {/* Quick family location presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2">
            <span className="text-[10px] text-stone-400 font-bold shrink-0">Nhanh:</span>
            <button
              type="button"
              onClick={() =>
                setMapLocation(
                  9.988,
                  106.353,
                  'Cù Lao Long Trị (Cồn Long Trị), Xã Long Đức, TP. Trà Vinh',
                  16
                )
              }
              className="px-2.5 py-1 bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 rounded-lg text-[10px] font-bold shrink-0 transition"
            >
              🏝️ Cù Lao Long Trị
            </button>
            <button
              type="button"
              onClick={() =>
                setMapLocation(
                  9.8189,
                  106.2081,
                  'Nhà Chính (Tiểu Cần, Trà Vinh)',
                  16
                )
              }
              className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-lg text-[10px] font-bold shrink-0 transition"
            >
              🏡 Nhà Chính Tiểu Cần
            </button>
            <button
              type="button"
              onClick={() =>
                setMapLocation(
                  9.9347,
                  106.3456,
                  'Thành phố Trà Vinh, Tỉnh Trà Vinh',
                  15
                )
              }
              className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 rounded-lg text-[10px] font-bold shrink-0 transition"
            >
              🏙️ TP. Trà Vinh
            </button>
          </div>
        </div>

        {/* Map Viewport Area */}
        <div className="relative flex-1 bg-stone-100">
          <div ref={mapContainerRef} className="w-full h-full z-10" />

          {/* Map HD Live Badge */}
          <div className="absolute top-3 left-3 z-[400] bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-xl text-[10px] font-bold text-stone-700 shadow-xs flex items-center gap-1.5 border border-stone-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Bản đồ MapTiler HD
          </div>

          {/* GPS Focus Button */}
          <button
            type="button"
            onClick={handleLocateCurrent}
            disabled={isLocating}
            className="absolute top-3 right-3 z-[400] px-3 py-2 bg-white/95 hover:bg-white text-orange-600 font-bold text-xs rounded-xl shadow-md border border-stone-200 flex items-center gap-1.5 transition active:scale-95"
            title="Lấy vị trí GPS hiện tại"
          >
            {isLocating ? (
              <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
            ) : (
              <Navigation className="w-4 h-4" />
            )}
            <span>Vị trí hiện tại</span>
          </button>
        </div>

        {/* Selected Address Footer & Confirm Button */}
        <div className="p-3.5 bg-stone-50/90 border-t border-stone-200 flex flex-col gap-2.5">
          <div className="flex items-start gap-2 bg-white p-2.5 rounded-2xl border border-stone-200/80 shadow-2xs">
            <MapPin className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                  Địa chỉ đã chọn:
                </span>
                {isReverseGeocoding && (
                  <span className="text-[10px] text-orange-600 flex items-center gap-1">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" /> Đang cập nhật tên...
                  </span>
                )}
              </div>
              <p className="text-xs font-bold text-stone-900 line-clamp-2 mt-0.5">
                {selectedAddress || 'Chưa chọn địa điểm'}
              </p>
              <span className="text-[9px] font-mono text-stone-400 block mt-0.5">
                Toạ độ: {selectedCoords.lat.toFixed(5)}, {selectedCoords.lng.toFixed(5)}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold rounded-xl text-xs transition"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-2 py-2.5 bg-linear-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold rounded-xl text-xs shadow-md shadow-orange-600/20 transition active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Xác nhận địa điểm</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
