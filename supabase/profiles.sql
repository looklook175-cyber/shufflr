-- Run in Supabase SQL editor if the profiles table does not exist yet.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);
