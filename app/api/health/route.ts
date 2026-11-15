// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { dbAdapter } from '@/backend/dbAdapter';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const health = await dbAdapter.health();
    return NextResponse.json({
      status: 'ok',
      ...health,
      message: 'Running on local CSV files in backend/data. No database server needed.',
    });
  } catch (err: any) {
    console.error('API /health error:', err);
    return NextResponse.json(
      {
        status: 'error',
        client: 'csv',
        message: 'The CSV data folder is not readable.',
        detail: err?.message,
      },
      { status: 503 }
    );
  }
}
