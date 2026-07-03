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
