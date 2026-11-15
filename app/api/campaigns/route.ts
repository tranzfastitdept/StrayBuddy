import { NextResponse } from 'next/server';
import { dbAdapter } from '@/backend/dbAdapter';
import { cached, cacheBust } from '@/lib/api/cache';
import { backendGet, jsonCacheHeaders } from '@/lib/api/backend';
import { savePhotos } from '@/backend/photos';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const campaigns = await cached('campaigns:all', 15_000, async () => {
      const remote = await backendGet<any[]>('/api/campaigns');
      if (remote) return remote;
      return dbAdapter.getCampaigns();
    });

    return NextResponse.json(campaigns || [], { headers: jsonCacheHeaders(10) });
  } catch (err: any) {
    console.error('API /campaigns GET error:', err);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      action,
      campaign_id,
      reaction_type,
      user_id,
      username,
      title,
      description,
      banner_photo_url,
      target_amount,
      is_popup,
      created_by,
    } = body;

    // Reacting to a campaign: REQUIRE USER AUTHENTICATION
    if (action === 'react') {
      if (!user_id && !username) {
        return NextResponse.json(
          { error: 'You must sign in or create an account before reacting to campaigns!' },
          { status: 401 }
        );
      }
      if (!campaign_id || !reaction_type) {
        return NextResponse.json({ error: 'campaign_id and reaction_type are required' }, { status: 400 });
      }
      const updated = await dbAdapter.reactToCampaign(campaign_id, reaction_type, user_id);
      cacheBust('campaigns:');
      return NextResponse.json({ success: true, campaign: updated });
    }

    // Creating a new campaign (Superadmin)
    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
    }

    const campaignId = `camp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // An uploaded banner is stored in public/uploads/campaigns/<id>/ and linked
    // by its photo id; a plain web address is kept as it was given.
    const photos =
      typeof banner_photo_url === 'string' && banner_photo_url.startsWith('data:')
        ? savePhotos('campaign', campaignId, [banner_photo_url])
        : [];

    const newCamp = await dbAdapter.createCampaign({
      title,
      description,
      id: campaignId,
      banner_photo_url: photos[0]?.photo_url || banner_photo_url,
      photo_ids: photos.map((p) => p.id),
      target_amount,
      is_popup: is_popup ?? true,
      created_by,
    });

    cacheBust('campaigns:');
    return NextResponse.json(newCamp, { status: 201 });
  } catch (err: any) {
    console.error('API /campaigns POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
