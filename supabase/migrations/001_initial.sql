-- Immimap core schema (run in Supabase SQL Editor or via CLI)
create extension if not exists postgis;

create table organizations (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  website_url text,
  phone text,
  address text,
  city text,
  state text,
  lat double precision,
  lng double precision,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table services (
  id uuid default gen_random_uuid() primary key,
  name text unique not null
);

create table org_services (
  org_id uuid references organizations(id) on delete cascade,
  service_id uuid references services(id) on delete cascade,
  primary key (org_id, service_id)
);

-- Public read access for the map catalog
alter table organizations enable row level security;
alter table services enable row level security;
alter table org_services enable row level security;

create policy "Public read organizations"
  on organizations for select
  using (true);

create policy "Public read services"
  on services for select
  using (true);

create policy "Public read org_services"
  on org_services for select
  using (true);
