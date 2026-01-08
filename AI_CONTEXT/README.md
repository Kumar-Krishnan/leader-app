# AI Context

This folder contains documentation for AI coding assistants working on this project.

## Files

| File | Purpose |
|------|---------|
| `PROJECT_OVERVIEW.md` | High-level overview, features, tech stack |
| `ARCHITECTURE.md` | Code structure, navigation flow, patterns |
| `DATABASE.md` | Supabase schema, RLS policies, relationships |
| `SUPABASE_SETUP.md` | Current Supabase state, fixes applied, how to export |
| `NEXT_STEPS.md` | TODO list, priorities, deployment info |
| `COMMON_TASKS.md` | How-to guides for common development tasks |

## Quick Start for AI Agents

1. Read `PROJECT_OVERVIEW.md` first for context
2. Check `NEXT_STEPS.md` for current priorities
3. Reference `ARCHITECTURE.md` for code patterns
4. See `DATABASE.md` for Supabase/data questions
5. Use `COMMON_TASKS.md` for implementation patterns

## Key Points

- **React Native + Expo** - Cross-platform mobile app
- **Supabase** - Backend (PostgreSQL + Auth + Realtime)
- **TypeScript** - Strict typing throughout
- **Dark theme** - Primary background `#0F172A`
- **Role-based** - user/leader/admin roles affect UI and permissions

## Current State

The app has basic authentication and navigation working. List views for threads, meetings, and resources are implemented but pull from real Supabase data (currently empty). The next major work is adding CRUD operations and real-time messaging.

