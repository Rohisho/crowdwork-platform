import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function PATCH(request, { params }) {
  const { error } = await requireAdmin();
  if (error) return NextResponse.json({ error: error.message }, { status: error.status });

  const { id } = await params;
  const body = await request.json();
  const patch = {};
  if (body.status && ['active', 'rejected', 'expired', 'pending'].includes(body.status)) patch.status = body.status;
  if (typeof body.category === 'string') patch.category = body.category;
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'No valid fields' }, { status: 400 });

  const admin = getSupabaseAdmin();
  const { data, error: e } = await admin.from('vacancies').update(patch).eq('id', id).select('*').single();
  if (e) return NextResponse.json({ error: e.message }, { status: 500 });
  return NextResponse.json({ ok: true, job: data });
}

export async function DELETE(_request, { params }) {
  const { error } = await requireAdmin();
  if (error) return NextResponse.json({ error: error.message }, { status: error.status });
  const { id } = await params;
  const admin = getSupabaseAdmin();

  // fetch to grab storage path
  const { data: job } = await admin.from('vacancies').select('poster_path').eq('id', id).maybeSingle();
  if (job?.poster_path) await admin.storage.from('job-posters').remove([job.poster_path]).catch(() => {});
  const { error: e } = await admin.from('vacancies').delete().eq('id', id);
  if (e) return NextResponse.json({ error: e.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
