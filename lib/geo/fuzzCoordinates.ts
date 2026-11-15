// lib/geo/fuzzCoordinates.ts
/**
 * Return a new lat/lng pair randomly offset within a radius (in meters).
 * Uses a deterministic random based on Math.random for simplicity.
 */
export function fuzzCoordinates(
  lat: number,
  lng: number,
  radiusMeters = 150
): { lat: number; lng: number } {
  // Convert radius from meters to degrees (approx.)
  const radiusDeg = radiusMeters / 111_320; // meters per degree latitude
  const u = Math.random();
  const v = Math.random();
  const w = radiusDeg * Math.sqrt(u);
  const t = 2 * Math.PI * v;
  const deltaLat = w * Math.cos(t);
  const deltaLng = w * Math.sin(t) / Math.cos((lat * Math.PI) / 180);
  return { lat: lat + deltaLat, lng: lng + deltaLng };
}
