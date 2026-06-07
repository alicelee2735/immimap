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
