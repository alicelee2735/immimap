-- Distinguishes an inferred baseline language from a human-confirmed one.
--
-- EOIR recognition under 8 C.F.R. Part 1292 requires representing clients
-- before U.S. immigration courts, which operate in English, so "English" is
-- a safe baseline inference for every doj-ra-* row. But it is an inference,
-- not curated data, and must never be presented identically to a
-- human-entered language list. Additional languages (Spanish, Mandarin,
-- etc.) are never guessed — they stay empty until confirmed through the
-- correction form, same as any other data gap.

alter table organizations
  add column if not exists languages_confirmed boolean not null default true;

comment on column organizations.languages_confirmed is
  'False means languages[] is an unconfirmed inference (e.g. the EOIR English baseline), not curated/human-confirmed data. Drives the "assumed" treatment in the detail panel. Defaults true because pre-existing languages data is curated.';

-- EOIR-synced rows have no language data today. Give them the English
-- baseline, explicitly flagged as unconfirmed. Rows that already carry some
-- language data (e.g. already corrected by hand) are left untouched.
update organizations
set languages = array['English'],
    languages_confirmed = false
where legacy_id like 'doj-ra-%'
  and (languages is null or coalesce(array_length(languages, 1), 0) = 0);
