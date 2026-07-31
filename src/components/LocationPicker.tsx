import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { searchAddress, reverseGeocode, type GeocodeResult } from "../lib/geocoding";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { inputBase } from "../lib/ui";

const SANTIAGO: [number, number] = [-33.4489, -70.6693];

export type LocationValue = {
  address: string;
  lat: number | null;
  lng: number | null;
};

export function LocationPicker({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: LocationValue;
  onChange: (value: LocationValue) => void;
}) {
  const [query, setQuery] = useState(value.address);
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 450);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  function placeMarker(map: L.Map, lat: number, lng: number) {
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng]).addTo(map);
    }
    map.setView([lat, lng], Math.max(map.getZoom(), 15));
  }

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    const initial = value.lat != null && value.lng != null ? [value.lat, value.lng] : SANTIAGO;
    const map = L.map(mapRef.current, {
      center: initial as [number, number],
      zoom: value.lat != null && value.lng != null ? 16 : 12,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    map.on("click", async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      placeMarker(map, lat, lng);
      try {
        const address = await reverseGeocode(lat, lng);
        setQuery(address);
        onChangeRef.current({ address, lat, lng });
      } catch {
        onChangeRef.current({ address: "", lat, lng });
      }
    });

    if (value.lat != null && value.lng != null) {
      placeMarker(map, value.lat, value.lng);
    }

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (debouncedQuery.trim().length < 3 || debouncedQuery === value.address) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    searchAddress(debouncedQuery)
      .then((found) => {
        if (cancelled) return;
        setResults(found);
        setShowResults(true);
      })
      .catch(() => !cancelled && setResults([]))
      .finally(() => !cancelled && setSearching(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  function selectResult(result: GeocodeResult) {
    setQuery(result.address);
    setShowResults(false);
    setResults([]);
    onChange(result);
    if (mapInstance.current) placeMarker(mapInstance.current, result.lat, result.lng);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink-muted">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          className={inputBase}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          onBlur={() => window.setTimeout(() => setShowResults(false), 150)}
          placeholder="Busca la dirección…"
          autoComplete="off"
          required
        />
        {searching && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted">
            Buscando…
          </span>
        )}
        {showResults && results.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-sm border border-line bg-surface shadow-lg">
            {results.map((r, i) => (
              <li key={i}>
                <button
                  type="button"
                  className="block w-full px-3.5 py-2.5 text-left text-sm text-ink hover:bg-surface-2"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectResult(r)}
                >
                  {r.address}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div
        ref={mapRef}
        className="h-[200px] w-full overflow-hidden rounded-sm border border-line"
        role="img"
        aria-label={`Mapa para elegir ${label.toLowerCase()}`}
      />
      <p className="text-xs text-ink-muted">
        Busca arriba o haz clic en el mapa para marcar el punto exacto.
      </p>
    </div>
  );
}
