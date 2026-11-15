// backend/dbAdapter.ts
/**
 * One data door for the whole app.
 *
 * StrayBuddy now stores everything in plain CSV files (see csvStore.ts and
 * csvDb.ts): users.csv, cats.csv, dogs.csv, others.csv, campaigns.csv, and so
 * on. MySQL is no longer used, so there is nothing to install or keep running
 * — the files are the database.
 *
 * Every method here keeps the name the API routes already call, so the routes
 * themselves did not need to change.
 */
import { csvDb } from './csvDb';

export const STORAGE = 'csv';

console.log('[StrayBuddy DB Adapter] Storage: local CSV files (backend/data)');

export const dbAdapter = csvDb;

export type DbAdapter = typeof csvDb;
