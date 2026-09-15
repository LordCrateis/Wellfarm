create table public.wellfarm_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null default '' check (char_length(first_name) <= 50),
  last_name text not null default '' check (char_length(last_name) <= 50),
  display_name text not null default '' check (char_length(display_name) <= 80),
  city text not null default '' check (char_length(city) <= 100),
  farm text not null default '' check (char_length(farm) <= 100),
  crops text[] not null default '{}',
  workspace text not null default 'farmer' check (workspace in ('farmer', 'insights')),
  notifications boolean not null default true,
  avatar text,
  state text not null default '' check (char_length(state) <= 100),
  district text not null default '' check (char_length(district) <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wellfarm_messages (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

insert into public.wellfarm_profiles (user_id, first_name, last_name, display_name, avatar)
select
  id,
  left(coalesce(raw_user_meta_data ->> 'given_name', raw_user_meta_data ->> 'first_name', ''), 50),
  left(coalesce(raw_user_meta_data ->> 'family_name', raw_user_meta_data ->> 'last_name', ''), 50),
  left(coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name', ''), 80),
  case
    when coalesce(raw_user_meta_data ->> 'avatar_url', raw_user_meta_data ->> 'picture', '') like 'https://%'
      then left(coalesce(raw_user_meta_data ->> 'avatar_url', raw_user_meta_data ->> 'picture'), 2048)
    else null
  end
from auth.users
on conflict (user_id) do nothing;

create index wellfarm_profiles_location_idx
  on public.wellfarm_profiles (state, district);
create index wellfarm_messages_thread_idx
  on public.wellfarm_messages (account_id, created_at, id);
create index wellfarm_messages_sender_idx
  on public.wellfarm_messages (sender_id);

alter table public.wellfarm_profiles enable row level security;
alter table public.wellfarm_messages enable row level security;

revoke all on table public.wellfarm_profiles from anon, authenticated;
revoke all on table public.wellfarm_messages from anon, authenticated;
grant select, insert, update, delete on table public.wellfarm_profiles to service_role;
grant select, insert, update, delete on table public.wellfarm_messages to service_role;

create policy "No direct browser access to Wellfarm profiles"
on public.wellfarm_profiles for all to anon, authenticated
using (false) with check (false);

create policy "No direct browser access to Wellfarm messages"
on public.wellfarm_messages for all to anon, authenticated
using (false) with check (false);

comment on table public.wellfarm_profiles is
  'Private Wellfarm profile data used by the trusted API server.';
comment on table public.wellfarm_messages is
  'Private conversations between Wellfarm farmers and administrators.';
