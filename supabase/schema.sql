-- Friday Night Blitz: accounts, cloud saves, activity tracking and the admin area.
-- Paste this whole file into Supabase > SQL Editor > New query and press Run.
-- It is safe to run again later (it only creates what is missing and replaces functions).
--
-- Before you run it: change YOUR-EMAIL@example.com at the very bottom to the email you'll sign in with.
-- That makes you the admin.

-- ---------- tables ----------
create table if not exists public.admins (
  email text primary key
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  coach_name text,
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  banned boolean not null default false,
  reset_at timestamptz
);

create table if not exists public.saves (
  user_id uuid not null references auth.users (id) on delete cascade,
  slot int not null check (slot between 0 and 2),
  data text not null check (length(data) < 4000000),
  summary jsonb,
  ts bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, slot)
);

create table if not exists public.events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid references auth.users (id) on delete set null,
  anon_id text check (anon_id is null or length(anon_id) <= 40),
  kind text not null check (length(kind) <= 24),
  detail jsonb check (detail is null or length(detail::text) <= 2000)
);
create index if not exists events_created_idx on public.events (created_at);
create index if not exists events_user_idx on public.events (user_id, created_at);

create table if not exists public.league (
  id int primary key default 1 check (id = 1),
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text
);

-- ---------- helpers ----------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

create or replace function public.is_banned() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select banned from public.profiles where id = auth.uid()), false);
$$;

-- every new sign-up gets a profile row
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email) on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
insert into public.profiles (id, email) select id, email from auth.users on conflict (id) do nothing;

-- ---------- row level security ----------
alter table public.admins enable row level security;
alter table public.profiles enable row level security;
alter table public.saves enable row level security;
alter table public.events enable row level security;
alter table public.league enable row level security;

drop policy if exists "admins: admin read" on public.admins;
create policy "admins: admin read" on public.admins for select using (public.is_admin());

drop policy if exists "profiles: own or admin read" on public.profiles;
create policy "profiles: own or admin read" on public.profiles for select using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles: admin update" on public.profiles;
create policy "profiles: admin update" on public.profiles for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "saves: own or admin read" on public.saves;
create policy "saves: own or admin read" on public.saves for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "saves: own insert" on public.saves;
create policy "saves: own insert" on public.saves for insert with check (user_id = auth.uid() and not public.is_banned());
drop policy if exists "saves: own update" on public.saves;
create policy "saves: own update" on public.saves for update using (user_id = auth.uid() and not public.is_banned()) with check (user_id = auth.uid());
drop policy if exists "saves: own or admin delete" on public.saves;
create policy "saves: own or admin delete" on public.saves for delete using ((user_id = auth.uid() and not public.is_banned()) or public.is_admin());

drop policy if exists "events: anyone insert" on public.events;
create policy "events: anyone insert" on public.events for insert to anon, authenticated with check (user_id is null or user_id = auth.uid());
drop policy if exists "events: admin read" on public.events;
create policy "events: admin read" on public.events for select using (public.is_admin());
drop policy if exists "events: admin delete" on public.events;
create policy "events: admin delete" on public.events for delete using (public.is_admin());

drop policy if exists "league: public read" on public.league;
create policy "league: public read" on public.league for select using (true);
drop policy if exists "league: admin insert" on public.league;
create policy "league: admin insert" on public.league for insert with check (public.is_admin());
drop policy if exists "league: admin update" on public.league;
create policy "league: admin update" on public.league for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "league: admin delete" on public.league;
create policy "league: admin delete" on public.league for delete using (public.is_admin());

grant usage on schema public to anon, authenticated;
grant select on public.league to anon, authenticated;
grant insert on public.events to anon, authenticated;
grant select, delete on public.events to authenticated;
grant select, insert, update, delete on public.saves to authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.admins to authenticated;
grant insert, update, delete on public.league to authenticated;

-- ---------- player RPCs ----------
-- called when a signed-in player opens the game: updates last seen, returns their status
create or replace function public.touch(p_coach text default null) returns json
language plpgsql security definer set search_path = public as $$
declare r public.profiles;
begin
  if auth.uid() is null then return json_build_object('ok', false); end if;
  insert into public.profiles (id, email) values (auth.uid(), auth.jwt() ->> 'email') on conflict (id) do nothing;
  update public.profiles set last_seen = now(), coach_name = coalesce(nullif(left(p_coach, 40), ''), coach_name) where id = auth.uid() returning * into r;
  return json_build_object('ok', true, 'banned', r.banned, 'admin', public.is_admin(),
    'reset_at', case when r.reset_at is null then 0 else floor(extract(epoch from r.reset_at) * 1000) end);
end; $$;

-- ---------- admin RPCs (all refuse unless the caller is an admin) ----------
create or replace function public.admin_users() returns table (
  id uuid, email text, coach_name text, created_at timestamptz, last_seen timestamptz, banned boolean,
  saves jsonb, games bigint, games_7d bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  return query
    select p.id, p.email, p.coach_name, p.created_at, p.last_seen, p.banned,
      coalesce((select jsonb_agg(jsonb_build_object('slot', s.slot, 'summary', s.summary, 'updated_at', s.updated_at) order by s.slot) from public.saves s where s.user_id = p.id), '[]'::jsonb),
      (select count(*) from public.events e where e.user_id = p.id and e.kind = 'game'),
      (select count(*) from public.events e where e.user_id = p.id and e.kind = 'game' and e.created_at > now() - interval '7 days')
    from public.profiles p order by p.last_seen desc;
end; $$;

create or replace function public.admin_totals() returns json
language plpgsql stable security definer set search_path = public as $$
declare tz text := 'America/Chicago'; today date := (now() at time zone tz)::date;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  return json_build_object(
    'accounts', (select count(*) from public.profiles),
    'banned', (select count(*) from public.profiles where banned),
    'new_7d', (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'players_today', (select count(distinct coalesce(user_id::text, anon_id)) from public.events where (created_at at time zone tz)::date = today),
    'players_7d', (select count(distinct coalesce(user_id::text, anon_id)) from public.events where created_at > now() - interval '7 days'),
    'players_30d', (select count(distinct coalesce(user_id::text, anon_id)) from public.events where created_at > now() - interval '30 days'),
    'guests_30d', (select count(distinct anon_id) from public.events where user_id is null and created_at > now() - interval '30 days'),
    'games_7d', (select count(*) from public.events where kind = 'game' and created_at > now() - interval '7 days'),
    'games_all', (select count(*) from public.events where kind = 'game'),
    'seasons_all', (select count(*) from public.events where kind = 'season'),
    'cloud_saves', (select count(*) from public.saves)
  );
end; $$;

create or replace function public.admin_daily(p_days int default 30) returns table (
  day date, players bigint, signed_in bigint, games bigint, franchise bigint, quick bigint, played bigint, watched bigint, simmed bigint, signups bigint)
language plpgsql stable security definer set search_path = public as $$
declare tz text := 'America/Chicago';
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  return query
    with d as (select generate_series((now() at time zone tz)::date - (greatest(1, least(p_days, 365)) - 1), (now() at time zone tz)::date, interval '1 day')::date as day),
    e as (select (ev.created_at at time zone tz)::date as day, ev.user_id, ev.anon_id, ev.kind, ev.detail from public.events ev
          where ev.created_at > now() - make_interval(days => greatest(1, least(p_days, 365)) + 1))
    select d.day,
      (select count(distinct coalesce(e.user_id::text, e.anon_id)) from e where e.day = d.day),
      (select count(distinct e.user_id) from e where e.day = d.day and e.user_id is not null),
      (select count(*) from e where e.day = d.day and e.kind = 'game'),
      (select count(*) from e where e.day = d.day and e.kind = 'game' and e.detail ->> 'mode' = 'franchise'),
      (select count(*) from e where e.day = d.day and e.kind = 'game' and e.detail ->> 'mode' = 'quick'),
      (select count(*) from e where e.day = d.day and e.kind = 'game' and e.detail ->> 'how' = 'play'),
      (select count(*) from e where e.day = d.day and e.kind = 'game' and e.detail ->> 'how' = 'watch'),
      (select count(*) from e where e.day = d.day and e.kind = 'game' and e.detail ->> 'how' = 'sim'),
      (select count(*) from public.profiles p where (p.created_at at time zone tz)::date = d.day)
    from d order by d.day;
end; $$;

create or replace function public.admin_user_events(p_user uuid, p_limit int default 50) returns table (created_at timestamptz, kind text, detail jsonb)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  return query select e.created_at, e.kind, e.detail from public.events e where e.user_id = p_user order by e.created_at desc limit least(p_limit, 500);
end; $$;

create or replace function public.admin_set_ban(p_user uuid, p_banned boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  update public.profiles set banned = p_banned where id = p_user;
end; $$;

create or replace function public.admin_reset(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  delete from public.saves where user_id = p_user;
  update public.profiles set reset_at = now() where id = p_user;
end; $$;

revoke all on function public.admin_users() from public, anon;
revoke all on function public.admin_totals() from public, anon;
revoke all on function public.admin_daily(int) from public, anon;
revoke all on function public.admin_user_events(uuid, int) from public, anon;
revoke all on function public.admin_set_ban(uuid, boolean) from public, anon;
revoke all on function public.admin_reset(uuid) from public, anon;
revoke all on function public.touch(text) from public, anon;
grant execute on function public.admin_users(), public.admin_totals(), public.admin_daily(int), public.admin_user_events(uuid, int),
  public.admin_set_ban(uuid, boolean), public.admin_reset(uuid), public.touch(text) to authenticated;

-- ---------- admin ----------
-- Change this to your email. Add more lines to make more admins.
insert into public.admins (email) values ('YOUR-EMAIL@example.com') on conflict do nothing;
