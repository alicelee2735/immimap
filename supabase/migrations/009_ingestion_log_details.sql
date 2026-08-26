-- Give the ingestion audit log room for a per-run summary.
--
-- The EOIR organization sync reports rows processed, new vs updated counts and
-- geocode failures. Without these columns that detail has nowhere to go and a
-- partially-successful run is indistinguishable from a clean one.
--
-- Additive and idempotent: safe to re-run, and the sync degrades to inserting
-- status/error_message only if this has not been applied yet.

alter table data_ingestion_log
  add column if not exists source text,
  add column if not exists details jsonb;

comment on column data_ingestion_log.source is
  'Which pipeline produced the run, e.g. eoir_organizations, visa_bulletin.';
comment on column data_ingestion_log.details is
  'Run summary: rows parsed/processed, inserted/updated/rekeyed, geocode outcomes, warnings.';

create index if not exists data_ingestion_log_source_ran_at_idx
  on data_ingestion_log (source, ran_at desc);

-- data_ingestion_log stays service-role only; migration 008 already revoked
-- anon/authenticated access and created no public policy. Nothing to change.
