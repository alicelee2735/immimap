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

create policy "Public read official data"
  on official_data_store for select
  to anon, authenticated
  using (true);

-- Ingestion logs are admin-only (service role bypasses RLS)
