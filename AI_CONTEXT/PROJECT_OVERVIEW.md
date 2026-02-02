# Leader App - Project Overview

## Purpose
A mobile/web app for community leaders to manage:
- Group messaging threads
- Meeting scheduling with topics/resources
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
| Theme | Centralized | `src/constants/theme.ts` |

## Current Focus

**Demo Org Target** - Building toward a demo-ready state for organizational pilot.

## Key Features Status

| Feature | Status | Notes |
|---------|--------|-------|
| Authentication | Complete | Email/password via Supabase |
| User Roles | Complete | user/leader/admin in profiles table |
| Group System | Complete | Users belong to groups, join via codes |
| Join Approval | Complete | Leaders approve join requests |
| Threads | Complete | Create, view, real-time messages |
| Message Edit/Delete | Complete | Users can edit/delete own messages |
| Resources | Complete | Folders, file uploads, links |
| Resource Sharing | Complete | Share resources across groups |
| Leader Hub | Complete | Separate tab with leader-only resources |
| Netlify Deploy | Complete | Auto-deploy on push |
| Meetings | Complete | Full CRUD, series, RSVP, skip |
| Meeting Series | Complete | Recurring meetings with series editor |
| Push Notifications | Not started | expo-notifications installed |
| Email Reminders | Not started | Future: Supabase Edge Function + Resend |
| HubSpot File Sync | Partial | File sync works, runs every 8 hours |

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

## HubSpot Integration

Files from HubSpot File Manager sync automatically to a system-managed "HubSpot Resources" group.

**How it works:**
- Supabase Edge Function (`hubspot-sync`) fetches files from HubSpot API
- Files are uploaded to Supabase Storage and linked as resources
- Deduplication by name + file size prevents duplicates
- GitHub Actions triggers sync every 8 hours (0:00, 8:00, 16:00 UTC)

**System Group:**
- "HubSpot Resources" group created automatically (`system_type = 'hubspot'`)
- All leaders/admins auto-join via database trigger
- Synced files appear in "HubSpot Resources" folder within the group

**Configuration:**
- `HUBSPOT_ACCESS_TOKEN` secret set in Supabase Edge Functions
- `SUPABASE_URL` and `SUPABASE_ANON_KEY` set in GitHub Actions secrets

**Manual sync:**
```bash
curl -X POST "https://PROJECT.supabase.co/functions/v1/hubspot-sync" \
  -H "Authorization: Bearer ANON_KEY" \
  -H "Content-Type: application/json"
```

## Meetings System

### Features
- **Single Meetings** - One-off events with date, time, location, description
- **Meeting Series** - Recurring meetings (weekly, etc.) with shared title but individual descriptions
- **RSVP** - Attendees can respond Yes/Maybe/No to individual meetings or entire series
- **Skip Meeting** - Organizers can skip a week, pushing all dates forward by one frequency interval

### Key Behaviors
- Series displayed as single card on main view showing next upcoming meeting
- Clicking series card opens view of all meetings with individual RSVP
- "Edit Series" opens spreadsheet-like editor for per-meeting descriptions
- Skip resets individual RSVPs but preserves series RSVPs
- Users who declined a specific date revert to their series preference when date changes

### Files
- `src/hooks/useMeetings.ts` - All meeting operations (CRUD, RSVP, skip)
- `src/screens/main/MeetingsScreen.tsx` - Main meetings list with series grouping
- `src/components/CreateMeetingModal.tsx` - Create single or series meetings
- `src/components/MeetingSeriesEditorModal.tsx` - Edit series descriptions

## Leader Hub

The Leader Hub is a separate tab visible only to leaders, containing resources with `visibility: 'leaders_only'`.

### Separation from Main Resources
- Main Resources tab shows resources with `visibility: 'all'`
- Leader Hub shows only resources with `visibility: 'leaders_only'`
- No overlap - leader-only resources do NOT appear in the main Resources tab

### Features
- Full folder navigation with breadcrumbs
- Create folders, upload files, add links
- All resources created here automatically have `visibility: 'leaders_only'`
- Comments and sharing functionality
- Same UI/UX as main Resources tab

### Files
- `src/screens/leader/LeaderResourcesScreen.tsx` - Leader Hub screen
- `src/hooks/useResources.ts` - Accepts `{ visibility: 'leaders_only' }` option

---

## Test Coverage

**Total: 321 tests passing**

### Well-Tested Areas
| Area | Test File | Tests |
|------|-----------|-------|
| useMeetings hook | `__tests__/hooks/useMeetings.test.tsx` | 17 |
| MeetingSeriesEditorModal | `__tests__/components/MeetingSeriesEditorModal.test.tsx` | 17 |
| useThreads hook | `__tests__/hooks/useThreads.test.tsx` | 11 |
| useMessages hook | `__tests__/hooks/useMessages.test.tsx` | 10 |
| useResources hook | `__tests__/hooks/useResources.test.tsx` | 12 |
| useGroupMembers hook | `__tests__/hooks/useGroupMembers.test.tsx` | 9 |
| AuthContext | `__tests__/contexts/AuthContext.test.tsx` | 9 |
| GroupContext | `__tests__/contexts/GroupContext.test.tsx` | 9 |
| Auth screens | `__tests__/screens/auth/*.test.tsx` | 34 |
| ProfileScreen | `__tests__/screens/main/ProfileScreen.test.tsx` | 24 |
| MeetingsScreen | `__tests__/screens/main/MeetingsScreen.test.tsx` | 17 |
| ThreadsScreen | `__tests__/screens/main/ThreadsScreen.test.tsx` | 21 |
| GroupSidebar | `__tests__/components/GroupSidebar.test.tsx` | 28 |
| DrawerNavigator | `__tests__/navigation/DrawerNavigator.test.tsx` | 9 |

---

## Future Features

| Feature | Priority | Notes |
|---------|----------|-------|
| Push Notifications | High | expo-notifications already installed |
| Email Reminders | Medium | Supabase Edge Function + Resend, 2-3 days before meetings |
| Meeting Attachments | Low | Link resources/files to meetings |
| Calendar Integration | Low | Export to Google/Apple Calendar |

---

## Access Control

Currently restricted to 3 email addresses for development. Remove restriction in Supabase SQL Editor when ready to open up.
