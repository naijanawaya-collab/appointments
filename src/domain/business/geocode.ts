/**
 * Address → coordinates for the storefront map, via OpenStreetMap
 * Nominatim (free; max 1 request/second and a descriptive User-Agent per
 * its usage policy). Called only when an owner presses "Find on map", and
 * cached by the caller.
 */
export type GeocodeResult = { lat: number; lon: number; label: string };

export async function geocodeAddress(
  address: string,
  { fetch: f = fetch, userAgent }: { fetch?: typeof fetch; userAgent: string },
): Promise<GeocodeResult | null> {
  const q = address.trim();
  if (q.length < 4) return null;
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("q", q);
  const res = await f(url, { headers: { "User-Agent": userAgent, "Accept-Language": "en" }, signal: AbortSignal.timeout(6000) });
  if (!res.ok) return null;
  const [hit] = (await res.json()) as { lat: string; lon: string; display_name: string }[];
  if (!hit) return null;
  const lat = Number(hit.lat);
  const lon = Number(hit.lon);
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon, label: hit.display_name } : null;
}
