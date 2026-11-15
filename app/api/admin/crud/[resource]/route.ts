// app/api/admin/crud/[resource]/route.ts
/**
 * Admin table browser: list rows and insert a row.
 *
 * Every request must carry the token minted by /api/admin/login. Without it
 * the answer is 401 and no database is touched.
 */
import { NextResponse } from 'next/server';
import { adminFromRequest } from '@/lib/admin/auth';
import { listRows, createRow, getResource, logActivity } from '@/backend/csvAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { resource: string } }) {
  const admin = adminFromRequest(request);
  if (!admin) return NextResponse.json({ error: 'Admins only' }, { status: 401 });

  try {
    if (!getResource(params.resource)) {
      return NextResponse.json({ error: `Unknown table: ${params.resource}` }, { status: 404 });
    }
    const url = new URL(request.url);
    const data = await listRows(params.resource, {
      q: url.searchParams.get('q') || undefined,
      limit: Number(url.searchParams.get('limit') || 100),
    });
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    console.error(`API /admin/crud/${params.resource} GET error:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { resource: string } }) {
  const admin = adminFromRequest(request);
  if (!admin) return NextResponse.json({ error: 'Admins only' }, { status: 401 });

  try {
    if (!getResource(params.resource)) {
      return NextResponse.json({ error: `Unknown table: ${params.resource}` }, { status: 404 });
    }
    const payload = await request.json();
    const row = await createRow(params.resource, payload);
    await logActivity({
      userId: admin.id,
      username: admin.username,
      action: `create:${params.resource}`,
      entity: params.resource,
      entityId: row?.id != null ? String(row.id) : null,
    });
    return NextResponse.json({ success: true, row }, { status: 201 });
  } catch (err: any) {
    console.error(`API /admin/crud/${params.resource} POST error:`, err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
