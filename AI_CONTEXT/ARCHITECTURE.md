# Architecture & Code Structure

## Directory Structure

```
leader_app/
├── CLAUDE.md                      # Always-loaded AI conventions (hot memory)
├── App.tsx                        # Root component, providers, navigation
├── src/
│   ├── components/                # 21 files — modals and shared UI
│   ├── contexts/
│   │   ├── AuthContext.tsx        # Session, profile, global roles
│   │   └── GroupContext.tsx       # Group membership, per-group roles
│   ├── hooks/                     # 10 files — business logic layer
│   │   ├── useThreads.ts
│   │   ├── useMeetings.ts
│   │   ├── useMessages.ts
│   │   ├── useResources.ts
│   │   ├── useGroupMembers.ts
│   │   └── index.ts              # Barrel file
│   ├── repositories/             # 9 files — data access layer
│   ├── services/
│   │   ├── auth/                 # AuthService interface + SupabaseAuthService
│   │   ├── email/                # EmailService interface + implementation
│   │   ├── realtime/             # RealtimeService interface + implementation
│   │   └── locationAnalytics.ts
│   ├── lib/
│   │   ├── supabase.ts           # Client creation + isSupabaseConfigured
│   │   └── storage/              # StorageProvider interface, Supabase + S3 implementations
│   ├── navigation/
│   │   ├── RootNavigator.tsx     # Auth → GroupSelect → Main routing
│   │   ├── MainNavigator.tsx     # Tab navigator with nested stacks
│   │   └── types.ts              # Navigation param types
│   ├── screens/
│   │   ├── auth/                 # SignIn, SignUp
│   │   ├── main/                 # Threads, ThreadDetail, Meetings, Resources, Profile
│   │   ├── group/                # GroupSelect, ManageMembers
│   │   └── leader/               # LeaderResources
│   ├── types/
│   │   ├── database.ts           # 489 lines — Supabase types, entity interfaces
│   │   └── enums.ts
│   └── constants/
│       └── theme.ts              # LeaderImpact branding: #2D2D2D bg, #F9C80E accent
├── supabase/
│   └── functions/                # Edge Functions (Deno runtime)
├── __tests__/                    # Mirrors src/ structure
├── __mocks__/                    # Supabase, hook, context, factory mocks
└── AI_CONTEXT/                   # Cold memory docs (load on demand)
```

## Navigation Flow

```
App.tsx → AuthProvider → GroupProvider → NavigationContainer
  └── RootNavigator
      ├── AuthNavigator (no session)
      │   ├── SignIn
      │   └── SignUp
      ├── GroupSelectScreen (no group selected)
      └── MainNavigator (session + group)
          └── Tab.Navigator (persistent bottom tabs)
              ├── Threads → ThreadsList, ThreadDetail
              ├── Meetings
              ├── Resources
              ├── LeaderHub (leaders only)
              └── Profile → ProfileMain, ManageMembers
```

## Data Flow Pattern

```
Repository (Supabase queries)
    ↓
Hook (state management, effects, real-time subscriptions)
    ↓
Screen/Component (presentational, delegates to hook)
```

Example:
```tsx
// Screen — thin, presentational
function ThreadsScreen() {
  const { threads, loading, createThread } = useThreads();
  // render only
}

// Hook — all logic
function useThreads() {
  // calls threadsRepo, manages state, subscribes to realtime
}

// Repo — data access only
export async function fetchThreads(groupId: string) {
  return supabase.from('threads').select('*').eq('group_id', groupId);
}
```

## Context Providers

### AuthContext
- Manages Supabase session, fetches/caches profile
- Provides: `session`, `user`, `profile`, `isLeader`, `isAdmin`, `signIn`, `signOut`
- 3-second timeout on `getSession` to handle corrupted sessions

### GroupContext
- Fetches user's group memberships, manages current group selection
- Persists selection to AsyncStorage
- Provides: `currentGroup`, `groups`, `isGroupLeader`, `isGroupAdmin`, `canApproveRequests`
- Handles: group creation, join requests, approvals

## Styling
- Theme: `src/constants/theme.ts` — centralized colors, spacing, typography, shadow presets
- Background: `#2D2D2D`, Cards: `#363636`, Accent: `#F9C80E`
- All styles via `StyleSheet.create` at bottom of files
- Import: `import { colors, spacing, fontSize } from '../constants/theme'`

## Platform Handling
- Web: localStorage for auth tokens
- Native: SecureStore for auth tokens
- `Platform.OS` guards for web vs native differences (e.g., `Alert.alert` vs `window.confirm`)

## Resource Visibility
```tsx
useResources()                              // default: excludes leaders_only
useResources({ visibility: 'leaders_only' }) // Leader Hub only
```
No overlap between main Resources tab and Leader Hub.

## Resource Sharing
- Resources/folders can be shared between groups (reference, not copy)
- Only source group leaders can edit/delete shared items
- Shared items show "Shared from [Group Name]" in receiving group
