import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json();
    const kind = body?.kind;
    if (!['still_active', 'gone'].includes(kind)) {
      return NextResponse.json({ error: 'Invalid kind' }, { status: 400 });
    }
    const admin = getSupabaseAdmin();
    const { error } = await admin.from('votes').upsert(
      { vacancy_id: id, user_id: user.id, kind },
      { onConflict: 'vacancy_id,user_id' }
    );
    if (error) throw error;

    // recount
    const [{ count: activeCount }, { count: goneCount }] = await Promise.all([
      admin.from('votes').select('*', { count: 'exact', head: true }).eq('vacancy_id', id).eq('kind', 'still_active'),
      admin.from('votes').select('*', { count: 'exact', head: true }).eq('vacancy_id', id).eq('kind', 'gone'),
    ]);
    await admin.from('vacancies').update({ active_votes: activeCount || 0, gone_votes: goneCount || 0 }).eq('id', id);
    return NextResponse.json({ ok: true, active_votes: activeCount || 0, gone_votes: goneCount || 0 });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 });
  }
}
