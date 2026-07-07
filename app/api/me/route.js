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

  // Defensive auto-create: if the trigger somehow missed this user (e.g. legacy row),
  // insert a profile row now so contribution/vote/bookmark flows have a target.
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
