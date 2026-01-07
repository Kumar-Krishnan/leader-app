# Leader App

A mobile app for community leaders to manage threads, meetings, resources, and team communication.

## Features

- 💬 **Cohesive Threads** - Group messaging with ability to add new members
- 📅 **Meetings** - Display meeting info with passages and relevant details
- 📚 **Resources** - Shared resource library with visibility controls
- 👥 **User/Leader Roles** - Role-based access and features
- ⭐ **Leader Hub** - Private resources and leader-to-leader sharing
- 🔔 **Push Notifications** - Configurable notifications for messages, meetings, etc.
- 🔗 **HubSpot Integration** - Connect with HubSpot CRM (coming soon)

## Tech Stack

- **Frontend**: React Native + Expo
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **Notifications**: Expo Push Notifications
- **Navigation**: React Navigation

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Supabase account (free tier works)

### 1. Clone and Install

```bash
cd leader_app
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor in your Supabase dashboard
3. Copy and run the contents of `supabase-schema.sql`
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

### 5. Preview on Your Phone

1. Download "Expo Go" from the App Store or Play Store
2. Scan the QR code shown in terminal
3. The app will load on your device

## Project Structure

```
leader_app/
├── App.tsx                    # App entry point
├── src/
│   ├── components/           # Reusable UI components
│   ├── contexts/
│   │   └── AuthContext.tsx   # Authentication state
│   ├── hooks/                # Custom React hooks
│   ├── lib/
│   │   └── supabase.ts       # Supabase client config
│   ├── navigation/
│   │   ├── AuthNavigator.tsx # Sign in/up flow
│   │   ├── MainNavigator.tsx # Main tab navigation
│   │   └── RootNavigator.tsx # Root navigation logic
│   ├── screens/
│   │   ├── auth/             # Authentication screens
│   │   ├── main/             # Main app screens
│   │   └── leader/           # Leader-only screens
│   └── types/
│       └── database.ts       # TypeScript types
├── supabase-schema.sql       # Database schema
└── .env.example              # Environment template
```

## Development Roadmap

- [x] Phase 1: Project setup, auth, navigation
- [ ] Phase 2: Real-time messaging in threads
- [ ] Phase 3: Push notifications
- [ ] Phase 4: Meetings & Resources CRUD
- [ ] Phase 5: Leader resource sharing
- [ ] Phase 6: HubSpot integration
- [ ] Phase 7: TestFlight & App Store

## Testing User Roles

To test leader features, update a user's role in Supabase:

```sql
UPDATE profiles SET role = 'leader' WHERE email = 'your@email.com';
```

## Deploying to iOS

1. Create an Apple Developer account
2. Run `npx expo prebuild` to generate native projects
3. Run `npx expo run:ios --configuration Release`
4. Or use EAS Build: `npx eas build --platform ios`

## License

Private - All rights reserved

