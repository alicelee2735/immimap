-- Verified badge is ImmiMap manual review, not NGO type and not EOIR ingest.
--
-- The detail panel previously treated every org_type = 'NGO' as Verified, which
-- made automated EOIR inserts look reviewed. This column is the source of
-- truth: inserts from db:sync-eoir send false; updates never write it.

alter table organizations
  add column if not exists verified boolean not null default false;

comment on column organizations.verified is
  'True only after ImmiMap manual review. Drives the Verified badge on NGO listings. Automated EOIR ingest always inserts false.';

-- Listings that existed before the EOIR roster sync were cataloged (and
-- reviewed) during initial cataloging. Rows inserted by db:sync-eoir on
-- 2026-08-24 stay false — automated roster data is not a review.
update organizations
  set verified = true
  where org_type = 'NGO'
    and created_at < timestamptz '2026-08-24 00:00:00+00';
