-- ============================================================
-- DBHS Front Office Kiosk — schema v1  (PLANNING.md §4)
--
-- Targets the EXISTING shared `dbhs-wayfinder` Supabase project, which
-- already serves the interactive map app (rooms/buildings/teachers/
-- announcements, all member-gated via is_school_member()). Everything
-- here is ADDITIVE: new kiosk tables, additive announcement columns,
-- and narrowly-scoped anon read policies for the public kiosk.
-- Existing tables, policies, and the member/admin model are untouched.
-- ============================================================

-- ---------- photos: kiosk-facing metadata for Drive→R2 synced images ----------
create table public.photos (
  id                uuid primary key default gen_random_uuid(),
  drive_file_id     text not null unique,          -- idempotency / reconciliation key
  r2_key_display    text not null,                 -- photos/<drive_file_id>/display.jpg
  r2_key_thumb      text not null,                 -- photos/<drive_file_id>/thumb.jpg
  display_url       text not null,                 -- full public URL (denormalized)
  thumb_url         text not null,
  caption           text,                          -- from Drive file "description"
  width             int,                           -- display-rendition pixel dims
  height            int,
  drive_created_at  timestamptz not null,          -- Drive upload time; sort + retention key
  drive_modified_at timestamptz,                   -- change detection (re-sync on edit)
  synced_at         timestamptz not null default now()
);

create index photos_feed_idx on public.photos (drive_created_at desc);

-- ---------- sync_runs: one row per sync invocation (ops only) ----------
create table public.sync_runs (
  id             bigint generated always as identity primary key,
  started_at     timestamptz not null default now(),
  finished_at    timestamptz,
  status         text not null default 'running'
                   check (status in ('running','success','partial','failed')),
  photos_added   int not null default 0,
  photos_updated int not null default 0,
  photos_deleted int not null default 0,
  skipped        int not null default 0,
  error_detail   text
);

-- ---------- announcements: additive kiosk columns ----------
-- (No CHECK constraint on title length here — the table is shared with the
--  existing app; the kiosk clamps long titles at render time instead.)
alter table public.announcements
  add column if not exists image_url    text,
  add column if not exists is_pinned    boolean not null default false,
  add column if not exists is_active    boolean not null default true,
  add column if not exists published_at timestamptz not null default now(),
  add column if not exists expires_at   timestamptz,
  add column if not exists updated_at   timestamptz not null default now();

-- Backfill: existing rows were "published" when they were created.
update public.announcements set published_at = created_at;

create index announcements_kiosk_feed_idx
  on public.announcements (is_pinned desc, published_at desc)
  where is_active;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists announcements_touch on public.announcements;
create trigger announcements_touch
  before update on public.announcements
  for each row execute function public.touch_updated_at();

-- ---------- Row Level Security (PLANNING §4.3) ----------
alter table public.photos    enable row level security;
alter table public.sync_runs enable row level security;   -- no policies → invisible to kiosk

-- The kiosk reads with the anon/publishable key. Policies are PERMISSIVE and
-- OR-ed, so these anon policies do not change what authenticated school
-- members can already see.
create policy "kiosk reads photos"
  on public.photos for select
  to anon
  using (true);

create policy "kiosk reads live announcements"
  on public.announcements for select
  to anon
  using (
    is_active
    and published_at <= now()
    and (expires_at is null or expires_at > now())
  );

-- Wayfinding data the kiosk map needs (public directory info):
create policy "kiosk reads rooms"
  on public.rooms for select
  to anon
  using (true);

create policy "kiosk reads buildings"
  on public.buildings for select
  to anon
  using (true);

create policy "kiosk reads teachers"
  on public.teachers for select
  to anon
  using (true);

-- Belt and braces on the NEW tables: strip write verbs at the grant level.
-- (Existing tables keep their current grants — their app's admin writes go
--  through the is_announcements_admin() policies.)
revoke insert, update, delete, truncate, references, trigger
  on public.photos, public.sync_runs
  from anon, authenticated;
