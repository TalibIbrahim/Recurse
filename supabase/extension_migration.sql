-- ==============================================================================
-- Recurse: Extension Support Migration
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/nhsbgweplsbiodxbdbcc/sql)
-- ==============================================================================

-- 1. Relax problem_id foreign key on attempts so LeetCode slugs can be stored directly
alter table public.attempts drop constraint if exists attempts_problem_id_fkey;
alter table public.attempts alter column problem_id type text;

-- 2. Allow authenticated & anon access to extension solve logging via SECURITY DEFINER function
create or replace function public.log_extension_solve(
  p_user_id uuid,
  p_problem_slug text,
  p_submission_url text default null,
  p_time_spent integer default null
)
returns json
language plpgsql
security definer
as $$
declare
  v_attempt_id uuid;
  v_today date := current_date;
  v_current_streak integer := 0;
  v_longest_streak integer := 0;
  v_last_active date;
begin
  -- 1. Insert attempt
  insert into public.attempts (
    user_id,
    problem_id,
    status,
    approach_notes,
    submission_url,
    time_spent_min,
    solved_at
  ) values (
    p_user_id,
    p_problem_slug,
    'solved',
    'Logged via Recurse Extension',
    p_submission_url,
    p_time_spent,
    now()
  ) returning id into v_attempt_id;

  -- 2. Update streaks
  select current_streak, longest_streak, last_active_date
  into v_current_streak, v_longest_streak, v_last_active
  from public.streaks
  where user_id = p_user_id;

  if not found then
    insert into public.streaks (user_id, current_streak, longest_streak, last_active_date)
    values (p_user_id, 1, 1, v_today);
    v_current_streak := 1;
  else
    if v_last_active is null or v_last_active < v_today - interval '1 day' then
      v_current_streak := 1;
    elsif v_last_active = v_today - interval '1 day' then
      v_current_streak := v_current_streak + 1;
    end if;

    if v_current_streak > v_longest_streak then
      v_longest_streak := v_current_streak;
    end if;

    update public.streaks
    set current_streak = v_current_streak,
        longest_streak = v_longest_streak,
        last_active_date = v_today,
        updated_at = now()
    where user_id = p_user_id;
  end if;

  return json_build_object(
    'success', true,
    'attempt_id', v_attempt_id,
    'current_streak', v_current_streak,
    'problem_slug', p_problem_slug
  );
end;
$$;

-- Grant execution to anon and authenticated
grant execute on function public.log_extension_solve(uuid, text, text, integer) to anon, authenticated;

-- 3. Verify user helper function for extension connection test
create or replace function public.verify_extension_user(p_user_id uuid)
returns json
language plpgsql
security definer
as $$
declare
  v_user record;
begin
  select id, username, full_name, avatar_url
  into v_user
  from public.profiles
  where id = p_user_id;

  if not found then
    return json_build_object('success', false, 'error', 'User not found');
  end if;

  return json_build_object(
    'success', true,
    'user_id', v_user.id,
    'username', v_user.username,
    'full_name', v_user.full_name,
    'avatar_url', v_user.avatar_url
  );
end;
$$;

grant execute on function public.verify_extension_user(uuid) to anon, authenticated;
