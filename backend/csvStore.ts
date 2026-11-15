// backend/csvStore.ts
/**
 * The CSV store: the whole database, kept as plain files in backend/data/.
 *
 * Tables:
 *   users.csv            accounts (incl. the superadmin)
 *   cats.csv             every cat row
 *   dogs.csv             every dog row
 *   others.csv           any other animal
 *   care_logs.csv        feed / water / sighting / urgent taps
 *   stray_reviews.csv    ratings & comments
 *   campaigns.csv        charity drives
 *   campaign_reactions.csv one row per person per reaction
 *   campaign_photos.csv  upload ids linked to a campaign
 *   stray_photos.csv     upload ids linked to an animal
 *   notifications.csv    alerts that the app can surface to a device
 *   site_settings.csv    key/value switches for the whole app
 *   server_logs.csv      one line per backend event worth keeping
 *   activity_logs.csv    audit trail of admin changes
 *   cities.csv           covered areas with their map centre
 *
 * Why three animal files instead of one: cats and dogs are read constantly and
 * separately (the map filter, the registry tabs), so splitting them keeps each
 * read small. `listStrays()` still hands back one list, so the rest of the app
 * never has to know. Each row carries `photo_ids`, the ids of its uploads,
 * which is how a photo file is tied back to its animal.
 */
import fs from 'fs';
import path from 'path';
import { readCSVTable, writeCSVTable, appendCSVRow } from './csvDriver';

export const DATA_DIR = path.join(process.cwd(), 'backend', 'data');
export const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

/** Every table the app knows about, with its default columns. */
export const TABLES: Record<string, string[]> = {
  users: ['id', 'username', 'name', 'email', 'password_hash', 'role', 'xp_points', 'is_active', 'created_at'],
  cats: [
    'id', 'created_by', 'name', 'species', 'coat_description', 'health_status', 'is_tnr', 'city',
    'exact_lat', 'exact_lng', 'public_lat', 'public_lng', 'photo_ids', 'identifier_photo_url',
    'gallery_photos', 'fed_count', 'last_fed_at', 'last_seen_at', 'created_at', 'status',
  ],
  dogs: [
    'id', 'created_by', 'name', 'species', 'coat_description', 'health_status', 'is_tnr', 'city',
    'exact_lat', 'exact_lng', 'public_lat', 'public_lng', 'photo_ids', 'identifier_photo_url',
    'gallery_photos', 'fed_count', 'last_fed_at', 'last_seen_at', 'created_at', 'status',
  ],
  others: [
    'id', 'created_by', 'name', 'species', 'coat_description', 'health_status', 'is_tnr', 'city',
    'exact_lat', 'exact_lng', 'public_lat', 'public_lng', 'photo_ids', 'identifier_photo_url',
    'gallery_photos', 'fed_count', 'last_fed_at', 'last_seen_at', 'created_at', 'status',
  ],
  care_logs: ['id', 'stray_id', 'user_id', 'username', 'action_type', 'notes', 'created_at'],
  stray_reviews: ['id', 'stray_id', 'user_id', 'username', 'rating', 'comment', 'created_at'],
  campaigns: [
    'id', 'title', 'description', 'banner_photo_url', 'photo_ids', 'target_amount',
    'raised_amount', 'is_active', 'is_popup', 'heart_count', 'paws_count', 'clap_count',
    'created_by', 'created_at',
  ],
  campaign_reactions: ['id', 'campaign_id', 'user_id', 'username', 'reaction_type', 'created_at'],
  campaign_photos: ['id', 'campaign_id', 'file_name', 'photo_url', 'sort_order', 'created_at'],
  stray_photos: ['id', 'stray_id', 'file_name', 'photo_url', 'sort_order', 'created_at'],
  notifications: ['id', 'user_id', 'stray_id', 'kind', 'title', 'body', 'is_read', 'created_at'],
  site_settings: ['key', 'value', 'updated_at'],
  server_logs: ['id', 'level', 'runtime', 'message', 'created_at'],
  activity_logs: ['id', 'user_id', 'username', 'action', 'entity', 'entity_id', 'details', 'created_at'],
  cities: ['id', 'name', 'region', 'center_lat', 'center_lng', 'is_active'],
};

/** The three animal files, in the order the registry shows them. */
export const ANIMAL_TABLES = ['cats', 'dogs', 'others'] as const;
export type AnimalTable = (typeof ANIMAL_TABLES)[number];

export function tablePath(table: string): string {
  if (!TABLES[table]) throw new Error(`Unknown table: ${table}`);
  return path.join(DATA_DIR, `${table}.csv`);
}

/** Make sure the folder exists and the file has its header row. */
function ensureTable(table: string) {
  const columns = TABLES[table];
  if (!columns) throw new Error(`Unknown table: ${table}`);
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const file = tablePath(table);
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, `${columns.join(',')}\n`, 'utf-8');
  }
}

export function ensureAllTables() {
  Object.keys(TABLES).forEach(ensureTable);
  ANIMAL_TABLES.forEach(ensureTable);
  splitLegacyStrays();
}

/**
 * One-time move of the old single strays.csv into cats.csv / dogs.csv /
 * others.csv, so an existing install keeps every buddy after the split.
 * The old file is left untouched as a backup.
 */
let splitDone = false;
function splitLegacyStrays() {
  if (splitDone) return;
  splitDone = true;

  const legacy = path.join(DATA_DIR, 'strays.csv');
  if (!fs.existsSync(legacy)) return;

  const alreadySplit = ANIMAL_TABLES.some((table) => readCSVTable(table).length > 0);
  if (alreadySplit) return;

  const rows = readCSVTable<any>('strays');
  if (!rows.length) return;

  ANIMAL_TABLES.forEach((table) => {
    const species = table === 'cats' ? 'cat' : table === 'dogs' ? 'dog' : 'other';
    const mine = rows
      .filter((row) => (row.species || 'cat') === species)
      .map((row) => ({
        ...row,
        photo_ids: Array.isArray(row.photo_ids) ? JSON.stringify(row.photo_ids) : row.photo_ids || '',
        gallery_photos: Array.isArray(row.gallery_photos)
          ? JSON.stringify(row.gallery_photos)
          : row.gallery_photos || '',
        status: row.status || 'active',
      }));
    if (mine.length) writeTable(table, mine);
  });
}

/** Read a table as objects. Missing file simply means "no rows yet". */
export function readTable<T = any>(table: string): T[] {
  ensureTable(table);
  splitLegacyStrays();
  return readCSVTable<T>(table);
}

/** Replace a whole table. Writes through a temp file so a crash cannot gut it. */
export function writeTable(table: string, rows: Record<string, any>[]): void {
  ensureTable(table);
  const file = tablePath(table);
  const columns = TABLES[table];
  const tmp = `${file}.tmp`;
  const lines = [columns.join(',')];
  rows.forEach((row) => lines.push(serialize(columns, row)));
  fs.writeFileSync(tmp, `${lines.join('\n')}\n`, 'utf-8');
  fs.renameSync(tmp, file);
}

/** Add a row to a table. */
export function appendRow(table: string, row: Record<string, any>): void {
  ensureTable(table);
  appendCSVRow(table, row);
}

function serialize(columns: string[], row: Record<string, any>): string {
  return columns
    .map((key) => {
      const value = row[key];
      if (value === null || value === undefined) return '';
      const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
      return text.includes(',') || text.includes('"') || text.includes('\n')
        ? `"${text.replace(/"/g, '""')}"`
        : text;
    })
    .join(',');
}

export const newId = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

export const nowIso = () => new Date().toISOString();

/** Booleans and JSON columns come back as text from the CSV parser. */
export function toBool(value: any): boolean {
  return value === true || value === 1 || value === '1' || value === 'true';
}

export function toArray(value: any): string[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return [];
    }
  }
  return [];
}

/** One report line kept forever in server_logs.csv. */
export function logServer(level: 'info' | 'warn' | 'error', runtime: string, message: string) {
  try {
    appendRow('server_logs', {
      id: newId('slg'),
      level,
      runtime,
      message: String(message).slice(0, 900),
      created_at: nowIso(),
    });
  } catch {
    // A log that cannot be written must never break the request that caused it.
  }
}

/** Read a setting from site_settings.csv, with a default when it is unset. */
export function getSetting(key: string, fallback = ''): string {
  const row = readTable<any>('site_settings').find((r) => r.key === key);
  return row ? String(row.value ?? fallback) : fallback;
}

/** Write a setting, keeping one row per key. */
export function setSetting(key: string, value: string): void {
  const rows = readTable<any>('site_settings');
  const index = rows.findIndex((r) => r.key === key);
  const row = { key, value: String(value), updated_at: nowIso() };
  if (index === -1) appendRow('site_settings', row);
  else {
    rows[index] = row;
    writeTable('site_settings', rows);
  }
}
