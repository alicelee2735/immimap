-- CRITICAL SECURITY: Ensure RLS is on for every public application table and
-- that anon/authenticated clients can only SELECT. Writes go through the
-- service_role key (bypasses RLS) from server-side admin paths only.
--
-- Idempotent: safe to re-run.

-- ── 1. Enable RLS on all user tables in public (skip PostGIS system tables) ──

do $$
declare
  r record;
  skip_tables text[] := array[
    'spatial_ref_sys'
  ];
begin
  for r in
    select c.relname as tablename
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r' -- ordinary tables
      and not (c.relname = any (skip_tables))
  loop
    execute format(
      'alter table public.%I enable row level security',
      r.tablename
    );
    -- Prevent table owners from bypassing RLS. service_role still bypasses.
    execute format(
      'alter table public.%I force row level security',
      r.tablename
    );
  end loop;
end $$;

-- ── 2. Drop any existing write policies (public should never mutate) ──────

do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname, cmd
    from pg_policies
    where schemaname = 'public'
      and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  loop
    execute format(
      'drop policy if exists %I on public.%I',
      r.policyname,
      r.tablename
    );
  end loop;
end $$;

-- Drop loose/duplicate SELECT policies from Dashboard templates
drop policy if exists "Enable read access for all users" on public.organizations;
drop policy if exists "Enable read access for all users" on public.services;
drop policy if exists "Enable read access for all users" on public.org_services;
drop policy if exists "Enable read access for all users" on public.official_data_store;

-- ── 3. Public SELECT policies (catalog + official data) ───────────────────
-- data_ingestion_log and any legacy snapshot tables: no public policies.

drop policy if exists "Public read organizations" on public.organizations;
create policy "Public read organizations"
  on public.organizations
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Public read services" on public.services;
create policy "Public read services"
  on public.services
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Public read org_services" on public.org_services;
create policy "Public read org_services"
  on public.org_services
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Public read official data" on public.official_data_store;
create policy "Public read official data"
  on public.official_data_store
  for select
  to anon, authenticated
  using (true);

-- Legacy tables (if present): strip write paths; leave SELECT read-only history only.
do $$
begin
  if to_regclass('public.submissions') is not null then
    execute 'drop policy if exists "Public insert pending submissions" on public.submissions';
    execute 'drop policy if exists "Public update submissions" on public.submissions';
    execute 'drop policy if exists "Public delete submissions" on public.submissions';
    -- Keep historical read policy if it exists; do not create write policies
  end if;

  if to_regclass('public.visa_bulletin_data') is not null then
    -- superseded by official_data_store — service_role only
    execute 'drop policy if exists "Public read visa_bulletin_data" on public.visa_bulletin_data';
    execute 'drop policy if exists "Enable read access for all users" on public.visa_bulletin_data';
  end if;
end $$;

-- Ensure ingestion logs stay closed to public roles.
drop policy if exists "Public read ingestion log" on public.data_ingestion_log;
drop policy if exists "Public read data_ingestion_log" on public.data_ingestion_log;

-- ── 4. Defense in depth: revoke write grants from API roles ───────────────

revoke insert, update, delete, truncate, references, trigger
  on all tables in schema public
  from anon, authenticated;

grant select on table
  public.organizations,
  public.services,
  public.org_services,
  public.official_data_store
  to anon, authenticated;

-- No SELECT grant for ingestion audit log (service_role only).
revoke all on table public.data_ingestion_log from anon, authenticated;

comment on table public.organizations is
  'Public catalog; RLS: select for anon/authenticated; writes via service_role only.';
comment on table public.data_ingestion_log is
  'Admin audit log; RLS enabled with no public policies (service_role only).';
