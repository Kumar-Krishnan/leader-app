# Common Tasks & How-To

## Adding a New Screen

1. Create the screen file in appropriate folder:
   - `src/screens/main/` for main app screens
   - `src/screens/auth/` for auth screens
   - `src/screens/leader/` for leader-only screens

2. Add to navigation:
   ```tsx
   // In types.ts
   export type MainTabParamList = {
     ...existing,
     NewScreen: undefined, // or { paramName: string }
   };
   
   // In MainNavigator.tsx
   <Tab.Screen name="NewScreen" component={NewScreen} />
   ```

## Adding a New Supabase Table

1. Create table in Supabase SQL Editor
2. Add RLS policies
3. Add TypeScript types in `src/types/database.ts`
4. Update the Database interface in same file

## Fetching Data Pattern

```tsx
const [data, setData] = useState<DataType[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetchData();
}, []);

const fetchData = async () => {
  try {
    const { data, error } = await supabase
      .from('table')
      .select('*')
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
      .insert(newItem)
      .select()
      .single();
    
    if (error) throw error;
    // Update local state or refetch
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
      event: '*', // or 'INSERT', 'UPDATE', 'DELETE'
      schema: 'public',
      table: 'table_name',
      filter: `column=eq.${value}` // optional
    }, (payload) => {
      // Handle the change
      console.log('Change:', payload);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [dependency]);
```

## Checking User Role

```tsx
const { isLeader, isAdmin, profile } = useAuth();

// In JSX
{isLeader && <LeaderContent />}
{isAdmin && <AdminContent />}
{profile?.role === 'user' && <UserOnlyContent />}
```

## Testing Different Roles

1. Sign up with a new email
2. In Supabase SQL Editor:
   ```sql
   UPDATE profiles SET role = 'leader' WHERE email = 'test@example.com';
   ```
3. Sign out and sign in again (or refresh)

## Debugging

- **Web console**: F12 in browser
- **React Native**: Expo DevTools or shake device for menu
- **Supabase logs**: Dashboard > Logs section
- **Network issues**: Check Supabase URL and key in .env

