-- Sussy Baka Detected — Project Hub learning/cache schema
-- Scope: sussy_baka_detected only. Do not move these objects into public.

select hub.assert_app_scope('sussy_baka_detected', 'sussy_baka_detected');

create schema if not exists sussy_baka_detected;

create table if not exists sussy_baka_detected.entity_cache (
  id uuid primary key default gen_random_uuid(),
  normalized_name text not null,
  canonical_name text not null,
  source text not null check (source in ('wikimedia','learned','seed')),
  source_id text,
  wikipedia_title text,
  description text,
  tags text[] not null default '{}'::text[],
  aliases text[] not null default '{}'::text[],
  popularity_score double precision not null default 0 check (popularity_score >= 0),
  provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  verified_at timestamptz not null default now(),
  expires_at timestamptz,
  hit_count bigint not null default 0 check (hit_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (normalized_name),
  unique (source, source_id)
);

create index if not exists entity_cache_popularity_idx
  on sussy_baka_detected.entity_cache (popularity_score desc, verified_at desc);
create index if not exists entity_cache_expires_idx
  on sussy_baka_detected.entity_cache (expires_at)
  where expires_at is not null;
create index if not exists entity_cache_tags_gin_idx
  on sussy_baka_detected.entity_cache using gin (tags);

create table if not exists sussy_baka_detected.search_cache (
  cache_key text primary key,
  primary_query text not null,
  secondary_query text,
  result_entities jsonb not null default '[]'::jsonb check (jsonb_typeof(result_entities) = 'array'),
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null,
  hit_count bigint not null default 0 check (hit_count >= 0),
  last_hit_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists search_cache_expiry_idx
  on sussy_baka_detected.search_cache (expires_at);

create table if not exists sussy_baka_detected.learning_events (
  id uuid primary key default gen_random_uuid(),
  game_id_hash text,
  outcome text not null check (outcome in ('correct_guess','rejected_guess','revealed_after_give_up','gave_up_unrevealed')),
  revealed_name text,
  normalized_revealed_name text,
  rejected_guesses text[] not null default '{}'::text[],
  answer_history jsonb not null default '[]'::jsonb check (jsonb_typeof(answer_history) = 'array'),
  top_candidates jsonb not null default '[]'::jsonb check (jsonb_typeof(top_candidates) = 'array'),
  question_count integer not null default 0 check (question_count >= 0 and question_count <= 100),
  engine_version text not null default 'knowledge-v1',
  created_at timestamptz not null default now()
);

create index if not exists learning_events_created_idx
  on sussy_baka_detected.learning_events (created_at desc);
create index if not exists learning_events_reveal_idx
  on sussy_baka_detected.learning_events (normalized_revealed_name)
  where normalized_revealed_name is not null;

create table if not exists sussy_baka_detected.candidate_stats (
  normalized_name text primary key,
  canonical_name text not null,
  wins bigint not null default 0 check (wins >= 0),
  rejected_guesses bigint not null default 0 check (rejected_guesses >= 0),
  revealed_misses bigint not null default 0 check (revealed_misses >= 0),
  total_evidence bigint not null default 0 check (total_evidence >= 0),
  learned_prior double precision not null default 1 check (learned_prior >= 0.1 and learned_prior <= 4),
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table sussy_baka_detected.entity_cache enable row level security;
alter table sussy_baka_detected.search_cache enable row level security;
alter table sussy_baka_detected.learning_events enable row level security;
alter table sussy_baka_detected.candidate_stats enable row level security;

comment on schema sussy_baka_detected is 'Isolated persistence for Sussy Baka Detected Knowledge Engine.';
comment on table sussy_baka_detected.entity_cache is 'Verified candidate cache with source provenance; no user profile data.';
comment on table sussy_baka_detected.search_cache is 'Short-lived knowledge-discovery cache keyed by normalized search plan.';
comment on table sussy_baka_detected.learning_events is 'Anonymous game outcomes used to improve candidate coverage and ranking.';
comment on table sussy_baka_detected.candidate_stats is 'Aggregate anonymous performance counters used for learned priors.';
