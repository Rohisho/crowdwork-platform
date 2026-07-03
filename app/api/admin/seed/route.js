import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

// Demo posters (real public Unsplash URLs of shop windows / hiring signs)
const DEMO_JOBS = [
  { title: 'Barista — Weekend Shifts', business_name: "Elle's Coffee Bar", category: 'hospitality', description: 'Friendly weekend baristas needed. £12.50/hr + tips. Latte art a plus — training given.', contact: '020 7946 0011', postcode: 'W11 2AB', town: 'Notting Hill', lat: 51.5152, lng: -0.2058, poster_url: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=70' },
  { title: 'Kitchen Porter', business_name: 'The Camden Tap', category: 'hospitality', description: 'Evenings 5pm–12am. Fast paced kitchen. Cash tips, staff meal, weekly pay.', contact: 'jobs@camdentap.co.uk', postcode: 'NW1 8QP', town: 'Camden', lat: 51.5390, lng: -0.1426, poster_url: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=900&q=70' },
  { title: 'Warehouse Operative (Full-time)', business_name: 'EastLDN Fulfilment', category: 'warehouse', description: '£13.20/hr, immediate start. Forklift ticket preferred, not essential. Overtime available.', contact: '07890 111 222', postcode: 'E14 9SG', town: 'Canary Wharf', lat: 51.5054, lng: -0.0235, poster_url: 'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=900&q=70' },
  { title: 'Sales Assistant', business_name: 'Oxford Row Boutique', category: 'retail', description: 'Fashion retail assistant. 30–35 hrs/week. Staff discount 40%. Must be smart & sociable.', contact: '020 7580 4400', postcode: 'W1D 2DZ', town: 'Soho', lat: 51.5137, lng: -0.1362, poster_url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=900&q=70' },
  { title: 'Nail Technician', business_name: 'Shoreditch Nail Studio', category: 'beauty', description: 'Experienced nail tech (gel + acrylic). Chair rental £120/wk OR employed £11.50/hr + commission.', contact: 'hello@shoreditchnails.uk', postcode: 'E1 6JN', town: 'Shoreditch', lat: 51.5237, lng: -0.0779, poster_url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=900&q=70' },
  { title: 'Receptionist — Front of House', business_name: 'BridgeCo Chambers', category: 'office', description: 'Mon–Fri 9–5. Answering calls, greeting clients, calendar management. £26–28k pro-rata.', contact: 'careers@bridgeco.co.uk', postcode: 'EC2A 4NE', town: 'City of London', lat: 51.5210, lng: -0.0851, poster_url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=900&q=70' },
  { title: 'Waiter / Waitress', business_name: 'Casa Napoli', category: 'hospitality', description: 'Italian trattoria. Dinner service Tue–Sat. £13/hr + share of tronc. Language a bonus.', contact: '020 7734 5533', postcode: 'W1F 9DT', town: 'Soho', lat: 51.5133, lng: -0.1352, poster_url: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=900&q=70' },
  { title: 'Retail Assistant — Weekend', business_name: 'Covent Records', category: 'retail', description: 'Music-loving weekend assistant needed. Vinyl handling, stock, tills. £11.44/hr.', contact: 'shop@coventrecords.co.uk', postcode: 'WC2E 8RA', town: 'Covent Garden', lat: 51.5117, lng: -0.1240, poster_url: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=900&q=70' },
];

async function ensureDemoUser(admin) {
  const email = 'demo@spottedjobs.app';
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = list?.users?.find((u) => u.email === email);
  if (existing) return existing;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: 'Spotted Jobs Demo' },
  });
  if (error) throw new Error(error.message);
  return data.user;
}

export async function POST() {
  const { error } = await requireAdmin();
  if (error) return NextResponse.json({ error: error.message }, { status: error.status });

  const admin = getSupabaseAdmin();

  try {
    // Check if we already have demo data
    const { count: existing } = await admin
      .from('vacancies')
      .select('id', { count: 'exact', head: true })
      .eq('business_name', DEMO_JOBS[0].business_name);

    if ((existing || 0) > 0) {
      return NextResponse.json({ ok: true, seeded: 0, message: 'Demo jobs already exist' });
    }

    const demoUser = await ensureDemoUser(admin);
    const rows = DEMO_JOBS.map((j) => ({
      owner_id: demoUser.id,
      title: j.title,
      business_name: j.business_name,
      description: j.description,
      contact: j.contact,
      category: j.category,
      poster_url: j.poster_url,
      poster_path: `demo/${j.title.replace(/\s+/g, '_').toLowerCase()}.jpg`,
      lat: j.lat,
      lng: j.lng,
      postcode: j.postcode,
      town: j.town,
      status: 'active',
      ai_confidence: 0.95,
      ai_raw: { demo: true, is_hiring_poster: true, safe: true, readable: true },
    }));

    const { data, error: e } = await admin.from('vacancies').insert(rows).select('id');
    if (e) return NextResponse.json({ error: e.message }, { status: 500 });
    return NextResponse.json({ ok: true, seeded: data.length });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE() {
  const { error } = await requireAdmin();
  if (error) return NextResponse.json({ error: error.message }, { status: error.status });
  const admin = getSupabaseAdmin();
  const businessNames = DEMO_JOBS.map((d) => d.business_name);
  const { error: e, count } = await admin.from('vacancies').delete({ count: 'exact' }).in('business_name', businessNames);
  if (e) return NextResponse.json({ error: e.message }, { status: 500 });
  return NextResponse.json({ ok: true, removed: count || 0 });
}
