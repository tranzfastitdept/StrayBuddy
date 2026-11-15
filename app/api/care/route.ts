// app/api/care/route.ts
import { NextResponse } from 'next/server';
import { dbAdapter } from '@/backend/dbAdapter';
import { cacheBust } from '@/lib/api/cache';

/** A community "fed" tap is one per buddy per guardian, every 5 hours. */
const FED_COOLDOWN_MINUTES = 300;

/**
 * Feeding and watering must be done by a signed-in guardian.
 * The reason is honesty, not gatekeeping: the fed counter and the water check
 * are what rescuers rely on, and an anonymous tap cannot be traced or slowed
 * down, so a stray's real condition would drift away from the truth.
 */
const SIGNED_IN_ONLY = ['fed', 'water'];

export async function POST(request: Request) {
  try {
    const { stray_id, user_id, username, action_type, notes } = await request.json();

    if (!stray_id || !action_type) {
      return NextResponse.json({ error: 'stray_id and action_type are required' }, { status: 400 });
    }

    const allowed = ['fed', 'water', 'sighting', 'medical_alert'];
    if (!allowed.includes(action_type)) {
      return NextResponse.json({ error: `action_type must be one of: ${allowed.join(', ')}` }, { status: 400 });
    }

    // A guardian id is what every action below is counted and slowed against.
    const guardianKey = user_id ? String(user_id) : null;

    if (SIGNED_IN_ONLY.includes(action_type) && !guardianKey) {
      return NextResponse.json(
        {
          error: 'signin-required',
          needsSignIn: true,
          message:
            action_type === 'fed'
              ? 'Sign in first so the community fed count stays honest.'
              : 'Sign in first so the water refills can be trusted.',
        },
        { status: 401 }
      );
    }

    if (action_type === 'fed') {
      const lastTap = await dbAdapter.getRecentFedTap(stray_id, guardianKey as string, FED_COOLDOWN_MINUTES);
      if (lastTap && 'created_at' in lastTap) {
        const lastMs = new Date(String((lastTap as any).created_at)).getTime();
        const waitMs = lastMs + FED_COOLDOWN_MINUTES * 60 * 1000 - Date.now();
        const minutesLeft = Math.max(1, Math.ceil(waitMs / 60000));
        return NextResponse.json(
          {
            error: 'cooldown',
            cooldown: true,
            minutesLeft,
            message: `You tapped this buddy today. Come back in ${Math.floor(minutesLeft / 60) > 0 ? `${Math.floor(minutesLeft / 60)}h ` : ''}${minutesLeft % 60}m to tap again.`,
          },
          { status: 429 }
        );
      }

      const updated = await dbAdapter.incrementStrayFed(
        stray_id,
        guardianKey as string,
        username,
        notes
      );
      if (!updated) {
        return NextResponse.json({ error: 'That buddy is no longer on record' }, { status: 404 });
      }
      cacheBust('strays:');
      cacheBust('admin:');
      return NextResponse.json({
        success: true,
        stray: updated,
        cooldownMinutes: FED_COOLDOWN_MINUTES,
        message: 'Fed reaction recorded!',
      });
    }

    const updated = await dbAdapter.logCare({ stray_id, user_id, username, action_type, notes });
    if (!updated) {
      return NextResponse.json({ error: 'That buddy is no longer on record' }, { status: 404 });
    }
    cacheBust('strays:');
    cacheBust('admin:');
    return NextResponse.json({
      success: true,
      stray: updated,
      message:
        action_type === 'water'
          ? 'Fresh water logged!'
          : action_type === 'medical_alert'
          ? 'Urgent report sent to rescuers!'
          : 'Sighting refreshed!',
    });
  } catch (err: any) {
    console.error('API /care POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
