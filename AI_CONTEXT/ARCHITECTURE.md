# Architecture & Code Structure

## Directory Structure

```
leader_app/
├── App.tsx                     # Root component, navigation container
├── src/
│   ├── components/             # Reusable UI components (empty, add as needed)
│   ├── contexts/
│   │   └── AuthContext.tsx     # Authentication state & methods
│   ├── hooks/                  # Custom hooks (empty, add as needed)
│   ├── lib/
│   │   └── supabase.ts         # Supabase client configuration
│   ├── navigation/
│   │   ├── types.ts            # Navigation type definitions
│   │   ├── AuthNavigator.tsx   # Sign in/up stack
│   │   ├── MainNavigator.tsx   # Bottom tab navigator
│   │   └── RootNavigator.tsx   # Switches between Auth/Main
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── SignInScreen.tsx
│   │   │   └── SignUpScreen.tsx
│   │   ├── main/
│   │   │   ├── ThreadsScreen.tsx
│   │   │   ├── MeetingsScreen.tsx
│   │   │   ├── ResourcesScreen.tsx
│   │   │   └── ProfileScreen.tsx
│   │   └── leader/
│   │       └── LeaderResourcesScreen.tsx
│   └── types/
│       └── database.ts         # TypeScript types matching Supabase schema
├── supabase-schema.sql         # Database schema (run in Supabase SQL Editor)
├── env.example                 # Environment template
└── AI_CONTEXT/                 # This folder - AI agent context
```

## Navigation Flow

```
App.tsx
└── AuthProvider (context)
    └── NavigationContainer
        └── RootNavigator
            ├── AuthNavigator (if no session)
            │   ├── SignIn
            │   └── SignUp
            └── MainNavigator (if session exists)
                ├── Threads tab
                ├── Meetings tab
                ├── Resources tab
                ├── Leader Hub tab (if isLeader)
                └── Profile tab
```

## Key Patterns

### Authentication Check
```tsx
const { session, user, profile, isLeader, isAdmin } = useAuth();
```

### Supabase Queries
```tsx
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('column', value);
```

### Role-based Rendering
```tsx
{isLeader && <LeaderOnlyComponent />}
```

## Styling Conventions

- Dark theme: Background `#0F172A`, cards `#1E293B`
- Primary blue: `#3B82F6`
- Leader purple: `#7C3AED`
- Text: `#F8FAFC` (primary), `#94A3B8` (secondary)
- All styles use React Native StyleSheet
- Consistent padding: 20px horizontal, 16px card padding
- Border radius: 12-16px for cards, 20px for buttons

## Database Access

All database access goes through the Supabase client with RLS (Row Level Security):
- Users can only see data they're permitted to see
- Leaders/admins have broader permissions
- See `supabase-schema.sql` for full policies

