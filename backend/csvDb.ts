// backend/csvDb.ts
/**
 * The CSV "database driver".
 *
 * Same method names as the old MySQL driver, so every API route keeps working
 * while nothing touches MySQL any more. Animals live in cats.csv / dogs.csv /
 * others.csv and are read back as one list, which is what the rest of the app
 * expects.
 */
import {
  ANIMAL_TABLES,
  AnimalTable,
  appendRow,
  getSetting,
  newId,
  nowIso,
  readTable,
  toArray,
  toBool,
  writeTable,
} from './csvStore';

/** Which animal file a species belongs in. */
export function tableForSpecies(species?: string | null): AnimalTable {
  if (species === 'dog') return 'dogs';
  if (species === 'cat') return 'cats';
  return 'others';
}

function asStray(row: Record<string, any>, table: AnimalTable): Record<string, any> {
  return {
    ...row,
    species: row.species || (table === 'cats' ? 'cat' : table === 'dogs' ? 'dog' : 'other'),
    exact_lat: row.exact_lat === '' ? undefined : Number(row.exact_lat),
    exact_lng: row.exact_lng === '' ? undefined : Number(row.exact_lng),
    public_lat: Number(row.public_lat),
    public_lng: Number(row.public_lng),
    is_tnr: toBool(row.is_tnr),
    fed_count: Number(row.fed_count || 0),
    gallery_photos: toArray(row.gallery_photos),
    photo_ids: toArray(row.photo_ids),
  };
}

/** Every animal, newest first, as one list. */
export function listStrays(): any[] {
  const rows = ANIMAL_TABLES.flatMap((table) =>
    readTable<any>(table).map((row) => asStray(row, table))
  );
  return rows
    .filter((row) => (row.status || 'active') === 'active')
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
}

/** Find an animal wherever it lives, plus which file it lives in. */
export function findAnimal(id: string): { table: AnimalTable; row: Record<string, any> } | null {
  for (const table of ANIMAL_TABLES) {
    const row = readTable<any>(table).find((r) => r.id === id);
    if (row) return { table, row };
  }
  return null;
}

/** Update one animal in place, in whichever file holds it. */
export function updateAnimal(id: string, patch: Record<string, any>) {
  const found = findAnimal(id);
  if (!found) return null;
  const { table } = found;
  const rows = readTable<any>(table);
  const index = rows.findIndex((r) => r.id === id);
  rows[index] = { ...rows[index], ...patch };
  writeTable(table, rows);
  return asStray(rows[index], table);
}

function mapCampaign(row: Record<string, any>) {
  return {
    ...row,
    is_active: toBool(row.is_active ?? 'true'),
    is_popup: toBool(row.is_popup ?? 'true'),
    photo_ids: toArray(row.photo_ids),
    reactions: {
      heart: Number(row.heart_count || 0),
      paws: Number(row.paws_count || 0),
      clap: Number(row.clap_count || 0),
    },
  };
}

export const csvDb = {
  /** USERS */
  async findUserByUsername(username: string) {
    const rows = readTable<any>('users');
    return rows.find((r) => String(r.username || '').toLowerCase() === String(username).toLowerCase()) || null;
  },

  async findUserByEmail(email: string) {
    const rows = readTable<any>('users');
    return rows.find((r) => String(r.email || '').toLowerCase() === String(email).toLowerCase()) || null;
  },

  async createUser(user: {
    username: string;
    name: string;
    email: string;
    password_hash: string;
    role?: string;
    id?: string;
  }) {
    const row = {
      id: user.id || newId('usr'),
      username: user.username,
      name: user.name,
      email: user.email,
      password_hash: user.password_hash,
      role: user.role || 'spotter',
      xp_points: 10,
      is_active: 1,
      created_at: nowIso(),
    };
    appendRow('users', row);
    return row;
  },

  async getAllProfiles() {
    return readTable<any>('users').map(({ password_hash, ...safe }) => safe);
  },

  /** ANIMALS */
  async getStrays(params?: { lat?: number; lng?: number; radius?: number; city?: string }) {
    let rows = listStrays();
    if (params?.city && params.city !== 'All Cities') {
      rows = rows.filter((r) => r.city === params.city);
    }
    if (params?.lat !== undefined && params?.lng !== undefined && params?.radius) {
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
  },

  async createStray(stray: Record<string, any>) {
    const table = tableForSpecies(stray.species);
    const row = {
      id: stray.id || newId('stray'),
      created_by: stray.created_by || '',
      name: stray.name || 'Unnamed Buddy',
      species: stray.species,
      coat_description: stray.coat_description || '',
      health_status: stray.health_status || 'healthy',
      is_tnr: stray.is_tnr ? 1 : 0,
      city: stray.city || 'Metro Manila',
      exact_lat: Number(stray.exact_lat),
      exact_lng: Number(stray.exact_lng),
      public_lat: Number(stray.public_lat),
      public_lng: Number(stray.public_lng),
      photo_ids: JSON.stringify(toArray(stray.photo_ids)),
      identifier_photo_url: stray.identifier_photo_url || '',
      gallery_photos: JSON.stringify(toArray(stray.gallery_photos).slice(0, 3)),
      fed_count: 0,
      last_fed_at: '',
      last_seen_at: nowIso(),
      created_at: nowIso(),
      status: 'active',
    };
    appendRow(table, row);
    return asStray(row, table);
  },

  async incrementStrayFed(strayId: string, userId?: string, username?: string, notes?: string) {
    const now = nowIso();
    appendRow('care_logs', {
      id: newId('log'),
      stray_id: strayId,
      user_id: userId || '',
      username: username || 'Anonymous Feeder',
      action_type: 'fed',
      notes: notes || 'Fed with a hearty meal',
      created_at: now,
    });

    const found = findAnimal(strayId);
    if (!found) return null;
    return updateAnimal(strayId, {
      fed_count: Number(found.row.fed_count || 0) + 1,
      last_fed_at: now,
      last_seen_at: now,
    });
  },

  /** Most recent 'fed' tap by this guardian inside the cooldown window. */
  async getRecentFedTap(strayId: string, guardianKey: string, minutes: number) {
    const cutoff = Date.now() - minutes * 60 * 1000;
    const logs = readTable<any>('care_logs');
    const bareName = guardianKey.replace(/^guest:/, '');
    const match = logs
      .filter(
        (l) =>
          l.stray_id === strayId &&
          l.action_type === 'fed' &&
          (l.user_id === guardianKey || String(l.username || '').toLowerCase() === bareName.toLowerCase()) &&
          new Date(l.created_at).getTime() >= cutoff
      )
      .pop();
    return match || null;
  },

  async logCare(input: {
    stray_id: string;
    user_id?: string | null;
    username?: string | null;
    action_type: 'fed' | 'water' | 'sighting' | 'medical_alert';
    notes?: string | null;
  }) {
    const now = nowIso();
    appendRow('care_logs', {
      id: newId('log'),
      stray_id: input.stray_id,
      user_id: input.user_id || '',
      username: input.username || 'Anonymous',
      action_type: input.action_type,
      notes: input.notes || '',
      created_at: now,
    });

    const found = findAnimal(input.stray_id);
    if (!found) return null;

    if (input.action_type === 'medical_alert') {
      const updated = updateAnimal(input.stray_id, { health_status: 'injured', last_seen_at: now });
      appendRow('notifications', {
        id: newId('ntf'),
        user_id: '',
        stray_id: input.stray_id,
        kind: 'urgent',
        title: `Urgent case: ${input.username || 'A guardian'} flagged a buddy`,
        body: input.notes || 'Needs a rescuer as soon as possible.',
        is_read: 0,
        created_at: now,
      });
      return updated;
    }

    // water / sighting / fed all mean "seen and helped just now".
    return updateAnimal(input.stray_id, { last_seen_at: now });
  },

  /** REVIEWS */
  async getReviewsForStray(strayId: string) {
    return readTable<any>('stray_reviews')
      .filter((r) => r.stray_id === strayId)
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  },

  async addReview(review: {
    stray_id: string;
    user_id?: string;
    username: string;
    rating: number;
    comment: string;
  }) {
    const rating = Math.min(5, Math.max(1, Math.round(Number(review.rating))));
    const row = {
      id: newId('rev'),
      stray_id: review.stray_id,
      user_id: review.user_id || '',
      username: review.username,
      rating,
      comment: String(review.comment || '').slice(0, 1200),
      created_at: nowIso(),
    };
    appendRow('stray_reviews', row);
    return row;
  },

  /** CAMPAIGNS */
  async getCampaigns() {
    return readTable<any>('campaigns')
      .filter((c) => toBool(c.is_active ?? 'true'))
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      .map(mapCampaign);
  },

  async createCampaign(campaign: {
    title: string;
    description: string;
    id?: string;
    banner_photo_url?: string;
    photo_ids?: string[];
    target_amount?: string;
    is_popup?: boolean;
    created_by?: string;
  }) {
    const row = {
      id: campaign.id || newId('camp'),
      title: campaign.title,
      description: campaign.description,
      banner_photo_url: campaign.banner_photo_url || '',
      photo_ids: JSON.stringify(toArray(campaign.photo_ids)),
      target_amount: campaign.target_amount || '',
      raised_amount: 0,
      is_active: 1,
      is_popup: campaign.is_popup === false ? 0 : 1,
      heart_count: 0,
      paws_count: 0,
      clap_count: 0,
      created_by: campaign.created_by || '',
      created_at: nowIso(),
    };
    appendRow('campaigns', row);
    return mapCampaign(row);
  },

  /** One reaction per signed-in person per campaign per kind. */
  async reactToCampaign(campaignId: string, reactionType: 'heart' | 'paws' | 'clap', userId?: string) {
    const who = userId || '';
    if (who) {
      const already = readTable<any>('campaign_reactions').some(
        (r) => r.campaign_id === campaignId && r.user_id === who && r.reaction_type === reactionType
      );
      if (already) {
        // Same person, same reaction: return the campaign untouched.
        const current = readTable<any>('campaigns').find((c) => c.id === campaignId);
        return current ? mapCampaign(current) : null;
      }
      appendRow('campaign_reactions', {
        id: newId('rxn'),
        campaign_id: campaignId,
        user_id: who,
        username: '',
        reaction_type: reactionType,
        created_at: nowIso(),
      });
    }

    const rows = readTable<any>('campaigns');
    const index = rows.findIndex((c) => c.id === campaignId);
    if (index === -1) return null;
    const column = `${reactionType}_count`;
    rows[index][column] = Number(rows[index][column] || 0) + 1;
    writeTable('campaigns', rows);
    return mapCampaign(rows[index]);
  },

  /** ADMIN */
  async getAggregate() {
    const strays = listStrays();
    const profiles = readTable<any>('users').map(({ password_hash, ...safe }) => safe);
    const careLogs = readTable<any>('care_logs');
    const cities = readTable<any>('cities').map((c) => String(c.name));

    const cityList = cities.length ? cities : [...new Set(strays.map((s) => String(s.city)))];
    const citySummary = cityList.map((name) => ({
      city: name,
      strayCount: strays.filter((s) => s.city === name).length,
      careLogCount: careLogs.filter((l) => {
        const animal = strays.find((s) => s.id === l.stray_id);
        return animal ? animal.city === name : false;
      }).length,
      status: 'Active',
    }));

    return {
      totalStrays: strays.length,
      totalUsers: profiles.length,
      totalCareLogs: careLogs.length,
      cities: citySummary,
      allStrays: strays,
      allUsers: profiles,
      allCareLogs: careLogs,
    };
  },

  /** Health check: what is actually being used is plain CSV files. */
  async health() {
    ensureHealthFiles();
    return {
      connected: true,
      database: 'local CSV files',
      client: 'csv',
      settings: { app_name: getSetting('app_name', 'StrayBuddy') },
    };
  },
};

/** Touch every table once so a fresh clone has all its files. */
function ensureHealthFiles() {
  ANIMAL_TABLES.forEach((table) => readTable(table));
  readTable('users');
  readTable('care_logs');
  readTable('campaigns');
}

export const DEFAULT_SUPERADMIN = {
  id: 'usr_superadmin',
  username: 'superadmin',
  name: 'System Superadmin',
  email: 'superadmin@straybuddy.local',
  password: 'superadmin123',
  role: 'superadmin',
};

/** Guarantee the superadmin row exists so the first admin login always works. */
export function ensureSuperAdminRow() {
  const users = readTable<any>('users');
  if (users.some((u) => u.role === 'superadmin')) return;
  appendRow('users', {
    id: DEFAULT_SUPERADMIN.id,
    username: DEFAULT_SUPERADMIN.username,
    name: DEFAULT_SUPERADMIN.name,
    email: DEFAULT_SUPERADMIN.email,
    password_hash: DEFAULT_SUPERADMIN.password,
    role: DEFAULT_SUPERADMIN.role,
    xp_points: 9999,
    is_active: 1,
    created_at: nowIso(),
  });
}

/** Write a row into the audit trail. */
export function logActivity(entry: {
  userId?: string | null;
  username?: string | null;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  details?: string | null;
}) {
  appendRow('activity_logs', {
    id: newId('act'),
    user_id: entry.userId || '',
    username: entry.username || 'admin',
    action: entry.action,
    entity: entry.entity || '',
    entity_id: entry.entityId ? String(entry.entityId) : '',
    details: entry.details || '',
    created_at: nowIso(),
  });
}
