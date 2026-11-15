// lib/admin/auth.ts
/**
 * Admin access tokens.
 *
 * The rest of the app signs people in and keeps their profile in the browser.
 * Admin tools are different: they touch every table, so the API itself has to
 * be able to tell an admin apart from a regular guardian. This file mints a
 * short-lived signed token when an admin signs in, and checks it on every
 * admin request. The token is signed with a secret only the server has, so it
 * cannot be forged from the browser.
 */
import crypto from 'crypto';

const SECRET = process.env.ADMIN_TOKEN_SECRET || 'straybuddy-admin-dev-secret';
const TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

export interface AdminTokenPayload {
  id: string;
  username: string;
  role: string;
  exp: number;
}

function b64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function sign(body: string): string {
  return b64url(crypto.createHmac('sha256', SECRET).update(body).digest());
}

/** Mint a token for an admin profile. */
export function mintAdminToken(user: { id: string; username: string; role: string }): string {
  const payload: AdminTokenPayload = {
    id: user.id,
    username: user.username,
    role: user.role,
    exp: Date.now() + TTL_MS,
  };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

/** Read a token back, or null when it is missing, expired or tampered with. */
export function verifyAdminToken(token: string | null | undefined): AdminTokenPayload | null {
  if (!token || !token.includes('.')) return null;
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;

  const expected = sign(body);
  // Constant-time compare so the signature cannot be guessed by timing.
  if (
    expected.length !== signature.length ||
    !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()) as AdminTokenPayload;
    if (!payload?.exp || payload.exp < Date.now()) return null;
    if (payload.role !== 'admin' && payload.role !== 'superadmin') return null;
    return payload;
  } catch {
    return null;
  }
}

/** True when this profile is allowed to use the console. */
export function isAdminRole(role?: string | null): boolean {
  return role === 'admin' || role === 'superadmin';
}

/** Pull the token out of a request and verify it. */
export function adminFromRequest(request: Request): AdminTokenPayload | null {
  const header = request.headers.get('x-admin-token') || '';
  return verifyAdminToken(header);
}
