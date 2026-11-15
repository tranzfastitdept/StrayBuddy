// lib/api/cache.ts
/**
 * Tiny in-memory TTL cache shared by the API routes and the Express backend.
 *
 * Why: the map asks for strays on every small pan. Without a cache each pan
 * re-runs the same SQL. A 10–20 second window removes almost all of that
 * repeat work while still looking "live" to a person using the app.
 */

type Entry<T> = { value: T; expiresAt: number };

const store = new Map<string, Entry<unknown>>();

/** Read a cached value, or null when it is missing / expired. */
export function cacheGet<T>(key: string): T | null {
  const hit = store.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    store.delete(key);
    return null;
  }
  return hit.value as T;
}

/** Store a value for `ttlMs` milliseconds. */
export function cacheSet<T>(key: string, value: T, ttlMs: number): T {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

/** Drop every entry whose key starts with `prefix` (used after writes). */
export function cacheBust(prefix: string) {
  for (const key of Array.from(store.keys())) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

/**
 * Get-or-load helper: returns the cached value when fresh, otherwise runs
 * `loader` once and remembers it. Concurrent callers share one loader run.
 */
const inflight = new Map<string, Promise<unknown>>();

export async function cached<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const hit = cacheGet<T>(key);
  if (hit !== null) return hit;

  const running = inflight.get(key);
  if (running) return running as Promise<T>;

  const task = (async () => {
    try {
      const value = await loader();
      cacheSet(key, value, ttlMs);
      return value;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, task);
  return task;
}

/** Swallow generator size growth on very long dev sessions. */
export function cacheStats() {
  return { entries: store.size, inflight: inflight.size };
}
