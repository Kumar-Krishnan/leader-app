# Supabase Setup & Current State

## How to Export Current Schema

### Option 1: Supabase CLI (Recommended)
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-id

# Dump the schema
supabase db dump --file supabase-current.sql
```

### Option 2: From Dashboard
1. Go to **Database** → **Backups**
2. Download a backup
3. Or go to **SQL Editor** and run:
   ```sql
   -- Get all table definitions
   SELECT * FROM information_schema.tables WHERE table_schema = 'public';
   
   -- Get all policies
   SELECT * FROM pg_policies WHERE schemaname = 'public';
   ```

### Option 3: Use pg_dump
```bash
pg_dump -h db.yourproject.supabase.co -U postgres -d postgres --schema-only > schema.sql
```

---

## Current Schema State

This reflects all changes made during development, including fixes.

### Tables Created

1. **profiles** - User profiles (extends auth.users)
2. **threads** - Group chat threads
3. **thread_members** - Users in threads (many-to-many)
4. **messages** - Thread messages
5. **meetings** - Scheduled meetings
6. **resources** - Shared resources
7. **resource_shares** - Leader-to-leader sharing

### Triggers Active

```sql
-- Auto-create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Current RLS Policies

#### profiles
- `Users can view all profiles` - SELECT for all authenticated
- `Users can update their own profile` - UPDATE where id = auth.uid()
- `Service role can insert profiles` - INSERT (for trigger)

#### threads
- `Members can view their threads` - SELECT (needs membership check)
- `Leaders can create threads` - INSERT for leaders/admins
- `Leaders can update threads` - UPDATE for leaders/admins

#### thread_members (FIXED - no recursion)
- `Authenticated users can view thread members` - SELECT for authenticated
- `Leaders can add thread members` - INSERT for leaders/admins
- `Leaders can remove thread members` - DELETE for leaders/admins

#### messages
- `Members can view thread messages` - SELECT (membership check)
- `Members can send messages` - INSERT (membership + sender check)

#### meetings
- `Anyone can view meetings` - SELECT for all
- `Leaders can create meetings` - INSERT for leaders/admins
- `Leaders can update meetings` - UPDATE for leaders/admins
- `Leaders can delete meetings` - DELETE for leaders/admins

#### resources
- `Users can view public resources` - SELECT with visibility check
- `Leaders can create resources` - INSERT for leaders/admins
- `Leaders can update resources` - UPDATE for leaders/admins
- `Leaders can delete resources` - DELETE for leaders/admins

#### resource_shares
- `Leaders can view their shared resources` - SELECT
- `Leaders can share resources` - INSERT for leaders/admins

---

## SQL Fixes Applied (Run in Order)

If setting up fresh, run `supabase-schema.sql` first, then these fixes:

### Fix 1: Profile Creation Trigger
```sql
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE POLICY "Service role can insert profiles" ON profiles
  FOR INSERT WITH CHECK (true);
```

### Fix 2: Thread Members RLS (No Recursion)
```sql
DROP POLICY IF EXISTS "Members can view thread members" ON thread_members;
DROP POLICY IF EXISTS "Leaders can add members" ON thread_members;
DROP POLICY IF EXISTS "Leaders can remove members" ON thread_members;

CREATE POLICY "Authenticated users can view thread members" ON thread_members
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Leaders can add thread members" ON thread_members
  FOR INSERT
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('leader', 'admin')
  );

CREATE POLICY "Leaders can remove thread members" ON thread_members
  FOR DELETE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('leader', 'admin')
  );
```

---

## Supabase Dashboard Settings

### Authentication
- **Email provider**: Enabled
- **Confirm email**: Disabled (for development)
- **Site URL**: http://localhost:8081

### Realtime
Enabled for tables:
- messages
- threads
- thread_members

---

## Test Data Commands

### Promote user to leader
```sql
UPDATE profiles SET role = 'leader' WHERE email = 'user@example.com';
```

### Create test thread
```sql
INSERT INTO threads (name, created_by) 
VALUES ('Test Thread', 'user-uuid-here');
```

### View all users and roles
```sql
SELECT id, email, full_name, role FROM profiles;
```

