# Project Overview

## Purpose
Mobile/web app for community leaders to manage group messaging, meeting scheduling, resource sharing, and leader-to-leader collaboration.

## Platforms
- **Web** (primary) — Deployed on Netlify, auto-deploys from `main`
- **iOS/Android** (future) — via Expo/React Native

## Features

| Feature | Status |
|---------|--------|
| Authentication (email/password) | Complete |
| Group system (join codes, approval, roles) | Complete |
| Threads (real-time messaging, edit/delete) | Complete |
| Meetings (CRUD, series, RSVP, skip) | Complete |
| Resources (folders, file uploads, links) | Complete |
| Resource sharing between groups | Complete |
| Leader Hub (leader-only resources tab) | Complete |
| HubSpot file sync (every 8 hours) | Complete |
| Meeting email reminders | Complete |
| Push notifications | Not started |

## Group System
- Users must belong to at least one group
- Join via 6-character codes, requires leader approval
- Per-group roles: member, leader-helper, leader, admin
- All content (threads, meetings, resources) is scoped to current group

## HubSpot Integration
- Edge Function (`hubspot-sync`) fetches files from HubSpot File Manager
- Files uploaded to Supabase Storage as resources
- GitHub Actions triggers sync every 8 hours
- System group "HubSpot Resources" auto-created, all leaders auto-join

## Environment
```
EXPO_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Running
```bash
npm install
npm start        # then press w (web), i (iOS sim), or scan QR
npm test         # 321 tests
```
