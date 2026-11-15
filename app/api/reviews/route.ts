import { NextResponse } from 'next/server';
import { dbAdapter } from '@/backend/dbAdapter';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const strayId = url.searchParams.get('stray_id');

    if (!strayId) {
      return NextResponse.json({ error: 'stray_id is required' }, { status: 400 });
    }

    const reviews = await dbAdapter.getReviewsForStray(strayId);
    return NextResponse.json(reviews || []);
  } catch (err: any) {
    console.error('API /reviews GET error:', err);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    const { stray_id, user_id, username, rating, comment } = await request.json();

    if (!stray_id || !username || !rating || !comment) {
      return NextResponse.json({ error: 'Missing required review fields' }, { status: 400 });
    }

    const newReview = await dbAdapter.addReview({
      stray_id,
      user_id,
      username,
      rating: Math.min(5, Math.max(1, Number(rating))),
      comment: comment.trim(),
    });

    return NextResponse.json(newReview, { status: 201 });
  } catch (err: any) {
    console.error('API /reviews POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
