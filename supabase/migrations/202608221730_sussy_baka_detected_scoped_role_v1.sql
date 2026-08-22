-- Sussy Baka Detected — least-privilege server role
-- The role intentionally starts NOLOGIN. A production password must never be
-- committed; login activation is a separate secret-management step.

select hub.assert_app_scope('sussy_baka_detected', 'sussy_baka_detected');

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'sussy_baka_detected_app') then
    create role sussy_baka_detected_app
      nologin
      noinherit
      nosuperuser
      nocreatedb
      nocreaterole
      noreplication
      nobypassrls;
  end if;
end
$$;

revoke all on schema sussy_baka_detected from public, anon, authenticated;
revoke all on all tables in schema sussy_baka_detected from public, anon, authenticated;

grant usage on schema sussy_baka_detected to sussy_baka_detected_app;

grant select, insert, update on sussy_baka_detected.entity_cache to sussy_baka_detected_app;
grant select, insert, update, delete on sussy_baka_detected.search_cache to sussy_baka_detected_app;
grant select, insert on sussy_baka_detected.learning_events to sussy_baka_detected_app;
grant select, insert, update on sussy_baka_detected.candidate_stats to sussy_baka_detected_app;

create policy sbd_entity_cache_app_only
  on sussy_baka_detected.entity_cache
  for all
  to sussy_baka_detected_app
  using (true)
  with check (true);

create policy sbd_search_cache_app_only
  on sussy_baka_detected.search_cache
  for all
  to sussy_baka_detected_app
  using (true)
  with check (true);

create policy sbd_learning_events_read
  on sussy_baka_detected.learning_events
  for select
  to sussy_baka_detected_app
  using (true);

create policy sbd_learning_events_insert
  on sussy_baka_detected.learning_events
  for insert
  to sussy_baka_detected_app
  with check (true);

create policy sbd_candidate_stats_app_only
  on sussy_baka_detected.candidate_stats
  for all
  to sussy_baka_detected_app
  using (true)
  with check (true);

comment on role sussy_baka_detected_app is
  'NOLOGIN least-privilege role reserved for SBD server persistence. Never grant access outside sussy_baka_detected.';
