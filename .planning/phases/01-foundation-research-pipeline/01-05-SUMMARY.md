---
phase: 01-foundation-research-pipeline
plan: "05"
subsystem: api
tags: [api-route, next-js, research-pipeline, gemini, google-docs, demo-mode, testing]
dependency_graph:
  requires: [01-02, 01-03, 01-04]
  provides: [POST /api/research, GLITCH_USE_DEMO_DOC mode]
  affects: [src/app/page.tsx (fetch call consumer)]
tech_stack:
  added: []
  patterns: [Next.js App Router API route, vi.hoisted() for vitest mock ordering, demo fallback env flag]
key_files:
  created:
    - src/app/api/research/route.ts
  modified:
    - tests/api/research.test.ts
decisions:
  - vi.hoisted() required for vi.mock factory to reference mock functions declared with const
  - GLITCH_USE_DEMO_DOC mode still calls createSkillDoc (graceful fallback if Docs write fails)
  - TODO comments mark each pipeline step where real API keys will activate live behavior
metrics:
  duration: "~5 min"
  completed: "2026-03-28T01:46:56Z"
  tasks_completed: 1
  files_created: 1
  files_modified: 1
---

# Phase 01 Plan 05: Research API Route Summary

**One-liner:** POST /api/research wires findTutorialUrls → analyzeSkillVideos → synthesizeSkillDoc → createSkillDoc with GLITCH_USE_DEMO_DOC bypass mode using pre-computed cooking-skill-demo.json.

## What Was Built

Created `src/app/api/research/route.ts` — the final wiring layer connecting the Gemini pipeline (Plans 02-03) and Google Docs writer (Plan 02) to the UI (Plan 04).

### API Behavior

| Request | Response |
|---------|----------|
| POST `{skill: "knife skills"}` | 200 `{success: true, docUrl, skillDoc}` |
| POST `{}` or `{skill: "  "}` | 400 `{error: "skill required"}` |
| Pipeline throws | 500 `{error: "Research pipeline failed"}` |
| `GLITCH_USE_DEMO_DOC=true` | 200 with pre-computed cooking doc, no Gemini calls |

### Demo Fallback Mode

When `GLITCH_USE_DEMO_DOC=true` is set in `.env.local`:
- Skips all three Gemini pipeline steps
- Loads `data/cooking-skill-demo.json` (knife skills pre-computed content)
- Still attempts `createSkillDoc` write (falls back gracefully if Docs write fails)
- Useful for demos without API keys configured

### TODOs (activate when keys are set)

Each pipeline step has a TODO comment identifying which env var enables real behavior:
- `findTutorialUrls` — requires `GEMINI_API_KEY`
- `analyzeSkillVideos` — requires `GEMINI_API_KEY`
- `synthesizeSkillDoc` — requires `GEMINI_API_KEY`
- `createSkillDoc` — requires `GOOGLE_SERVICE_ACCOUNT_KEY`

## Task Commits

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Implement POST /api/research + update tests | 7881680 | src/app/api/research/route.ts, tests/api/research.test.ts |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] vi.hoisted() required for mock function references in vi.mock factory**
- **Found during:** Task 1 — first test run
- **Issue:** `vi.mock` factories are hoisted to top of file by vitest before `const` declarations, causing `ReferenceError: Cannot access 'mockFindTutorialUrls' before initialization`
- **Fix:** Replaced plain `const mock... = vi.fn()` declarations with `vi.hoisted()` wrapper so mock functions are available in the hoisted `vi.mock` factory scope
- **Files modified:** tests/api/research.test.ts
- **Commit:** 7881680 (same commit — caught and fixed before committing)

## Test Results

```
Test Files  4 passed (4)
     Tests  25 passed (25)
  Duration  1.42s
```

Files covered: gemini.test.ts (9 tests), google-docs.test.ts (7 tests), research.test.ts (7 tests), SkillSelection.test.tsx (2 tests).

## Known Stubs

None — the route wires real lib functions. The lib functions themselves have stub implementations that return mock data until API keys are set (documented via TODO comments). This is expected behavior per the user constraint ("Wire them together in the API route — it will work end-to-end with mock data").

## Phase 1 End-to-End Status

With Plan 05 complete, Phase 1 is fully wired:

```
User enters skill (page.tsx)
  → POST /api/research (route.ts)        ← THIS PLAN
    → findTutorialUrls (lib/gemini.ts)   ← Plan 03
    → analyzeSkillVideos (lib/gemini.ts) ← Plan 03
    → synthesizeSkillDoc (lib/gemini.ts) ← Plan 03
    → createSkillDoc (lib/google-docs.ts)← Plan 02
  ← returns {docUrl, skillDoc}
← displays Google Doc link (page.tsx)    ← Plan 04
```

Live behavior activates once `GEMINI_API_KEY` and `GOOGLE_SERVICE_ACCOUNT_KEY` are set in `.env.local`.

## Self-Check: PASSED

- [x] src/app/api/research/route.ts exists: FOUND
- [x] tests/api/research.test.ts updated: FOUND
- [x] Commit 7881680 exists: FOUND
- [x] 25/25 tests pass: CONFIRMED
- [x] No stubs that prevent plan goal: route wires pipeline correctly
