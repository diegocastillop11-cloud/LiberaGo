import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { searchAddress, reverseGeocode, type GeocodeResult } from "../lib/geocoding";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { btnPrimary, btnGhost, inputBase } from "../lib/ui";

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
  const isConfirmed = value.lat != null && value.lng != null;
  const [editing, setEditing] = useState(!isConfirmed);
  const [query, setQuery] = useState(value.address);
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [pending, setPending] = useState<GeocodeResult | null>(null);
  const debouncedQuery = useDebouncedValue(query, 450);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  function placeMarker(map: L.Map, lat: number, lng: number) {
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng]).addTo(map);
    }
    map.setView([lat, lng], Math.max(map.getZoom(), 15));
  }

  useEffect(() => {
    if (!editing || !mapRef.current || mapInstance.current) return;
    const initial = isConfirmed ? [value.lat as number, value.lng as number] : SANTIAGO;
    const map = L.map(mapRef.current, {
      center: initial as [number, number],
      zoom: isConfirmed ? 16 : 12,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    map.on("click", async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      placeMarker(map, lat, lng);
      setPending({ address: "Buscando dirección…", lat, lng });
      try {
        const address = await reverseGeocode(lat, lng);
        setPending({ address, lat, lng });
      } catch {
        setPending({ address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng });
      }
    });

    if (isConfirmed) {
      placeMarker(map, value.lat as number, value.lng as number);
    }

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

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

  function pickResult(result: GeocodeResult) {
    setQuery(result.address);
    setShowResults(false);
    setResults([]);
    setPending(result);
    if (mapInstance.current) placeMarker(mapInstance.current, result.lat, result.lng);
  }

  function confirm() {
    if (!pending) return;
    onChange(pending);
    setPending(null);
    setEditing(false);
  }

  function cancelPending() {
    setPending(null);
    if (mapInstance.current && isConfirmed) {
      placeMarker(mapInstance.current, value.lat as number, value.lng as number);
    } else if (markerRef.current && mapInstance.current) {
      mapInstance.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }
  }

  function startEditing() {
    setQuery(value.address);
    setPending(null);
    setEditing(true);
  }

  if (!editing && isConfirmed) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink-muted">{label}</span>
        <div className="flex items-center justify-between gap-3 rounded-sm border border-line bg-surface-2 px-3.5 py-2.5">
          <span className="text-sm text-ink">✓ {value.address}</span>
          <button type="button" className={`${btnGhost} !min-h-0 !px-2 !py-1 !text-xs`} onClick={startEditing}>
            Cambiar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink-muted">
        {label}
      </label>

      <div className="relative z-10">
        <input
          id={id}
          className={inputBase}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          onBlur={() => window.setTimeout(() => setShowResults(false), 150)}
          placeholder="Busca la dirección…"
          autoComplete="off"
        />
        {searching && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted">
            Buscando…
          </span>
        )}
        {showResults && results.length > 0 && (
          <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-sm border border-line bg-surface shadow-lg">
            {results.map((r, i) => (
              <li key={i}>
                <button
                  type="button"
                  className="block w-full px-3.5 py-2.5 text-left text-sm text-ink hover:bg-surface-2"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickResult(r)}
                >
                  {r.address}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!searching &&
        debouncedQuery.trim().length >= 3 &&
        debouncedQuery !== value.address &&
        results.length === 0 && (
          <p className="text-xs text-ink-muted">
            No encontramos ese lugar. Prueba buscando por la dirección (calle y comuna) en vez
            del nombre del negocio, o marca el punto directo en el mapa.
          </p>
        )}

      <div
        ref={mapRef}
        className="relative z-0 h-[200px] w-full overflow-hidden rounded-sm border border-line"
        role="img"
        aria-label={`Mapa para elegir ${label.toLowerCase()}`}
      />

      {pending ? (
        <div className="flex flex-col gap-2 rounded-sm border border-action bg-action/10 p-3">
          <p className="text-sm text-ink">📍 {pending.address}</p>
          <div className="flex gap-2">
            <button type="button" className={`${btnPrimary} !min-h-0 !px-3 !py-1.5 !text-xs`} onClick={confirm}>
              Confirmar dirección
            </button>
            <button
              type="button"
              className={`${btnGhost} !min-h-0 !px-3 !py-1.5 !text-xs`}
              onClick={cancelPending}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-ink-muted">
          Busca arriba o haz clic en el mapa, luego confirma el punto exacto.
        </p>
      )}
    </div>
  );
}
