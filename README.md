# Spotted Jobs

Hyperlocal, crowdsourced job discovery. Users snap photos of “We’re Hiring” posters they see in shop windows; the app auto-extracts job details with AI and plots them on a live map for nearby seekers.

## Tech

- **Next.js 15** (App Router) + TypeScript-ready JS
- **Supabase** (Postgres + PostGIS + Auth + Storage + Realtime + RLS)
- **OpenAI GPT-4o Vision** (via Emergent Universal LLM key) — OCR + moderation + structured extraction
- **Mapbox GL** — map, clustering, markers, geolocation
- **shadcn/ui + Tailwind** — mobile-first UI, warm-orange design system
- **Framer Motion** — micro-interactions
- **PostHog** — analytics (EU cloud)
- **Resend** — email notifications (weekly digest — iter 2)

## Environment variables (`/app/.env`)

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...       # server only
NEXT_PUBLIC_MAPBOX_TOKEN=...
EMERGENT_LLM_KEY=sk-emergent-...    # for OpenAI vision
OPENAI_API_KEY=sk-emergent-...
OPENAI_BASE_URL=https://integrations.emergentagent.com/llm
RESEND_API_KEY=re_...
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```

## Supabase one-time setup

1. Open the SQL editor: <https://supabase.com/dashboard/project/gbpxiyvuvkyrxtujxqwf/sql/new>
2. Paste the contents of `/app/supabase/schema.sql` and click **Run**.
3. Go to **Authentication › URL Configuration** and add:
   - Site URL: `https://<your-preview>.preview.emergentagent.com`
   - Redirect URLs: `https://<your-preview>.preview.emergentagent.com/auth/callback` and `…/auth/confirm`
4. Optional — Google OAuth: enable Google in **Auth › Providers** with a Google Cloud Web client.

## API surface

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Env sanity |
| GET | `/api/jobs?lat&lng&radius_m&category` | Nearby jobs via PostGIS |
| POST | `/api/jobs/upload` (multipart) | Image + lat/lng → AI extract → store → insert |
| POST | `/api/jobs/:id/vote` | `{ kind: 'still_active' \| 'gone' }` |
| POST/DELETE | `/api/jobs/:id/bookmark` | Save / un-save |
| POST | `/api/jobs/:id/report` | Report spam / fake |
| GET | `/api/me` | Session + profile |

## Architecture

```
User (mobile)
  ↓ camera / gallery
Spotted Jobs client (Next.js)
  ↓ multipart w/ GPS
/api/jobs/upload (Node runtime)
  ↓ base64 data URL
OpenAI Vision (moderation + OCR + JSON extraction)
  ↓ safe & readable
Supabase Storage (job-posters bucket)  ←  service role
Supabase Postgres (vacancies + PostGIS point)  ←  service role
  ↓ Realtime INSERT
All live clients receive the new job on the map.
```

## Roadmap (post-MVP)

1. Admin dashboard (`/admin`) with moderation queue + user management
2. Auto-expiry cron (Supabase Edge Function daily) marking `status='expired'` after 10 days
3. Weekly digest email via Resend + nearby-jobs SQL
4. PWA installable + offline caching (Workbox)
5. Cluster markers with Mapbox source layer
6. Trust score algorithm (contributions × quality × vote agreement)
7. Business claim flow — verified employer badge
