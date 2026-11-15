// app/api/admin/crud/[resource]/[id]/route.ts
/**
 * Admin table browser: read, update or delete one row.
 */
import { NextResponse } from 'next/server';
import { adminFromRequest } from '@/lib/admin/auth';
import { getRow, updateRow, deleteRow, getResource, logActivity } from '@/backend/csvAdmin';
import { cacheBust } from '@/lib/api/cache';

export const dynamic = 'force-dynamic';

function guard(request: Request) {
  return adminFromRequest(request);
}

export async function GET(request: Request, { params }: { params: { resource: string; id: string } }) {
  const admin = guard(request);
  if (!admin) return NextResponse.json({ error: 'Admins only' }, { status: 401 });

  try {
    if (!getResource(params.resource)) {
      return NextResponse.json({ error: `Unknown table: ${params.resource}` }, { status: 404 });
    }
    const row = await getRow(params.resource, params.id);
    if (!row) return NextResponse.json({ error: 'Row not found' }, { status: 404 });
    return NextResponse.json(row, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { resource: string; id: string } }) {
  const admin = guard(request);
  if (!admin) return NextResponse.json({ error: 'Admins only' }, { status: 401 });

  try {
    if (!getResource(params.resource)) {
      return NextResponse.json({ error: `Unknown table: ${params.resource}` }, { status: 404 });
    }
    const payload = await request.json();
    const row = await updateRow(params.resource, params.id, payload);
    await logActivity({
      userId: admin.id,
      username: admin.username,
      action: `update:${params.resource}`,
      entity: params.resource,
      entityId: params.id,
      details: JSON.stringify(payload).slice(0, 900),
    });
    cacheBust('strays:');
    cacheBust('admin:');
    cacheBust('campaigns:');
    return NextResponse.json({ success: true, row });
  } catch (err: any) {
    console.error(`API /admin/crud/${params.resource}/${params.id} PUT error:`, err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: { resource: string; id: string } }) {
  const admin = guard(request);
  if (!admin) return NextResponse.json({ error: 'Admins only' }, { status: 401 });

  try {
    if (!getResource(params.resource)) {
      return NextResponse.json({ error: `Unknown table: ${params.resource}` }, { status: 404 });
    }
    const result = await deleteRow(params.resource, params.id);
    await logActivity({
      userId: admin.id,
      username: admin.username,
      action: `delete:${params.resource}`,
      entity: params.resource,
      entityId: params.id,
    });
    cacheBust('strays:');
    cacheBust('admin:');
    cacheBust('campaigns:');
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error(`API /admin/crud/${params.resource}/${params.id} DELETE error:`, err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
