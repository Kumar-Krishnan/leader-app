# Leader App - Project Overview

## Purpose
A mobile/web app for community leaders to manage:
- Group messaging threads
- Meeting scheduling with passages/resources
- Resource sharing (files, links, documents)
- Leader-to-leader collaboration

## Target Platforms
- **Web** (primary) - Deployed on Netlify
- **iOS** (future) - via Expo/React Native
- **Android** (future) - via Expo/React Native

## Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Frontend | React Native + Expo | Cross-platform, TypeScript |
| Backend | Supabase | PostgreSQL, Auth, Realtime, Storage |
| Hosting | Netlify | Auto-deploy from GitHub |
| Navigation | React Navigation | Nested stacks within tabs |
| State | React Context | AuthContext + GroupContext |

## Key Features Status

| Feature | Status | Notes |
|---------|--------|-------|
| Authentication | ✅ Complete | Email/password via Supabase |
| User Roles | ✅ Complete | user/leader/admin in profiles table |
| Group System | ✅ Complete | Users belong to groups, join via codes |
| Join Approval | ✅ Complete | Leaders approve join requests |
| Threads | ✅ Complete | Create, view, real-time messages |
| Message Edit/Delete | ✅ Complete | Users can edit/delete own messages |
| Resources | ✅ Complete | Folders, file uploads, links |
| Netlify Deploy | ✅ Complete | Auto-deploy on push |
| Meetings | 🟡 Partial | List view done, need CRUD |
| Push Notifications | ❌ Not started | expo-notifications installed |
| HubSpot Integration | ❌ Not started | Planned for later phase |

## Group System

- Users must belong to at least one group to use the app
- Users can join multiple groups via 6-character codes
- Each group has its own threads, meetings, resources
- Users have roles per-group: member, leader-helper, leader, admin
- Group admins can see the join code in Profile screen
- Join requests require approval from leader/leader-helper/admin

## User Roles (Global)

1. **user** - Regular member
   - Can view threads they're added to
   - Can view meetings and public resources
   - Cannot create content

2. **leader** - Group leader
   - All user permissions
   - Can create threads, meetings, resources
   - Can create groups
   - Access to Leader Hub

3. **admin** - System admin
   - All leader permissions
   - Can manage user roles
   - Full system access

## Group Roles (Per-Group)

1. **member** - Regular group member
2. **leader-helper** - Can approve join requests
3. **leader** - Can create content, manage members
4. **admin** - Full group control, sees join code

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

## Deployment

Web app is deployed on Netlify:
- Auto-deploys on push to `main`
- Environment variables set in Netlify dashboard
- Configuration in `netlify.toml`

## Access Control

Currently restricted to 3 email addresses for development. Remove restriction in Supabase SQL Editor when ready to open up.
