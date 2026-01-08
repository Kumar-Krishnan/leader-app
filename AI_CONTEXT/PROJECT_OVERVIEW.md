# Leader App - Project Overview

## Purpose
A mobile/web app for community leaders (e.g., Bible study groups, small groups) to manage:
- Group messaging threads
- Meeting scheduling with passages/resources
- Resource sharing
- Leader-to-leader collaboration

## Target Platforms
- iOS (primary) - via Expo/React Native
- Web (development/secondary)
- Android (future)

## Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Frontend | React Native + Expo | Cross-platform, TypeScript |
| Backend | Supabase | PostgreSQL, Auth, Realtime, RLS |
| Navigation | React Navigation | Native stack + bottom tabs |
| State | React Context | AuthContext for user/session |
| Notifications | Expo Notifications | Push notifications (not yet implemented) |

## Key Features Status

| Feature | Status | Notes |
|---------|--------|-------|
| Authentication | ✅ Complete | Email/password via Supabase |
| User Roles | ✅ Complete | user/leader/admin in profiles table |
| Parish System | ✅ Complete | Users belong to parishes, can join multiple |
| Role-based UI | ✅ Complete | Leader Hub tab only for parish leaders |
| Threads (messaging) | ✅ Complete | Create, view, real-time messages |
| Meetings | 🟡 Partial | List view done, need CRUD |
| Resources | 🟡 Partial | List view done, need CRUD |
| Leader Hub | 🟡 Partial | List view done, need sharing |
| Push Notifications | ❌ Not started | expo-notifications installed |
| HubSpot Integration | ❌ Not started | Planned for later phase |

## Parish System

- Users must belong to at least one parish
- Users can join multiple parishes via 6-character codes
- Each parish has its own threads, meetings, resources
- Users have roles per-parish (member, leader, admin)
- Parish admins can see the join code in Profile

## User Roles

1. **user** - Regular member
   - Can view threads they're added to
   - Can view meetings and public resources
   - Cannot create content

2. **leader** - Group leader
   - All user permissions
   - Can create threads, meetings, resources
   - Access to Leader Hub
   - Can share resources with other leaders

3. **admin** - System admin
   - All leader permissions
   - Can manage user roles
   - Full system access

## Running the App

```bash
# Install dependencies
npm install

# Start Expo dev server
npm start

# Then press:
# w - web browser
# i - iOS simulator (requires Xcode + iOS runtime)
# Scan QR - Expo Go app on phone
```

## Environment Setup

Copy `env.example` to `.env` and add Supabase credentials:
```
EXPO_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

