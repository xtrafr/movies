create table if not exists public.user_library (
  user_id uuid not null references auth.users(id) on delete cascade,
  media_type text not null check (media_type in ('movie', 'tv')),
  media_id bigint not null,
  metadata jsonb not null default '{}'::jsonb,
  saved boolean not null default false,
  progress real not null default 0 check (progress >= 0 and progress <= 100),
  season integer check (season is null or season > 0),
  episode integer check (episode is null or episode > 0),
  watched_seconds integer not null default 0 check (watched_seconds >= 0),
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  saved_at timestamptz,
  last_watched_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, media_type, media_id)
);

create index if not exists user_library_saved_idx
  on public.user_library (user_id, saved, saved_at desc);

create index if not exists user_library_history_idx
  on public.user_library (user_id, last_watched_at desc)
  where last_watched_at is not null;

alter table public.user_library enable row level security;

revoke all on table public.user_library from anon;
revoke all on table public.user_library from authenticated;
grant select, insert, update, delete on table public.user_library to authenticated;

drop policy if exists "Users can read their own library" on public.user_library;
create policy "Users can read their own library"
  on public.user_library
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can add to their own library" on public.user_library;
create policy "Users can add to their own library"
  on public.user_library
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own library" on public.user_library;
create policy "Users can update their own library"
  on public.user_library
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete from their own library" on public.user_library;
create policy "Users can delete from their own library"
  on public.user_library
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  auto_next boolean not null default true,
  subtitle_language text not null default 'en',
  preferred_quality text not null default 'auto'
    check (preferred_quality in ('auto', '1080', '720', '480')),
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

revoke all on table public.user_preferences from anon;
revoke all on table public.user_preferences from authenticated;
grant select, insert, update, delete on table public.user_preferences to authenticated;

drop policy if exists "Users can read their own preferences" on public.user_preferences;
create policy "Users can read their own preferences"
  on public.user_preferences
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can add their own preferences" on public.user_preferences;
create policy "Users can add their own preferences"
  on public.user_preferences
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own preferences" on public.user_preferences;
create policy "Users can update their own preferences"
  on public.user_preferences
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own preferences" on public.user_preferences;
create policy "Users can delete their own preferences"
  on public.user_preferences
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
