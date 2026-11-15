// app/api/admin/aggregate/route.ts
import { NextResponse } from 'next/server';
import { dbAdapter } from '@/backend/dbAdapter';
import { cached } from '@/lib/api/cache';
import { backendGet } from '@/lib/api/backend';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await cached('admin:aggregate', 10_000, async () => {
      const remote = await backendGet<any>('/api/admin/aggregate');
      if (remote) return remote;
      return dbAdapter.getAggregate();
    });

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('API /admin/aggregate error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
