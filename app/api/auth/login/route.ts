import { NextResponse } from 'next/server';
import { dbAdapter } from '@/backend/dbAdapter';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const trimmedUsername = username.trim().toLowerCase();

    // Check credentials against database / CSV
    const user = await dbAdapter.findUserByUsername(trimmedUsername);

    if (!user) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    // Verify password (plain check or superadmin credentials)
    if (user.password_hash !== password && user.password_hash !== password.trim()) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    // Omit password hash from response
    const { password_hash, ...safeProfile } = user;

    return NextResponse.json({
      success: true,
      user: safeProfile,
      message: `Welcome back, ${user.name}!`,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
