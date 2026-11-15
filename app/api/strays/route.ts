import { NextResponse } from 'next/server';
import { dbAdapter } from '@/backend/dbAdapter';
import { fuzzCoordinates } from '@/lib/geo/fuzzCoordinates';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const lat = Number(url.searchParams.get('lat'));
    const lng = Number(url.searchParams.get('lng'));
    const radius = Number(url.searchParams.get('radius') ?? 0.08);
    const city = url.searchParams.get('city') || undefined;

    const strays = await dbAdapter.getStrays({
      lat: !isNaN(lat) ? lat : undefined,
      lng: !isNaN(lng) ? lng : undefined,
      radius: !isNaN(radius) ? radius : undefined,
      city,
    });

    return NextResponse.json(strays || []);
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

    // Safety coordinate jitter (~150m) to protect stray from malicious actors
    const { lat: public_lat, lng: public_lng } = fuzzCoordinates(
      Number(exact_lat),
      Number(exact_lng),
      150
    );

    // Ensure maximum 3 additional gallery photos (total max 4 photos: 1 identifier + 3 gallery)
    const sanitizedGallery = Array.isArray(gallery_photos) ? gallery_photos.slice(0, 3) : [];

    const newStray = await dbAdapter.createStray({
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
      identifier_photo_url,
      gallery_photos: sanitizedGallery,
      created_by: created_by || null,
    });

    return NextResponse.json(newStray, { status: 201 });
  } catch (err: any) {
    console.error('API /strays POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
