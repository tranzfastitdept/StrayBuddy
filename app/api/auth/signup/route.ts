import { NextResponse } from 'next/server';
import { dbAdapter } from '@/backend/dbAdapter';

export async function POST(request: Request) {
  try {
    const { username, name, email, password } = await request.json();

    if (!username || !name || !email || !password) {
      return NextResponse.json({ error: 'All fields (Username, Name, Email, Password) are required' }, { status: 400 });
    }

    const trimmedUsername = username.trim().toLowerCase();
    const trimmedEmail = email.trim().toLowerCase();

    // Check existing username
    const existingUser = await dbAdapter.findUserByUsername(trimmedUsername);
    if (existingUser) {
      return NextResponse.json({ error: 'Username is already taken' }, { status: 400 });
    }

    // Check existing email
    const existingEmail = await dbAdapter.findUserByEmail(trimmedEmail);
    if (existingEmail) {
      return NextResponse.json({ error: 'Email is already registered' }, { status: 400 });
    }

    // Create user in CSV or Supabase
    const newUser = await dbAdapter.createUser({
      username: trimmedUsername,
      name: name.trim(),
      email: trimmedEmail,
      password_hash: password, // For MVP demo; in prod use bcrypt/argon2
      role: trimmedUsername === 'superad' ? 'superadmin' : 'spotter',
    });

    const { password_hash, ...safeProfile } = newUser;

    return NextResponse.json({
      success: true,
      user: safeProfile,
      message: 'Account created successfully!',
    });
  } catch (err: any) {
    console.error('Signup error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
