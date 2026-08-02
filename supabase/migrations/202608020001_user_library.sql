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

create table if not exists public.user_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  username_normalized text not null unique,
  created_at timestamptz not null default now(),
  constraint user_accounts_username_length check (char_length(username) between 3 and 24),
  constraint user_accounts_username_normalized check (
    username_normalized = lower(username_normalized)
    and username_normalized ~ '^[a-z0-9_]+$'
  )
);

alter table public.user_accounts enable row level security;

revoke all on table public.user_accounts from anon;
revoke all on table public.user_accounts from authenticated;
grant select on table public.user_accounts to authenticated;
grant all on table public.user_accounts to service_role;

drop policy if exists "Users can read their own account" on public.user_accounts;
create policy "Users can read their own account"
  on public.user_accounts
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create table if not exists public.user_recovery_codes (
  user_id uuid not null references auth.users(id) on delete cascade,
  code_salt text not null,
  code_hash text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, code_hash)
);

alter table public.user_recovery_codes enable row level security;

revoke all on table public.user_recovery_codes from anon;
revoke all on table public.user_recovery_codes from authenticated;
grant all on table public.user_recovery_codes to service_role;

create table if not exists public.auth_rate_limits (
  rate_key text primary key,
  window_started_at timestamptz not null,
  attempts integer not null check (attempts > 0),
  updated_at timestamptz not null default now()
);

alter table public.auth_rate_limits enable row level security;

revoke all on table public.auth_rate_limits from anon;
revoke all on table public.auth_rate_limits from authenticated;
grant all on table public.auth_rate_limits to service_role;

create or replace function public.consume_auth_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_attempts integer;
begin
  if p_key is null
    or char_length(p_key) < 16
    or char_length(p_key) > 180
    or p_limit < 1
    or p_limit > 1000
    or p_window_seconds < 10
    or p_window_seconds > 86400
  then
    return false;
  end if;

  insert into public.auth_rate_limits (rate_key, window_started_at, attempts, updated_at)
  values (p_key, now(), 1, now())
  on conflict (rate_key) do update
  set
    attempts = case
      when public.auth_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds)
        then 1
      else public.auth_rate_limits.attempts + 1
    end,
    window_started_at = case
      when public.auth_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds)
        then now()
      else public.auth_rate_limits.window_started_at
    end,
    updated_at = now()
  returning attempts into current_attempts;

  return current_attempts <= p_limit;
end;
$$;

revoke all on function public.consume_auth_rate_limit(text, integer, integer) from public;
revoke all on function public.consume_auth_rate_limit(text, integer, integer) from anon;
revoke all on function public.consume_auth_rate_limit(text, integer, integer) from authenticated;
grant execute on function public.consume_auth_rate_limit(text, integer, integer) to service_role;

create or replace function public.consume_recovery_code(
  p_user_id uuid,
  p_code_hash text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.user_recovery_codes
  where user_id = p_user_id and code_hash = p_code_hash;
  return found;
end;
$$;

revoke all on function public.consume_recovery_code(uuid, text) from public;
revoke all on function public.consume_recovery_code(uuid, text) from anon;
revoke all on function public.consume_recovery_code(uuid, text) from authenticated;
grant execute on function public.consume_recovery_code(uuid, text) to service_role;
