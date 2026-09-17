import React, { useEffect, useRef, useState, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { FamilyMember, FamilyPlace } from "../../types";
import { familyService } from "../../services/familyService";
import { socketService } from "../../services/socket";
import { locationSyncService } from "../../services/locationSyncService";
import { LocationInput } from "../common/LocationInput";
import { LocationPickerModal } from "../common/LocationPickerModal";
import { BottomSheet } from "../common/BottomSheet";
import { Avatar } from "../common/Avatar";
import {
  MapPin,
  Search,
  Plus,
  Compass,
  Users,
  ExternalLink,
  Battery,
  Clock,
  Camera,
  X,
  RefreshCw,
  Loader2,
  Navigation,
  Trash2,
  Edit2,
  Check,
} from "lucide-react";

interface FamilyMapScreenProps {
  allMembers: FamilyMember[];
  currentMember: FamilyMember;
}

export const FamilyMapScreen: React.FC<FamilyMapScreenProps> = ({
  allMembers,
  currentMember,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const memberMarkersRef = useRef<Record<string, L.Marker>>({});
  const placeMarkersRef = useRef<Record<string, L.Marker>>({});

  // Places & Categories State from FamilyService
  const [places, setPlaces] = useState<FamilyPlace[]>(() =>
    familyService.getPlaces(),
  );
  const [placeCategories, setPlaceCategories] = useState<string[]>(() =>
    familyService.getCustomPlaceCategories(),
  );

  // Filters & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] =
    useState<string>("all");
  const [selectedCreatorFilter, setSelectedCreatorFilter] =
    useState<string>("all");

  // Selected Item to show Detail BottomSheet
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(
    null,
  );
  const [selectedPlace, setSelectedPlace] = useState<FamilyPlace | null>(null);

  // Modal State for Adding New Place
  const [showAddPlaceModal, setShowAddPlaceModal] = useState(false);
  const [newPlaceName, setNewPlaceName] = useState("");
  const [newPlaceAddress, setNewPlaceAddress] = useState("");
  const [newPlaceCoords, setNewPlaceCoords] = useState<{
    lat: number;
    lng: number;
  }>({
    lat: 9.8189,
    lng: 106.2081,
  });
  const [newPlaceCategory, setNewPlaceCategory] = useState<string>(
    placeCategories[0] || "Nhà riêng",
  );
  const [newPlaceImage, setNewPlaceImage] = useState("");
  const [newPlaceNotes, setNewPlaceNotes] = useState("");
  const [isAddingNewPlaceCategory, setIsAddingNewPlaceCategory] =
    useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState("");

  // Modal State for Editing Place
  const [editingPlace, setEditingPlace] = useState<FamilyPlace | null>(null);
  const [editPlaceName, setEditPlaceName] = useState("");
  const [editPlaceAddress, setEditPlaceAddress] = useState("");
  const [editPlaceCoords, setEditPlaceCoords] = useState<{
    lat: number;
    lng: number;
  }>({
    lat: 9.8189,
    lng: 106.2081,
  });
  const [editPlaceCategory, setEditPlaceCategory] =
    useState<string>("Nhà riêng");
  const [editPlaceImage, setEditPlaceImage] = useState("");
  const [editPlaceNotes, setEditPlaceNotes] = useState("");
  const [isAddingEditPlaceCategory, setIsAddingEditPlaceCategory] =
    useState(false);
  const [editCustomCategoryInput, setEditCustomCategoryInput] = useState("");

  // GPS Sync State
  const [isSyncingLocation, setIsSyncingLocation] = useState(false);
  const [syncToast, setSyncToast] = useState<{
    text: string;
    isError?: boolean;
  } | null>(null);
  const [showAdjustLocationModal, setShowAdjustLocationModal] = useState(false);

  // 1. Initialize Map & Subscribe to data updates
  useEffect(() => {
    const unsub = familyService.subscribe(() => {
      setPlaces(familyService.getPlaces());
      setPlaceCategories(familyService.getCustomPlaceCategories());
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Tiểu Cần, Trà Vinh / Vĩnh Long làm tâm mặc định
      const defaultCenter: [number, number] = [9.8189, 106.2081];

      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 14,
        zoomControl: false,
      });

      // Lớp bản đồ MapTiler Streets v2 HD mượt mà
      const mapTilerUrl =
        "https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=odL8F5mMYH7APbT24t4Q";

      L.tileLayer(mapTilerUrl, {
        tileSize: 512,
        zoomOffset: -1,
        minZoom: 1,
        maxZoom: 20,
        crossOrigin: true,
        attribution: "© MapTiler © OpenStreetMap contributors",
      }).addTo(map);

      L.control.zoom({ position: "bottomright" }).addTo(map);

      mapInstanceRef.current = map;

      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 200);
    }

    // Tự động định vị GPS chính xác khi mở màn hình Bản đồ
    locationSyncService.syncCurrentLocation(true).then((res) => {
      if (res.success && res.lat && res.lng && mapInstanceRef.current) {
        flyToLocation(res.lat, res.lng, 15);
      }
    });

    // Kích hoạt theo dõi GPS thực tế liên tục Realtime (Hardware watchPosition)
    locationSyncService.startLiveLocationWatch();

    return () => {
      locationSyncService.stopLiveLocationWatch();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      memberMarkersRef.current = {};
      placeMarkersRef.current = {};
    };
  }, []);

  // Sync My Current Location manually via GPS
  const handleSyncMyLocation = async () => {
    setIsSyncingLocation(true);
    setSyncToast(null);
    const result = await locationSyncService.syncCurrentLocation(true);
    setIsSyncingLocation(false);
    if (result.success && result.lat && result.lng) {
      flyToLocation(result.lat, result.lng, 16);
      setSyncToast({
        text: `Đã xác định vị trí: ${result.address || "Thành công"}`,
        isError: false,
      });
    } else {
      setSyncToast({
        text: `Lỗi định vị: ${result.error || "Vui lòng kiểm tra quyền GPS"}`,
        isError: true,
      });
    }
    setTimeout(() => setSyncToast(null), 4000);
  };

  // Manual Adjust & Save Current Location
  const handleManualUpdateMyLocation = (
    address: string,
    coords?: { lat: number; lng: number },
  ) => {
    if (!coords) return;
    const nowIso = new Date().toISOString();
    familyService.updateMember(currentMember.id, {
      latitude: coords.lat,
      longitude: coords.lng,
      locationAddress: address,
      lastLocationUpdated: nowIso,
      lastSeen: "Vừa xong",
      onlineStatus: "online",
    });
    socketService.updateLocation(
      currentMember.id,
      coords.lat,
      coords.lng,
      address,
    );
    flyToLocation(coords.lat, coords.lng, 16);
    setSyncToast({
      text: `Đã cập nhật vị trí của bạn: ${address}`,
      isError: false,
    });
    setShowAdjustLocationModal(false);
    setTimeout(() => setSyncToast(null), 4000);
  };

  // Open external Google Maps navigation
  const handleOpenGoogleMapsRoute = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, "_blank");
  };

  // Zoom to specific coordinates
  const flyToLocation = (lat: number, lng: number, zoom = 16) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], zoom, {
        animate: true,
        duration: 1.2,
      });
    }
  };

  // Filtered Places list
  const filteredPlaces = useMemo(() => {
    return places.filter((p) => {
      const matchSearch =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.createdByName &&
          p.createdByName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchCategory =
        selectedCategoryFilter === "all" ||
        (selectedCategoryFilter === "places_only" && true) ||
        p.category === selectedCategoryFilter;

      const matchCreator =
        selectedCreatorFilter === "all" ||
        p.createdById === selectedCreatorFilter;

      return matchSearch && matchCategory && matchCreator;
    });
  }, [places, searchQuery, selectedCategoryFilter, selectedCreatorFilter]);

  // Filtered Members list
  const filteredMembers = useMemo(() => {
    if (
      selectedCategoryFilter !== "all" &&
      selectedCategoryFilter !== "members_only"
    ) {
      return [];
    }
    return allMembers.filter((m) => {
      return (
        !searchQuery.trim() ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.relationship.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.locationAddress &&
          m.locationAddress.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    });
  }, [allMembers, searchQuery, selectedCategoryFilter]);

  // 2. Render Markers on Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers
    Object.values(memberMarkersRef.current).forEach((marker) =>
      map.removeLayer(marker),
    );
    Object.values(placeMarkersRef.current).forEach((marker) =>
      map.removeLayer(marker),
    );
    memberMarkersRef.current = {};
    placeMarkersRef.current = {};

    // A. Render Member Markers
    filteredMembers.forEach((member) => {
      const lat =
        member.latitude ||
        (member.id === currentMember.id ? undefined : 9.8189);
      const lng =
        member.longitude ||
        (member.id === currentMember.id ? undefined : 106.2081);
      if (!lat || !lng) return;

      const customMemberIcon = L.divIcon({
        className: "custom-member-marker",
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
            <div style="position: relative; width: 44px; height: 44px; border-radius: 50%; border: 3px solid #ea580c; overflow: hidden; background: white; box-shadow: 0 4px 14px rgba(234, 88, 12, 0.45);">
              <img src="${member.avatar}" style="width: 100%; height: 100%; object-fit: cover;" />
              <span style="position: absolute; bottom: 0; right: 0; width: 12px; height: 12px; border-radius: 50%; background: ${
                member.onlineStatus === "online" ? "#22c55e" : "#94a3b8"
              }; border: 2px solid white;"></span>
            </div>
            <div style="background: rgba(28, 25, 23, 0.9); color: white; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 9999px; margin-top: 3px; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
              ${member.name.split(" ").slice(-1)[0]}
            </div>
          </div>
        `,
        iconSize: [44, 65],
        iconAnchor: [22, 55],
      });

      const marker = L.marker([lat, lng], { icon: customMemberIcon }).addTo(
        map,
      );
      marker.on("click", () => {
        setSelectedPlace(null);
        setSelectedMember(member);
        flyToLocation(lat, lng, 16);
      });

      memberMarkersRef.current[member.id] = marker;
    });

    // B. Render Saved Places Markers
    filteredPlaces.forEach((place) => {
      const customPlaceIcon = L.divIcon({
        className: "custom-place-marker",
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
            <div style="width: 38px; height: 38px; border-radius: 14px; background: #0284c7; color: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.45); border: 2.5px solid white;">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
            <div style="background: rgba(15, 23, 42, 0.9); color: white; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 8px; margin-top: 2px; white-space: nowrap; max-width: 110px; overflow: hidden; text-overflow: ellipsis;">
              ${place.name}
            </div>
          </div>
        `,
        iconSize: [38, 58],
        iconAnchor: [19, 50],
      });

      const marker = L.marker([place.latitude, place.longitude], {
        icon: customPlaceIcon,
      }).addTo(map);
      marker.on("click", () => {
        setSelectedMember(null);
        setSelectedPlace(place);
        flyToLocation(place.latitude, place.longitude, 16);
      });

      placeMarkersRef.current[place.id] = marker;
    });
  }, [filteredMembers, filteredPlaces]);

  // Handle Add New Place Submit
  const handleCreatePlaceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaceName.trim() || !newPlaceAddress.trim()) return;

    let finalCategory = newPlaceCategory;
    if (isAddingNewPlaceCategory && customCategoryInput.trim()) {
      finalCategory = customCategoryInput.trim();
      const updatedCats = familyService.addCustomPlaceCategory(finalCategory);
      setPlaceCategories(updatedCats);
    }

    const createdPlace = familyService.addPlace({
      name: newPlaceName.trim(),
      address: newPlaceAddress.trim(),
      latitude: newPlaceCoords.lat,
      longitude: newPlaceCoords.lng,
      category: finalCategory,
      imageUrl: newPlaceImage.trim() || undefined,
      createdById: currentMember.id,
      createdByName: currentMember.name,
      createdByAvatar: currentMember.avatar,
      notes: newPlaceNotes.trim() || undefined,
    });

    setPlaces(familyService.getPlaces());
    setSelectedCategoryFilter("all");
    setSelectedCreatorFilter("all");
    setSearchQuery("");
    setShowAddPlaceModal(false);

    // Reset Form
    setNewPlaceName("");
    setNewPlaceAddress("");
    setNewPlaceImage("");
    setNewPlaceNotes("");
    setIsAddingNewPlaceCategory(false);
    setCustomCategoryInput("");

    // Focus on new place
    setSelectedMember(null);
    setSelectedPlace(createdPlace);
    flyToLocation(createdPlace.latitude, createdPlace.longitude, 16);
  };

  // Handle Image Upload for Place (Base64 preview)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setNewPlaceImage(uploadEvent.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Open Edit Place
  const handleOpenEditPlace = (place: FamilyPlace) => {
    setEditingPlace(place);
    setEditPlaceName(place.name);
    setEditPlaceAddress(place.address);
    setEditPlaceCoords({ lat: place.latitude, lng: place.longitude });
    setEditPlaceCategory(place.category);
    setEditPlaceImage(place.imageUrl || "");
    setEditPlaceNotes(place.notes || "");
    setIsAddingEditPlaceCategory(false);
    setEditCustomCategoryInput("");
  };

  // Handle Edit Image Upload
  const handleEditImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setEditPlaceImage(uploadEvent.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Update Place Submit
  const handleUpdatePlaceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlace || !editPlaceName.trim() || !editPlaceAddress.trim())
      return;

    let finalCategory = editPlaceCategory;
    if (isAddingEditPlaceCategory && editCustomCategoryInput.trim()) {
      finalCategory = editCustomCategoryInput.trim();
      const updatedCats = familyService.addCustomPlaceCategory(finalCategory);
      setPlaceCategories(updatedCats);
    }

    const updatedData: Partial<FamilyPlace> = {
      name: editPlaceName.trim(),
      address: editPlaceAddress.trim(),
      latitude: editPlaceCoords.lat,
      longitude: editPlaceCoords.lng,
      category: finalCategory,
      imageUrl: editPlaceImage.trim() || undefined,
      notes: editPlaceNotes.trim() || undefined,
    };

    familyService.updatePlace(editingPlace.id, updatedData);
    const refreshed = familyService.getPlaces();
    setPlaces(refreshed);

    const updatedObj = refreshed.find((p) => p.id === editingPlace.id);
    if (updatedObj) {
      setSelectedPlace(updatedObj);
      flyToLocation(updatedObj.latitude, updatedObj.longitude, 16);
    }

    setEditingPlace(null);
  };

  // Handle Delete Place
  const handleDeletePlace = (placeId: string) => {
    if (window.confirm("Bạn có chắc muốn xoá địa điểm này khỏi bản đồ?")) {
      familyService.deletePlace(placeId);
      setPlaces(familyService.getPlaces());
      setSelectedPlace(null);
    }
  };

  return (
    <div className="relative w-full h-full flex-1 flex flex-col overflow-hidden bg-stone-100">
      {/* 1. Top Search & Controls Overlay */}
      <div className="absolute top-3 left-3 right-3 z-20 space-y-2">
        {/* Search Bar & Add Button */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative bg-white/95 backdrop-blur-md rounded-2xl shadow-md border border-stone-200/80 flex items-center px-3 py-2">
            <Search className="w-4 h-4 text-stone-400 shrink-0 mr-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm thành viên, nhà riêng, quán quen..."
              className="w-full bg-transparent text-xs text-stone-900 focus:outline-hidden"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="p-1 text-stone-400 hover:text-stone-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowAddPlaceModal(true)}
            className="h-10 px-3.5 bg-orange-600 hover:bg-orange-700 active:scale-95 text-white font-bold text-xs rounded-2xl shadow-md shadow-orange-600/20 flex items-center gap-1.5 transition shrink-0"
            title="Thêm địa điểm gia đình mới"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Thêm địa điểm</span>
          </button>
        </div>

        {/* Filter Categories Horizontal Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => setSelectedCategoryFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition shadow-xs ${
              selectedCategoryFilter === "all"
                ? "bg-stone-900 text-white shadow-md"
                : "bg-white/90 text-stone-700 hover:bg-white border border-stone-200/80"
            }`}
          >
            Tất cả
          </button>

          <button
            onClick={() => setSelectedCategoryFilter("members_only")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-1 shadow-xs ${
              selectedCategoryFilter === "members_only"
                ? "bg-orange-600 text-white shadow-md"
                : "bg-white/90 text-stone-700 hover:bg-white border border-stone-200/80"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Thành viên ({allMembers.length})</span>
          </button>

          {placeCategories.map((cat, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition shadow-xs ${
                selectedCategoryFilter === cat
                  ? "bg-sky-600 text-white shadow-md"
                  : "bg-white/90 text-stone-700 hover:bg-white border border-stone-200/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Map Viewport Canvas */}
      <div className="relative flex-1 w-full h-full">
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Floating Quick Actions: Sync GPS & Manual Calibrate */}
        <div className="absolute bottom-36 right-3 z-20 flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={() => setShowAdjustLocationModal(true)}
            className="px-3 py-2 bg-white/95 hover:bg-white text-stone-700 rounded-2xl shadow-lg border border-stone-200/90 active:scale-95 transition flex items-center gap-1.5 text-xs font-bold backdrop-blur-md"
            title="Chọn thủ công vị trí của tôi (Cù Lao Long Trị, Nhà chính...)"
          >
            <MapPin className="w-3.5 h-3.5 text-amber-600" />
            <span>Hiệu chỉnh vị trí</span>
          </button>

          <button
            type="button"
            disabled={isSyncingLocation}
            onClick={handleSyncMyLocation}
            className="px-3.5 py-2.5 bg-white/95 hover:bg-white text-stone-800 rounded-2xl shadow-xl border border-stone-200/90 active:scale-95 transition flex items-center gap-2 text-xs font-bold disabled:opacity-60 backdrop-blur-md"
            title="Định vị vị trí của tôi ngay"
          >
            {isSyncingLocation ? (
              <Loader2 className="w-4 h-4 text-orange-600 animate-spin" />
            ) : (
              <Compass className="w-4 h-4 text-orange-600" />
            )}
            <span>Định vị tôi</span>
          </button>
        </div>

        {/* GPS Sync Toast Alert */}
        {syncToast && (
          <div className="absolute top-20 left-3 right-3 z-30 pointer-events-none animate-in fade-in slide-in-from-top-2">
            <div
              className={`p-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg backdrop-blur-md ${
                syncToast.isError
                  ? "bg-red-500/90 text-white"
                  : "bg-stone-900/90 text-white"
              }`}
            >
              <Navigation className="w-3.5 h-3.5 shrink-0 text-orange-400" />
              <span className="truncate">{syncToast.text}</span>
            </div>
          </div>
        )}

        {/* Realtime Family Tracking Floating Bar (Floating above Bottom Navigation) */}
        <div className="absolute bottom-4 left-3 right-3 z-20 bg-white/95 backdrop-blur-md rounded-3xl p-3 shadow-xl border border-stone-200/80 space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-stone-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Vị trí trực tiếp gia đình ({allMembers.length} thành viên)
            </span>
            <span className="text-[10px] text-stone-400">
              Chạm để xem & chỉ đường
            </span>
          </div>

          <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
            {allMembers.map((member) => {
              const isSelected = selectedMember?.id === member.id;
              const battery = member.batteryLevel ?? 90;
              return (
                <button
                  key={member.id}
                  onClick={() => {
                    setSelectedPlace(null);
                    setSelectedMember(member);
                    flyToLocation(
                      member.latitude || 9.8189,
                      member.longitude || 106.2081,
                      16,
                    );
                  }}
                  className={`flex items-center gap-2 p-2 rounded-2xl border shrink-0 transition text-left active:scale-95 ${
                    isSelected
                      ? "bg-orange-50 border-orange-500 ring-2 ring-orange-500/20 shadow-xs"
                      : "bg-stone-50 hover:bg-stone-100 border-stone-200"
                  }`}
                >
                  <Avatar src={member.avatar} name={member.name} size="sm" />
                  <div className="min-w-0 pr-1">
                    <div className="flex items-center gap-1">
                      <h4 className="text-xs font-bold text-stone-900 truncate">
                        {member.name.split(" ").slice(-1)[0]}
                      </h4>
                      <span
                        className={`text-[9px] font-bold px-1 rounded-md ${
                          battery > 50
                            ? "bg-emerald-100 text-emerald-800"
                            : battery > 20
                              ? "bg-amber-100 text-amber-800"
                              : "bg-red-100 text-red-800 animate-pulse"
                        }`}
                      >
                        {battery}%
                      </span>
                    </div>
                    <p className="text-[10px] text-stone-500 truncate max-w-[100px]">
                      {locationSyncService.formatLastUpdated(
                        member.lastLocationUpdated || member.lastSeen,
                      )}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Detail BottomSheet: Family Member Info & Directions */}
      <BottomSheet
        isOpen={!!selectedMember}
        onClose={() => setSelectedMember(null)}
        title="Vị trí thành viên gia đình"
      >
        {selectedMember && (
          <div className="space-y-4 text-xs">
            {/* Header info */}
            <div className="flex items-center gap-3.5 pb-3 border-b border-stone-100">
              <Avatar
                src={selectedMember.avatar}
                name={selectedMember.name}
                size="lg"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-stone-900">
                    {selectedMember.name}
                  </h3>
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      selectedMember.onlineStatus === "online"
                        ? "bg-emerald-500"
                        : "bg-stone-400"
                    }`}
                  />
                </div>
                <p className="text-xs text-stone-600 font-medium">
                  {selectedMember.relationship} • {selectedMember.phone}
                </p>
                <div className="flex items-center gap-3 text-[11px] text-stone-500 mt-1">
                  <span
                    className={`flex items-center gap-1 font-bold ${
                      (selectedMember.batteryLevel ?? 95) > 50
                        ? "text-emerald-600"
                        : (selectedMember.batteryLevel ?? 95) > 20
                          ? "text-amber-600"
                          : "text-red-600 animate-pulse"
                    }`}
                  >
                    <Battery className="w-3.5 h-3.5" />
                    Pin: {selectedMember.batteryLevel ?? 95}%
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-stone-400" />
                    {locationSyncService.formatLastUpdated(
                      selectedMember.lastLocationUpdated ||
                        selectedMember.lastSeen,
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Current Address Card */}
            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-1">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                Vị trí hiện tại:
              </span>
              <p className="text-xs font-bold text-stone-900 leading-relaxed">
                {selectedMember.locationAddress ||
                  "Thị trấn Tiểu Cần, Tỉnh Trà Vinh"}
              </p>
              <span className="text-[10px] text-stone-400 font-mono block mt-0.5">
                Khu vực: {selectedMember.currentZone || "Nhà chính"}
              </span>
            </div>

            {/* Action Buttons: Direct Google Maps Routing & Adjust Location */}
            <div className="space-y-2 pt-1">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleOpenGoogleMapsRoute(
                      selectedMember.latitude || 9.8189,
                      selectedMember.longitude || 106.2081,
                    )
                  }
                  className="flex-1 py-3 bg-linear-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold rounded-2xl text-xs shadow-md shadow-orange-600/20 transition active:scale-95 flex items-center justify-center gap-2"
                >
                  <Compass className="w-4 h-4" />
                  <span>Chỉ đường (Google Maps)</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </button>
              </div>

              {selectedMember.id === currentMember.id && (
                <button
                  type="button"
                  onClick={() => setShowAdjustLocationModal(true)}
                  className="w-full py-2.5 bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold rounded-2xl text-xs border border-orange-200 transition active:scale-95 flex items-center justify-center gap-2"
                >
                  <MapPin className="w-4 h-4 text-orange-600" />
                  <span>
                    Hiệu chỉnh vị trí thực tế của tôi (Cù Lao Long Trị,...)
                  </span>
                </button>
              )}
            </div>
          </div>
        )}
      </BottomSheet>

      {/* 4. Detail BottomSheet: Family Saved Place Info & Directions */}
      <BottomSheet
        isOpen={!!selectedPlace}
        onClose={() => setSelectedPlace(null)}
        title="Chi tiết địa điểm gia đình"
      >
        {selectedPlace && (
          <div className="space-y-3.5 text-xs">
            {/* Optional Place Image Preview */}
            {selectedPlace.imageUrl && (
              <div className="w-full h-44 rounded-2xl overflow-hidden border border-stone-200 shadow-xs">
                <img
                  src={selectedPlace.imageUrl}
                  alt={selectedPlace.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 border border-sky-200">
                  {selectedPlace.category}
                </span>
                <span className="text-[10px] text-stone-400">
                  Thêm lúc:{" "}
                  {new Date(selectedPlace.createdAt).toLocaleDateString(
                    "vi-VN",
                  )}
                </span>
              </div>
              <h3 className="text-base font-bold text-stone-900">
                {selectedPlace.name}
              </h3>
            </div>

            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-1">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                Địa chỉ:
              </span>
              <p className="text-xs font-semibold text-stone-800 leading-relaxed">
                {selectedPlace.address}
              </p>
              <span className="text-[10px] text-stone-400 font-mono block">
                Tọa độ: {selectedPlace.latitude.toFixed(5)},{" "}
                {selectedPlace.longitude.toFixed(5)}
              </span>
            </div>

            {selectedPlace.notes && (
              <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-100 space-y-1">
                <span className="text-[10px] font-bold text-amber-900 block">
                  Ghi chú:
                </span>
                <p className="text-stone-700">{selectedPlace.notes}</p>
              </div>
            )}

            {/* Creator Information */}
            <div className="flex items-center gap-2 pt-1 border-t border-stone-100 text-stone-600">
              <span className="text-[11px]">Người tạo:</span>
              <span className="font-bold text-stone-800">
                {selectedPlace.createdByName || "Thành viên"}
              </span>
            </div>

            {/* Action Buttons: Direct Google Maps Routing, Edit & Delete */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() =>
                  handleOpenGoogleMapsRoute(
                    selectedPlace.latitude,
                    selectedPlace.longitude,
                  )
                }
                className="flex-1 py-3 bg-linear-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white font-bold rounded-2xl text-xs shadow-md shadow-sky-600/20 transition active:scale-95 flex items-center justify-center gap-2"
              >
                <Compass className="w-4 h-4" />
                <span>Chỉ đường (Google Maps)</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </button>

              {(currentMember.isAdmin ||
                selectedPlace.createdById === currentMember.id) && (
                <>
                  <button
                    type="button"
                    onClick={() => handleOpenEditPlace(selectedPlace)}
                    className="px-3.5 py-3 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-2xl text-xs border border-amber-200/80 transition active:scale-95 flex items-center justify-center gap-1.5"
                    title="Chỉnh sửa thông tin địa điểm này"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Sửa</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeletePlace(selectedPlace.id)}
                    className="px-3.5 py-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-2xl text-xs border border-red-200/80 transition active:scale-95 flex items-center justify-center gap-1.5"
                    title="Xoá địa điểm này"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Xóa</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </BottomSheet>

      {/* 5. Modal: Add New Place */}
      <BottomSheet
        isOpen={showAddPlaceModal}
        onClose={() => setShowAddPlaceModal(false)}
        title="Thêm địa điểm mới trên bản đồ"
      >
        <form
          onSubmit={handleCreatePlaceSubmit}
          className="space-y-3.5 text-xs"
        >
          <div>
            <label className="font-bold text-stone-800 block mb-1">
              Tên địa điểm *
            </label>
            <input
              type="text"
              required
              value={newPlaceName}
              onChange={(e) => setNewPlaceName(e.target.value)}
              placeholder="VD: Nhà Bà Ngoại, Quán Phở quen, Bệnh viện..."
              className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:border-orange-500 focus:bg-white text-xs"
            />
          </div>

          {/* Location picker with map modal */}
          <LocationInput
            label="Địa chỉ & Tọa độ *"
            value={newPlaceAddress}
            onChange={(val, coords) => {
              setNewPlaceAddress(val);
              if (coords) setNewPlaceCoords(coords);
            }}
            placeholder="Chạm vào biểu tượng bản đồ để chọn chính xác..."
          />

          {/* Category Selector with Custom Category Support */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-stone-800 block text-xs">
                Danh mục địa điểm
              </label>
              <button
                type="button"
                onClick={() =>
                  setIsAddingNewPlaceCategory(!isAddingNewPlaceCategory)
                }
                className="text-[11px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>
                  {isAddingNewPlaceCategory
                    ? "Chọn danh mục có sẵn"
                    : "Thêm danh mục mới"}
                </span>
              </button>
            </div>

            {isAddingNewPlaceCategory ? (
              <input
                type="text"
                value={customCategoryInput}
                onChange={(e) => setCustomCategoryInput(e.target.value)}
                placeholder="Nhập danh mục mới (VD: Quán ăn ngon, Chỗ câu cá...)"
                className="w-full p-2.5 bg-white border border-orange-300 rounded-xl text-stone-900 text-xs focus:ring-2 focus:ring-orange-500/20"
              />
            ) : (
              <select
                value={newPlaceCategory}
                onChange={(e) => setNewPlaceCategory(e.target.value)}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 text-xs font-medium"
              >
                {placeCategories.map((cat, idx) => (
                  <option key={idx} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Image Upload / Photo Attachment */}
          <div>
            <label className="font-bold text-stone-800 block mb-1">
              Hình ảnh đính kèm (tuỳ chọn)
            </label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-3 py-2 bg-stone-100 hover:bg-stone-200/80 rounded-xl cursor-pointer text-stone-700 transition">
                <Camera className="w-4 h-4 text-orange-600" />
                <span className="text-xs font-medium">Tải ảnh lên</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
              {newPlaceImage && (
                <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-stone-200">
                  <img
                    src={newPlaceImage}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setNewPlaceImage("")}
                    className="absolute top-0 right-0 bg-black/60 text-white rounded-bl-lg p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="font-bold text-stone-800 block mb-1">
              Ghi chú dặn dò
            </label>
            <textarea
              value={newPlaceNotes}
              onChange={(e) => setNewPlaceNotes(e.target.value)}
              placeholder="Chỉ dẫn đường đi, người quen liên hệ..."
              rows={2}
              className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 text-xs"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-xs transition active:scale-95 flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Lưu địa điểm lên bản đồ</span>
          </button>
        </form>
      </BottomSheet>

      {/* 6. Modal: Edit Place */}
      <BottomSheet
        isOpen={!!editingPlace}
        onClose={() => setEditingPlace(null)}
        title="Chỉnh sửa địa điểm gia đình"
      >
        {editingPlace && (
          <form
            onSubmit={handleUpdatePlaceSubmit}
            className="space-y-3.5 text-xs"
          >
            <div>
              <label className="font-bold text-stone-800 block mb-1">
                Tên địa điểm *
              </label>
              <input
                type="text"
                required
                value={editPlaceName}
                onChange={(e) => setEditPlaceName(e.target.value)}
                placeholder="VD: Nhà Bà Ngoại, Quán Phở quen, Bệnh viện..."
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:border-orange-500 focus:bg-white text-xs"
              />
            </div>

            {/* Location picker with map modal */}
            <LocationInput
              label="Địa chỉ & Tọa độ *"
              value={editPlaceAddress}
              initialCoords={editPlaceCoords}
              onChange={(val, coords) => {
                setEditPlaceAddress(val);
                if (coords) setEditPlaceCoords(coords);
              }}
              placeholder="Chạm vào biểu tượng bản đồ để thay đổi vị trí..."
            />

            {/* Category Selector with Custom Category Support */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-bold text-stone-800 block text-xs">
                  Danh mục địa điểm
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setIsAddingEditPlaceCategory(!isAddingEditPlaceCategory)
                  }
                  className="text-[11px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>
                    {isAddingEditPlaceCategory
                      ? "Chọn danh mục có sẵn"
                      : "Thêm danh mục mới"}
                  </span>
                </button>
              </div>

              {isAddingEditPlaceCategory ? (
                <input
                  type="text"
                  value={editCustomCategoryInput}
                  onChange={(e) => setEditCustomCategoryInput(e.target.value)}
                  placeholder="Nhập danh mục mới (VD: Quán ăn ngon, Chỗ câu cá...)"
                  className="w-full p-2.5 bg-white border border-orange-300 rounded-xl text-stone-900 text-xs focus:ring-2 focus:ring-orange-500/20"
                />
              ) : (
                <select
                  value={editPlaceCategory}
                  onChange={(e) => setEditPlaceCategory(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 text-xs font-medium"
                >
                  {placeCategories.map((cat, idx) => (
                    <option key={idx} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Image Upload / Photo Attachment */}
            <div>
              <label className="font-bold text-stone-800 block mb-1">
                Hình ảnh đính kèm (tuỳ chọn)
              </label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-3 py-2 bg-stone-100 hover:bg-stone-200/80 rounded-xl cursor-pointer text-stone-700 transition">
                  <Camera className="w-4 h-4 text-orange-600" />
                  <span className="text-xs font-medium">Thay đổi ảnh</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleEditImageUpload}
                    className="hidden"
                  />
                </label>
                {editPlaceImage && (
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-stone-200">
                    <img
                      src={editPlaceImage}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setEditPlaceImage("")}
                      className="absolute top-0 right-0 bg-black/60 text-white rounded-bl-lg p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="font-bold text-stone-800 block mb-1">
                Ghi chú dặn dò
              </label>
              <textarea
                value={editPlaceNotes}
                onChange={(e) => setEditPlaceNotes(e.target.value)}
                placeholder="Chỉ dẫn đường đi, người quen liên hệ..."
                rows={2}
                className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 text-xs"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingPlace(null)}
                className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex-2 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-xs transition active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Lưu thay đổi</span>
              </button>
            </div>
          </form>
        )}
      </BottomSheet>
      {/* 7. Modal: Adjust My Location */}
      <LocationPickerModal
        isOpen={showAdjustLocationModal}
        onClose={() => setShowAdjustLocationModal(false)}
        onSelectLocation={handleManualUpdateMyLocation}
        initialAddress={
          currentMember.locationAddress ||
          "Cù Lao Long Trị, Long Đức, TP. Trà Vinh"
        }
        initialCoords={{
          lat: currentMember.latitude || 9.988,
          lng: currentMember.longitude || 106.353,
        }}
      />
    </div>
  );
};
