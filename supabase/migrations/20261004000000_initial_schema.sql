-- samasaya: initial schema
-- Run once in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
--
-- Access model
--   student  : sees every grievance on the public board (their own included);
--              authors of anonymous grievances are hidden from them.
--   resolver : sees only grievances whose category matches their department;
--              authors of anonymous grievances are hidden from them.
--   admin    : sees everything, including who filed anonymous grievances.
--
-- How author_id stays hidden
--   Row-level security decides which ROWS a user can read, but it can't hide a
--   single column. So signed-in users get no SELECT privilege on
--   grievances.author_id at all, and the app reads grievances through the
--   grievance_board view, which returns author_id/author_name only when the
--   viewer is allowed to see them.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.user_role as enum ('student', 'resolver', 'admin');

create type public.grievance_category as enum (
  'Hostel',
  'Mess',
  'IT',
  'PGP Office',
  'Sports',
  'Clubs & Committees'
);

create type public.grievance_status as enum (
  'Submitted',
  'Acknowledged',
  'In progress',
  'Resolved'
);

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- One row per signed-in person, created automatically on first sign-in.
-- A resolver's department is the grievance category they handle.
create table public.users (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null unique,
  name       text,
  role       public.user_role not null default 'student',
  department public.grievance_category,
  constraint resolver_has_department
    check (role <> 'resolver' or department is not null)
);

create table public.grievances (
  id           uuid primary key default gen_random_uuid(),
  author_id    uuid not null default auth.uid()
               references public.users (id) on delete cascade,
  category     public.grievance_category not null,
  title        text not null check (char_length(title) between 5 and 150),
  description  text not null check (char_length(description) between 10 and 5000),
  is_anonymous boolean not null default false,
  status       public.grievance_status not null default 'Submitted',
  created_at   timestamptz not null default now()
);

create index grievances_category_created_at_idx
  on public.grievances (category, created_at desc);
create index grievances_author_id_idx on public.grievances (author_id);

create table public.upvotes (
  user_id      uuid not null default auth.uid()
               references public.users (id) on delete cascade,
  grievance_id uuid not null references public.grievances (id) on delete cascade,
  constraint upvotes_user_grievance_unique unique (user_id, grievance_id)
);

create index upvotes_grievance_id_idx on public.upvotes (grievance_id);

create table public.status_updates (
  id           bigint generated always as identity primary key,
  grievance_id uuid not null references public.grievances (id) on delete cascade,
  updated_by   uuid references public.users (id) on delete set null,
  old_status   public.grievance_status not null,
  new_status   public.grievance_status not null,
  comment      text,
  created_at   timestamptz not null default now()
);

create index status_updates_grievance_id_idx
  on public.status_updates (grievance_id, created_at);

-- ---------------------------------------------------------------------------
-- Helpers (in a schema the Supabase API doesn't expose)
-- ---------------------------------------------------------------------------

create schema if not exists private;
grant usage on schema private to authenticated;

-- Security definer so policies can read the caller's role without tripping
-- over the RLS on public.users itself.
create function private.user_role()
returns public.user_role
language sql stable security definer set search_path = ''
as $$
  select role from public.users where id = auth.uid()
$$;

create function private.user_department()
returns public.grievance_category
language sql stable security definer set search_path = ''
as $$
  select department from public.users where id = auth.uid()
$$;

revoke execute on function private.user_role(), private.user_department() from public;
grant execute on function private.user_role(), private.user_department() to authenticated;

-- Create a public.users row when someone signs in for the first time.
-- Non-IIML accounts get no row, so every policy below denies them.
create function private.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if lower(new.email) like '%@iiml.ac.in' then
    insert into public.users (id, email, name)
    values (
      new.id,
      lower(new.email),
      coalesce(
        new.raw_user_meta_data ->> 'full_name',
        new.raw_user_meta_data ->> 'name',
        split_part(new.email, '@', 1)
      )
    )
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Backfill anyone who already signed in before this migration ran.
insert into public.users (id, email, name)
select
  id,
  lower(email),
  coalesce(
    raw_user_meta_data ->> 'full_name',
    raw_user_meta_data ->> 'name',
    split_part(email, '@', 1)
  )
from auth.users
where lower(email) like '%@iiml.ac.in'
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Privileges
-- Supabase grants everything on new tables to anon/authenticated by default,
-- so start from nothing and grant back only what the app needs.
-- ---------------------------------------------------------------------------

revoke all on public.users, public.grievances, public.upvotes, public.status_updates
  from anon, authenticated;

grant select on public.users to authenticated;
grant update (name) on public.users to authenticated;

-- Every column except author_id.
grant select (id, category, title, description, is_anonymous, status, created_at)
  on public.grievances to authenticated;
-- author_id and status come from their defaults (the caller, 'Submitted').
grant insert (category, title, description, is_anonymous)
  on public.grievances to authenticated;

grant select, delete on public.upvotes to authenticated;
grant insert (grievance_id) on public.upvotes to authenticated;

-- Status changes only go through update_grievance_status() below.
grant select on public.status_updates to authenticated;

-- ---------------------------------------------------------------------------
-- Row-level security
-- (select private.x()) is evaluated once per query instead of once per row.
-- ---------------------------------------------------------------------------

alter table public.users enable row level security;
alter table public.grievances enable row level security;
alter table public.upvotes enable row level security;
alter table public.status_updates enable row level security;

-- users
create policy "Users read their own profile; admins read all"
  on public.users for select to authenticated
  using (id = (select auth.uid()) or (select private.user_role()) = 'admin');

create policy "Users update their own name"
  on public.users for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- grievances
create policy "Students and admins see all; resolvers see their department"
  on public.grievances for select to authenticated
  using (
    (select private.user_role()) in ('student', 'admin')
    or (
      (select private.user_role()) = 'resolver'
      and category = (select private.user_department())
    )
  );

create policy "Students file grievances as themselves"
  on public.grievances for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and status = 'Submitted'
    and (select private.user_role()) = 'student'
  );

-- upvotes
create policy "Users see their own upvotes"
  on public.upvotes for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users upvote grievances they can see"
  on public.upvotes for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.grievances g where g.id = grievance_id)
  );

create policy "Users remove their own upvotes"
  on public.upvotes for delete to authenticated
  using (user_id = (select auth.uid()));

-- status_updates: visible whenever the grievance itself is visible.
create policy "Status history follows grievance visibility"
  on public.status_updates for select to authenticated
  using (exists (select 1 from public.grievances g where g.id = grievance_id));

-- ---------------------------------------------------------------------------
-- grievance_board: what the app reads
-- Runs with the view owner's rights (so it can read author_id), and applies
-- the same visibility rule as the grievances policy in its WHERE clause.
-- ---------------------------------------------------------------------------

create view public.grievance_board
with (security_barrier = true)
as
select
  g.id,
  g.category,
  g.title,
  g.description,
  g.is_anonymous,
  g.status,
  g.created_at,
  case when author_visible then g.author_id end as author_id,
  case when author_visible then u.name end      as author_name,
  g.author_id = auth.uid()                       as is_mine,
  (select count(*) from public.upvotes v where v.grievance_id = g.id)::int
                                                 as upvote_count,
  exists (
    select 1 from public.upvotes v
    where v.grievance_id = g.id and v.user_id = auth.uid()
  )                                              as has_upvoted
from public.grievances g
join public.users u on u.id = g.author_id
cross join lateral (
  select
    not g.is_anonymous
    or g.author_id = auth.uid()
    or private.user_role() = 'admin' as author_visible
) a
where
  private.user_role() in ('student', 'admin')
  or (
    private.user_role() = 'resolver'
    and g.category = private.user_department()
  );

revoke all on public.grievance_board from anon, authenticated;
grant select on public.grievance_board to authenticated;

-- ---------------------------------------------------------------------------
-- update_grievance_status: the only way to change a grievance's status.
-- Updates the grievance and records the change in status_updates together.
-- ---------------------------------------------------------------------------

create function public.update_grievance_status(
  p_grievance_id uuid,
  p_new_status   public.grievance_status,
  p_comment      text default null
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_role       public.user_role;
  v_department public.grievance_category;
  v_category   public.grievance_category;
  v_old_status public.grievance_status;
begin
  select role, department into v_role, v_department
  from public.users where id = auth.uid();

  if v_role is null or v_role = 'student' then
    raise exception 'Only resolvers and admins can change a grievance''s status'
      using errcode = '42501';
  end if;

  select category, status into v_category, v_old_status
  from public.grievances where id = p_grievance_id
  for update;

  if not found then
    raise exception 'Grievance not found' using errcode = 'P0002';
  end if;

  if v_role = 'resolver' and v_category is distinct from v_department then
    raise exception 'This grievance belongs to another department'
      using errcode = '42501';
  end if;

  if v_old_status = p_new_status then
    raise exception 'Grievance is already %', p_new_status
      using errcode = '22023';
  end if;

  update public.grievances set status = p_new_status where id = p_grievance_id;

  insert into public.status_updates
    (grievance_id, updated_by, old_status, new_status, comment)
  values
    (p_grievance_id, auth.uid(), v_old_status, p_new_status, nullif(trim(p_comment), ''));
end;
$$;

revoke execute on function public.update_grievance_status(uuid, public.grievance_status, text)
  from public, anon;
grant execute on function public.update_grievance_status(uuid, public.grievance_status, text)
  to authenticated;
