import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request) {
  const url = new URL(request.url);
  const token_hash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  const next = url.searchParams.get('next') || '/';
  if (!token_hash || !type) return NextResponse.redirect(new URL('/login?error=bad_link', url));
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash, type });
  if (error) return NextResponse.redirect(new URL('/login?error=' + encodeURIComponent(error.message), url));
  return NextResponse.redirect(new URL(next, url));
}
