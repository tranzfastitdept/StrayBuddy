// lib/geo/detectCity.ts
/**
 * Simple bounding‑box lookup for Metro Manila cities.
 * Returns the city name if the coordinate falls inside a known box,
 * otherwise returns 'Metro Manila' as a generic fallback.
 */
export function detectCity(lat: number, lng: number): string {
  const boxes: Record<string, { minLat: number; maxLat: number; minLng: number; maxLng: number }> = {
    Manila: { minLat: 14.55, maxLat: 14.66, minLng: 120.95, maxLng: 121.09 },
    Makati: { minLat: 14.54, maxLat: 14.59, minLng: 121.00, maxLng: 121.05 },
    "Quezon City": { minLat: 14.60, maxLat: 14.71, minLng: 121.00, maxLng: 121.15 },
    Taguig: { minLat: 14.48, maxLat: 14.58, minLng: 121.03, maxLng: 121.10 },
    Pasig: { minLat: 14.55, maxLat: 14.65, minLng: 121.06, maxLng: 121.15 },
    Mandaluyong: { minLat: 14.56, maxLat: 14.60, minLng: 121.03, maxLng: 121.06 },
    Pasay: { minLat: 14.50, maxLat: 14.55, minLng: 120.96, maxLng: 121.00 },
    "Parañaque": { minLat: 14.46, maxLat: 14.53, minLng: 120.97, maxLng: 121.03 },
    Caloocan: { minLat: 14.65, maxLat: 14.73, minLng: 120.97, maxLng: 121.09 },
    "Las Piñas": { minLat: 14.40, maxLat: 14.48, minLng: 120.98, maxLng: 121.03 },
  };

  for (const [city, b] of Object.entries(boxes)) {
    if (lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng) {
      return city;
    }
  }
  return 'Metro Manila';
}
