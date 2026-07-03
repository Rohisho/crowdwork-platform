import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

// GET /api/jobs?lat=..&lng=..&radius_m=5000&category=hospitality
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const lat = parseFloat(url.searchParams.get('lat'));
    const lng = parseFloat(url.searchParams.get('lng'));
    const radius_m = parseInt(url.searchParams.get('radius_m') || '10000', 10);
    const category = url.searchParams.get('category') || null;
    const limit = parseInt(url.searchParams.get('limit') || '200', 10);

    const admin = getSupabaseAdmin();

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const { data, error } = await admin.rpc('jobs_within_radius', {
        in_lat: lat,
        in_lng: lng,
        radius_m,
        in_category: category,
        in_limit: limit,
      });
      if (error) throw error;
      return NextResponse.json({ jobs: data || [] });
    }

    // Fallback: list latest active without geo filter
    let q = admin
      .from('vacancies')
      .select('id,title,business_name,description,contact,category,poster_url,lat,lng,postcode,town,status,active_votes,gone_votes,created_at,expires_at')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (category) q = q.eq('category', category);
    const { data, error } = await q;
    if (error) throw error;
    return NextResponse.json({ jobs: data || [] });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 });
  }
}
