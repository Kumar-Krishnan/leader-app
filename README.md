# Leader App

A mobile/web app for community leaders to manage groups, threads, meetings, resources, and team communication.

## Features

- 💬 **Cohesive Threads** - Real-time group messaging with member management
- 📅 **Meetings** - Schedule meetings with passages and resources
- 📚 **Resources** - Shared resource library with folders, file uploads, and links
- 👥 **Groups** - Multi-group support with join codes and approval workflow
- ⭐ **Leader Hub** - Private leader-only resources
- 🔔 **Push Notifications** - Configurable notifications (coming soon)
- 🔗 **HubSpot Integration** - Connect with HubSpot CRM (coming soon)

## Tech Stack

- **Frontend**: React Native + Expo
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **Hosting**: Netlify (web)
- **Navigation**: React Navigation (nested stacks + tabs)

## Live Demo

Deployed at: [Your Netlify URL]

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm or yarn
- Supabase account (free tier works)

### 1. Clone and Install

```bash
cd leader_app
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor in your Supabase dashboard
3. Run the contents of `supabase-fresh-start.sql`
4. Go to Settings > API to get your project URL and anon key

### 3. Configure Environment

```bash
cp env.example .env
```

Edit `.env` with your Supabase credentials:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run the App

```bash
# Start Expo development server
npm start

# Or run directly on specific platform
npm run ios      # iOS Simulator
npm run android  # Android Emulator
npm run web      # Web browser
```

## Project Structure

```
leader_app/
├── App.tsx                    # App entry point
├── netlify.toml               # Netlify deployment config
├── src/
│   ├── components/            # Reusable UI components
│   │   ├── CreateThreadModal.tsx
│   │   └── AddResourceModal.tsx
│   ├── contexts/
│   │   ├── AuthContext.tsx    # Authentication state
│   │   └── GroupContext.tsx   # Group membership state
│   ├── lib/
│   │   ├── supabase.ts        # Supabase client config
│   │   └── storage/           # Storage abstraction layer
│   ├── navigation/
│   │   ├── types.ts           # Navigation type definitions
│   │   ├── AuthNavigator.tsx  # Sign in/up flow
│   │   ├── MainNavigator.tsx  # Tabs with nested stacks
│   │   └── RootNavigator.tsx  # Root navigation logic
│   ├── screens/
│   │   ├── auth/              # Authentication screens
│   │   ├── main/              # Main app screens
│   │   ├── group/             # Group selection/management
│   │   └── leader/            # Leader-only screens
│   └── types/
│       └── database.ts        # TypeScript types
├── supabase-fresh-start.sql   # Complete database schema
└── AI_CONTEXT/                # Documentation for AI agents
```

## Development Status

- [x] Authentication (email/password)
- [x] User roles (user/leader/admin)
- [x] Group system with join codes
- [x] Real-time messaging in threads
- [x] Message edit/delete
- [x] Resources with folders & file uploads
- [x] Netlify deployment
- [ ] Push notifications
- [ ] Meetings CRUD
- [ ] Leader resource sharing
- [ ] HubSpot integration

## Deployment

### Netlify (Web)

The app auto-deploys to Netlify on push to `main`. Configuration is in `netlify.toml`.

Environment variables needed in Netlify:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### iOS (Future)

```bash
npx eas build --platform ios
npx eas submit --platform ios
```

## Testing

### Run Unit Tests

```bash
npm test              # Run all tests
npm test:watch        # Watch mode for development
npm test:coverage     # Generate coverage report
```

**Current Status**: 141 tests passing across 11 test suites
- AuthContext (9 tests)
- GroupContext (9 tests)
- Supabase Config (5 tests)
- CreateThreadModal (9 tests)
- AddResourceModal (5 tests)
- SignInScreen (17 tests)
- SignUpScreen (17 tests)
- ProfileScreen (22 tests)
- MeetingsScreen (9 tests)
- ThreadsScreen (21 tests)
- ThreadDetailScreen (19 tests)

See `AI_CONTEXT/TESTING.md` for detailed testing documentation.

## Testing User Roles

```sql
-- Make a user a leader
UPDATE profiles SET role = 'leader' WHERE email = 'your@email.com';

-- Make a user an admin
UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';
```

## Development Access Control

Currently restricted to specific emails for development:
- joshirby@gmail.com
- gkrishnan803@gmail.com
- josh.irby@cru.org

To remove this restriction:
```sql
DROP TRIGGER IF EXISTS check_email_before_signup ON auth.users;
DROP FUNCTION IF EXISTS check_allowed_email();
```

## License

Private - All rights reserved
