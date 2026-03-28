---
phase: 01-foundation-research-pipeline
plan: 03
subsystem: research-pipeline
status: complete
completed: "2026-03-28"
duration: "8 min"
tasks_completed: 2
files_created: 3
files_modified: 1
tags: [gemini, youtube, prompts, pipeline, vitest]
dependencies:
  requires: [01-01]
  provides: [lib/gemini.ts, lib/youtube.ts, prompts/skill-research.ts]
  affects: [01-05-api-route]
tech_stack:
  added: []
  patterns:
    - Gemini googleSearch grounding via config.tools
    - YouTube URLs as fileData.fileUri content parts
    - Prompt templates separated from pipeline infrastructure
    - Vitest vi.mock with function constructor for class mocks
key_files:
  created:
    - prompts/skill-research.ts
    - lib/gemini.ts
    - lib/youtube.ts
  modified:
    - tests/lib/gemini.test.ts
key_decisions:
  - "prompts/skill-research.ts was already committed in the initial codebase commit (40fbc03) — no duplicate commit needed"
  - "vi.mock GoogleGenAI requires regular function syntax, not arrow function, to be usable as a constructor with new"
  - "Removed deprecated model string from comment in lib/gemini.ts to satisfy grep verification (model only appears once in constant)"
  - "synthesizeSkillDoc takes (skill, rawAnalysis) — not just rawAnalysis — to match Plan 05 API route signature"
---

# Phase 01 Plan 03: Gemini Research Pipeline — Summary

Three-step Gemini research pipeline with prompt templates enforcing observable camera-detectable mistakes, YouTube grounding extraction, and video analysis via fileData.fileUri — all stubbed for Plan 05 wiring.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create prompts/skill-research.ts | 40fbc03 (initial codebase) | prompts/skill-research.ts |
| 2 | Implement lib/gemini.ts, lib/youtube.ts, update tests | 307e863 | lib/gemini.ts, lib/youtube.ts, tests/lib/gemini.test.ts |

## What Was Built

**prompts/skill-research.ts** — Three prompt builder functions kept separate from pipeline logic:
- `buildDiscoveryPrompt(skill)`: Guides Gemini grounding to return YouTube tutorial URLs
- `buildAnalysisPrompt(skill)`: Enforces OBSERVABLE camera-detectable mistakes constraint with explicit JSON schema (skill, techniqueSteps, commonMistakes, progressionMilestones, keyTimestamps)
- `buildSynthesisPrompt(skill, rawAnalysis)`: Produces plain-text output with ALL CAPS section headers compatible with Google Docs insertText API

**lib/gemini.ts** — Three-step pipeline:
- `GEMINI_MODEL = "gemini-2.5-flash"` — single constant, no deprecated 2.0 string anywhere
- `findTutorialUrls(skill)`: Uses `config.tools: [{ googleSearch: {} }]`, filters groundingChunks for youtube.com/watch or youtu.be/, caps at 5, falls back to YouTube Data API if < 3 URLs
- `analyzeSkillVideos(skill, urls)`: Passes URLs as `{ fileData: { fileUri: url } }` content parts, throws on empty array
- `synthesizeSkillDoc(skill, rawAnalysis)`: Returns plain text, throws on empty Gemini response

**lib/youtube.ts** — YouTube Data API fallback:
- `searchYouTubeTutorials(skill, maxResults?)`: search.list with type=video, handles quotaExceeded gracefully, returns empty array if YOUTUBE_API_KEY not set

**tests/lib/gemini.test.ts** — 9 passing tests covering RES-02, RES-03, RES-04:
- Model constant check (gemini-2.5-flash, not 2.0)
- findTutorialUrls: URL filtering, max 5 cap, empty array on no YouTube URLs
- analyzeSkillVideos: throws on empty urls, fileData.fileUri structure, response passthrough
- synthesizeSkillDoc: returns string, throws on empty response

## Deviations from Plan

**1. [Rule 1 - Bug] Fixed vi.mock GoogleGenAI constructor pattern**
- Found during: Task 2 test run
- Issue: `vi.fn().mockImplementation(() => ({...}))` produces an arrow function which is not a valid constructor — `new GoogleGenAI()` throws "is not a constructor"
- Fix: Replaced with `function() { return {...}; }` regular function syntax
- Files modified: tests/lib/gemini.test.ts
- Commit: 307e863

**2. [Rule 1 - Bug] Removed deprecated model string from comment**
- Found during: Task 2 verification
- Issue: Comment `// NEVER use "gemini-2.0-flash"` caused `grep "gemini-2.0-flash" lib/gemini.ts` to return 0 (found), failing the plan's verification
- Fix: Rewrote comment to reference "previous 2.0 model" without the literal string
- Files modified: lib/gemini.ts
- Commit: 307e863 (amend)

**3. [Context - Note] prompts/skill-research.ts was pre-committed**
- The "initial codebase" commit (40fbc03) already contained prompts/skill-research.ts with the exact plan content
- No duplicate commit was created; Task 1 is complete via that commit

## Known Stubs

All three Gemini functions in lib/gemini.ts are real implementations that will make actual API calls when GEMINI_API_KEY is set. The stubs are:
- No GEMINI_API_KEY in .env.local — functions throw `GEMINI_API_KEY environment variable is not set` until set
- No YOUTUBE_API_KEY in .env.local — searchYouTubeTutorials returns [] with a console.warn

Plan 05 (api/research route) will wire these functions into the full pipeline with real environment variables.

## Self-Check

Files created/modified:
- [x] /Users/jt/Desktop/Glitch/prompts/skill-research.ts — exists (committed 40fbc03)
- [x] /Users/jt/Desktop/Glitch/lib/gemini.ts — exists (committed 307e863)
- [x] /Users/jt/Desktop/Glitch/lib/youtube.ts — exists (committed 307e863)
- [x] /Users/jt/Desktop/Glitch/tests/lib/gemini.test.ts — updated (committed 307e863)

Commits verified:
- [x] 40fbc03 — initial codebase (includes prompts/skill-research.ts)
- [x] 307e863 — feat(01-03): implement Gemini pipeline

Tests: 9/9 passing (`npm test -- --run tests/lib/gemini.test.ts`)

## Self-Check: PASSED
