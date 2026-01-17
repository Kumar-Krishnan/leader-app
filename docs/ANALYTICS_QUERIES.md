# Location Analytics Queries

## Quick Reference

These queries help you analyze the anonymous location events stored in your database.

---

## Daily Activity

### Events per day
```sql
SELECT 
  DATE(created_at) as date,
  COUNT(*) as event_count,
  COUNT(DISTINCT event_type) as event_types,
  ARRAY_AGG(DISTINCT platform) as platforms
FROM location_events 
GROUP BY DATE(created_at)
ORDER BY date DESC
LIMIT 30;
```

### This week's activity
```sql
SELECT 
  DATE(created_at) as date,
  event_type,
  COUNT(*) as count
FROM location_events 
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at), event_type
ORDER BY date DESC, event_type;
```

---

## Geographic Distribution

### Events by region (~10km grid)
```sql
SELECT 
  ROUND(lat::numeric, 1) as latitude,
  ROUND(lng::numeric, 1) as longitude,
  COUNT(*) as total_events,
  COUNT(DISTINCT DATE(created_at)) as active_days
FROM location_events 
GROUP BY latitude, longitude
ORDER BY total_events DESC
LIMIT 20;
```

### Top 10 cities/areas (~1km precision)
```sql
SELECT 
  lat,
  lng,
  COUNT(*) as event_count,
  MIN(created_at) as first_seen,
  MAX(created_at) as last_seen,
  ARRAY_AGG(DISTINCT event_type) as event_types
FROM location_events 
GROUP BY lat, lng
ORDER BY event_count DESC
LIMIT 10;
```

### Heatmap data (for visualization)
```sql
SELECT 
  lat::float as latitude,
  lng::float as longitude,
  COUNT(*) as weight
FROM location_events 
GROUP BY lat, lng
ORDER BY weight DESC;
```

---

## Platform Breakdown

### Events by platform
```sql
SELECT 
  COALESCE(platform, 'unknown') as platform,
  COUNT(*) as total_events,
  COUNT(DISTINCT DATE(created_at)) as active_days
FROM location_events 
GROUP BY platform
ORDER BY total_events DESC;
```

### Platform usage by region
```sql
SELECT 
  ROUND(lat::numeric, 1) as lat,
  ROUND(lng::numeric, 1) as lng,
  platform,
  COUNT(*) as events
FROM location_events 
GROUP BY lat, lng, platform
ORDER BY events DESC
LIMIT 20;
```

---

## Event Types

### Event breakdown
```sql
SELECT 
  event_type,
  COUNT(*) as total,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage,
  MIN(created_at) as first_event,
  MAX(created_at) as last_event
FROM location_events 
GROUP BY event_type
ORDER BY total DESC;
```

### Events over time
```sql
SELECT 
  DATE(created_at) as date,
  SUM(CASE WHEN event_type = 'login' THEN 1 ELSE 0 END) as logins,
  SUM(CASE WHEN event_type = 'signup' THEN 1 ELSE 0 END) as signups,
  SUM(CASE WHEN event_type = 'app_open' THEN 1 ELSE 0 END) as app_opens
FROM location_events 
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## Growth Metrics

### New locations per week
```sql
SELECT 
  DATE_TRUNC('week', first_seen) as week,
  COUNT(*) as new_locations
FROM (
  SELECT 
    lat, 
    lng, 
    MIN(created_at) as first_seen
  FROM location_events
  GROUP BY lat, lng
) as locations
GROUP BY week
ORDER BY week DESC;
```

### Active locations (seen in last 7 days)
```sql
SELECT 
  COUNT(DISTINCT (lat, lng)) as active_locations,
  COUNT(*) as total_events
FROM location_events 
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days';
```

---

## Time-based Analysis

### Events by hour of day
```sql
SELECT 
  EXTRACT(HOUR FROM created_at) as hour,
  COUNT(*) as event_count,
  ARRAY_AGG(DISTINCT event_type) as event_types
FROM location_events 
GROUP BY hour
ORDER BY hour;
```

### Events by day of week
```sql
SELECT 
  TO_CHAR(created_at, 'Day') as day_of_week,
  EXTRACT(DOW FROM created_at) as day_number,
  COUNT(*) as event_count
FROM location_events 
GROUP BY day_of_week, day_number
ORDER BY day_number;
```

---

## Data Quality

### Check for missing data
```sql
SELECT 
  COUNT(*) as total_events,
  COUNT(lat) as has_lat,
  COUNT(lng) as has_lng,
  COUNT(platform) as has_platform,
  COUNT(event_type) as has_event_type,
  MIN(created_at) as oldest_event,
  MAX(created_at) as newest_event
FROM location_events;
```

### Outlier detection (very far coordinates)
```sql
SELECT 
  lat,
  lng,
  COUNT(*) as event_count
FROM location_events 
WHERE 
  lat < -90 OR lat > 90 OR
  lng < -180 OR lng > 180
GROUP BY lat, lng;
```

---

## Export for Mapping

### JSON format for map visualization
```sql
SELECT 
  json_build_object(
    'type', 'Feature',
    'geometry', json_build_object(
      'type', 'Point',
      'coordinates', json_build_array(lng, lat)
    ),
    'properties', json_build_object(
      'event_count', COUNT(*),
      'platforms', ARRAY_AGG(DISTINCT platform),
      'last_seen', MAX(created_at)
    )
  ) as geojson
FROM location_events 
GROUP BY lat, lng
LIMIT 100;
```

### CSV export format
```sql
SELECT 
  lat as latitude,
  lng as longitude,
  COUNT(*) as event_count,
  STRING_AGG(DISTINCT platform, ',') as platforms,
  MIN(created_at) as first_seen,
  MAX(created_at) as last_seen
FROM location_events 
GROUP BY lat, lng
ORDER BY event_count DESC;
```

---

## Summary Dashboard Query

### Overall stats
```sql
SELECT 
  COUNT(*) as total_events,
  COUNT(DISTINCT (lat, lng)) as unique_locations,
  COUNT(DISTINCT platform) as platforms_used,
  COUNT(DISTINCT event_type) as event_types,
  MIN(created_at) as first_event,
  MAX(created_at) as last_event,
  DATE_PART('day', MAX(created_at) - MIN(created_at)) as days_active
FROM location_events;
```

---

## Notes

- All coordinates are rounded to 2 decimal places (~1km accuracy)
- No user identification is possible from this data
- Times are in UTC (adjust for local timezone if needed)
- Use `::float` cast when passing to mapping libraries that expect floats

