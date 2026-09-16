import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { FamilyMember } from '../../types';

interface VietbandoMapProps {
  members: FamilyMember[];
  center?: [number, number]; // [lat, lng]
  zoom?: number;
}

export const VietbandoMap: React.FC<VietbandoMapProps> = ({
  members,
  center = [21.0285, 105.8542], // Hà Nội mặc định
  zoom = 13,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Khởi tạo Leaflet Map với Tile Vietbando
      const map = L.map(mapContainerRef.current, {
        center: center as [number, number],
        zoom,
        zoomControl: false,
      });

      // Lớp bản đồ MapTiler Streets v2 HD
      const mapTilerUrl =
        'https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=odL8F5mMYH7APbT24t4Q';

      L.tileLayer(mapTilerUrl, {
        maxZoom: 20,
        attribution: '© MapTiler © OpenStreetMap contributors',
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    // Add Family Members Markers
    members.forEach((m) => {
      const lat = m.location?.lat || 21.0285 + (Math.random() - 0.5) * 0.04;
      const lng = m.location?.lng || 105.8542 + (Math.random() - 0.5) * 0.04;

      const customIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
            <div style="width: 42px; height: 42px; border-radius: 50%; border: 3px solid #f97316; overflow: hidden; background: white; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
              <img src="${m.avatar}" style="width: 100%; height: 100%; object-fit: cover;" />
            </div>
            <div style="background: rgba(28,25,23,0.85); color: white; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 10px; margin-top: 2px; white-space: nowrap;">
              ${m.name}
            </div>
          </div>
        `,
        iconSize: [42, 60],
        iconAnchor: [21, 50],
      });

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px;">
          <b>${m.name} (${m.role})</b><br/>
          📍 Trạng thái: ${m.status || 'Ở nhà'}<br/>
          ⏱️ Cập nhật: ${m.location?.updatedAt || 'Vừa xong'}
        </div>
      `);
    });
  }, [members, center, zoom]);

  return (
    <div className="relative w-full h-[280px] rounded-2xl overflow-hidden border border-amber-200/60 shadow-sm z-0">
      <div ref={mapContainerRef} className="w-full h-full" />
      <div className="absolute top-2 left-2 z-[400] bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-lg text-[10px] font-bold text-stone-700 shadow-xs flex items-center gap-1 border border-stone-200">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        Bản đồ vị trí gia đình (HD)
      </div>
    </div>
  );
};
