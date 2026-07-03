import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function POST(request, { params }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const reason = body?.reason || 'other';
  const notes = body?.notes || null;
  const admin = getSupabaseAdmin();
  const { error } = await admin.from('reports').insert({ vacancy_id: id, reporter_id: user.id, reason, notes });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // best-effort report_count bump
  await admin.rpc('increment_report_count', { p_vacancy: id }).catch(() => {});
  return NextResponse.json({ ok: true });
}
