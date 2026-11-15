// app/api/admin/login/route.ts
/**
 * Admin sign-in. The normal sign-in endpoint is shared by everyone; this one
 * only succeeds for admin and superadmin accounts and hands back a signed
 * token the console sends with every request.
 */
import { NextResponse } from 'next/server';
import { dbAdapter } from '@/backend/dbAdapter';
import { mintAdminToken, isAdminRole } from '@/lib/admin/auth';
import { ensureSuperAdminRow } from '@/backend/csvDb';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    // Make sure the default superadmin exists before the first attempt.
    ensureSuperAdminRow();

    const user: any = await dbAdapter.findUserByUsername(String(username).trim());

    if (!user || user.password_hash !== password) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    if (!isAdminRole(user.role)) {
      // Deliberately the same wording: regular users are not told an admin
      // account exists at this address.
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const { password_hash, ...safeProfile } = user;

    return NextResponse.json({
      success: true,
      user: safeProfile,
      token: mintAdminToken({ id: user.id, username: user.username, role: user.role }),
      message: `Welcome back, ${user.name}!`,
    });
  } catch (err: any) {
    console.error('Admin login error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
