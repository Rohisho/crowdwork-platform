import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return NextResponse.json({ error: error.message }, { status: error.status });

  const admin = getSupabaseAdmin();

  // Stats
  const [total, active, expired, rejected, reports, users] = await Promise.all([
    admin.from('vacancies').select('id', { count: 'exact', head: true }),
    admin.from('vacancies').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    admin.from('vacancies').select('id', { count: 'exact', head: true }).eq('status', 'expired'),
    admin.from('vacancies').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
    admin.from('reports').select('id', { count: 'exact', head: true }),
    admin.from('profiles').select('id', { count: 'exact', head: true }),
  ]);

  // Category breakdown
  const { data: byCategoryRows } = await admin
    .from('vacancies')
    .select('category')
    .eq('status', 'active');
  const byCategory = {};
  (byCategoryRows || []).forEach((r) => { byCategory[r.category] = (byCategory[r.category] || 0) + 1; });

  // Recent jobs (moderation queue — latest, all statuses)
  const { data: jobs } = await admin
    .from('vacancies')
    .select('id,title,business_name,category,status,poster_url,lat,lng,postcode,town,ai_confidence,report_count,active_votes,gone_votes,created_at,expires_at,owner_id')
    .order('created_at', { ascending: false })
    .limit(100);

  // Users — join profile rows with auth emails/providers
  const { data: profileRows } = await admin
    .from('profiles')
    .select('id,display_name,avatar_url,role,trust_score,contribution_count,created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  const { data: authList } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const authById = Object.fromEntries((authList?.users || []).map((u) => [u.id, u]));
  const usersList = (profileRows || []).map((p) => {
    const au = authById[p.id];
    const providers = au?.app_metadata?.providers || (au?.app_metadata?.provider ? [au.app_metadata.provider] : []);
    return {
      ...p,
      email: au?.email || null,
      providers,
      last_sign_in_at: au?.last_sign_in_at || null,
      banned: !!au?.banned_until,
    };
  });

  // Reports (with joined vacancy title)
  const { data: reportsList } = await admin
    .from('reports')
    .select('id,reason,notes,created_at,vacancy_id,reporter_id,vacancies(title,business_name,poster_url,status)')
    .order('created_at', { ascending: false })
    .limit(100);

  return NextResponse.json({
    stats: {
      total: total.count || 0,
      active: active.count || 0,
      expired: expired.count || 0,
      rejected: rejected.count || 0,
      reports: reports.count || 0,
      users: users.count || 0,
      byCategory,
    },
    jobs: jobs || [],
    users: usersList || [],
    reports: reportsList || [],
  });
}
