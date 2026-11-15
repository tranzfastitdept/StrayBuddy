import { createClient, SupabaseClient } from '@supabase/supabase-js';

const PRIMARY_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const PRIMARY_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

const SUPABASE_SHARDS: Record<string, { url: string; anonKey: string }> = {
  Manila: { url: process.env.MANILA_SUPABASE_URL || PRIMARY_URL, anonKey: process.env.MANILA_SUPABASE_ANON_KEY || PRIMARY_ANON_KEY },
  Makati: { url: PRIMARY_URL, anonKey: PRIMARY_ANON_KEY },
  "Quezon City": { url: PRIMARY_URL, anonKey: PRIMARY_ANON_KEY },
  Taguig: { url: PRIMARY_URL, anonKey: PRIMARY_ANON_KEY },
  Pasig: { url: PRIMARY_URL, anonKey: PRIMARY_ANON_KEY },
  Mandaluyong: { url: PRIMARY_URL, anonKey: PRIMARY_ANON_KEY },
  Pasay: { url: PRIMARY_URL, anonKey: PRIMARY_ANON_KEY },
  "Parañaque": { url: PRIMARY_URL, anonKey: PRIMARY_ANON_KEY },
  Caloocan: { url: PRIMARY_URL, anonKey: PRIMARY_ANON_KEY },
  "Las Piñas": { url: PRIMARY_URL, anonKey: PRIMARY_ANON_KEY },
};

export function getSupabaseClientForCity(city: string): SupabaseClient {
  const cfg = SUPABASE_SHARDS[city] ?? SUPABASE_SHARDS['Manila'];
  return createClient(cfg.url, cfg.anonKey);
}

export function getAllShardClients(): { city: string; client: SupabaseClient }[] {
  return Object.entries(SUPABASE_SHARDS).map(([city, c]) => ({
    city,
    client: createClient(c.url, c.anonKey),
  }));
}
