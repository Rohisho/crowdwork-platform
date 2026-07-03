import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  const envOk = {
    supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabase_anon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabase_service: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    mapbox: !!process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
    llm: !!(process.env.EMERGENT_LLM_KEY || process.env.OPENAI_API_KEY),
  };
  return NextResponse.json({ ok: true, env: envOk, ts: new Date().toISOString() });
}
