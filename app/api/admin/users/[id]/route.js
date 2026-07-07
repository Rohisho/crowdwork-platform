import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function PATCH(request, { params }) {
  const { user, error } = await requireAdmin();
  if (error) return NextResponse.json({ error: error.message }, { status: error.status });
  const { id } = await params;
  if (id === user.id) return NextResponse.json({ error: "You can't change your own role" }, { status: 400 });
  const body = await request.json();
  if (!['user', 'admin'].includes(body.role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  const admin = getSupabaseAdmin();
  const { error: e } = await admin.from('profiles').update({ role: body.role }).eq('id', id);
  if (e) return NextResponse.json({ error: e.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// Ban / hard-delete a user (also removes their profile via cascade)
export async function DELETE(_request, { params }) {
  const { user, error } = await requireAdmin();
  if (error) return NextResponse.json({ error: error.message }, { status: error.status });
  const { id } = await params;
  if (id === user.id) return NextResponse.json({ error: "You can't remove yourself" }, { status: 400 });
  const admin = getSupabaseAdmin();

  // Delete storage objects owned by user (best-effort) \u2014 their vacancies\u2019 posters
  const { data: jobs } = await admin.from('vacancies').select('poster_path').eq('owner_id', id);
  const paths = (jobs || []).map((j) => j.poster_path).filter(Boolean);
  if (paths.length) await admin.storage.from('job-posters').remove(paths).catch(() => {});

  // Delete auth user \u2014 cascades to profiles + vacancies + votes + bookmarks via FK
  const { error: e } = await admin.auth.admin.deleteUser(id);
  if (e) return NextResponse.json({ error: e.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
