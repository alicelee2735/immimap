-- Remove deferred community submission pipeline (not used in public beta)
drop function if exists approve_submission(uuid, text);
drop function if exists reject_submission(uuid, text);
drop function if exists check_rate_limit(text);
drop table if exists submissions;
