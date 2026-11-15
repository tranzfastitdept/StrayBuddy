import { NextResponse } from 'next/server';
import { dbAdapter } from '@/backend/dbAdapter';

export async function POST(request: Request) {
  try {
    const { stray_id, user_id, username, action_type, notes } = await request.json();

    if (!stray_id || !action_type) {
      return NextResponse.json({ error: 'stray_id and action_type are required' }, { status: 400 });
    }

    if (action_type === 'fed') {
      const updated = await dbAdapter.incrementStrayFed(stray_id, user_id, username, notes);
      return NextResponse.json({ success: true, stray: updated, message: 'Fed reaction recorded!' });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('API /care POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
