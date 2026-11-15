// app/api/strays/route.ts
import { NextResponse } from 'next/server';
import { dbAdapter } from '@/backend/dbAdapter';
import { fuzzCoordinates } from '@/lib/geo/fuzzCoordinates';
import { cached, cacheBust } from '@/lib/api/cache';
import { backendGet, jsonCacheHeaders } from '@/lib/api/backend';
import { savePhotos } from '@/backend/photos';

/** Always fresh from the CSV files, but cheap: the response is shared for 10s. */
export const dynamic = 'force-dynamic';

const TTL_MS = 10_000;

/** Round the viewport so a 200 m pan reuses the same cached page. */
function roundCoord(n: number) {
  return Math.round(n * 200) / 200;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const rawLat = Number(url.searchParams.get('lat'));
    const rawLng = Number(url.searchParams.get('lng'));
    const rawRadius = Number(url.searchParams.get('radius') ?? 0.08);
    const city = url.searchParams.get('city') || undefined;

    const lat = !isNaN(rawLat) ? roundCoord(rawLat) : undefined;
    const lng = !isNaN(rawLng) ? roundCoord(rawLng) : undefined;
    const radius = !isNaN(rawRadius) ? rawRadius : undefined;

    const key = `strays:${lat ?? '-'}:${lng ?? '-'}:${radius ?? '-'}:${city ?? '-'}`;

    const strays = await cached(key, TTL_MS, async () => {
      // The shared Express backend is layered first, the local CSV store is the fallback.
      const remote = await backendGet<any[]>(
        `/api/strays?${new URLSearchParams(
          Object.entries({
            ...(lat !== undefined ? { lat: String(lat) } : {}),
            ...(lng !== undefined ? { lng: String(lng) } : {}),
            ...(radius !== undefined ? { radius: String(radius) } : {}),
            ...(city ? { city } : {}),
          })
        ).toString()}`
      );
      if (remote) return remote;

      return dbAdapter.getStrays({ lat, lng, radius, city });
    });

    return NextResponse.json(strays || [], {
      headers: jsonCacheHeaders(5),
    });
  } catch (err: any) {
    console.error('API /strays GET error:', err);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const {
      name,
      species,
      coat_description,
      health_status,
      is_tnr,
      city,
      exact_lat,
      exact_lng,
      identifier_photo_url,
      gallery_photos,
      created_by,
    } = payload;

    if (!species || !exact_lat || !exact_lng || !identifier_photo_url) {
      return NextResponse.json({ error: 'Species, Coordinates, and Identifier Photo are required' }, { status: 400 });
    }

    // Safety coordinate jitter (~150m) so the exact spot of a buddy stays quiet.
    const { lat: public_lat, lng: public_lng } = fuzzCoordinates(Number(exact_lat), Number(exact_lng), 150);

    // 1 identifier + up to 3 gallery photos.
    const incoming = [
      ...(typeof identifier_photo_url === 'string' ? [identifier_photo_url] : []),
      ...(Array.isArray(gallery_photos) ? gallery_photos.slice(0, 3) : []),
    ].filter((photo) => typeof photo === 'string' && photo.startsWith('data:'));

    const strayId = `stray_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Photos are written to public/uploads/<owner>/<id>/ and linked by photo id.
    const saved = savePhotos('stray', strayId, incoming);
    const gallery = saved.slice(1).map((p) => p.photo_url);

    const newStray = await dbAdapter.createStray({
      id: strayId,
      name: name?.trim() || (species === 'cat' ? 'Community Cat' : 'Community Dog'),
      species,
      coat_description: coat_description?.trim() || '',
      health_status: health_status || 'healthy',
      is_tnr: Boolean(is_tnr),
      city: city || 'Manila',
      exact_lat: Number(exact_lat),
      exact_lng: Number(exact_lng),
      public_lat,
      public_lng,
      // A photo that could not be saved stays as the data URL so nothing is lost.
      identifier_photo_url: saved[0]?.photo_url || identifier_photo_url,
      photo_ids: saved.map((p) => p.id),
      gallery_photos: gallery.length ? gallery : [],
      created_by: created_by || null,
    });

    cacheBust('strays:');
    cacheBust('admin:');
    return NextResponse.json(newStray, { status: 201 });
  } catch (err: any) {
    console.error('API /strays POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
