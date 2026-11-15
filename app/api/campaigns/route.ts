import { NextResponse } from 'next/server';
import { dbAdapter } from '@/backend/dbAdapter';

export async function GET() {
  try {
    const campaigns = await dbAdapter.getCampaigns();
    return NextResponse.json(campaigns || []);
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
      created_by 
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
      const updated = await dbAdapter.reactToCampaign(campaign_id, reaction_type);
      return NextResponse.json({ success: true, campaign: updated });
    }

    // Creating a new campaign (Superadmin)
    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
    }

    const newCamp = await dbAdapter.createCampaign({
      title,
      description,
      banner_photo_url,
      target_amount,
      is_popup: is_popup ?? true,
      created_by,
    });

    return NextResponse.json(newCamp, { status: 201 });
  } catch (err: any) {
    console.error('API /campaigns POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
