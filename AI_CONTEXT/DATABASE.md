# Database Schema & Supabase

## Tables Overview

| Table | Purpose | RLS |
|-------|---------|-----|
| `profiles` | User profiles, extends auth.users | Yes |
| `threads` | Group chat threads | Yes |
| `thread_members` | Many-to-many: users in threads | Yes |
| `messages` | Messages within threads | Yes |
| `meetings` | Scheduled meetings with details | Yes |
| `resources` | Shared documents/links/videos | Yes |
| `resource_shares` | Leader-to-leader resource sharing | Yes |

## Key Relationships

```
auth.users (Supabase built-in)
    │
    └──> profiles (1:1, created by trigger)
            │
            ├──> thread_members ──> threads
            │
            ├──> messages
            │
            ├──> meetings (created_by)
            │
            └──> resources (shared_by)
                    │
                    └──> resource_shares
```

## Profile Creation

Profiles are created automatically via database trigger when a user signs up:

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

The app does NOT insert profiles directly.

## Important RLS Policies

### Threads
- Users can only see threads they're members of
- Only leaders can create threads

### Resources
- `visibility = 'all'`: Everyone can see
- `visibility = 'leaders_only'`: Only leaders/admins can see

### Messages
- Users can only see messages in threads they belong to
- Users can only send messages to threads they belong to

## Realtime Subscriptions

Enabled for:
- `messages` - for live chat
- `threads` - for thread updates
- `thread_members` - for membership changes

To subscribe:
```tsx
const channel = supabase
  .channel('messages')
  .on('postgres_changes', { 
    event: 'INSERT', 
    schema: 'public', 
    table: 'messages',
    filter: `thread_id=eq.${threadId}`
  }, handleNewMessage)
  .subscribe();
```

## Changing User Roles

To promote a user to leader (run in Supabase SQL Editor):

```sql
UPDATE profiles SET role = 'leader' WHERE email = 'user@example.com';
```

## Schema File

The complete schema is in `/supabase-schema.sql`. Run this in the Supabase SQL Editor to set up the database.

**Note:** After running the main schema, also run the trigger fix:

```sql
-- This was added later to fix profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, notification_preferences)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'user',
    '{"messages": true, "meetings": true, "resources": true, "push_enabled": true}'::jsonb
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Service role can insert profiles" ON profiles
  FOR INSERT WITH CHECK (true);
```

