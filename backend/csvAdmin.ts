// backend/csvAdmin.ts
/**
 * Admin create / read / update / delete for the CSV store.
 *
 * Same shapes the console already expects ({ columns, rows }), so the admin
 * screens did not need to change when the storage moved from MySQL to CSV.
 * Columns come from the table definition, so a new column added to csvStore.ts
 * shows up in the console automatically.
 */
import {
  ANIMAL_TABLES,
  TABLES,
  appendRow,
  newId,
  nowIso,
  readTable,
  tablePath,
  toBool,
  writeTable,
} from './csvStore';
import { findAnimal, listStrays, logActivity as writeActivity, DEFAULT_SUPERADMIN, ensureSuperAdminRow } from './csvDb';
import fs from 'fs';

export interface ResourceSpec {
  table: string;
  key: string;
  label: string;
  columns: string[];
  /** Rows are spread over several files (cats/dogs/others). */
  animals?: boolean;
}

export const RESOURCES: Record<string, ResourceSpec> = {
  strays: {
    table: 'strays',
    key: 'id',
    label: 'Strays',
    columns: ['id', 'name', 'species', 'city', 'health_status', 'fed_count', 'is_tnr', 'status', 'last_fed_at'],
    animals: true,
  },
  users: {
    table: 'users',
    key: 'id',
    label: 'Accounts',
    columns: ['id', 'username', 'name', 'email', 'role', 'xp_points', 'is_active', 'created_at'],
  },
  cities: {
    table: 'cities',
    key: 'id',
    label: 'Cities',
    columns: ['id', 'name', 'region', 'center_lat', 'center_lng', 'is_active'],
  },
  care_logs: {
    table: 'care_logs',
    key: 'id',
    label: 'Care logs',
    columns: ['id', 'stray_id', 'username', 'action_type', 'notes', 'created_at'],
  },
  stray_reviews: {
    table: 'stray_reviews',
    key: 'id',
    label: 'Reviews',
    columns: ['id', 'stray_id', 'username', 'rating', 'comment', 'created_at'],
  },
  campaigns: {
    table: 'campaigns',
    key: 'id',
    label: 'Campaigns',
    columns: ['id', 'title', 'target_amount', 'raised_amount', 'is_active', 'heart_count', 'created_at'],
  },
  campaign_photos: {
    table: 'campaign_photos',
    key: 'id',
    label: 'Campaign photos',
    columns: ['id', 'campaign_id', 'photo_url', 'sort_order', 'created_at'],
  },
  stray_photos: {
    table: 'stray_photos',
    key: 'id',
    label: 'Animal photos',
    columns: ['id', 'stray_id', 'photo_url', 'sort_order', 'created_at'],
  },
  notifications: {
    table: 'notifications',
    key: 'id',
    label: 'Notifications',
    columns: ['id', 'user_id', 'kind', 'title', 'is_read', 'created_at'],
  },
  activity_logs: {
    table: 'activity_logs',
    key: 'id',
    label: 'Audit trail',
    columns: ['id', 'username', 'action', 'entity', 'entity_id', 'created_at'],
  },
  server_logs: {
    table: 'server_logs',
    key: 'id',
    label: 'Server logs',
    columns: ['id', 'level', 'runtime', 'message', 'created_at'],
  },
  site_settings: {
    table: 'site_settings',
    key: 'key',
    label: 'Site settings',
    columns: ['key', 'value', 'updated_at'],
  },
};

export function getResource(name: string): ResourceSpec | null {
  return RESOURCES[name] ?? null;
}

/** Keep only columns the table really has, so a bad field is ignored. */
function pickColumns(table: string, payload: Record<string, any>): Record<string, any> {
  const allowed = TABLES[table];
  if (!allowed) throw new Error(`Unknown table: ${table}`);
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(payload || {})) {
    if (!allowed.includes(key)) continue;
    out[key] = typeof value === 'boolean' ? (value ? 1 : 0) : value;
  }
  return out;
}

/** List rows; `q` matches any text column. */
export async function listRows(resource: string, opts: { q?: string; limit?: number } = {}) {
  const spec = getResource(resource);
  if (!spec) throw new Error(`Unknown resource: ${resource}`);

  let rows: Record<string, any>[];
  if (spec.animals) {
    rows = listStrays();
  } else if (spec.table === 'users') {
    rows = readTable<any>('users').map(({ password_hash, ...safe }) => safe);
  } else if (spec.table === 'campaigns') {
    rows = readTable<any>('campaigns').map((c) => ({
      ...c,
      is_active: toBool(c.is_active ?? 'true'),
    }));
  } else {
    rows = readTable<any>(spec.table);
  }

  const q = (opts.q || '').trim().toLowerCase();
  if (q) {
    rows = rows.filter((row) =>
      Object.values(row).some((value) =>
        value !== null && value !== undefined && String(value).toLowerCase().includes(q)
      )
    );
  }

  const limit = Math.min(Math.max(Number(opts.limit) || 100, 1), 500);
  rows = rows.sort((a, b) => String(b.created_at || b.updated_at || '').localeCompare(String(a.created_at || a.updated_at || '')));

  return { columns: spec.columns, rows: rows.slice(0, limit) };
}

export async function getRow(resource: string, id: string) {
  const spec = getResource(resource);
  if (!spec) throw new Error(`Unknown resource: ${resource}`);
  if (spec.animals) {
    const found = findAnimal(id);
    return found ? found.row : null;
  }
  return readTable<any>(spec.table).find((r) => String(r[spec.key]) === String(id)) || null;
}

export async function createRow(resource: string, payload: Record<string, any>) {
  const spec = getResource(resource);
  if (!spec) throw new Error(`Unknown resource: ${resource}`);

  if (spec.animals) {
    const species = payload.species === 'dog' ? 'dog' : payload.species === 'other' ? 'other' : 'cat';
    const table = species === 'dog' ? 'dogs' : species === 'other' ? 'others' : 'cats';
    const data = pickColumns(table, {
      id: payload.id || newId('stray'),
      created_at: nowIso(),
      status: payload.status || 'active',
      last_seen_at: nowIso(),
      fed_count: Number(payload.fed_count || 0),
      ...payload,
      species,
    });
    appendRow(table, data);
    return data;
  }

  const data = pickColumns(spec.table, payload);
  if (!data[spec.key]) {
    data[spec.key] = spec.key === 'key' ? newId('set') : newId(spec.table.slice(0, 5));
  }
  if (spec.table !== 'site_settings' && !data.created_at) data.created_at = nowIso();
  if (spec.table === 'site_settings' && !data.updated_at) data.updated_at = nowIso();
  appendRow(spec.table, data);
  return data;
}

export async function updateRow(resource: string, id: string, payload: Record<string, any>) {
  const spec = getResource(resource);
  if (!spec) throw new Error(`Unknown resource: ${resource}`);

  if (spec.animals) {
    const found = findAnimal(id);
    if (!found) throw new Error('No row matched that id');
    const data = pickColumns(found.table, payload);
    delete data.id;
    const rows = readTable<any>(found.table);
    const index = rows.findIndex((r) => r.id === id);
    rows[index] = { ...rows[index], ...data };
    writeTable(found.table, rows);
    return rows[index];
  }

  const rows = readTable<any>(spec.table);
  const index = rows.findIndex((r) => String(r[spec.key]) === String(id));
  if (index === -1) throw new Error('No row matched that id');

  const data = pickColumns(spec.table, payload);
  delete data[spec.key];
  rows[index] = { ...rows[index], ...data };
  writeTable(spec.table, rows);
  return rows[index];
}

export async function deleteRow(resource: string, id: string) {
  const spec = getResource(resource);
  if (!spec) throw new Error(`Unknown resource: ${resource}`);

  if (spec.animals) {
    const found = findAnimal(id);
    if (!found) throw new Error('No row matched that id');
    const rows = readTable<any>(found.table).filter((r) => r.id !== id);
    writeTable(found.table, rows);
    return { deleted: 1 };
  }

  const rows = readTable<any>(spec.table);
  const remaining = rows.filter((r) => String(r[spec.key]) !== String(id));
  if (remaining.length === rows.length) throw new Error('No row matched that id');
  writeTable(spec.table, remaining);
  return { deleted: rows.length - remaining.length };
}

export async function logActivity(entry: {
  userId?: string | null;
  username?: string | null;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  details?: string | null;
}) {
  writeActivity(entry);
}

/** Recount fed totals from the care log, which is the single source of truth. */
export async function rebuildCounters() {
  const logs = readTable<any>('care_logs');
  ANIMAL_TABLES.forEach((table) => {
    const rows = readTable<any>(table);
    rows.forEach((row) => {
      const feeds = logs.filter((l) => l.stray_id === row.id && l.action_type === 'fed');
      row.fed_count = feeds.length;
      const last = feeds
        .map((l) => String(l.created_at))
        .sort()
        .pop();
      row.last_fed_at = last || '';
    });
    writeTable(table, rows);
  });
}

/** Empty the operational data but keep the accounts and the superadmin. */
export async function resetDatabase() {
  ['care_logs', 'stray_reviews', 'campaign_reactions', 'campaign_photos', 'stray_photos', 'notifications', 'campaigns'].forEach(
    (table) => writeTable(table, [])
  );
  ANIMAL_TABLES.forEach((table) => writeTable(table, []));
  ensureSuperAdminRow();
}

/** Housekeeping: drop the .tmp leftovers a hard crash may leave behind. */
export async function optimizeTables() {
  ['users', 'cities', 'site_settings', 'server_logs', 'activity_logs', ...ANIMAL_TABLES].forEach((table) => {
    const path = tablePath(table);
    if (!fs.existsSync(path)) writeTable(table, []);
  });
  return DEFAULT_SUPERADMIN.username;
}
