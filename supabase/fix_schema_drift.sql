-- ==============================================================================
-- Recurse: Schema drift fix
-- Brings the live database in line with what the web app and extension expect.
-- Idempotent — safe to run more than once.
-- Run in the Supabase SQL editor:
--   https://supabase.com/dashboard/project/nhsbgweplsbiodxbdbcc/sql
-- ==============================================================================

-- 1. DAILY GOALS: cadence + weekly stretch target (goal customization saves these)
alter table public.daily_goals
    add column if not exists cadence text not null default 'both'
        check (cadence in ('daily', 'weekly', 'both'));
alter table public.daily_goals
    add column if not exists weekly_target integer not null default 10
        check (weekly_target >= 1);
alter table public.daily_goals alter column hard_target set default 0;

-- 2. ATTEMPTS: confidence rating + problem metadata captured by the extension
--    (problem_id is free text: catalog id like 'prob-1' or a LeetCode slug)
alter table public.attempts
    add column if not exists confidence_rating smallint
        check (confidence_rating is null or confidence_rating between 1 and 5);
alter table public.attempts add column if not exists problem_title text;
alter table public.attempts
    add column if not exists problem_difficulty text
        check (problem_difficulty is null or problem_difficulty in ('Easy', 'Medium', 'Hard'));

-- 3. STREAKS: freeze bookkeeping read by the streak card
alter table public.streaks add column if not exists freezes_available integer not null default 2;
alter table public.streaks add column if not exists freezes_used integer not null default 0;
alter table public.streaks add column if not exists last_freeze_date date;

-- 4. PROFILES: optional identity label shown on the leaderboard
alter table public.profiles add column if not exists identity_label jsonb;

-- 5. FRIEND POKES
create table if not exists public.friend_pokes (
    id uuid primary key default gen_random_uuid(),
    sender_id uuid not null,
    receiver_id uuid not null,
    message text not null default '',
    poked_at timestamptz not null default now(),
    constraint friend_pokes_sender_id_fkey foreign key (sender_id) references public.profiles(id) on delete cascade,
    constraint friend_pokes_receiver_id_fkey foreign key (receiver_id) references public.profiles(id) on delete cascade,
    constraint no_self_poke check (sender_id <> receiver_id)
);
create index if not exists idx_friend_pokes_receiver on public.friend_pokes(receiver_id, poked_at desc);
create index if not exists idx_friend_pokes_sender on public.friend_pokes(sender_id, poked_at desc);

alter table public.friend_pokes enable row level security;

drop policy if exists "Participants can view pokes" on public.friend_pokes;
create policy "Participants can view pokes" on public.friend_pokes
    for select to authenticated
    using (auth.uid() = sender_id or auth.uid() = receiver_id);

drop policy if exists "Users can poke friends" on public.friend_pokes;
create policy "Users can poke friends" on public.friend_pokes
    for insert to authenticated
    with check (auth.uid() = sender_id and public.are_friends(sender_id, receiver_id));

-- 6. DUELS
create table if not exists public.duels (
    id uuid primary key default gen_random_uuid(),
    challenger_id uuid not null,
    opponent_id uuid not null,
    problem_id text not null,
    status text not null default 'pending'
        check (status in ('pending', 'active', 'completed', 'declined')),
    time_limit_sec integer not null default 1800,
    challenger_time_sec integer,
    opponent_time_sec integer,
    winner_id uuid references public.profiles(id) on delete set null,
    start_time timestamptz,
    end_time timestamptz,
    created_at timestamptz not null default now(),
    constraint duels_challenger_id_fkey foreign key (challenger_id) references public.profiles(id) on delete cascade,
    constraint duels_opponent_id_fkey foreign key (opponent_id) references public.profiles(id) on delete cascade,
    constraint no_self_duel check (challenger_id <> opponent_id)
);
create index if not exists idx_duels_challenger on public.duels(challenger_id, created_at desc);
create index if not exists idx_duels_opponent on public.duels(opponent_id, created_at desc);

alter table public.duels enable row level security;

drop policy if exists "Participants can view duels" on public.duels;
create policy "Participants can view duels" on public.duels
    for select to authenticated
    using (auth.uid() = challenger_id or auth.uid() = opponent_id);

drop policy if exists "Users can challenge friends" on public.duels;
create policy "Users can challenge friends" on public.duels
    for insert to authenticated
    with check (auth.uid() = challenger_id and public.are_friends(challenger_id, opponent_id));

drop policy if exists "Participants can update duels" on public.duels;
create policy "Participants can update duels" on public.duels
    for update to authenticated
    using (auth.uid() = challenger_id or auth.uid() = opponent_id)
    with check (auth.uid() = challenger_id or auth.uid() = opponent_id);

drop policy if exists "Participants can delete duels" on public.duels;
create policy "Participants can delete duels" on public.duels
    for delete to authenticated
    using (auth.uid() = challenger_id or auth.uid() = opponent_id);

-- 7. EXTENSION RPC v2
--    Adds title/difficulty capture, same-day de-duplication, and rejects calls
--    where a signed-in caller tries to log a solve for a different user.
drop function if exists public.log_extension_solve(uuid, text, text, integer);

create or replace function public.log_extension_solve(
    p_user_id uuid,
    p_problem_slug text,
    p_submission_url text default null,
    p_time_spent integer default null,
    p_title text default null,
    p_difficulty text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
    v_attempt_id uuid;
    v_slug text := lower(trim(p_problem_slug));
    v_difficulty text := case when p_difficulty in ('Easy', 'Medium', 'Hard') then p_difficulty end;
    v_current_streak integer;
begin
    if auth.uid() is not null and auth.uid() <> p_user_id then
        return json_build_object('success', false, 'error', 'User mismatch');
    end if;

    if v_slug is null or v_slug = '' then
        return json_build_object('success', false, 'error', 'Missing problem slug');
    end if;

    -- Same problem already logged as solved today: don't double count it.
    select id into v_attempt_id
    from public.attempts
    where user_id = p_user_id
      and problem_id = v_slug
      and status = 'solved'
      and solved_at >= date_trunc('day', now())
    limit 1;

    if v_attempt_id is null then
        insert into public.attempts (
            user_id, problem_id, status, approach_notes, submission_url,
            time_spent_min, solved_at, problem_title, problem_difficulty
        ) values (
            p_user_id, v_slug, 'solved', 'Logged via Recurse Extension', p_submission_url,
            p_time_spent, now(), nullif(trim(p_title), ''), v_difficulty
        )
        returning id into v_attempt_id;

        -- Streak update. Idempotent with the on_attempt_logged trigger: if the
        -- trigger already ran, last_active_date is today and nothing changes.
        insert into public.streaks as s (user_id, current_streak, longest_streak, last_active_date)
        values (p_user_id, 1, 1, current_date)
        on conflict (user_id) do update set
            current_streak = case
                when s.last_active_date = current_date then s.current_streak
                when s.last_active_date = current_date - 1 then s.current_streak + 1
                else 1
            end,
            longest_streak = greatest(s.longest_streak, case
                when s.last_active_date = current_date then s.current_streak
                when s.last_active_date = current_date - 1 then s.current_streak + 1
                else 1
            end),
            last_active_date = current_date,
            updated_at = now();
    else
        update public.attempts
        set problem_title = coalesce(problem_title, nullif(trim(p_title), '')),
            problem_difficulty = coalesce(problem_difficulty, v_difficulty),
            updated_at = now()
        where id = v_attempt_id;
    end if;

    select current_streak into v_current_streak from public.streaks where user_id = p_user_id;

    return json_build_object(
        'success', true,
        'attempt_id', v_attempt_id,
        'current_streak', coalesce(v_current_streak, 0),
        'problem_slug', v_slug
    );
end;
$$;

grant execute on function public.log_extension_solve(uuid, text, text, integer, text, text) to anon, authenticated;

-- 8. REALTIME: live updates for the dashboard (ignore if already added)
do $$
declare
    t text;
begin
    foreach t in array array['attempts', 'daily_goals', 'streaks', 'duels', 'friend_pokes'] loop
        begin
            execute format('alter publication supabase_realtime add table public.%I', t);
        exception
            when duplicate_object then null;
            when undefined_object then null;
        end;
    end loop;
end $$;

-- 9. Refresh PostgREST's schema cache so the new columns are visible immediately
notify pgrst, 'reload schema';
