import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { extractPosterFromDataUrl } from '@/lib/ai/extract';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_BYTES = 8 * 1024 * 1024; // 8MB

export async function POST(request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const form = await request.formData();
    const file = form.get('image');
    const lat = parseFloat(form.get('lat'));
    const lng = parseFloat(form.get('lng'));
    const postcode = (form.get('postcode') || '').toString().trim() || null;
    const town = (form.get('town') || '').toString().trim() || null;
    const overrides = (() => { try { return JSON.parse(form.get('overrides') || '{}'); } catch { return {}; } })();

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Image is required' }, { status: 400 });
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: 'Location (lat/lng) is required' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Image too large (>8MB)' }, { status: 413 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const mime = file.type || 'image/jpeg';
    const dataUrl = `data:${mime};base64,${buf.toString('base64')}`;

    // 1) AI extraction + moderation in one shot
    let ai;
    try {
      ai = await extractPosterFromDataUrl(dataUrl);
    } catch (err) {
      return NextResponse.json({ error: 'AI extraction failed: ' + err.message }, { status: 502 });
    }

    if (!ai.safe) {
      return NextResponse.json({ error: 'Image rejected by moderation', ai }, { status: 422 });
    }
    if (!ai.is_hiring_poster || !ai.readable) {
      return NextResponse.json({ error: 'This does not look like a readable hiring poster', ai }, { status: 422 });
    }

    // 2) Upload image to Storage via service-role (bypasses RLS)
    const admin = getSupabaseAdmin();
    const ext = mime.split('/')[1] || 'jpg';
    const path = `${user.id}/${randomUUID()}.${ext}`;
    const { error: upErr } = await admin.storage.from('job-posters').upload(path, buf, {
      contentType: mime,
      upsert: false,
    });
    if (upErr) return NextResponse.json({ error: 'Storage upload failed: ' + upErr.message }, { status: 500 });

    const { data: pub } = admin.storage.from('job-posters').getPublicUrl(path);
    const posterUrl = pub.publicUrl;

    // 3) Insert vacancy
    const insertRow = {
      owner_id: user.id,
      title: (overrides.title || ai.title || 'Hiring').toString().slice(0, 160),
      business_name: overrides.business_name ?? ai.business_name,
      description: (overrides.description ?? ai.description ?? '').toString().slice(0, 500),
      contact: overrides.contact ?? ai.contact,
      category: overrides.category || ai.category || 'other',
      poster_url: posterUrl,
      poster_path: path,
      lat,
      lng,
      postcode,
      town,
      status: 'active',
      ai_confidence: ai.confidence ?? null,
      ai_raw: ai,
    };
    const { data: inserted, error: insErr } = await admin
      .from('vacancies')
      .insert(insertRow)
      .select('*')
      .single();
    if (insErr) return NextResponse.json({ error: 'DB insert failed: ' + insErr.message }, { status: 500 });

    // 4) bump contribution count (best-effort)
    await admin.rpc('increment_contribution', { p_user: user.id }).catch(() => {});

    return NextResponse.json({ ok: true, job: inserted, ai });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 });
  }
}
