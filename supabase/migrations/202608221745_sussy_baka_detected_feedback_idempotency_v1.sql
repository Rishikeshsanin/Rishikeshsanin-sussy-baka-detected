-- Sussy Baka Detected — feedback idempotency + role search path
select hub.assert_app_scope('sussy_baka_detected', 'sussy_baka_detected');

alter role sussy_baka_detected_app
  set search_path = sussy_baka_detected, pg_catalog;

create unique index if not exists learning_events_game_outcome_once_idx
  on sussy_baka_detected.learning_events (
    game_id_hash,
    outcome,
    coalesce(normalized_revealed_name, '')
  )
  where game_id_hash is not null;
