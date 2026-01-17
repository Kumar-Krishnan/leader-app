# Architecture Improvements for Long-Term Scalability

A comprehensive review of the Leader App codebase with recommendations for interfaces, patterns, and forward-facing improvements.

---

## ✅ What's Already Good

1. **Storage Abstraction Layer** (`src/lib/storage/`)
   - Excellent `StorageProvider` interface
   - Easy to swap Supabase → S3 → Azure
   - Clean separation of concerns

2. **Context Pattern**
   - `AuthContext` and `GroupContext` properly encapsulate state
   - Good use of TypeScript for type safety

3. **Database Types** (`src/types/database.ts`)
   - Strong typing for Supabase tables
   - Prevents runtime errors

4. **Navigation Structure**
   - Clean separation of auth/main/root navigators
   - Proper TypeScript param lists

---

## 🔧 Recommended Improvements

### 1. **Repository Pattern for Data Access**

**Problem**: Screens directly call `supabase.from('table')`, creating tight coupling.

**Solution**: Create repository interfaces for each domain entity.

```typescript
// src/repositories/types.ts
export interface Repository<T> {
  findById(id: string): Promise<T | null>;
  findAll(options?: QueryOptions): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

// src/repositories/ThreadRepository.ts
export interface ThreadRepository extends Repository<Thread> {
  findByGroupId(groupId: string): Promise<Thread[]>;
  findWithMessages(threadId: string): Promise<ThreadWithMessages>;
  archive(threadId: string): Promise<void>;
}

// src/repositories/supabase/SupabaseThreadRepository.ts
export class SupabaseThreadRepository implements ThreadRepository {
  constructor(private supabase: SupabaseClient) {}
  
  async findByGroupId(groupId: string): Promise<Thread[]> {
    const { data, error } = await this.supabase
      .from('threads')
      .select('*')
      .eq('group_id', groupId)
      .eq('is_archived', false)
      .order('updated_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }
  // ...
}
```

**Benefits**:
- Easier to test (mock repositories, not Supabase)
- Switch backends without touching screens
- Centralized query logic
- Better error handling

---

### 2. **Service Layer for Business Logic**

**Problem**: Business logic scattered across components.

**Solution**: Create services that orchestrate repositories and implement business rules.

```typescript
// src/services/types.ts
export interface MessageService {
  sendMessage(threadId: string, content: string): Promise<Message>;
  editMessage(messageId: string, content: string): Promise<Message>;
  deleteMessage(messageId: string): Promise<void>;
  markAsRead(threadId: string, userId: string): Promise<void>;
}

export interface MeetingService {
  createMeeting(data: CreateMeetingInput): Promise<Meeting>;
  createRecurringSeries(data: CreateMeetingInput, recurrence: Recurrence): Promise<Meeting[]>;
  rsvp(meetingId: string, status: RSVPStatus): Promise<void>;
  rsvpToSeries(seriesId: string, status: RSVPStatus): Promise<void>;
}

// src/services/supabase/SupabaseMeetingService.ts
export class SupabaseMeetingService implements MeetingService {
  constructor(
    private meetingRepo: MeetingRepository,
    private attendeeRepo: AttendeeRepository,
    private notificationService: NotificationService
  ) {}
  
  async createMeeting(data: CreateMeetingInput): Promise<Meeting> {
    const meeting = await this.meetingRepo.create(data);
    
    // Business logic: invite all attendees
    await Promise.all(
      data.attendeeIds.map(id => 
        this.attendeeRepo.create({ meeting_id: meeting.id, user_id: id })
      )
    );
    
    // Side effect: send notifications
    await this.notificationService.notifyMeetingCreated(meeting);
    
    return meeting;
  }
}
```

---

### 3. **Dependency Injection Container**

**Problem**: Hard to swap implementations, test in isolation.

**Solution**: Simple DI container for service resolution.

```typescript
// src/di/container.ts
import { createContext, useContext, ReactNode } from 'react';

interface Services {
  messageService: MessageService;
  meetingService: MeetingService;
  threadService: ThreadService;
  storageProvider: StorageProvider;
  authService: AuthService;
}

const ServicesContext = createContext<Services | null>(null);

export function ServicesProvider({ children, services }: { 
  children: ReactNode; 
  services: Services 
}) {
  return (
    <ServicesContext.Provider value={services}>
      {children}
    </ServicesContext.Provider>
  );
}

export function useServices(): Services {
  const context = useContext(ServicesContext);
  if (!context) throw new Error('useServices must be used within ServicesProvider');
  return context;
}

// Usage in App.tsx
const services = {
  messageService: new SupabaseMessageService(supabase),
  // ...
};

<ServicesProvider services={services}>
  <App />
</ServicesProvider>

// Usage in components
function ThreadDetailScreen() {
  const { messageService } = useServices();
  
  const sendMessage = async () => {
    await messageService.sendMessage(threadId, content);
  };
}
```

---

### 4. **Custom Hooks Layer**

**Problem**: Screens contain too much logic (fetching, state, effects).

**Solution**: Extract reusable hooks for each feature.

```typescript
// src/hooks/useThreads.ts
export function useThreads(groupId: string | undefined) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { threadService } = useServices();

  const fetchThreads = useCallback(async () => {
    if (!groupId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await threadService.findByGroupId(groupId);
      setThreads(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [groupId, threadService]);

  const createThread = useCallback(async (name: string) => {
    return threadService.create({ group_id: groupId, name });
  }, [groupId, threadService]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  return { threads, loading, error, refetch: fetchThreads, createThread };
}

// Usage in component
function ThreadsScreen() {
  const { currentGroup } = useGroup();
  const { threads, loading, error, createThread } = useThreads(currentGroup?.id);
  
  // Component is now purely presentational
}
```

---

### 5. **Error Boundary & Global Error Handling**

**Problem**: Errors handled inconsistently, no recovery mechanism.

**Solution**: Centralized error handling with user-friendly recovery.

```typescript
// src/lib/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = true,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NetworkError extends AppError {
  constructor(originalError?: Error) {
    super('Network connection failed', 'NETWORK_ERROR', true, { originalError });
  }
}

export class AuthError extends AppError {
  constructor(message: string) {
    super(message, 'AUTH_ERROR', false);
  }
}

// src/components/ErrorBoundary.tsx
export class ErrorBoundary extends Component<Props, State> {
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log to Sentry, Datadog, etc.
    errorReporting.capture(error, info);
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorScreen error={this.state.error} onRetry={this.reset} />;
    }
    return this.props.children;
  }
}
```

---

### 6. **Notification Service Interface**

**Problem**: Push notifications not implemented, no abstraction for future.

**Solution**: Create notification interface now, implement later.

```typescript
// src/services/notifications/types.ts
export interface NotificationService {
  // Setup
  requestPermissions(): Promise<PermissionStatus>;
  registerToken(userId: string, token: string): Promise<void>;
  
  // Send
  sendPushNotification(userId: string, notification: Notification): Promise<void>;
  sendBatchNotifications(userIds: string[], notification: Notification): Promise<void>;
  
  // In-app
  showToast(message: string, type: 'success' | 'error' | 'info'): void;
  scheduleLocalNotification(notification: LocalNotification): Promise<string>;
  cancelLocalNotification(id: string): Promise<void>;
}

export interface Notification {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: string;
  badge?: number;
}

// src/services/notifications/ExpoNotificationService.ts
export class ExpoNotificationService implements NotificationService {
  // Implement using expo-notifications
}
```

---

### 7. **State Machine for Complex Flows**

**Problem**: Join request flow, RSVP series flow have complex state transitions.

**Solution**: Use XState or custom state machines for predictable behavior.

```typescript
// src/machines/joinRequestMachine.ts
import { createMachine, assign } from 'xstate';

export const joinRequestMachine = createMachine({
  id: 'joinRequest',
  initial: 'idle',
  context: {
    groupCode: '',
    error: null,
  },
  states: {
    idle: {
      on: { SUBMIT: 'validating' }
    },
    validating: {
      invoke: {
        src: 'validateCode',
        onDone: 'submitting',
        onError: { target: 'error', actions: 'setError' }
      }
    },
    submitting: {
      invoke: {
        src: 'submitRequest',
        onDone: 'pending',
        onError: { target: 'error', actions: 'setError' }
      }
    },
    pending: {
      on: { 
        APPROVED: 'approved',
        REJECTED: 'rejected'
      }
    },
    approved: { type: 'final' },
    rejected: { type: 'final' },
    error: {
      on: { RETRY: 'idle' }
    }
  }
});
```

---

### 8. **API Response Wrapper**

**Problem**: Supabase error handling is repetitive and inconsistent.

**Solution**: Unified response handling.

```typescript
// src/lib/api.ts
export type ApiResult<T> = 
  | { success: true; data: T }
  | { success: false; error: AppError };

export async function safeQuery<T>(
  query: Promise<{ data: T | null; error: any }>
): Promise<ApiResult<T>> {
  try {
    const { data, error } = await query;
    
    if (error) {
      return { 
        success: false, 
        error: new AppError(error.message, error.code) 
      };
    }
    
    if (data === null) {
      return { 
        success: false, 
        error: new AppError('No data returned', 'NO_DATA') 
      };
    }
    
    return { success: true, data };
  } catch (err) {
    return { 
      success: false, 
      error: new NetworkError(err as Error) 
    };
  }
}

// Usage
const result = await safeQuery(
  supabase.from('threads').select('*').eq('id', threadId).single()
);

if (!result.success) {
  // Handle error uniformly
  handleError(result.error);
  return;
}

// result.data is typed and guaranteed to exist
const thread = result.data;
```

---

### 9. **Feature Flags System**

**Problem**: No way to gradually roll out features or A/B test.

**Solution**: Simple feature flag infrastructure.

```typescript
// src/lib/features.ts
export interface FeatureFlags {
  enablePushNotifications: boolean;
  enableHubSpotIntegration: boolean;
  enableFileSharing: boolean;
  maxMeetingAttendees: number;
  enableRealtimePresence: boolean;
}

const defaultFlags: FeatureFlags = {
  enablePushNotifications: false,
  enableHubSpotIntegration: false,
  enableFileSharing: true,
  maxMeetingAttendees: 50,
  enableRealtimePresence: false,
};

// Could fetch from Supabase, LaunchDarkly, etc.
export function useFeatureFlags(): FeatureFlags {
  const [flags, setFlags] = useState<FeatureFlags>(defaultFlags);
  
  useEffect(() => {
    // Fetch from server or use defaults
    fetchFeatureFlags().then(setFlags).catch(() => {});
  }, []);
  
  return flags;
}

// Usage
function MeetingsScreen() {
  const { enablePushNotifications } = useFeatureFlags();
  
  return (
    <>
      {enablePushNotifications && <NotificationToggle />}
    </>
  );
}
```

---

### 10. **Offline-First Architecture**

**Problem**: App is unusable offline.

**Solution**: Design for offline with sync.

```typescript
// src/lib/offline/types.ts
export interface OfflineQueue {
  enqueue(action: QueuedAction): Promise<void>;
  process(): Promise<void>;
  getQueueSize(): number;
}

export interface QueuedAction {
  id: string;
  type: 'CREATE_MESSAGE' | 'UPDATE_MESSAGE' | 'CREATE_RSVP' | ...;
  payload: Record<string, unknown>;
  createdAt: Date;
  retryCount: number;
}

// src/lib/offline/OfflineManager.ts
export class OfflineManager {
  private queue: QueuedAction[] = [];
  
  async executeWithOfflineSupport<T>(
    onlineAction: () => Promise<T>,
    offlineAction: QueuedAction
  ): Promise<T | 'queued'> {
    if (await this.isOnline()) {
      return onlineAction();
    }
    
    await this.enqueue(offlineAction);
    return 'queued';
  }
  
  async syncWhenOnline() {
    // Process queue when connection restored
  }
}
```

---

## 📁 Recommended Folder Structure

```
src/
├── components/          # Presentational components
│   ├── common/         # Buttons, inputs, modals
│   ├── threads/        # Thread-specific components
│   ├── meetings/       # Meeting-specific components
│   └── ...
├── screens/            # Screen components (thin, mostly composition)
├── contexts/           # React contexts (keep thin)
├── hooks/              # Custom hooks (useThreads, useMeetings, etc.)
├── services/           # Business logic layer
│   ├── types.ts        # Service interfaces
│   └── supabase/       # Supabase implementations
├── repositories/       # Data access layer
│   ├── types.ts        # Repository interfaces
│   └── supabase/       # Supabase implementations
├── lib/               # Utilities, clients, config
│   ├── api.ts         # API utilities
│   ├── errors.ts      # Error classes
│   ├── features.ts    # Feature flags
│   ├── offline/       # Offline support
│   ├── storage/       # Storage abstraction (✅ already exists)
│   └── supabase.ts    # Supabase client
├── machines/          # State machines (optional, for complex flows)
├── navigation/        # Navigation config
├── types/            # TypeScript types & interfaces
└── di/               # Dependency injection
```

---

## 🎯 Implementation Priority

| Priority | Improvement | Impact | Effort | Status |
|----------|-------------|--------|--------|--------|
| 1 | Custom Hooks Layer | High | Low | ✅ DONE |
| 2 | Service Interfaces | High | Medium | Pending |
| 3 | Repository Pattern | High | Medium | Pending |
| 4 | Error Handling | Medium | Low | Pending |
| 5 | API Response Wrapper | Medium | Low | Pending |
| 6 | Notification Interface | Medium | Low | Pending |
| 7 | DI Container | Medium | Medium | Pending |
| 8 | Feature Flags | Low | Low | Pending |
| 9 | State Machines | Low | High | Pending |
| 10 | Offline Support | Low | High | Pending |

---

## Quick Wins to Start

1. ✅ **Extract `useThreads`, `useMeetings`, `useMessages` hooks** - DONE! See `src/hooks/`
2. **Create service interfaces** - define contracts before implementation
3. **Add `safeQuery` wrapper** - standardize error handling today
4. **Create `NotificationService` interface** - ready for when you implement push

---

## ✅ IMPLEMENTED: Custom Hooks Pattern

The hooks layer has been implemented! Here's what was created:

### `src/hooks/useThreads.ts`
```typescript
const { threads, loading, error, refetch, createThread, archiveThread } = useThreads();
```
- Fetches threads for current group
- Create/archive thread with optimistic updates
- Full error handling

### `src/hooks/useMeetings.ts`
```typescript
const { meetings, loading, error, refetch, rsvpToMeeting, rsvpToSeries, deleteMeeting, deleteSeries } = useMeetings();
```
- Fetches upcoming meetings with attendees
- RSVP to single meeting or entire series
- Delete single or series with optimistic updates

### `src/hooks/useMessages.ts`
```typescript
const { messages, loading, sending, error, refetch, sendMessage, editMessage, deleteMessage } = useMessages(threadId);
```
- Fetches messages with sender info
- Real-time subscription for new/updated/deleted messages
- Send/edit/delete with optimistic updates

### `src/hooks/useResources.ts`
```typescript
const { folders, resources, currentFolderId, folderPath, loading, uploading, openFolder, goBack, createFolder, uploadFileResource, createLinkResource, deleteFolder, deleteResource, getResourceUrl } = useResources();
```
- Folder/resource fetching with navigation
- Folder navigation (open, back, root)
- File upload and link creation
- Delete operations with storage cleanup
- Download URL generation

### `src/hooks/useGroupMembers.ts`
```typescript
const { members, loading, error, processingId, refetch, updateRole, removeMember } = useGroupMembers();
```
- Fetches members with profile info
- Role updates with optimistic UI
- Member removal

### Usage Pattern
```tsx
// Before (in component)
const [threads, setThreads] = useState([]);
const [loading, setLoading] = useState(true);
useEffect(() => { /* fetch logic */ }, []);
const fetchThreads = async () => { /* supabase calls */ };

// After (with hook)
const { threads, loading, refetch } = useThreads();
// That's it! Component is now purely presentational
```

### Benefits Achieved
- **Testability**: 30 hook tests covering all operations
- **Reusability**: Same logic can be used in multiple screens
- **Separation**: Components are thin, focused on presentation
- **Type Safety**: Full TypeScript interfaces for all returns

### Screens Refactored to Use Hooks
- ✅ `ThreadsScreen` → uses `useThreads`
- ✅ `MeetingsScreen` → uses `useMeetings`
- ✅ `ThreadDetailScreen` → uses `useMessages`
- ✅ `ResourcesScreen` → uses `useResources`
- ✅ `ManageMembersScreen` → uses `useGroupMembers`

### Services Layer
- ✅ `locationAnalytics.ts` → Anonymous location events for analytics

### Test Strategy Update
The screen tests now mock the hooks instead of mocking Supabase directly:

```typescript
// OLD (mocking Supabase)
jest.mock('../../../src/lib/supabase');
(supabase.from as jest.Mock).mockReturnValue(createMockChain([mockData]));

// NEW (mocking hooks)
jest.mock('../../../src/hooks/useMeetings', () => ({
  useMeetings: () => mockUseMeetingsResult,
}));

mockUseMeetingsResult = {
  meetings: [mockMeeting],
  loading: false,
  error: null,
  rsvpToMeeting: jest.fn().mockResolvedValue(true),
  // ...
};
```

This approach is:
- **Simpler** - No need to recreate Supabase query chains
- **Focused** - Tests screen behavior, not Supabase implementation
- **Decoupled** - Changing Supabase calls in hooks doesn't break screen tests

---

*Last updated: January 2026*

