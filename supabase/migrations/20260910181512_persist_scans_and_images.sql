create table public.wellfarm_scans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  crop text not null check (crop in ('Rice', 'Wheat', 'Maize', 'Cotton', 'Sugarcane', 'Soybean', 'Tomato', 'Potato')),
  symptoms text[],
  affected_part text check (affected_part is null or char_length(affected_part) <= 100),
  growth_stage text check (growth_stage is null or char_length(growth_stage) <= 100),
  affected_area_percentage integer check (affected_area_percentage between 0 and 100),
  nearby_plants_affected boolean,
  notes text check (notes is null or char_length(notes) <= 2000),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  location_state text not null default '',
  location_district text not null default '',
  image_object_path text,
  image_content_type text check (image_content_type is null or image_content_type in ('image/jpeg', 'image/png')),
  status text not null default 'pending' check (status in ('pending', 'analyzing', 'completed', 'failed')),
  analysis jsonb,
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index wellfarm_scans_owner_created_idx
  on public.wellfarm_scans (owner_id, created_at desc);
create index wellfarm_scans_regional_idx
  on public.wellfarm_scans (location_state, location_district, crop, created_at desc)
  where hidden_at is null;

alter table public.wellfarm_scans enable row level security;

-- Wellfarm accesses this table only through its trusted API server. The public
-- browser client receives neither table privileges nor the server's secret key.
revoke all on table public.wellfarm_scans from anon, authenticated;
grant select, insert, update, delete on table public.wellfarm_scans to service_role;

comment on table public.wellfarm_scans is
  'Private Wellfarm farmer scans, storage object references, and cached model results.';
