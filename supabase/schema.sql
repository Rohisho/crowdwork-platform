-- ============================================================
-- Spotted Jobs — Supabase Schema (run once in SQL Editor)
-- ============================================================

create extension if not exists pgcrypto;
create extension if not exists postgis with schema extensions;

-- ---------- Enums ----------
do $$ begin
  create type job_status as enum ('active','expired','rejected','pending');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_role as enum ('user','admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type vote_kind as enum ('still_active','gone');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_reason as enum ('spam','fake','inappropriate','duplicate','other');
exception when duplicate_object then null; end $$;

-- ---------- Profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  role user_role not null default 'user',
  trust_score integer not null default 0,
  contribution_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- Categories ----------
create table if not exists public.categories (
  slug text primary key,
  label text not null,
  color text not null,
  icon text not null default 'briefcase'
);

insert into public.categories (slug, label, color, icon) values
  ('hospitality','Hospitality','#f97316','utensils'),
  ('retail','Retail','#8b5cf6','shopping-bag'),
  ('warehouse','Warehouse','#0ea5e9','package'),
  ('beauty','Beauty','#ec4899','sparkles'),
  ('office','Office','#10b981','briefcase'),
  ('other','Other','#64748b','tag')
on conflict (slug) do nothing;

-- ---------- Vacancies (jobs) ----------
create table if not exists public.vacancies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  business_name text,
  description text,
  contact text,
  category text not null references public.categories(slug) default 'other',
  poster_url text not null,
  poster_path text not null,
  lat double precision not null,
  lng double precision not null,
  location geography(point, 4326),
  postcode text,
  town text,
  status job_status not null default 'active',
  ai_confidence numeric(3,2),
  ai_raw jsonb,
  active_votes integer not null default 0,
  gone_votes integer not null default 0,
  report_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '10 days')
);

create or replace function public.set_vacancy_location()
returns trigger language plpgsql as $$
begin
  if new.lat is not null and new.lng is not null then
    new.location := st_setsrid(st_makepoint(new.lng, new.lat), 4326)::geography;
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_set_vacancy_location on public.vacancies;
create trigger trg_set_vacancy_location
  before insert or update on public.vacancies
  for each row execute function public.set_vacancy_location();

create index if not exists vacancies_location_gix on public.vacancies using gist (location);
create index if not exists vacancies_created_at_idx on public.vacancies (created_at desc);
create index if not exists vacancies_status_idx on public.vacancies (status);
create index if not exists vacancies_expires_at_idx on public.vacancies (expires_at);
create index if not exists vacancies_category_idx on public.vacancies (category);

-- ---------- Votes ----------
create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  vacancy_id uuid not null references public.vacancies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind vote_kind not null,
  created_at timestamptz not null default now(),
  unique (vacancy_id, user_id)
);

-- ---------- Bookmarks ----------
create table if not exists public.bookmarks (
  user_id uuid not null references auth.users(id) on delete cascade,
  vacancy_id uuid not null references public.vacancies(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, vacancy_id)
);

-- ---------- Reports ----------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  vacancy_id uuid not null references public.vacancies(id) on delete cascade,
  reporter_id uuid references auth.users(id) on delete set null,
  reason report_reason not null,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------- Audit Logs ----------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  target_table text,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles    enable row level security;
alter table public.vacancies   enable row level security;
alter table public.votes       enable row level security;
alter table public.bookmarks   enable row level security;
alter table public.reports     enable row level security;
alter table public.categories  enable row level security;

-- Profiles
drop policy if exists "profiles readable" on public.profiles;
create policy "profiles readable" on public.profiles for select using (true);
drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Categories (read only for everyone)
drop policy if exists "categories readable" on public.categories;
create policy "categories readable" on public.categories for select using (true);

-- Vacancies
drop policy if exists "vacancies public read" on public.vacancies;
create policy "vacancies public read" on public.vacancies for select using (status = 'active' or auth.uid() = owner_id);
drop policy if exists "vacancies auth insert" on public.vacancies;
create policy "vacancies auth insert" on public.vacancies for insert to authenticated with check (auth.uid() = owner_id);
drop policy if exists "vacancies owner update" on public.vacancies;
create policy "vacancies owner update" on public.vacancies for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
drop policy if exists "vacancies owner delete" on public.vacancies;
create policy "vacancies owner delete" on public.vacancies for delete to authenticated using (auth.uid() = owner_id);

-- Votes
drop policy if exists "votes read" on public.votes;
create policy "votes read" on public.votes for select using (true);
drop policy if exists "votes insert" on public.votes;
create policy "votes insert" on public.votes for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "votes update" on public.votes;
create policy "votes update" on public.votes for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "votes delete" on public.votes;
create policy "votes delete" on public.votes for delete to authenticated using (auth.uid() = user_id);

-- Bookmarks
drop policy if exists "bookmarks self read" on public.bookmarks;
create policy "bookmarks self read" on public.bookmarks for select to authenticated using (auth.uid() = user_id);
drop policy if exists "bookmarks self write" on public.bookmarks;
create policy "bookmarks self write" on public.bookmarks for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "bookmarks self delete" on public.bookmarks;
create policy "bookmarks self delete" on public.bookmarks for delete to authenticated using (auth.uid() = user_id);

-- Reports
drop policy if exists "reports insert" on public.reports;
create policy "reports insert" on public.reports for insert to authenticated with check (auth.uid() = reporter_id);
drop policy if exists "reports read own" on public.reports;
create policy "reports read own" on public.reports for select to authenticated using (auth.uid() = reporter_id);

-- ============================================================
-- RPC: jobs_within_radius
-- ============================================================
create or replace function public.jobs_within_radius(
  in_lat double precision,
  in_lng double precision,
  radius_m integer default 5000,
  in_category text default null,
  in_limit integer default 200
)
returns table (
  id uuid,
  title text,
  business_name text,
  description text,
  contact text,
  category text,
  poster_url text,
  lat double precision,
  lng double precision,
  postcode text,
  town text,
  status job_status,
  active_votes integer,
  gone_votes integer,
  created_at timestamptz,
  expires_at timestamptz,
  distance_m double precision
)
language sql stable as $$
  select v.id, v.title, v.business_name, v.description, v.contact, v.category, v.poster_url,
         v.lat, v.lng, v.postcode, v.town, v.status, v.active_votes, v.gone_votes,
         v.created_at, v.expires_at,
         st_distance(v.location, st_setsrid(st_makepoint(in_lng, in_lat), 4326)::geography) as distance_m
  from public.vacancies v
  where v.status = 'active'
    and (in_category is null or v.category = in_category)
    and st_dwithin(v.location, st_setsrid(st_makepoint(in_lng, in_lat), 4326)::geography, radius_m)
  order by v.created_at desc
  limit in_limit;
$$;

grant execute on function public.jobs_within_radius(double precision, double precision, integer, text, integer) to anon, authenticated;

-- ============================================================
-- Storage bucket for posters
-- ============================================================
insert into storage.buckets (id, name, public)
values ('job-posters', 'job-posters', true)
on conflict (id) do nothing;

drop policy if exists "posters public read" on storage.objects;
create policy "posters public read" on storage.objects for select using (bucket_id = 'job-posters');

drop policy if exists "posters auth insert" on storage.objects;
create policy "posters auth insert" on storage.objects for insert to authenticated with check (bucket_id = 'job-posters');

drop policy if exists "posters owner update" on storage.objects;
create policy "posters owner update" on storage.objects for update to authenticated using (bucket_id = 'job-posters' and owner = auth.uid()) with check (bucket_id = 'job-posters' and owner = auth.uid());

drop policy if exists "posters owner delete" on storage.objects;
create policy "posters owner delete" on storage.objects for delete to authenticated using (bucket_id = 'job-posters' and owner = auth.uid());

-- ============================================================
-- Convenience RPCs (best-effort counters)
-- ============================================================
create or replace function public.increment_contribution(p_user uuid)
returns void language sql as $$
  update public.profiles set contribution_count = contribution_count + 1 where id = p_user;
$$;

create or replace function public.increment_report_count(p_vacancy uuid)
returns void language sql as $$
  update public.vacancies set report_count = report_count + 1 where id = p_vacancy;
$$;

grant execute on function public.increment_contribution(uuid) to authenticated, service_role;
grant execute on function public.increment_report_count(uuid) to authenticated, service_role;

-- ============================================================
-- Realtime publication
-- ============================================================
alter publication supabase_realtime add table public.vacancies;
