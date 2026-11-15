// lib/api/backend.ts
/**
 * One door between the two Next frontends (user app + admin app) and the
 * shared Express backend.
 *
 * Order of preference:
 *   1. Express backend at BACKEND_API_URL (the properly layered path)
 *   2. The in-app driver (mysqlDriver / CSV) when the backend is unreachable
 *
 * Returning null means "backend not reachable, use the local driver" so a
 * developer who only has XAMPP running is never blocked.
 */

const BACKEND_URL = (process.env.BACKEND_API_URL || '').replace(/\/$/, '');

export function backendUrlEnabled(): boolean {
  return BACKEND_URL.length > 0;
}

/** GET JSON from the Express backend, or null when it is down/unreachable. */
export async function backendGet<T>(path: string, timeoutMs = 4000): Promise<T | null> {
  if (!BACKEND_URL) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${BACKEND_URL}${path}`, {
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** POST JSON to the Express backend, or null when it is down/unreachable. */
export async function backendPost<T>(path: string, body: unknown, timeoutMs = 6000): Promise<T | null> {
  if (!BACKEND_URL) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${BACKEND_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Headers that let browsers and the service worker reuse a response briefly. */
export function jsonCacheHeaders(seconds: number): Record<string, string> {
  return {
    'Cache-Control': `public, max-age=${seconds}, stale-while-revalidate=${seconds * 2}`,
  };
}
