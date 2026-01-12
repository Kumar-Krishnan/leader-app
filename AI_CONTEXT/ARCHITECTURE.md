# Architecture & Code Structure

## Directory Structure

```
leader_app/
├── App.tsx                     # Root component, providers, navigation
├── netlify.toml                # Netlify deployment config
├── src/
│   ├── components/
│   │   ├── CreateThreadModal.tsx   # Modal for creating threads
│   │   └── AddResourceModal.tsx    # Modal for adding resources/folders
│   ├── contexts/
│   │   ├── AuthContext.tsx     # Authentication state & methods
│   │   └── GroupContext.tsx    # Group membership & management
│   ├── hooks/                  # Custom hooks (add as needed)
│   ├── lib/
│   │   ├── supabase.ts         # Supabase client configuration
│   │   └── storage/
│   │       ├── types.ts        # StorageProvider interface
│   │       ├── supabaseStorage.ts  # Supabase Storage implementation
│   │       ├── awsS3Storage.ts     # AWS S3 placeholder
│   │       └── index.ts        # Active provider export
│   ├── navigation/
│   │   ├── types.ts            # Navigation type definitions
│   │   ├── AuthNavigator.tsx   # Sign in/up stack
│   │   ├── MainNavigator.tsx   # Tabs with nested stacks
│   │   └── RootNavigator.tsx   # Switches between Auth/Group/Main
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── SignInScreen.tsx
│   │   │   └── SignUpScreen.tsx
│   │   ├── main/
│   │   │   ├── ThreadsScreen.tsx
│   │   │   ├── ThreadDetailScreen.tsx
│   │   │   ├── MeetingsScreen.tsx
│   │   │   ├── ResourcesScreen.tsx
│   │   │   └── ProfileScreen.tsx
│   │   ├── group/
│   │   │   ├── GroupSelectScreen.tsx
│   │   │   └── ManageMembersScreen.tsx
│   │   └── leader/
│   │       └── LeaderResourcesScreen.tsx
│   └── types/
│       └── database.ts         # TypeScript types for Supabase
├── supabase-fresh-start.sql    # Complete database schema
├── env.example                 # Environment template
└── AI_CONTEXT/                 # This folder
```

## Navigation Flow

```
App.tsx
└── AuthProvider
    └── GroupProvider
        └── NavigationContainer
            └── RootNavigator
                ├── AuthNavigator (if no session)
                │   ├── SignIn
                │   └── SignUp
                ├── GroupSelectScreen (if no group selected)
                └── MainNavigator (if session + group)
                    └── Tab.Navigator (tabs always visible)
                        ├── Threads (ThreadsStack)
                        │   ├── ThreadsList
                        │   └── ThreadDetail
                        ├── Meetings
                        ├── Resources
                        ├── LeaderHub (if isLeader)
                        └── Profile (ProfileStack)
                            ├── ProfileMain
                            └── ManageMembers
```

## Key Patterns

### Authentication & Group Check
```tsx
const { session, user, profile, isLeader, isAdmin } = useAuth();
const { currentGroup, groups, isGroupLeader, isGroupAdmin } = useGroup();
```

### Supabase Queries with Group Scope
```tsx
const { data, error } = await supabase
  .from('threads')
  .select('*')
  .eq('group_id', currentGroup.id)
  .order('created_at', { ascending: false });
```

### Real-time Subscriptions
```tsx
useEffect(() => {
  const channel = supabase
    .channel(`messages:${threadId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `thread_id=eq.${threadId}`,
    }, handleNewMessage)
    .subscribe();

  return () => supabase.removeChannel(channel);
}, [threadId]);
```

### Role-based Rendering
```tsx
{isLeader && <LeaderOnlyComponent />}
{isGroupAdmin && <AdminOnlyComponent />}
{canApproveRequests && <ApprovalUI />}
```

### Storage Abstraction
```tsx
import { storageProvider } from '../lib/storage';

// Upload file
const { url, error } = await storageProvider.upload(path, file);

// Easy to switch from Supabase to S3 later
```

## Styling Conventions

- Dark theme: Background `#0F172A`, cards `#1E293B`
- Primary blue: `#3B82F6`
- Leader purple: `#7C3AED`
- Admin red: `#DC2626`
- Text: `#F8FAFC` (primary), `#94A3B8` (secondary)
- All styles use React Native StyleSheet
- Consistent padding: 20px horizontal, 16px card padding
- Border radius: 12-16px for cards, 20px for buttons

## Context Providers

### AuthContext
- Manages Supabase session
- Fetches and caches user profile
- Provides role checks (isLeader, isAdmin)
- Handles sign in/out

### GroupContext
- Fetches user's group memberships
- Manages current selected group
- Persists selection to AsyncStorage
- Provides group role checks (isGroupLeader, canApproveRequests)
- Handles group creation, join requests, approvals

## Platform Considerations

- Web uses localStorage (Supabase default)
- Native uses SecureStore for auth tokens
- Platform-specific code guarded with `Platform.OS`
- Alert.alert replaced with window.confirm on web
