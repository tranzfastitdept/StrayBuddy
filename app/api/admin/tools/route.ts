// app/api/admin/tools/route.ts
/**
 * Admin bulk tools: reset the operational data, or run a named maintenance
 * action. Both need the admin token.
 */
import { NextResponse } from 'next/server';
import { adminFromRequest } from '@/lib/admin/auth';
import { resetDatabase, logActivity, rebuildCounters, optimizeTables } from '@/backend/csvAdmin';
import { ensureSuperAdminRow } from '@/backend/csvDb';
import { cacheBust } from '@/lib/api/cache';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const admin = adminFromRequest(request);
  if (!admin) return NextResponse.json({ error: 'Admins only' }, { status: 401 });

  try {
    const { action, confirm } = await request.json();

    if (action === 'reset') {
      if (confirm !== 'RESET') {
        return NextResponse.json({ error: 'Send confirm="RESET" to wipe the operational data' }, { status: 400 });
      }
      await resetDatabase();
      cacheBust('strays:');
      cacheBust('admin:');
      cacheBust('campaigns:');
      await logActivity({
        userId: admin.id,
        username: admin.username,
        action: 'reset:database',
      });
      return NextResponse.json({ success: true, message: 'Operational data cleared. Accounts were kept.' });
    }

    if (action === 'rebuild-counters') {
      await rebuildCounters();
      cacheBust('strays:');
      cacheBust('admin:');
      return NextResponse.json({ success: true, message: 'Fed counters rebuilt from the care log.' });
    }

    if (action === 'ensure-superadmin') {
      ensureSuperAdminRow();
      return NextResponse.json({ success: true, message: 'Superadmin verified.' });
    }

    if (action === 'optimize') {
      await optimizeTables();
      return NextResponse.json({
        success: true,
        message: 'Every CSV table checked. Missing files were recreated.',
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error('API /admin/tools error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
