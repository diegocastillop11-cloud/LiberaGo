export type GeocodeResult = {
  address: string;
  lat: number;
  lng: number;
};

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

export async function searchAddress(query: string): Promise<GeocodeResult[]> {
  if (query.trim().length < 3) return [];

  const url = new URL(`${NOMINATIM_BASE}/search`);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("countrycodes", "cl");
  url.searchParams.set("limit", "5");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("No se pudo buscar la dirección.");

  const data: { display_name: string; lat: string; lon: string }[] = await res.json();
  return data.map((r) => ({
    address: r.display_name,
    lat: Number(r.lat),
    lng: Number(r.lon),
  }));
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const url = new URL(`${NOMINATIM_BASE}/reverse`);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "jsonv2");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("No se pudo obtener la dirección.");

  const data: { display_name?: string } = await res.json();
  return data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}
