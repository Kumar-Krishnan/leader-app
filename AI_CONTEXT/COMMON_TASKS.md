# Common Tasks & How-To

## Adding a New Screen

1. Create the screen file:
   - `src/screens/main/` - main app screens
   - `src/screens/auth/` - auth screens
   - `src/screens/group/` - group management
   - `src/screens/leader/` - leader-only screens

2. Add to navigation in `MainNavigator.tsx`:
   ```tsx
   // If it needs its own stack (for sub-navigation)
   <SomeStack.Screen name="NewScreen" component={NewScreen} />
   
   // Or as a tab
   <Tab.Screen name="NewTab" component={NewScreen} />
   ```

3. Update types in `navigation/types.ts`

## Adding a New Supabase Table

1. Add to `supabase-fresh-start.sql`
2. Run migration in Supabase SQL Editor
3. Add TypeScript types in `src/types/database.ts`
4. Add to realtime publication if needed:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE new_table;
   ```

## Fetching Data Pattern

```tsx
const [data, setData] = useState<DataType[]>([]);
const [loading, setLoading] = useState(true);
const { currentGroup } = useGroup();

useEffect(() => {
  if (currentGroup) fetchData();
}, [currentGroup?.id]);

const fetchData = async () => {
  try {
    const { data, error } = await supabase
      .from('table')
      .select('*')
      .eq('group_id', currentGroup.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    setData(data || []);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    setLoading(false);
  }
};
```

## Creating Data Pattern

```tsx
const createItem = async (newItem: InsertType) => {
  try {
    const { data, error } = await supabase
      .from('table')
      .insert({
        ...newItem,
        group_id: currentGroup.id,
      })
      .select()
      .single();
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};
```

## Adding Real-time Subscription

```tsx
useEffect(() => {
  const channel = supabase
    .channel('unique-channel-name')
    .on('postgres_changes', {
      event: 'INSERT', // or 'UPDATE', 'DELETE', '*'
      schema: 'public',
      table: 'table_name',
      filter: `column=eq.${value}` // optional
    }, (payload) => {
      console.log('Change:', payload);
      // Update local state
    })
    .subscribe();

  return () => supabase.removeChannel(channel);
}, [dependency]);
```

## Checking User Role

```tsx
// Global roles (from profile)
const { isLeader, isAdmin, profile } = useAuth();

// Group-specific roles
const { isGroupLeader, isGroupAdmin, canApproveRequests } = useGroup();

// In JSX
{isLeader && <LeaderContent />}
{isGroupAdmin && <GroupAdminContent />}
{canApproveRequests && <ApprovalUI />}
```

## File Upload Pattern

```tsx
import { storageProvider } from '../../lib/storage';

const uploadFile = async (file: File) => {
  const path = `${currentGroup.id}/${Date.now()}-${file.name}`;
  const { url, error } = await storageProvider.upload(path, file);
  
  if (error) {
    console.error('Upload failed:', error);
    return null;
  }
  
  return url;
};
```

## Platform-Specific Code

```tsx
import { Platform, Alert } from 'react-native';

// Confirmation dialog
const confirmAction = () => {
  if (Platform.OS === 'web') {
    return window.confirm('Are you sure?');
  } else {
    return new Promise(resolve => {
      Alert.alert('Confirm', 'Are you sure?', [
        { text: 'Cancel', onPress: () => resolve(false) },
        { text: 'OK', onPress: () => resolve(true) },
      ]);
    });
  }
};
```

## Testing Different Roles

1. Sign up with allowed email
2. In Supabase SQL Editor:
   ```sql
   -- Make global leader
   UPDATE profiles SET role = 'leader' WHERE email = 'test@example.com';
   
   -- Make group admin
   UPDATE group_members SET role = 'admin' 
   WHERE user_id = 'user-uuid' AND group_id = 'group-uuid';
   ```
3. Refresh the app

## Debugging

- **Web console**: F12 in browser, check Console tab
- **React DevTools**: Install browser extension
- **Supabase logs**: Dashboard > Logs > Postgres/Auth
- **Network issues**: Check .env has correct Supabase URL/key
- **Session issues**: Clear localStorage and try again

## Deploying Changes

```bash
# Push to GitHub - Netlify auto-deploys
git add .
git commit -m "Description of changes"
git push

# Check Netlify dashboard for deploy status
```
