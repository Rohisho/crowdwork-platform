import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('bookmarks')
    .select('created_at, vacancy_id, vacancies(id,title,business_name,description,contact,category,poster_url,lat,lng,postcode,town,status,active_votes,gone_votes,created_at,expires_at)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const jobs = (data || []).map((row) => ({ ...row.vacancies, bookmarked_at: row.created_at })).filter((j) => j && j.id);
  return NextResponse.json({ jobs });
}
