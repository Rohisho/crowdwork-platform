import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ user: null });

  const admin = getSupabaseAdmin();
  let { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).maybeSingle();

  if (!profile) {
    const insertRow = {
      id: user.id,
      display_name:
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        (user.email ? user.email.split('@')[0] : 'User'),
      avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      role: 'user',
    };
    const { data: created } = await admin
      .from('profiles')
      .upsert(insertRow, { onConflict: 'id' })
      .select('*')
      .single();
    profile = created;
  }

  return NextResponse.json({ user, profile });
}

export async function PATCH(request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const patch = {};
  if (typeof body.display_name === 'string') patch.display_name = body.display_name.slice(0, 60);
  if (typeof body.avatar_url === 'string' || body.avatar_url === null) patch.avatar_url = body.avatar_url;
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from('profiles').update(patch).eq('id', user.id).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, profile: data });
}
