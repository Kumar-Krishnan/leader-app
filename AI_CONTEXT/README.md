# AI Context

This folder contains documentation for AI coding assistants working on this project.

## Files

| File | Purpose |
|------|---------|
| `PROJECT_OVERVIEW.md` | High-level overview, features, tech stack |
| `ARCHITECTURE.md` | Code structure, navigation flow, patterns |
| `DATABASE.md` | Supabase schema, RLS policies, relationships |
| `SUPABASE_SETUP.md` | Current Supabase state, deployment config |
| `NEXT_STEPS.md` | TODO list, priorities, deployment info |
| `COMMON_TASKS.md` | How-to guides for common development tasks |
| `TESTING.md` | Testing plan, status, and coverage goals |
| `TESTING_LESSONS_LEARNED.md` | **Read this before writing tests!** Patterns, pitfalls, debugging |
| `ARCHITECTURE_IMPROVEMENTS.md` | **Long-term roadmap** - Interfaces, patterns, refactoring guide |

## Quick Start for AI Agents

1. Read `PROJECT_OVERVIEW.md` first for context
2. Check `NEXT_STEPS.md` for current priorities
3. Reference `ARCHITECTURE.md` for code patterns
4. See `DATABASE.md` for Supabase/data questions
5. Use `COMMON_TASKS.md` for implementation patterns

## Key Points

- **React Native + Expo** - Cross-platform mobile/web app
- **Supabase** - Backend (PostgreSQL + Auth + Realtime + Storage)
- **TypeScript** - Strict typing throughout
- **Dark theme** - Primary background `#0F172A`
- **Role-based** - user/leader/admin roles affect UI and permissions
- **Group system** - Users belong to groups, content is scoped per group

## Current State (January 2026)

The app is deployed on Netlify with:
- ✅ Full authentication flow
- ✅ Group system with join codes and approval
- ✅ Real-time messaging in threads
- ✅ Resource management with folders and file uploads
- ✅ Navigation with persistent bottom tabs
- ⏳ Push notifications (not started)
- ⏳ Meetings CRUD (list view only)
- ⏳ HubSpot integration (not started)

## Terminology

- **Group** - A community/organization users belong to (formerly "Parish")
- **Thread** - A group messaging conversation
- **Leader** - User who can create content and manage members
- **Leader-helper** - Can approve join requests but not create content
