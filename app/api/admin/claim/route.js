import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { anyAdminExists } from '@/lib/admin-guard';

export const runtime = 'nodejs';

// Bootstrap route: allow the currently signed-in user to claim admin
// ONLY if no admin exists yet. Prevents privilege escalation later.
export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = getSupabaseAdmin();
  const hasAdmin = await anyAdminExists();

  // Fetch caller's current role
  const { data: myProfile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();

  // If the caller is already admin, no-op success
  if (myProfile?.role === 'admin') return NextResponse.json({ ok: true, alreadyAdmin: true });

  if (hasAdmin) return NextResponse.json({ error: 'An admin already exists. Ask them to promote you.' }, { status: 403 });

  const { error } = await admin.from('profiles').update({ role: 'admin' }).eq('id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, promoted: true });
}

export async function GET() {
  const hasAdmin = await anyAdminExists();
  return NextResponse.json({ hasAdmin });
}
