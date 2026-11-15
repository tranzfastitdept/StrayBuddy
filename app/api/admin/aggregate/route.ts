import { NextResponse } from 'next/server';
import { getAllShardClients } from '@/lib/db/shardRouter';

export async function GET() {
  try {
    const shardEntries = getAllShardClients();

    const results = await Promise.allSettled(
      shardEntries.map(async ({ city, client }) => {
        const [profilesRes, straysRes, careLogsRes] = await Promise.all([
          client.from('profiles').select('id, username, role, xp_points').limit(50),
          client.from('strays').select('id, name, species, city, health_status, is_tnr, created_at').limit(50),
          client.from('care_logs').select('id, stray_id, action_type, created_at').limit(50),
        ]);

        return {
          city,
          profiles: profilesRes.data || [],
          strays: straysRes.data || [],
          careLogs: careLogsRes.data || [],
        };
      })
    );

    const aggregated = {
      cities: [] as any[],
      totalStrays: 0,
      totalUsers: 0,
      totalCareLogs: 0,
      allStrays: [] as any[],
    };

    results.forEach((res) => {
      if (res.status === 'fulfilled') {
        const data = res.value;
        aggregated.cities.push({
          city: data.city,
          strayCount: data.strays.length,
          userCount: data.profiles.length,
          careLogCount: data.careLogs.length,
        });
        aggregated.totalStrays += data.strays.length;
        aggregated.totalUsers += data.profiles.length;
        aggregated.totalCareLogs += data.careLogs.length;
        aggregated.allStrays.push(...data.strays);
      }
    });

    return NextResponse.json(aggregated);
  } catch (err: any) {
    console.error('API /admin/aggregate error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
