# Leader App — Core Conventions

## Stack
React Native (Expo 54), Supabase (PostgreSQL + Auth + Realtime + Storage), TypeScript strict mode, React Navigation (nested stacks in tabs), deployed on Netlify (web).

## Architecture
Horizontal layers with repo → hook → component → screen pattern:
- `src/repositories/` — plain async functions wrapping Supabase queries
- `src/services/` — interface + implementation (auth, email, realtime)
- `src/hooks/` — consume repos/services, manage state + effects
- `src/contexts/` — AuthContext (session, profile, roles), GroupContext (group membership, roles)
- `src/screens/` — mostly presentational, delegate logic to hooks
- `src/components/` — modals and shared UI
- `src/lib/` — Supabase client, storage abstraction, utilities
- `src/constants/theme.ts` — centralized colors, spacing, typography (LeaderImpact branding)

## Critical Rules
- NEVER import supabase directly in hooks/components — go through repositories
- NEVER use class components — functional components only
- For tables NOT in the Database interface: use `(supabase as any).from('table')`
- For tables with `never` insert/update types: use `(supabase.from('table') as any).insert(...)`
- Theme values: always import from `src/constants/theme.ts`
- Modals: accept `visible` and `onClose` props

## Testing
- 321 tests across 21 suites. Run with `npm test`
- Screen tests mock hooks (NOT Supabase directly)
- Hook tests mock repositories
- Use mutable mock objects so values can change per test
- `beforeEach`: always `jest.clearAllMocks()` and reset mock state
- Use `waitFor` for all async assertions

## File Naming
- Components/Screens: PascalCase.tsx
- Hooks: camelCase with `use` prefix
- Repos/Services: camelCase
- Tests: `__tests__/` directory mirrors `src/` structure

## Key Types
- `src/types/database.ts` — Supabase types, entity interfaces
- `src/types/enums.ts` — shared enums
- Each hook exports typed return interface (e.g., `UseThreadsResult`)
- Services have `types.ts` with interface contracts

## Roles
- Global roles (profiles.role): `user`, `leader`, `admin`
- Group roles (group_members.role): `member`, `leader-helper`, `leader`, `admin`
- Access checks: `useAuth()` for global, `useGroup()` for per-group

## Debugging
- When something "isn't working", add console.logs and troubleshoot immediately — don't theorize
- Fire-and-forget `.catch()` silently swallows errors when async functions resolve with `{ success: false }`. Use `.then()` to inspect results too.

## AI Context (Cold Memory)
Detailed docs in `AI_CONTEXT/` — load on demand, not every session:
- `ARCHITECTURE.md` — directory tree, navigation flow, code patterns
- `PROJECT_OVERVIEW.md` — features, roles, integrations
- `DATABASE.md` — schema, relationships, RLS, queries
- `TESTING.md` — testing strategy, mock patterns, pitfalls
- `SECURITY_AUDIT.md` — security findings and priority matrix
- `MEETING_REMINDERS.md` — reminder system architecture
- `EDGE_FUNCTIONS.md` — edge function patterns and deployment
- `ARCHITECTURE_IMPROVEMENTS.md` — pending improvement roadmap
