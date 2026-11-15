// lib/geo/distance.ts
/** Plain distance maths in metres — no extra dependency needed. */

const EARTH_RADIUS_M = 6371000;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

/**
 * Straight-line distance between two coordinates, in metres.
 * Good enough for a 15 km radius fence around the user.
 */
export function distanceMetres(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** Distance in kilometres, rounded to one decimal for display. */
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  return Math.round(distanceMetres(a, b) / 100) / 10;
}

/**
 * Degrees of latitude/longitude that cover `km` around a point.
 * Used as the cheap server-side bounding box before the exact client filter.
 */
export function boundingRadiusDegrees(km: number, atLat: number) {
  const lat = km / 111.32;
  const lng = km / (111.32 * Math.max(Math.cos(toRadians(atLat)), 0.2));
  return { lat, lng: Math.max(lat, lng) };
}
