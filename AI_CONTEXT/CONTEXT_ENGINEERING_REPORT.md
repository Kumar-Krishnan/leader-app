# Context Engineering Report: Leader App

**Date:** March 8, 2026
**Scope:** Architectural assessment of the Leader App codebase for AI-assisted development, based on current context engineering research and best practices.

---

## Executive Summary

The Leader App is already **ahead of most codebases** in AI-friendliness — the `AI_CONTEXT/` folder, strict TypeScript, repository+service pattern, and 321-test suite put it in the top tier. However, emerging research in context engineering (2025–2026) reveals concrete structural changes that would make AI agents significantly more effective at extending, refactoring, and debugging this codebase.

This report identifies **7 high-impact improvements** organized by effort and payoff.

---

## Table of Contents

1. [What is Context Engineering?](#1-what-is-context-engineering)
2. [Current State Assessment](#2-current-state-assessment)
3. [Recommendations](#3-recommendations)
   - [3.1 Adopt Layered Context Architecture](#31-adopt-layered-context-architecture)
   - [3.2 Move Toward Vertical Feature Slices](#32-move-toward-vertical-feature-slices)
   - [3.3 Create Spec-Driven Development Workflow](#33-create-spec-driven-development-workflow)
   - [3.4 Implement Hot/Cold Memory Separation](#34-implement-hotcold-memory-separation)
   - [3.5 Add Path-Scoped Rules](#35-add-path-scoped-rules)
   - [3.6 Collocate Tests with Source](#36-collocate-tests-with-source)
   - [3.7 Create Skills for Specialized Knowledge](#37-create-skills-for-specialized-knowledge)
4. [Priority Matrix](#4-priority-matrix)
5. [Sources](#5-sources)

---

## 1. What is Context Engineering?

Context engineering is the discipline of **architecting the entire information ecosystem** that an AI agent has access to — not just the prompt, but the codebase structure, documentation, conventions, type system, test patterns, and retrieval mechanisms that shape what the model sees.

The key insight from 2025–2026 research: **the contents of the context window are the only lever affecting output quality.** You cannot make the model smarter, but you can make its inputs dramatically better.

Three principles dominate the field:

| Principle | Description |
|-----------|-------------|
| **The 40% Rule** | Agent performance degrades past ~40% context window utilization (Stanford/UC Berkeley). Every token spent on exploration is a token not available for implementation. |
| **Compaction Over Accumulation** | Ruthlessly reduce what the agent sees to only what it needs, when it needs it. Large context windows create a "lost-in-the-middle" effect. |
| **Structure as Documentation** | How files are organized communicates intent. AI agents explore codebases via tree traversal — structure that minimizes hops = better results. |

---

## 2. Current State Assessment

### What the Leader App Does Well (Grade: A-)

| Strength | Detail |
|----------|--------|
| **AI_CONTEXT/ folder** | 17 files (~200KB) specifically designed for AI agents. README with navigation guide, architecture docs, database schema, testing lessons. This is exceptional and rare. |
| **Repository + Service + Hook pattern** | Clean separation: `repos → hooks → components → screens`. Each layer has a clear contract. |
| **Strict TypeScript** | `database.ts` (489 lines) with full Supabase types, service interfaces with explicit contracts, hooks exporting typed return values. |
| **Test infrastructure** | 321 tests, comprehensive mocks, screens test against hook interfaces (not Supabase directly). |
| **Barrel files** | Clean imports via `src/hooks/index.ts`, service barrel files. Reduces import noise. |
| **Centralized theme** | `src/constants/theme.ts` — single source of truth for colors, spacing, typography. |

### Where It Falls Short for AI Agents

| Gap | Impact |
|-----|--------|
| **Horizontal file organization** | Agent must traverse 5+ directories to understand one feature (repo + hook + component + screen + test). Each traversal burns context tokens. |
| **Separated test directories** | `__tests__/` mirrors `src/` — agent reads test file to understand conventions, then must cross-reference the source file in a different tree. |
| **Monolithic AI_CONTEXT** | 200KB of docs loaded into context is too much. Research shows models struggle with information "buried in the middle" of large contexts. |
| **No path-scoped rules** | All conventions live in CLAUDE.md/AI_CONTEXT — loaded every session regardless of what the agent is working on. |
| **No spec/plan artifacts** | Features are implemented ad-hoc. No research → plan → implement workflow, no checked-in specs to guide future AI work on the same feature. |
| **No skills system** | Specialized knowledge (Supabase RLS, Expo navigation, meeting reminders) isn't packaged for on-demand loading. |

---

## 3. Recommendations

### 3.1 Adopt Layered Context Architecture

**The Problem:** The current approach loads all context at once via `AI_CONTEXT/` and `MEMORY.md`. This works for a ~80-file codebase but will degrade as the app grows.

**The Solution:** Martin Fowler's layered context hierarchy, adapted for this project:

```
Layer 1: Always-Loaded (CLAUDE.md)
  → Project conventions, tech stack, critical patterns
  → Keep under 200 lines — ruthlessly concise

Layer 2: Path-Triggered (Rules)
  → *.tsx → component conventions
  → src/repositories/** → query patterns, error handling
  → supabase/** → edge function conventions

Layer 3: On-Demand (Skills)
  → .claude/skills/supabase-rls/ → RLS patterns + examples
  → .claude/skills/meeting-flow/ → meeting feature specifics
  → .claude/skills/navigation/ → React Navigation patterns

Layer 4: Event-Driven (Hooks)
  → Post-edit: auto-format with Prettier
  → Pre-commit: run relevant tests

Layer 5: Isolated (Subagents)
  → Research tasks in separate context windows
  → E2E test generation with isolated context
```

**Action Items:**
1. Slim down `CLAUDE.md` / `MEMORY.md` to core conventions only (~100 lines)
2. Move detailed docs from `AI_CONTEXT/` into on-demand skills
3. Create `.claude/rules/` with path-scoped conventions
4. Set up hooks for auto-formatting

---

### 3.2 Move Toward Vertical Feature Slices

**The Problem:** The current horizontal organization requires an AI agent to traverse 5+ directories to understand one feature:

```
Current (Horizontal):
src/
  repositories/threadsRepo.ts      ← data access
  hooks/useThreads.ts              ← business logic
  components/CreateThreadModal.tsx  ← UI component
  screens/main/ThreadsScreen.tsx   ← page
  types/database.ts                ← types (shared)
__tests__/
  hooks/useThreads.test.ts         ← tests (separate tree!)
  screens/ThreadsScreen.test.ts
```

Each directory listing + file read costs tokens. Research from Dev.to and the "Codified Context" paper shows agents perform measurably better with vertical slices.

**The Solution:** Reorganize by feature domain:

```
Proposed (Vertical):
src/features/
  threads/
    threadsRepo.ts
    useThreads.ts
    useThreads.test.ts
    CreateThreadModal.tsx
    ThreadsScreen.tsx
    ThreadsScreen.test.ts
    ThreadDetailScreen.tsx
    types.ts
    README.md              ← feature-level context for AI
  meetings/
    meetingsRepo.ts
    useMeetings.ts
    useMeetings.test.ts
    CreateMeetingModal.tsx
    MeetingsScreen.tsx
    MeetingsScreen.test.ts
    types.ts
    README.md
  resources/
    resourcesRepo.ts
    useResources.ts
    ...
  auth/
    AuthContext.tsx
    supabaseAuthService.ts
    authTypes.ts
    SignInScreen.tsx
    SignUpScreen.tsx
    ...
  groups/
    GroupContext.tsx
    groupsRepo.ts
    GroupSelectScreen.tsx
    ManageMembersScreen.tsx
    ...
src/shared/
  components/        ← truly shared UI (headers, sidebars)
  lib/               ← supabase client, storage, utilities
  constants/         ← theme
  types/             ← shared database types
  navigation/        ← app-level navigation config
```

**Why This Works for AI:**
- Agent can `ls src/features/threads/` and see everything it needs in one call
- Feature-level `README.md` provides scoped context (not the whole app)
- Tests are right next to the code they test — no cross-referencing
- Adding a new feature means creating one folder with a clear pattern to follow

**Migration Strategy:**
1. Start with one feature (e.g., `threads`) as a proof of concept
2. Update barrel files and imports
3. Migrate remaining features one at a time
4. Keep `src/shared/` for truly cross-cutting concerns

---

### 3.3 Create Spec-Driven Development Workflow

**The Problem:** Features are implemented without checked-in research or plans. When an AI agent (or a future developer) needs to extend a feature, there's no record of design decisions, alternatives considered, or constraints discovered.

**The Solution:** Adopt the Research → Plan → Implement workflow from HumanLayer's ACE framework:

```
.specs/
  threads/
    research.md       ← What exists, how it works, edge cases found
    plan.md           ← Exact files to create/modify, in what order
    status.md         ← Progress tracking for multi-session work
  meetings/
    research.md
    plan.md
    status.md
  meeting-reminders/
    research.md       ← Deep dive into reminder flow
    plan.md
```

**Template for `research.md`:**
```markdown
# Feature: [Name]
## Current State
- What exists today
- Key files involved
- Data model / schema

## Requirements
- What needs to change or be added

## Constraints Discovered
- Edge cases, RLS implications, platform differences

## Approach Options
- Option A: [description] — tradeoffs
- Option B: [description] — tradeoffs

## Chosen Approach
- [Which option and why]
```

**Template for `plan.md`:**
```markdown
# Implementation Plan: [Feature]

## Phase 1: [Description]
### Files to modify:
- `src/features/threads/threadsRepo.ts` — add `archiveThread()` function
- `src/features/threads/useThreads.ts` — expose archive in hook return

### Files to create:
- `src/features/threads/ArchiveThreadModal.tsx`

### Verification:
- [ ] Existing thread tests still pass
- [ ] New archive tests pass
- [ ] Manual test: archive thread, verify it disappears from list

## Phase 2: ...
```

**Why This Matters:**
- Plans become the highest-leverage human review point. Catching a wrong approach in a plan prevents thousands of lines of wrong code.
- Specs serve as persistent context for future AI sessions — no need to re-research the same feature.
- The HumanLayer team reported shipping 35K LOC in 7 hours using this workflow on a 300K LOC Rust project.

---

### 3.4 Implement Hot/Cold Memory Separation

**The Problem:** `AI_CONTEXT/` contains ~200KB of documentation. Loading all of it into context every session wastes tokens and creates the "lost-in-the-middle" effect where models struggle to attend to information buried in long contexts.

**The Solution:** Separate into hot memory (always loaded) and cold memory (loaded on demand):

**Hot Memory (~100-150 lines in CLAUDE.md):**
```markdown
# Leader App — Core Conventions

## Stack
React Native (Expo 54), Supabase, TypeScript strict

## Architecture
Feature-based vertical slices in src/features/
Shared code in src/shared/

## Patterns
- Repositories: plain async functions wrapping Supabase queries
- Services: interface + implementation (auth, email, realtime)
- Hooks: consume repos/services, manage state + effects
- Screens: mostly presentational, delegate to hooks

## Critical Rules
- NEVER import supabase directly in hooks/components — go through repos
- NEVER use class components — functional only
- NEVER modify database.ts types without updating the actual schema
- For tables not in Database interface: use `(supabase as any).from('table')`
- Tests: screens mock hooks, hooks mock repos

## File Naming
- Components/Screens: PascalCase.tsx
- Hooks: camelCase with use prefix
- Repos/Services: camelCase
- Tests: collocated as [filename].test.ts(x)
```

**Cold Memory (loaded on demand via skills or explicit request):**
- Database schema details → `.claude/skills/database/`
- Supabase edge function patterns → `.claude/skills/edge-functions/`
- Meeting reminder architecture → `.claude/skills/meeting-reminders/`
- Testing lessons learned → `.claude/skills/testing/`
- Security audit findings → `.claude/skills/security/`

---

### 3.5 Add Path-Scoped Rules

**The Problem:** All conventions are in a single file. An agent editing a repository file gets the same context as one editing a screen component.

**The Solution:** Create path-scoped rules that load only when relevant files are being edited:

**`.claude/rules/components.md`** (triggers for `*.tsx` in components/screens):
```markdown
# Component Conventions
- Use functional components only
- Import theme values from @/shared/constants/theme
- Use StyleSheet.create for styles (bottom of file)
- Modal components: accept `visible` and `onClose` props
- Screen components: delegate all logic to hooks
- Never fetch data directly — use the feature's hook
```

**`.claude/rules/repositories.md`** (triggers for `*Repo.ts`):
```markdown
# Repository Conventions
- Export plain async functions (no classes)
- Always return typed results from database.ts
- Handle Supabase errors: return { data, error } pattern
- For tables not in Database interface: use (supabase as any).from()
- For tables with `never` insert types: use (supabase.from() as any).insert()
```

**`.claude/rules/tests.md`** (triggers for `*.test.ts(x)`):
```markdown
# Testing Conventions
- Screen tests: mock hooks via jest.mock('@/features/[domain]')
- Hook tests: mock repositories
- Use test factories from @/shared/test/factories
- Follow AAA pattern: Arrange, Act, Assert
- Test user-visible behavior, not implementation details
```

---

### 3.6 Collocate Tests with Source

**The Problem:** The current `__tests__/` directory mirrors the `src/` structure. To understand how a feature is tested, the agent must:
1. Read the source file in `src/`
2. Navigate to the parallel path in `__tests__/`
3. Read the test file
4. Cross-reference mock setup in `__mocks__/`

This burns 4+ file reads before the agent can even begin working.

**The Solution:** Place test files next to the code they test:

```
Before:
  src/hooks/useThreads.ts
  __tests__/hooks/useThreads.test.ts

After:
  src/features/threads/useThreads.ts
  src/features/threads/useThreads.test.ts
```

**Jest config update:**
```js
// jest.config.js
testMatch: ['**/*.test.ts', '**/*.test.tsx'],
```

**Benefits:**
- Agent sees tests immediately when listing a feature directory
- "Add tests for this function" requires reading only one directory
- Deleting a feature means deleting one folder (no orphaned tests)

---

### 3.7 Create Skills for Specialized Knowledge

**The Problem:** Complex features like meeting reminders, real-time subscriptions, and Supabase edge functions require deep specialized knowledge. Currently this lives in large markdown files that are either always loaded (wasting tokens) or never loaded (agent lacks context).

**The Solution:** Package specialized knowledge as skills:

```
.claude/skills/
  supabase-queries/
    SKILL.md           ← When to use, what this covers
    patterns.md        ← Query patterns, RLS, real-time subscriptions
    examples.md        ← Before/after examples
  meeting-reminders/
    SKILL.md
    architecture.md    ← Email flow, edge functions, token system
    edge-functions.md  ← How to create/modify edge functions
  navigation/
    SKILL.md
    patterns.md        ← Stack structure, deep linking, tab navigation
    examples.md
  new-feature/
    SKILL.md           ← "Use this skill when adding a new feature"
    checklist.md       ← Step-by-step guide with file templates
    example.md         ← Complete example of a recently added feature
```

**Example `SKILL.md` for new-feature:**
```markdown
# Skill: Adding a New Feature

## When to Use
When creating a new feature domain (e.g., "announcements", "polls", "events")

## What This Covers
- File structure and naming
- Repository, hook, component, and screen templates
- Test setup
- Navigation integration
- Database migration pattern

## Files
- checklist.md — Step-by-step implementation guide
- example.md — The "resources" feature as a complete reference
```

The "new feature" skill is especially high-value — it gives the AI agent a complete, working example to follow rather than inferring patterns from scattered files.

---

## 4. Priority Matrix

| # | Recommendation | Effort | Impact | Priority |
|---|---------------|--------|--------|----------|
| 3.4 | Hot/Cold Memory Separation | Low (1-2 hours) | High | **Do First** |
| 3.5 | Path-Scoped Rules | Low (1-2 hours) | High | **Do First** |
| 3.3 | Spec-Driven Workflow | Low (process change) | Very High | **Do First** |
| 3.7 | Skills for Specialized Knowledge | Medium (3-4 hours) | High | **Do Second** |
| 3.1 | Layered Context Architecture | Medium (combines above) | High | **Do Second** |
| 3.6 | Collocate Tests | Medium (migration) | Medium | **Do Third** |
| 3.2 | Vertical Feature Slices | High (major refactor) | Very High | **Do Third** |

**Recommended approach:** Start with the low-effort, high-impact items (3.4, 3.5, 3.3) — these are mostly about creating new files and reorganizing documentation, not refactoring code. Then tackle skills (3.7). The vertical slice migration (3.2) is the highest-impact change but also the most disruptive — do it incrementally, one feature at a time, after the documentation layer is solid.

---

## 5. Sources

### Research Papers & Articles
- [Context Engineering for Coding Agents — Martin Fowler](https://martinfowler.com/articles/exploring-gen-ai/context-engineering-coding-agents.html)
- [Advanced Context Engineering for Coding Agents — HumanLayer](https://github.com/humanlayer/advanced-context-engineering-for-coding-agents/blob/main/ace-fca.md)
- [Codified Context: Infrastructure for AI Agents in a Complex Codebase — arXiv](https://arxiv.org/html/2602.20478v1)
- [Coding Agents as a First-Class Consideration in Project Structures — Dev.to](https://dev.to/somedood/coding-agents-as-a-first-class-consideration-in-project-structures-2a6b)

### Guides & Frameworks
- [Context Engineering: A Complete Guide (2026) — CodeConductor](https://codeconductor.ai/blog/context-engineering)
- [Claude Code Context Engineering: 6 Pillars Framework — ClaudeFast](https://claudefa.st/blog/guide/mechanics/context-engineering)
- [Context Engineering for Claude Code — Thomas Landgraf](https://thomaslandgraf.substack.com/p/context-engineering-for-claude-code)
- [Context Engineering for Developers — Faros AI](https://www.faros.ai/blog/context-engineering-for-developers)

### Spec-Driven Development
- [Spec-Driven Development — Thoughtworks](https://www.thoughtworks.com/en-us/insights/blog/agile-engineering-practices/spec-driven-development-unpacking-2025-new-engineering-practices)
- [Spec-Driven Development with AI — GitHub Blog](https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/)
- [Aligning Spec-Driven Development and Context Engineering for 2026 — WeBuild-AI](https://www.webuild-ai.com/insights/aligning-spec-driven-development-and-context-engineering-for-2026)

### AI-Friendly Codebase Design
- [Creating AI-Friendly Codebases — Davide Consonni](https://medium.com/@dconsonni/creating-ai-friendly-codebases-82cb3203c118)
- [Coding Guidelines for Your AI Agents — JetBrains](https://blog.jetbrains.com/idea/2025/05/coding-guidelines-for-your-ai-agents/)
- [AGENTS.md Specification](https://agents.md/)
- [Set up a context engineering flow in VS Code — Microsoft](https://code.visualstudio.com/docs/copilot/guides/context-engineering-guide)
- [My LLM Coding Workflow Going Into 2026 — Addy Osmani](https://addyosmani.com/blog/ai-coding-workflow/)
