-- Immimap core schema (run in Supabase SQL Editor or via CLI)
create extension if not exists postgis;

create table organizations (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  website_url text,
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

-- Public read access for the map catalog (writes: service_role only)
alter table organizations enable row level security;
alter table services enable row level security;
alter table org_services enable row level security;
alter table organizations force row level security;
alter table services force row level security;
alter table org_services force row level security;

drop policy if exists "Public read organizations" on organizations;
create policy "Public read organizations"
  on organizations for select
  to anon, authenticated
  using (true);

drop policy if exists "Public read services" on services;
create policy "Public read services"
  on services for select
  to anon, authenticated
  using (true);

drop policy if exists "Public read org_services" on org_services;
create policy "Public read org_services"
  on org_services for select
  to anon, authenticated
  using (true);
-- Extra columns to preserve ImmigrationService fields from services.json
alter table organizations
  add column if not exists legacy_id text unique,
  add column if not exists org_type text check (org_type in ('NGO', 'Law Firm')),
  add column if not exists pricing text,
  add column if not exists thumbnail_image_url text,
  add column if not exists intake_status text
    check (intake_status in ('OPEN', 'LIMITED', 'WAITLISTED')),
  add column if not exists languages text[],
  add column if not exists catchment_note text;

create index if not exists organizations_state_idx on organizations (state);
create index if not exists organizations_legacy_id_idx on organizations (legacy_id);

-- Official Visa Bulletin and Processing Data
create table official_data_store (
  id uuid default gen_random_uuid() primary key,
  source_url text not null,
  bulletin_month text not null,
  data_type text not null check (data_type in ('visa_bulletin', 'processing_times')),
  content jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

create unique index official_data_store_type_month_idx
  on official_data_store (data_type, bulletin_month);

create index official_data_store_type_updated_idx
  on official_data_store (data_type, updated_at desc);

-- Audit log for provenance
create table data_ingestion_log (
  id uuid default gen_random_uuid() primary key,
  status text not null check (status in ('success', 'failed')),
  error_message text,
  ran_at timestamp with time zone default timezone('utc'::text, now())
);

create index data_ingestion_log_ran_at_idx
  on data_ingestion_log (ran_at desc);

alter table official_data_store enable row level security;
alter table data_ingestion_log enable row level security;
alter table official_data_store force row level security;
alter table data_ingestion_log force row level security;

drop policy if exists "Public read official data" on official_data_store;
create policy "Public read official data"
  on official_data_store for select
  to anon, authenticated
  using (true);

-- Ingestion logs are admin-only (service role bypasses RLS; no public policies)

revoke insert, update, delete, truncate on all tables in schema public
  from anon, authenticated;
grant select on table
  organizations, services, org_services, official_data_store
  to anon, authenticated;
revoke all on table data_ingestion_log from anon, authenticated;

-- Track whether organization website URLs are reachable
alter table organizations
  add column if not exists is_website_active boolean default true,
  add column if not exists website_checked_at timestamp with time zone,
  add column if not exists website_check_error text;

comment on column organizations.is_website_active is
  'Whether website_url currently responds successfully. Defaults true (optimistic) until an audit sets it.';
comment on column organizations.website_checked_at is
  'UTC timestamp of the most recent website link check.';
comment on column organizations.website_check_error is
  'Last link-check failure reason (HTTP status, DNS, timeout, etc.). Null when active or never checked.';

create index if not exists organizations_is_website_active_idx
  on organizations (is_website_active)
  where website_url is not null;

-- Phone numbers are no longer shown or collected
alter table organizations drop column if exists phone;

