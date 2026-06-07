-- Submissions staging table
create table submissions (
  id uuid default gen_random_uuid() primary key,
  org_id uuid references organizations(id) on delete cascade,
  payload jsonb not null,
  submission_type text not null check (submission_type in ('new', 'edit')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  submitted_by text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  reviewed_at timestamp with time zone,
  review_notes text
);

create index submissions_status_idx on submissions (status);
create index submissions_org_id_idx on submissions (org_id);
create index submissions_submitted_by_idx on submissions (submitted_by, created_at desc);

-- Rate limiting: max 5 submissions per identifier per hour
create or replace function check_rate_limit(user_ip text)
returns boolean
language sql
stable
as $$
  select count(*) < 5
  from submissions
  where submitted_by = user_ip
    and created_at > now() - interval '1 hour';
$$;

-- Resolve or create a service row by name
create or replace function upsert_service_by_name(service_name text)
returns uuid
language plpgsql
as $$
declare
  service_id uuid;
begin
  select id into service_id from services where name = service_name;

  if service_id is null then
    insert into services (name) values (service_name) returning id into service_id;
  end if;

  return service_id;
end;
$$;

-- Atomically approve a pending submission
create or replace function approve_submission(
  submission_id uuid,
  reviewer_notes text default null
)
returns uuid
language plpgsql
as $$
declare
  sub submissions%rowtype;
  target_org_id uuid;
  service_name text;
  service_id uuid;
begin
  select * into sub
  from submissions
  where id = submission_id and status = 'pending'
  for update;

  if not found then
    raise exception 'Submission not found or already reviewed';
  end if;

  if sub.submission_type = 'new' then
    insert into organizations (
      name,
      description,
      website_url,
      phone,
      address,
      city,
      state,
      lat,
      lng,
      org_type,
      pricing,
      thumbnail_image_url,
      intake_status,
      languages,
      catchment_note
    )
    values (
      sub.payload ->> 'name',
      nullif(sub.payload ->> 'description', ''),
      nullif(sub.payload ->> 'website_url', ''),
      nullif(sub.payload ->> 'phone', ''),
      nullif(sub.payload ->> 'address', ''),
      sub.payload ->> 'city',
      sub.payload ->> 'state',
      (sub.payload ->> 'lat')::double precision,
      (sub.payload ->> 'lng')::double precision,
      nullif(sub.payload ->> 'org_type', ''),
      nullif(sub.payload ->> 'pricing', ''),
      nullif(sub.payload ->> 'thumbnail_image_url', ''),
      nullif(sub.payload ->> 'intake_status', ''),
      case
        when sub.payload ? 'languages' then array(
          select jsonb_array_elements_text(sub.payload -> 'languages')
        )
        else null
      end,
      nullif(sub.payload ->> 'catchment_note', '')
    )
    returning id into target_org_id;
  elsif sub.submission_type = 'edit' then
    if sub.org_id is null then
      raise exception 'Edit submission is missing org_id';
    end if;

    update organizations
    set
      name = coalesce(sub.payload ->> 'name', name),
      description = coalesce(nullif(sub.payload ->> 'description', ''), description),
      website_url = coalesce(nullif(sub.payload ->> 'website_url', ''), website_url),
      phone = coalesce(nullif(sub.payload ->> 'phone', ''), phone),
      address = coalesce(nullif(sub.payload ->> 'address', ''), address),
      city = coalesce(sub.payload ->> 'city', city),
      state = coalesce(sub.payload ->> 'state', state),
      lat = coalesce((sub.payload ->> 'lat')::double precision, lat),
      lng = coalesce((sub.payload ->> 'lng')::double precision, lng),
      org_type = coalesce(nullif(sub.payload ->> 'org_type', ''), org_type),
      pricing = coalesce(nullif(sub.payload ->> 'pricing', ''), pricing),
      thumbnail_image_url = coalesce(nullif(sub.payload ->> 'thumbnail_image_url', ''), thumbnail_image_url),
      intake_status = coalesce(nullif(sub.payload ->> 'intake_status', ''), intake_status),
      languages = case
        when sub.payload ? 'languages' then array(
          select jsonb_array_elements_text(sub.payload -> 'languages')
        )
        else languages
      end,
      catchment_note = coalesce(nullif(sub.payload ->> 'catchment_note', ''), catchment_note)
    where id = sub.org_id
    returning id into target_org_id;
  else
    raise exception 'Unsupported submission_type: %', sub.submission_type;
  end if;

  if sub.payload ? 'service_names' then
    delete from org_services where org_id = target_org_id;

    for service_name in
      select jsonb_array_elements_text(sub.payload -> 'service_names')
    loop
      service_id := upsert_service_by_name(service_name);
      insert into org_services (org_id, service_id)
      values (target_org_id, service_id)
      on conflict do nothing;
    end loop;
  end if;

  update submissions
  set
    status = 'approved',
    reviewed_at = timezone('utc'::text, now()),
    review_notes = reviewer_notes,
    org_id = coalesce(sub.org_id, target_org_id)
  where id = submission_id;

  return target_org_id;
end;
$$;

create or replace function reject_submission(
  submission_id uuid,
  reviewer_notes text default null
)
returns void
language plpgsql
as $$
declare
  sub submissions%rowtype;
begin
  select * into sub
  from submissions
  where id = submission_id and status = 'pending'
  for update;

  if not found then
    raise exception 'Submission not found or already reviewed';
  end if;

  update submissions
  set
    status = 'rejected',
    reviewed_at = timezone('utc'::text, now()),
    review_notes = reviewer_notes
  where id = submission_id;
end;
$$;

grant execute on function check_rate_limit(text) to anon, authenticated, service_role;
grant execute on function approve_submission(uuid, text) to service_role;
grant execute on function reject_submission(uuid, text) to service_role;

alter table submissions enable row level security;

-- Visitors may insert pending submissions only
create policy "Public insert pending submissions"
  on submissions for insert
  to anon, authenticated
  with check (status = 'pending');

-- Public audit trail: reviewed submissions for an org (no payload exposure)
create policy "Public read reviewed submission history"
  on submissions for select
  to anon, authenticated
  using (status in ('approved', 'rejected') and org_id is not null);
