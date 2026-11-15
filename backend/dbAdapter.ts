// backend/dbAdapter.ts
/**
 * Dual Database Adapter for StrayBuddy
 * - Development Mode: Reads/writes local CSV files inside backend/data/
 * - Production Mode: Reads/writes Supabase PostgreSQL + PostGIS
 */

import { supabase } from '@/lib/supabaseClient';
import { readCSVTable, writeCSVTable, appendCSVRow } from './csvDriver';

export const IS_PRODUCTION =
  process.env.APP_MODE === 'production' ||
  (process.env.NODE_ENV === 'production' &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder'));

console.log(`[StrayBuddy DB Adapter] Running in ${IS_PRODUCTION ? '🚀 PRODUCTION (Supabase)' : '🛠️ DEVELOPMENT (CSV)'} mode`);

export const dbAdapter = {
  /**
   * PROFILES / USERS
   */
  async findUserByUsername(username: string) {
    if (IS_PRODUCTION) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .maybeSingle();
      if (error) console.error('Supabase findUser error:', error);
      return data;
    } else {
      const rows = readCSVTable('profiles');
      return rows.find((r) => r.username?.toLowerCase() === username.toLowerCase()) || null;
    }
  },

  async findUserByEmail(email: string) {
    if (IS_PRODUCTION) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .maybeSingle();
      if (error) console.error('Supabase findUserByEmail error:', error);
      return data;
    } else {
      const rows = readCSVTable('profiles');
      return rows.find((r) => r.email?.toLowerCase() === email.toLowerCase()) || null;
    }
  },

  async createUser(user: {
    username: string;
    name: string;
    email: string;
    password_hash: string;
    role?: string;
  }) {
    const newUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      username: user.username,
      name: user.name,
      email: user.email,
      password_hash: user.password_hash,
      role: user.role || 'spotter',
      xp_points: 10,
      created_at: new Date().toISOString(),
    };

    if (IS_PRODUCTION) {
      const { data, error } = await supabase.from('profiles').insert([newUser]).select().single();
      if (error) throw error;
      return data;
    } else {
      appendCSVRow('profiles', newUser);
      return newUser;
    }
  },

  async getAllProfiles() {
    if (IS_PRODUCTION) {
      const { data } = await supabase.from('profiles').select('*');
      return data || [];
    } else {
      return readCSVTable('profiles');
    }
  },

  /**
   * STRAYS
   */
  async getStrays(params?: { lat?: number; lng?: number; radius?: number; city?: string }) {
    if (IS_PRODUCTION) {
      let query = supabase
        .from('strays')
        .select('*')
        .order('created_at', { ascending: false });

      if (params?.city && params.city !== 'All Cities') {
        query = query.eq('city', params.city);
      }
      if (params?.lat && params?.lng && params?.radius) {
        query = query
          .gt('public_lat', params.lat - params.radius)
          .lt('public_lat', params.lat + params.radius)
          .gt('public_lng', params.lng - params.radius)
          .lt('public_lng', params.lng + params.radius);
      }

      const { data, error } = await query;
      if (error) console.error('Supabase getStrays error:', error);
      return data || [];
    } else {
      let rows = readCSVTable('strays');
      if (params?.city && params.city !== 'All Cities') {
        rows = rows.filter((r) => r.city === params.city);
      }
      if (params?.lat && params?.lng && params?.radius) {
        const { lat, lng, radius } = params;
        rows = rows.filter(
          (r) =>
            Number(r.public_lat) >= lat - radius &&
            Number(r.public_lat) <= lat + radius &&
            Number(r.public_lng) >= lng - radius &&
            Number(r.public_lng) <= lng + radius
        );
      }
      return rows;
    }
  },

  async createStray(stray: Record<string, any>) {
    const newStray = {
      id: `stray_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      name: stray.name || 'Unnamed Buddy',
      species: stray.species,
      coat_description: stray.coat_description || '',
      health_status: stray.health_status || 'healthy',
      is_tnr: Boolean(stray.is_tnr),
      city: stray.city || 'Metro Manila',
      exact_lat: Number(stray.exact_lat),
      exact_lng: Number(stray.exact_lng),
      public_lat: Number(stray.public_lat),
      public_lng: Number(stray.public_lng),
      identifier_photo_url: stray.identifier_photo_url,
      gallery_photos: stray.gallery_photos || [],
      fed_count: 0,
      last_fed_at: null,
      last_seen_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      created_by: stray.created_by || null,
    };

    if (IS_PRODUCTION) {
      const { data, error } = await supabase
        .from('strays')
        .insert([{ ...newStray, location_geom: `POINT(${newStray.exact_lng} ${newStray.exact_lat})` }])
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      appendCSVRow('strays', newStray);
      return newStray;
    }
  },

  async incrementStrayFed(strayId: string, userId?: string, username?: string, notes?: string) {
    const now = new Date().toISOString();

    // 1. Log care action
    const careLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      stray_id: strayId,
      user_id: userId || null,
      username: username || 'Anonymous Feeder',
      action_type: 'fed',
      notes: notes || 'Fed with hearty meal',
      created_at: now,
    };

    if (IS_PRODUCTION) {
      await supabase.from('care_logs').insert([careLog]);
      // Update stray
      const { data: stray } = await supabase
        .from('strays')
        .select('fed_count')
        .eq('id', strayId)
        .single();
      const nextCount = ((stray?.fed_count as number) || 0) + 1;
      const { data, error } = await supabase
        .from('strays')
        .update({
          fed_count: nextCount,
          last_fed_at: now,
          last_seen_at: now,
        })
        .eq('id', strayId)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      appendCSVRow('care_logs', careLog);
      const strays = readCSVTable('strays');
      const idx = strays.findIndex((s) => s.id === strayId);
      if (idx !== -1) {
        strays[idx].fed_count = (Number(strays[idx].fed_count) || 0) + 1;
        strays[idx].last_fed_at = now;
        strays[idx].last_seen_at = now;
        writeCSVTable('strays', strays);
        return strays[idx];
      }
      return null;
    }
  },

  /**
   * REVIEWS & RATINGS
   */
  async getReviewsForStray(strayId: string) {
    if (IS_PRODUCTION) {
      const { data } = await supabase
        .from('stray_reviews')
        .select('*')
        .eq('stray_id', strayId)
        .order('created_at', { ascending: false });
      return data || [];
    } else {
      const rows = readCSVTable('stray_reviews');
      return rows.filter((r) => r.stray_id === strayId);
    }
  },

  async addReview(review: {
    stray_id: string;
    user_id?: string;
    username: string;
    rating: number;
    comment: string;
  }) {
    const newRev = {
      id: `rev_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      stray_id: review.stray_id,
      user_id: review.user_id || null,
      username: review.username,
      rating: Number(review.rating),
      comment: review.comment,
      created_at: new Date().toISOString(),
    };

    if (IS_PRODUCTION) {
      const { data, error } = await supabase.from('stray_reviews').insert([newRev]).select().single();
      if (error) throw error;
      return data;
    } else {
      appendCSVRow('stray_reviews', newRev);
      return newRev;
    }
  },

  /**
   * CAMPAIGNS & ANNOUNCEMENTS
   */
  async getCampaigns() {
    if (IS_PRODUCTION) {
      const { data } = await supabase
        .from('campaigns')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      return data || [];
    } else {
      return readCSVTable('campaigns');
    }
  },

  async createCampaign(campaign: {
    title: string;
    description: string;
    banner_photo_url?: string;
    target_amount?: string;
    is_popup?: boolean;
    created_by?: string;
  }) {
    const newCamp = {
      id: `camp_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      title: campaign.title,
      description: campaign.description,
      banner_photo_url: campaign.banner_photo_url || '',
      target_amount: campaign.target_amount || '',
      is_active: true,
      is_popup: campaign.is_popup ?? true,
      reactions: { heart: 0, paws: 0, clap: 0 },
      created_by: campaign.created_by || null,
      created_at: new Date().toISOString(),
    };

    if (IS_PRODUCTION) {
      const { data, error } = await supabase.from('campaigns').insert([newCamp]).select().single();
      if (error) throw error;
      return data;
    } else {
      appendCSVRow('campaigns', newCamp);
      return newCamp;
    }
  },

  async reactToCampaign(campaignId: string, reactionType: 'heart' | 'paws' | 'clap') {
    if (IS_PRODUCTION) {
      const { data: camp } = await supabase
        .from('campaigns')
        .select('reactions')
        .eq('id', campaignId)
        .single();
      const current = (camp?.reactions as any) || { heart: 0, paws: 0, clap: 0 };
      current[reactionType] = (current[reactionType] || 0) + 1;
      const { data, error } = await supabase
        .from('campaigns')
        .update({ reactions: current })
        .eq('id', campaignId)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const camps = readCSVTable('campaigns');
      const idx = camps.findIndex((c) => c.id === campaignId);
      if (idx !== -1) {
        if (!camps[idx].reactions || typeof camps[idx].reactions !== 'object') {
          camps[idx].reactions = { heart: 0, paws: 0, clap: 0 };
        }
        camps[idx].reactions[reactionType] = (camps[idx].reactions[reactionType] || 0) + 1;
        writeCSVTable('campaigns', camps);
        return camps[idx];
      }
      return null;
    }
  },
};
