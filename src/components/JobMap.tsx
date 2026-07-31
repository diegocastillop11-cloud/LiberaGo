import { useEffect, useRef } from "react";
import L from "leaflet";
import type { ServiceLocation } from "../lib/types";

export function JobMap({ locations }: { locations: ServiceLocation[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    const pins = locations.filter(
      (l): l is ServiceLocation & { lat: number; lng: number } => l.lat != null && l.lng != null,
    );
    if (pins.length === 0) return;

    const map = L.map(mapRef.current, { scrollWheelZoom: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    pins.forEach((loc, i) => {
      L.marker([loc.lat, loc.lng])
        .addTo(map)
        .bindPopup(`${i + 1}. ${loc.label}`);
    });

    if (pins.length === 1) {
      map.setView([pins[0].lat, pins[0].lng], 15);
    } else {
      map.fitBounds(
        pins.map((l) => [l.lat, l.lng] as [number, number]),
        { padding: [24, 24] },
      );
    }

    mapInstance.current = map;
    return () => {
      map.remove();
      mapInstance.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={mapRef}
      className="h-[220px] w-full overflow-hidden rounded-sm border border-line"
      role="img"
      aria-label="Mapa con las direcciones de este trabajo"
    />
  );
}
