# HubSpot Integration

## What It Does

One-way file sync: **HubSpot File Manager → Leader App**. Files stored in HubSpot are automatically pulled into the app every 8 hours and made available to all leaders/admins through a system-managed group called "HubSpot Resources."

There is no UI for managing the integration. Once configured, it runs silently in the background.

---

## Architecture

```
GitHub Actions (cron: every 8 hours)
    │
    ▼
POST /functions/v1/hubspot-sync  (Supabase Edge Function)
    │
    ├── 1. Authenticate with HubSpot API (private app token)
    ├── 2. Fetch all files with pagination (100 per page)
    ├── 3. For each file:
    │       ├── Check deduplication (hubspot_files table)
    │       ├── Download from HubSpot signed URL
    │       ├── Upload to Supabase Storage (resources bucket)
    │       ├── Create resource record in database
    │       └── Track mapping in hubspot_files table
    └── 4. Record sync stats in hubspot_sync_state table
```

---

## Files

| File | Purpose |
|------|---------|
| `supabase/functions/hubspot-sync/index.ts` | Edge Function entry point, handles HTTP request/response |
| `supabase/functions/hubspot-sync/hubspot-api.ts` | HubSpot API client — fetches file listings and signed download URLs |
| `supabase/functions/hubspot-sync/sync-logic.ts` | Core sync logic — deduplication, download, upload, resource creation |
| `supabase-hubspot-sync.sql` | Database migration — tables, triggers, RLS policies, system group creation |
| `.github/workflows/hubspot-sync.yml` | GitHub Actions workflow — runs every 8 hours or manually |
| `src/types/database.ts` | TypeScript types for `HubSpotSyncState`, `HubSpotFile` |
| `__tests__/manual_tests/hubspot_integration/` | Manual test scripts for validating API connectivity and scopes |

---

## Database Tables

### `hubspot_sync_state`

Tracks each sync run. One row per run.

| Column | Type | Description |
|--------|------|-------------|
| `status` | text | `pending` → `running` → `completed` or `failed` |
| `files_synced` | int | Files successfully synced this run |
| `files_skipped` | int | Files already present (deduplicated) |
| `files_failed` | int | Files that failed to sync |
| `error_message` | text | Error details if status is `failed` |
| `started_at` / `completed_at` | timestamptz | Timing |

RLS: Read-only access for admins. Service role has full access.

### `hubspot_files`

Maps each HubSpot file to a local resource. Used for deduplication.

| Column | Type | Description |
|--------|------|-------------|
| `hubspot_file_id` | text (unique) | HubSpot's file ID |
| `hubspot_file_name` | text | Original filename |
| `hubspot_file_size` | int | File size in bytes |
| `resource_id` | uuid (FK → resources) | Local resource record |
| `sync_status` | text | `synced`, `failed`, or `deleted` |

RLS: Read-only access for admins. Service role has full access.

### Modified existing tables

- **`groups`** — Added `is_system` (boolean) and `system_type` (text) columns. The HubSpot group has `is_system = true`, `system_type = 'hubspot'`.
- **`profiles`** — Has a `hubspot_contact_id` column (currently unused, reserved for future CRM contact sync).

---

## System Group & Auto-Membership

The migration SQL creates a system group:

- **Name**: "HubSpot Resources"
- **Code**: `HUBSPOT-SYSTEM`
- **is_system**: `true`
- **system_type**: `hubspot`

A database trigger (`on_profile_becomes_leader`) fires on `INSERT` or `UPDATE` of the `profiles.role` column. When a user becomes a `leader` or `admin`, they are automatically added to the HubSpot Resources group as a `member`. The migration also backfills existing leaders/admins.

---

## Sync Logic Details

### Deduplication (3-tier)

1. **By HubSpot file ID** — Primary check. If `hubspot_files` already has a row with this `hubspot_file_id`, skip it.
2. **By name + size** — Fallback for files synced before tracking was added. Matches on identical filename and file size.
3. **Deleted check** — If `sync_status = 'deleted'` (user deleted the resource locally), don't re-sync it.

### File Type Mapping

| HubSpot MIME Type | App Resource Type |
|-------------------|-------------------|
| PDF, Word, Excel, PowerPoint, text, CSV | `document` |
| mp4, video/* | `video` |
| Images, audio, zip, everything else | `other` |

### Storage Path

Files are stored in Supabase Storage at:
```
resources/hubspot/{groupId}/{hubspot_file_id}-{sanitized_filename}
```

Filenames are sanitized to remove special characters, keeping only alphanumeric characters, dots, and dashes.

### Error Handling

- Individual file failures do **not** stop the sync. The function continues processing remaining files.
- Failed files are recorded in `hubspot_files` with `sync_status = 'failed'`.
- The sync run is marked `completed` even if some files failed. The `files_failed` counter tracks how many.
- If the entire sync fails (e.g., API auth error), the run is marked `failed` with an `error_message`.

### Pagination

HubSpot's API returns max 100 files per request. The Edge Function follows pagination cursors (`after` parameter) until all files are fetched.

---

## Trigger: GitHub Actions

**File**: `.github/workflows/hubspot-sync.yml`

```
Schedule: 0 0,8,16 * * *   (every 8 hours: midnight, 8 AM, 4 PM UTC)
Manual:   workflow_dispatch  (trigger from GitHub Actions UI)
```

The workflow makes a `curl` POST to the Edge Function with the Supabase anon key. It parses the JSON response and logs the results (processed/skipped/failed counts).

---

## Configuration

### Supabase Edge Function Secrets

Set via `supabase secrets set` or the Supabase dashboard:

| Secret | Description |
|--------|-------------|
| `HUBSPOT_ACCESS_TOKEN` | HubSpot private app token (starts with `pat-`) |
| `SUPABASE_URL` | Auto-provided by Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-provided by Supabase |

### GitHub Actions Secrets

Set in GitHub repo Settings → Secrets:

| Secret | Description |
|--------|-------------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon key (used to invoke the Edge Function) |

### HubSpot Private App Setup

1. Go to **HubSpot → Settings → Integrations → Private Apps**
2. Create a new private app
3. Under **Scopes**, enable `files` (under CMS) for full file access
4. Create the app and copy the access token
5. Set the token as `HUBSPOT_ACCESS_TOKEN` in Supabase secrets

---

## What Users See

Leaders and admins see a group called **"HubSpot Resources"** in their group list. Inside it, there's a folder named **"HubSpot Resources"** containing all synced files. These appear and behave like any other resource in the app — they can be viewed, downloaded, and commented on. Users cannot delete or modify the system group itself.

Regular users (`role = 'user'`) do not see this group.

---

## Manual Sync

To trigger a sync outside the 8-hour schedule:

**Option 1 — GitHub Actions UI:**
Go to Actions → "HubSpot File Sync" → "Run workflow"

**Option 2 — curl:**
```bash
curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/hubspot-sync" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

---

## What's Not Implemented

- No sync from app → HubSpot (one-way only)
- No UI for viewing sync history or triggering syncs
- No HubSpot contact/CRM sync (the `hubspot_contact_id` field on profiles exists but is unused)
- No webhook-based real-time sync (polling only)
