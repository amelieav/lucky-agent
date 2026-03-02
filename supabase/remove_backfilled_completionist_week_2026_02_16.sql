-- Remove backfilled completionist timestamps for season week-2026-02-16 only.
-- Window: [2026-02-16T00:00:00Z, 2026-02-23T00:00:00Z)
-- Scope: full-holo lifetime rows only, and only rows where first_holo_at matches
-- backfill-style timestamps (equal to last/first collected timestamp).

begin;

-- Preview affected rows before update.
select
  count(*) as affected_rows,
  count(distinct user_id) as affected_users
from public.player_lifetime_terms
where public.normalize_mutation(best_mutation) = 'holo'
  and first_holo_at >= '2026-02-16T00:00:00Z'::timestamptz
  and first_holo_at < '2026-02-23T00:00:00Z'::timestamptz
  and first_holo_at = coalesce(last_collected_at, first_collected_at);

-- Remove only the targeted backfilled completionist timestamps.
update public.player_lifetime_terms
set first_holo_at = null,
    updated_at = now()
where public.normalize_mutation(best_mutation) = 'holo'
  and first_holo_at >= '2026-02-16T00:00:00Z'::timestamptz
  and first_holo_at < '2026-02-23T00:00:00Z'::timestamptz
  and first_holo_at = coalesce(last_collected_at, first_collected_at);

-- Verify cleanup window now empty for this targeted pattern.
select
  count(*) as remaining_rows
from public.player_lifetime_terms
where public.normalize_mutation(best_mutation) = 'holo'
  and first_holo_at >= '2026-02-16T00:00:00Z'::timestamptz
  and first_holo_at < '2026-02-23T00:00:00Z'::timestamptz
  and first_holo_at = coalesce(last_collected_at, first_collected_at);

commit;
