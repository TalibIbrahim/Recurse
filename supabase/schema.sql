-- ==============================================================================
-- CodeGrind Supabase PostgreSQL Schema & Row-Level Security (RLS)
-- ==============================================================================

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 2. ENUMS & DOMAINS
do $$ begin
    create type difficulty_level as enum ('Easy', 'Medium', 'Hard');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type attempt_status as enum ('solved', 'attempted', 'needs_review');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type friendship_status as enum ('pending', 'accepted', 'rejected');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type goal_preset_type as enum ('Light', 'Standard', 'Grinder', 'Custom');
exception
    when duplicate_object then null;
end $$;

-- 3. TABLES

-- ------------------------------------------------------------------------------
-- PROFILES: Extended public profile for each authenticated user
-- ------------------------------------------------------------------------------
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    username text unique not null,
    full_name text,
    avatar_url text,
    bio text default '',
    leetcode_username text,
    is_online boolean default false not null,
    last_seen_at timestamptz default now() not null,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null,
    constraint username_min_length check (char_length(username) >= 3),
    constraint username_format check (username ~ '^[a-zA-Z0-9_-]+$')
);

-- ------------------------------------------------------------------------------
-- FRIENDSHIPS: Bidirectional friend requests and connections
-- ------------------------------------------------------------------------------
create table if not exists public.friendships (
    id uuid primary key default gen_random_uuid(),
    requester_id uuid not null references public.profiles(id) on delete cascade,
    addressee_id uuid not null references public.profiles(id) on delete cascade,
    status friendship_status default 'pending' not null,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null,
    constraint unique_friendship unique (requester_id, addressee_id),
    constraint no_self_friendship check (requester_id <> addressee_id)
);

-- ------------------------------------------------------------------------------
-- PROBLEMS: Cached LeetCode problem catalog (seeded via GraphQL)
-- ------------------------------------------------------------------------------
create table if not exists public.problems (
    id uuid primary key default gen_random_uuid(),
    frontend_id integer,
    leetcode_slug text unique not null,
    title text not null,
    difficulty difficulty_level not null,
    tags text[] default '{}'::text[] not null,
    url text not null,
    acceptance_rate numeric(5,2),
    cached_at timestamptz default now() not null
);

-- ------------------------------------------------------------------------------
-- DAILY GOALS: Customizable daily solve targets per user
-- ------------------------------------------------------------------------------
create table if not exists public.daily_goals (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    preset goal_preset_type default 'Standard' not null,
    easy_target integer default 1 not null check (easy_target >= 0),
    medium_target integer default 1 not null check (medium_target >= 0),
    hard_target integer default 1 not null check (hard_target >= 0),
    effective_from date default current_date not null,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null,
    constraint unique_user_daily_goal unique (user_id, effective_from)
);

-- ------------------------------------------------------------------------------
-- ATTEMPTS: Solve logs, approach notes, time complexity, and review status
-- ------------------------------------------------------------------------------
create table if not exists public.attempts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    problem_id uuid not null references public.problems(id) on delete cascade,
    status attempt_status not null,
    approach_notes text,
    pattern_tag text,
    time_complexity text,
    space_complexity text,
    time_spent_min integer check (time_spent_min is null or time_spent_min >= 0),
    submission_url text,
    solved_at timestamptz default now() not null,
    needs_revisit boolean default false not null,
    revisit_by timestamptz,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

-- ------------------------------------------------------------------------------
-- STREAKS: Current and longest streaks, plus last active date
-- ------------------------------------------------------------------------------
create table if not exists public.streaks (
    user_id uuid primary key references public.profiles(id) on delete cascade,
    current_streak integer default 0 not null check (current_streak >= 0),
    longest_streak integer default 0 not null check (longest_streak >= 0),
    last_active_date date,
    updated_at timestamptz default now() not null
);

-- ------------------------------------------------------------------------------
-- PROBLEM COMMENTS: Scoped peer discussion threads on friend attempts
-- ------------------------------------------------------------------------------
create table if not exists public.problem_comments (
    id uuid primary key default gen_random_uuid(),
    attempt_id uuid not null references public.attempts(id) on delete cascade,
    author_id uuid not null references public.profiles(id) on delete cascade,
    body text not null check (char_length(trim(body)) > 0),
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

-- 4. PERFORMANCE INDEXES
create index if not exists idx_profiles_username on public.profiles(username);
create index if not exists idx_profiles_last_seen on public.profiles(last_seen_at desc);

create index if not exists idx_friendships_requester on public.friendships(requester_id, status);
create index if not exists idx_friendships_addressee on public.friendships(addressee_id, status);

create index if not exists idx_problems_slug on public.problems(leetcode_slug);
create index if not exists idx_problems_difficulty on public.problems(difficulty);
create index if not exists idx_problems_frontend_id on public.problems(frontend_id);

create index if not exists idx_daily_goals_user_effective on public.daily_goals(user_id, effective_from desc);

create index if not exists idx_attempts_user_solved_at on public.attempts(user_id, solved_at desc);
create index if not exists idx_attempts_problem_id on public.attempts(problem_id);
create index if not exists idx_attempts_status on public.attempts(status);
create index if not exists idx_attempts_needs_revisit on public.attempts(user_id, needs_revisit) where needs_revisit is true;

create index if not exists idx_problem_comments_attempt on public.problem_comments(attempt_id, created_at asc);
create index if not exists idx_problem_comments_author on public.problem_comments(author_id);

-- 5. HELPER SECURITY & UTILITY FUNCTIONS

-- Function to check whether two users have an accepted friendship
create or replace function public.are_friends(user_a uuid, user_b uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.friendships
    where status = 'accepted'
      and (
        (requester_id = user_a and addressee_id = user_b)
        or
        (requester_id = user_b and addressee_id = user_a)
      )
  );
$$;

-- Function to check whether the current user can access a specific attempt
create or replace function public.can_access_attempt(target_attempt_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.attempts a
    where a.id = target_attempt_id
      and (
        a.user_id = auth.uid()
        or public.are_friends(auth.uid(), a.user_id)
      )
  );
$$;

-- Function to auto-update updated_at timestamp
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

-- Apply updated_at triggers
drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists set_friendships_updated_at on public.friendships;
create trigger set_friendships_updated_at before update on public.friendships
for each row execute function public.touch_updated_at();

drop trigger if exists set_daily_goals_updated_at on public.daily_goals;
create trigger set_daily_goals_updated_at before update on public.daily_goals
for each row execute function public.touch_updated_at();

drop trigger if exists set_attempts_updated_at on public.attempts;
create trigger set_attempts_updated_at before update on public.attempts
for each row execute function public.touch_updated_at();

drop trigger if exists set_streaks_updated_at on public.streaks;
create trigger set_streaks_updated_at before update on public.streaks
for each row execute function public.touch_updated_at();

drop trigger if exists set_problem_comments_updated_at on public.problem_comments;
create trigger set_problem_comments_updated_at before update on public.problem_comments
for each row execute function public.touch_updated_at();

-- Automatic profile & streak initialization on auth.users signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
declare
    raw_username text;
    final_username text;
begin
    raw_username := coalesce(
        new.raw_user_meta_data->>'username',
        split_part(new.email, '@', 1)
    );
    
    -- Ensure clean alphanumeric username
    raw_username := regexp_replace(raw_username, '[^a-zA-Z0-9_-]', '', 'g');
    if char_length(raw_username) < 3 then
        raw_username := 'user_' || substr(new.id::text, 1, 8);
    end if;

    final_username := raw_username;

    -- Avoid conflicts by suffixing if already taken
    if exists (select 1 from public.profiles where username = final_username) then
        final_username := final_username || '_' || substr(new.id::text, 1, 4);
    end if;

    -- Insert profile
    insert into public.profiles (id, username, full_name, avatar_url)
    values (
        new.id,
        final_username,
        coalesce(new.raw_user_meta_data->>'full_name', final_username),
        coalesce(new.raw_user_meta_data->>'avatar_url', '')
    );

    -- Insert default daily goal (Standard: 1 Easy, 1 Medium, 0 Hard)
    insert into public.daily_goals (user_id, preset, easy_target, medium_target, hard_target)
    values (new.id, 'Standard', 1, 1, 0);

    -- Insert initial streak
    insert into public.streaks (user_id, current_streak, longest_streak, last_active_date)
    values (new.id, 0, 0, null);

    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- Trigger to recalculate streaks upon recording a solved attempt
create or replace function public.handle_attempt_streak()
returns trigger
language plpgsql
security definer
as $$
declare
    solve_date date;
    prev_streak record;
    new_current integer;
    new_longest integer;
begin
    if new.status = 'solved' then
        solve_date := (new.solved_at at time zone 'UTC')::date;
        
        select current_streak, longest_streak, last_active_date
        into prev_streak
        from public.streaks
        where user_id = new.user_id;

        if not found then
            insert into public.streaks (user_id, current_streak, longest_streak, last_active_date)
            values (new.user_id, 1, 1, solve_date);
        else
            if prev_streak.last_active_date is null then
                new_current := 1;
            elsif prev_streak.last_active_date = solve_date then
                -- Already solved something today; streak unchanged
                return new;
            elsif prev_streak.last_active_date = solve_date - interval '1 day' then
                -- Solved yesterday; streak increments
                new_current := prev_streak.current_streak + 1;
            else
                -- Streak broken
                new_current := 1;
            end if;

            new_longest := greatest(prev_streak.longest_streak, new_current);

            update public.streaks
            set current_streak = new_current,
                longest_streak = new_longest,
                last_active_date = solve_date,
                updated_at = now()
            where user_id = new.user_id;
        end if;
    end if;
    return new;
end;
$$;

drop trigger if exists on_attempt_logged on public.attempts;
create trigger on_attempt_logged
    after insert or update on public.attempts
    for each row execute function public.handle_attempt_streak();

-- 6. ROW-LEVEL SECURITY (RLS)

alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.problems enable row level security;
alter table public.daily_goals enable row level security;
alter table public.attempts enable row level security;
alter table public.streaks enable row level security;
alter table public.problem_comments enable row level security;

-- PROFILES POLICIES
-- Anyone authenticated can view user profiles (required for searching friends & leaderboard)
create policy "Profiles viewable by authenticated users"
    on public.profiles for select
    to authenticated
    using (true);

-- Users can insert and update their own profile
create policy "Users can insert own profile"
    on public.profiles for insert
    to authenticated
    with check (auth.uid() = id);

create policy "Users can update own profile"
    on public.profiles for update
    to authenticated
    using (auth.uid() = id)
    with check (auth.uid() = id);

-- FRIENDSHIPS POLICIES
-- Users can view friendships they are involved in
create policy "Users can view own friendships"
    on public.friendships for select
    to authenticated
    using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Users can send a friend request (must be requester)
create policy "Users can send friend requests"
    on public.friendships for insert
    to authenticated
    with check (auth.uid() = requester_id);

-- Users can update friendships they are part of (accept/reject)
create policy "Users can update own friendships"
    on public.friendships for update
    to authenticated
    using (auth.uid() = requester_id or auth.uid() = addressee_id)
    with check (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Users can delete/unfriend
create policy "Users can delete own friendships"
    on public.friendships for delete
    to authenticated
    using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- PROBLEMS POLICIES
-- Problem catalog is publicly viewable by authenticated users
create policy "Problems viewable by authenticated users"
    on public.problems for select
    to authenticated
    using (true);

-- PROBLEMS insert/update reserved for service_role / migrations (no public write)

-- DAILY GOALS POLICIES
-- Users can view their own goals, plus accepted friends can view
create policy "Users and accepted friends can view daily goals"
    on public.daily_goals for select
    to authenticated
    using (
        auth.uid() = user_id
        or public.are_friends(auth.uid(), user_id)
    );

create policy "Users can insert own daily goals"
    on public.daily_goals for insert
    to authenticated
    with check (auth.uid() = user_id);

create policy "Users can update own daily goals"
    on public.daily_goals for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Users can delete own daily goals"
    on public.daily_goals for delete
    to authenticated
    using (auth.uid() = user_id);

-- ATTEMPTS POLICIES
-- Users can view their own attempts, and accepted friends can view them
create policy "Users and accepted friends can view attempts"
    on public.attempts for select
    to authenticated
    using (
        auth.uid() = user_id
        or public.are_friends(auth.uid(), user_id)
    );

create policy "Users can insert own attempts"
    on public.attempts for insert
    to authenticated
    with check (auth.uid() = user_id);

create policy "Users can update own attempts"
    on public.attempts for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Users can delete own attempts"
    on public.attempts for delete
    to authenticated
    using (auth.uid() = user_id);

-- STREAKS POLICIES
-- Streaks are viewable by self and accepted friends (for leaderboard & profile)
create policy "Users and accepted friends can view streaks"
    on public.streaks for select
    to authenticated
    using (
        auth.uid() = user_id
        or public.are_friends(auth.uid(), user_id)
    );

create policy "Users can update own streak"
    on public.streaks for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- PROBLEM COMMENTS POLICIES
-- Users can view comments on attempts they have permission to access
create policy "Users can view comments on accessible attempts"
    on public.problem_comments for select
    to authenticated
    using (public.can_access_attempt(attempt_id));

-- Users can post comments if they can access the attempt
create policy "Users can comment on accessible attempts"
    on public.problem_comments for insert
    to authenticated
    with check (
        auth.uid() = author_id
        and public.can_access_attempt(attempt_id)
    );

-- Authors can update or delete their own comments
create policy "Authors can update own comments"
    on public.problem_comments for update
    to authenticated
    using (auth.uid() = author_id)
    with check (auth.uid() = author_id);

create policy "Authors can delete own comments"
    on public.problem_comments for delete
    to authenticated
    using (auth.uid() = author_id);
