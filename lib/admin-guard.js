import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null, error: { message: 'Unauthorized', status: 401 } };
  const admin = getSupabaseAdmin();
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'admin') return { user, profile, error: { message: 'Forbidden', status: 403 } };
  return { user, profile, error: null };
}

export async function anyAdminExists() {
  const admin = getSupabaseAdmin();
  const { count } = await admin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin');
  return (count || 0) > 0;
}
