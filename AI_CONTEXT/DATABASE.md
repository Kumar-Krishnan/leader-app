# Database Schema & Supabase

## Schema File

The complete schema is in `/supabase-fresh-start.sql`. Run this in Supabase SQL Editor for a fresh setup.

## Tables Overview

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles, extends auth.users |
| `groups` | Groups/communities users belong to |
| `group_members` | User membership in groups with roles |
| `group_join_requests` | Pending requests to join groups |
| `threads` | Group chat threads (scoped to group) |
| `thread_members` | Users in threads |
| `messages` | Messages within threads |
| `meetings` | Scheduled meetings (scoped to group) |
| `resources` | Shared documents/links (scoped to group) |
| `resource_folders` | Folder organization for resources |
| `resource_shares` | Leader-to-leader resource sharing (legacy) |
| `resource_group_shares` | Share resources with other groups |
| `resource_folder_group_shares` | Share folders with other groups |

## Key Relationships

```
auth.users (Supabase built-in)
    │
    └──> profiles (1:1, created by trigger)
            │
            ├──> group_members ──> groups
            │       │
            │       └──> group_join_requests
            │
            ├──> thread_members ──> threads (scoped to group)
            │
            ├──> messages
            │
            ├──> meetings (scoped to group)
            │
            └──> resources (scoped to group)
                    │
                    ├──> resource_folders
                    └──> resource_shares
```

## Profile Creation

Profiles are created automatically via database trigger:

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

The app does NOT insert profiles directly.

## Group Roles

Stored in `group_members.role`:
- `member` - Regular member
- `leader-helper` - Can approve join requests
- `leader` - Can create content, manage members
- `admin` - Full control, sees join code

## RLS Status

**Currently DISABLED for development.** All authenticated users have full access to all tables.

To re-enable with proper policies:
```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
-- Then add appropriate policies
```

## Realtime

Enabled via publication for live updates:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE threads;
ALTER PUBLICATION supabase_realtime ADD TABLE group_members;
-- etc.
```

## Storage

Supabase Storage bucket `resources` for file uploads:
- Files stored at: `{group_id}/{filename}`
- Public URL accessible to authenticated users

## Email Restriction

Signup restricted to specific emails during development:

```sql
CREATE TRIGGER check_email_before_signup
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION check_allowed_email();
```

Allowed emails defined in `check_allowed_email()` function.

## Common Queries

### Promote user to leader
```sql
UPDATE profiles SET role = 'leader' WHERE email = 'user@example.com';
```

### View all users
```sql
SELECT id, email, full_name, role FROM profiles;
```

### View group memberships
```sql
SELECT 
  p.email,
  g.name as group_name,
  gm.role as group_role
FROM group_members gm
JOIN profiles p ON p.id = gm.user_id
JOIN groups g ON g.id = gm.group_id;
```

### Remove email restriction
```sql
DROP TRIGGER IF EXISTS check_email_before_signup ON auth.users;
DROP FUNCTION IF EXISTS check_allowed_email();
```

## Resource Sharing Between Groups

Resources and folders can be shared with other groups. The sharing creates a reference (not a copy) - the original owner retains control.

### Sharing Tables

```sql
-- Share individual resources
resource_group_shares (
  id UUID PRIMARY KEY,
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  shared_with_group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  shared_by_user_id UUID REFERENCES profiles(id),
  shared_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(resource_id, shared_with_group_id)
)

-- Share folders (includes all contents recursively)
resource_folder_group_shares (
  id UUID PRIMARY KEY,
  folder_id UUID REFERENCES resource_folders(id) ON DELETE CASCADE,
  shared_with_group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  shared_by_user_id UUID REFERENCES profiles(id),
  shared_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(folder_id, shared_with_group_id)
)
```

### Sharing Rules

- **Who can share**: Leaders/admins of the source group
- **Where can they share**: Any group in the system
- **What happens on delete**: Cascade removes share records
- **Visibility**: Shared items appear in target group's resource list with "Shared from [Group]" label
- **Editing**: Only the original group can edit/delete the resource

### Helper Functions

```sql
-- Check if folder is shared to user (via direct share or ancestor)
is_folder_shared_to_user(folder_id UUID, user_id UUID) RETURNS BOOLEAN

-- Check if folder or any ancestor is shared to user
is_folder_or_ancestor_shared_to_user(folder_id UUID, user_id UUID) RETURNS BOOLEAN
```

### Migration File

See `supabase-resource-sharing.sql` for complete schema with RLS policies.
