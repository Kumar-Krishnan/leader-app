# Supabase Setup & Configuration

## Project Info

- **Dashboard**: [supabase.com/dashboard](https://supabase.com/dashboard)
- **Schema File**: `/supabase-fresh-start.sql` (complete, ready to run)

## Fresh Setup Steps

1. Create new Supabase project
2. Go to SQL Editor
3. Run entire contents of `supabase-fresh-start.sql`
4. Copy URL and anon key from Settings > API
5. Add to `.env` or Netlify environment variables

## Current Configuration

### Authentication
- **Email provider**: Enabled
- **Confirm email**: Disabled (for development)
- **Site URL**: Your Netlify URL
- **Redirect URLs**: Your Netlify URL + `/**`

### Row Level Security
**Currently DISABLED** for ease of development. All authenticated users have access to all data.

Re-enable before production:
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
-- etc. for all tables
```

### Realtime
Enabled for tables:
- messages
- threads
- thread_members
- group_members
- group_join_requests
- meetings
- resources

### Storage
Bucket `resources` exists for file uploads.

### Email Restriction
Signup restricted to:
- joshirby@gmail.com
- gkrishnan803@gmail.com
- josh.irby@cru.org

Remove with:
```sql
DROP TRIGGER IF EXISTS check_email_before_signup ON auth.users;
DROP FUNCTION IF EXISTS check_allowed_email();
```

## Useful SQL Commands

### View all users
```sql
SELECT id, email, full_name, role FROM profiles;
```

### Promote to leader
```sql
UPDATE profiles SET role = 'leader' WHERE email = 'user@example.com';
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

### Change group role
```sql
UPDATE group_members 
SET role = 'admin' 
WHERE user_id = 'user-uuid' AND group_id = 'group-uuid';
```

### Reset user password
```sql
UPDATE auth.users 
SET encrypted_password = crypt('new_password', gen_salt('bf'))
WHERE email = 'user@example.com';
```

### View all groups and their codes
```sql
SELECT id, name, code, created_at FROM groups;
```

### Delete a user completely
```sql
-- This cascades to profiles, group_members, etc.
DELETE FROM auth.users WHERE email = 'user@example.com';
```

## Exporting Schema

### Option 1: Supabase CLI
```bash
npm install -g supabase
supabase login
supabase link --project-ref your-project-id
supabase db dump --file backup.sql
```

### Option 2: Dashboard
Database > Backups > Download

## Troubleshooting

### "permission denied for table X"
Table-level permissions missing. Run:
```sql
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
```

### "new row violates row-level security"
RLS is blocking the operation. Either:
1. Disable RLS: `ALTER TABLE X DISABLE ROW LEVEL SECURITY;`
2. Add appropriate policy

### Realtime not working
Make sure table is added to publication:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE table_name;
```

### Session/auth issues
Clear browser localStorage and try again. The app has a 3-second timeout that auto-clears corrupted sessions.
