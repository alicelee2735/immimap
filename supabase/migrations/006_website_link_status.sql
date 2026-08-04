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
