-- samasaya: resolver dashboard and admin "View as"
-- Run in the Supabase SQL Editor after 20261005000000_filing_grievances.sql.
--
-- Adds:
--   - "View as" for admins: an admin can act as a student, a resolver for any
--     department, or an admin. Every policy, the board view and
--     update_grievance_status() follow the chosen view, so it is enforced in
--     the database, not just hidden in the UI. Only real admins can switch.
--   - status_update_log: status history with the name of who made each change

-- ---------------------------------------------------------------------------
-- View as
-- ---------------------------------------------------------------------------

alter table public.users
  add column view_as_role       public.user_role,
  add column view_as_department public.grievance_category,
  add constraint view_as_resolver_has_department
    check (view_as_role is distinct from 'resolver' or view_as_department is not null);

-- The caller's effective role and department. A real admin who has chosen a
-- view gets that view; everyone else gets their own role. Every policy and
-- function uses these, so the switch applies everywhere at once.
create or replace function private.user_role()
returns public.user_role
language sql stable security definer set search_path = ''
as $$
  select case
    when role = 'admin' and view_as_role is not null then view_as_role
    else role
  end
  from public.users where id = auth.uid()
$$;

create or replace function private.user_department()
returns public.grievance_category
language sql stable security definer set search_path = ''
as $$
  select case
    when role = 'admin' and view_as_role is not null then view_as_department
    else department
  end
  from public.users where id = auth.uid()
$$;

-- Switch view. Checks the REAL role, so an admin viewing as a student can
-- always switch back, and nobody else can switch at all.
create function public.set_view_as(
  p_role       public.user_role,
  p_department public.grievance_category default null
)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Only admins can switch views' using errcode = '42501';
  end if;

  if p_role = 'resolver' and p_department is null then
    raise exception 'Choose a department to view as a resolver'
      using errcode = '22023';
  end if;

  update public.users
  set
    view_as_role       = case when p_role = 'admin' then null else p_role end,
    view_as_department = case when p_role = 'resolver' then p_department end
  where id = auth.uid();
end;
$$;

revoke execute on function public.set_view_as(public.user_role, public.grievance_category)
  from public, anon;
grant execute on function public.set_view_as(public.user_role, public.grievance_category)
  to authenticated;

-- Use the effective role (rather than reading users.role directly) so an
-- admin viewing as a resolver is limited to that department, and one viewing
-- as a student can't change statuses.
create or replace function public.update_grievance_status(
  p_grievance_id uuid,
  p_new_status   public.grievance_status,
  p_comment      text default null
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_role       public.user_role := private.user_role();
  v_department public.grievance_category := private.user_department();
  v_category   public.grievance_category;
  v_old_status public.grievance_status;
begin
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

-- ---------------------------------------------------------------------------
-- status_update_log: status history with who made each change.
-- Same visibility as grievance_board. Reads users.name with the view owner's
-- rights, since resolvers and students can't read other users' profiles.
-- ---------------------------------------------------------------------------

create view public.status_update_log
with (security_barrier = true)
as
select
  s.id,
  s.grievance_id,
  s.old_status,
  s.new_status,
  s.comment,
  s.created_at,
  u.name as updated_by_name
from public.status_updates s
join public.grievances g on g.id = s.grievance_id
left join public.users u on u.id = s.updated_by
where
  private.user_role() in ('student', 'admin')
  or (
    private.user_role() = 'resolver'
    and g.category = private.user_department()
  );

revoke all on public.status_update_log from anon, authenticated;
grant select on public.status_update_log to authenticated;
