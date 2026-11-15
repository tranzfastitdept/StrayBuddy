// lib/hooks/useStrays.ts
'use client';

/**
 * Shared strays loader.
 *
 * Kept in one place so the map and the /strays list read the same data,
 * share one in-memory copy, and skip a second network round trip.
 */
import { useCallback, useEffect, useState } from 'react';
import { Stray } from '@/types/stray';

type Options = { lat?: number; lng?: number; radius?: number; city?: string };

const FRESH_MS = 10_000;
let memoryCache: { key: string; list: Stray[]; at: number } | null = null;

function makeKey(o: Options) {
  return [
    o.lat !== undefined ? Math.round(o.lat * 200) / 200 : '-',
    o.lng !== undefined ? Math.round(o.lng * 200) / 200 : '-',
    o.radius ?? 0.12,
    o.city ?? '-',
  ].join(':');
}

export function useStrays(options: Options = {}, enabled = true) {
  const key = makeKey(options);
  const [strays, setStrays] = useState<Stray[]>(memoryCache?.key === key ? memoryCache.list : []);
  const [loading, setLoading] = useState(enabled && !(memoryCache?.key === key));

  const load = useCallback(
    async (force = false) => {
      if (!enabled) return [] as Stray[];
      if (!force && memoryCache && memoryCache.key === key && Date.now() - memoryCache.at < FRESH_MS) {
        setStrays(memoryCache.list);
        setLoading(false);
        return memoryCache.list;
      }
      setLoading(true);
      const params = new URLSearchParams();
      if (options.lat !== undefined) params.set('lat', String(options.lat));
      if (options.lng !== undefined) params.set('lng', String(options.lng));
      if (options.radius !== undefined) params.set('radius', String(options.radius));
      if (options.city) params.set('city', options.city);

      try {
        const res = await fetch(`/api/strays?${params.toString()}`);
        if (res.ok) {
          const list: Stray[] = await res.json();
          if (Array.isArray(list)) {
            memoryCache = { key, list, at: Date.now() };
            setStrays(list);
            return list;
          }
        }
      } catch (err) {
        console.warn('Strays fetch failed', err);
      } finally {
        setLoading(false);
      }
      return [] as Stray[];
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, enabled]
  );

  useEffect(() => {
    load();
  }, [load]);

  /** Swap in an updated stray without refetching the whole viewport. */
  const patchStray = useCallback((updated: Stray) => {
    setStrays((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }, []);

  return { strays, loading, reload: load, patchStray };
}
