-- Fix SECURITY DEFINER views → SECURITY INVOKER
-- These views currently bypass the querying user's RLS policies.
-- Recreating with security_invoker = on ensures the user's own
-- permissions are respected.

BEGIN;

CREATE OR REPLACE VIEW public.location_events_by_region
  WITH (security_invoker = on)
  AS
  SELECT round(lat, 1) AS lat_region,
    round(lng, 1) AS lng_region,
    count(*) AS total_events,
    count(DISTINCT date(created_at)) AS active_days
  FROM location_events
  GROUP BY round(lat, 1), round(lng, 1)
  ORDER BY count(*) DESC;

CREATE OR REPLACE VIEW public.location_events_daily
  WITH (security_invoker = on)
  AS
  SELECT date(created_at) AS date,
    lat,
    lng,
    event_type,
    platform,
    count(*) AS event_count
  FROM location_events
  GROUP BY date(created_at), lat, lng, event_type, platform
  ORDER BY date(created_at) DESC;

CREATE OR REPLACE VIEW public.resource_upvote_counts
  WITH (security_invoker = on)
  AS
  SELECT resource_id,
    count(*) AS total_upvotes,
    count(*) FILTER (WHERE is_leader_upvote = true) AS leader_upvotes,
    count(*) FILTER (WHERE is_leader_upvote = false) AS user_upvotes
  FROM resource_upvotes
  GROUP BY resource_id;

COMMIT;
