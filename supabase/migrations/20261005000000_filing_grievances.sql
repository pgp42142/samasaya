-- samasaya: filing grievances
-- Run in the Supabase SQL Editor after 20261004000000_initial_schema.sql.
--
-- Adds:
--   - a daily limit of 5 grievances per student (IST calendar day)
--   - similar_grievances(), used to suggest upvoting instead of filing a duplicate

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Daily limit
-- ---------------------------------------------------------------------------

create function private.enforce_daily_grievance_limit()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_day_start timestamptz :=
    date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata';
  v_count int;
begin
  -- Inserts made outside a user session (SQL Editor, service role) aren't limited.
  if auth.uid() is null then
    return new;
  end if;

  -- Serialise concurrent submissions from the same person so two requests
  -- can't both slip in as the 5th.
  perform pg_advisory_xact_lock(hashtextextended(new.author_id::text, 0));

  select count(*) into v_count
  from public.grievances
  where author_id = new.author_id
    and created_at >= v_day_start;

  if v_count >= 5 then
    raise exception 'You can file up to 5 grievances a day. Please try again tomorrow.'
      using errcode = 'P0001', hint = 'daily_limit';
  end if;

  return new;
end;
$$;

create trigger grievances_daily_limit
  before insert on public.grievances
  for each row execute function private.enforce_daily_grievance_limit();

-- ---------------------------------------------------------------------------
-- Similar open grievances in a category, best match first.
-- Runs as the caller and reads grievance_board, so it returns only what the
-- caller may see, with anonymous authors already hidden.
-- ---------------------------------------------------------------------------

create function public.similar_grievances(
  p_category public.grievance_category,
  p_title    text
)
returns setof public.grievance_board
language sql stable security invoker set search_path = ''
as $$
  with scored as (
    select
      b,
      greatest(
        extensions.word_similarity(p_title, b.title),
        extensions.similarity(p_title, b.title)
      ) as score
    from public.grievance_board b
    where b.category = p_category
      and b.status <> 'Resolved'
      and char_length(trim(p_title)) >= 4
  ),
  matches as (
    select b, score, max(score) over () as best
    from scored
    where score >= 0.3
  )
  -- Words shared by a whole category (e.g. "hostel") lift every score a
  -- little, so keep only results close to the best match.
  select (b).*
  from matches
  where score >= best * 0.8
  order by score desc, (b).upvote_count desc
  limit 3
$$;

revoke execute on function public.similar_grievances(public.grievance_category, text)
  from public, anon;
grant execute on function public.similar_grievances(public.grievance_category, text)
  to authenticated;
