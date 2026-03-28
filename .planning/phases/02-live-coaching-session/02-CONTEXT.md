# Phase 2: Live Coaching Session - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning
**Source:** Synthesized from Project.md, Decisions.md, ROADMAP.md, Phase 1 CONTEXT.md + RESEARCH.md

<domain>
## Phase Boundary

Phase 2 delivers the live coaching session end-to-end:
- User starts a session for a researched skill → browser streams webcam frames to WebSocket server → Gemini Live watches and coaches → tiered interventions escalate from voice to annotated frames to tutorial references → user can speak back mid-session.
- This is the demo centerpiece. Judges will spend most time here.
- Depends on Phase 1: skill document must exist in Google Docs (or fallback JSON) before session starts.
- Phase 3 (post-session) reads observations logged during this phase — intervention history and session transcript are the primary outputs Phase 3 consumes.

</domain>

<decisions>
## Implementation Decisions

### WebSocket Architecture (Locked)
- Browser → `ws` WebSocket server (`/server/index.ts`) → Gemini Live API
- Next.js API routes cannot hold persistent bidirectional connections — all real-time flow goes through the WS server
- WS server runs locally (`WS_PORT=3001` default), Next.js on 3000
- `concurrently` dev script already in package.json for running both

### Video Feed (Locked)
- Browser captures webcam via `getUserMedia` (MediaDevices API)
- Sends frames at 1 FPS as base64-encoded JPEG over WebSocket to WS server
- WS server forwards frames to Gemini Live session
- FramePayload type already defined in `server/types.ts`: `{ data: string, sessionId: string }`

### Gemini Live API
- SDK: `@google/genai` (same as Phase 1 — already installed)
- Use `ai.live.connect()` to establish a Live session
- Session initialized with system prompt containing: skill model document + user model (empty for new users)
- Send frames as `inlineData` with `mimeType: "image/jpeg"` to the live session
- Audio from user captured in browser, sent as audio chunks to WS server, forwarded to Gemini Live
- Gemini Live returns audio output (coaching voice) + optional function calls

### Intervention Tiers (Locked from Project.md)
- **Tier 1** — Ambient acknowledgment. Pure Gemini Live voice output. No backend call.
- **Tier 2** — Quick verbal correction. Pure Gemini Live voice output. No backend call.
- **Tier 3** — Annotated frame. Gemini calls `generate_annotation()` function → Next.js API route → Gemini image gen with spatial corrections drawn → annotated image URL returned to browser.
- **Tier 4** — Tutorial reference. Gemini calls `surface_tutorial()` → Next.js API route pulls YouTube URL + timestamp from skill doc → returned to browser.
- **Escalation logic:** Tier 2 correction repeated 3× without improvement → Gemini should call `generate_annotation()`. If annotation doesn't land → Gemini calls `surface_tutorial()`. This escalation is prompted via system prompt instructions, not client code.

### Function Tool Definitions (Register with Gemini Live session)
```typescript
tools: [{
  functionDeclarations: [
    {
      name: "generate_annotation",
      description: "Generate an annotated frame showing spatial corrections on the user's current technique. Call when a verbal correction has been given 3 times without improvement.",
      parameters: {
        type: "object",
        properties: {
          frameDescription: { type: "string", description: "What the user is doing wrong that needs visual correction" },
          correctionType: { type: "string", description: "What the annotation should show" }
        },
        required: ["frameDescription", "correctionType"]
      }
    },
    {
      name: "surface_tutorial",
      description: "Surface a YouTube tutorial clip with timestamp for fundamental technique misunderstandings.",
      parameters: {
        type: "object",
        properties: {
          techniqueArea: { type: "string", description: "The specific technique or concept to surface a tutorial for" }
        },
        required: ["techniqueArea"]
      }
    },
    {
      name: "log_observation",
      description: "Log a coaching observation for the post-session summary.",
      parameters: {
        type: "object",
        properties: {
          observationType: { type: "string", enum: ["improvement", "correction", "milestone"] },
          description: { type: "string" }
        },
        required: ["observationType", "description"]
      }
    }
  ]
}]
```

### Annotation Generation (Tier 3) — "Nano Banana"
- The project calls this "Nano Banana" — it's Gemini image generation
- Use `gemini-2.0-flash-preview-image-generation` (or current available image gen model)
- Prompt: describe the spatial correction needed, include the captured frame as base64 input
- Model should draw circles, arrows, overlays showing corrected form positions
- Generation takes 3–8 seconds — coach narrates "hold on, let me show you something" during wait
- Verbal fallback: if generation fails, coach narrates the correction without the visual

### Session UI (UI-02, Locked Requirements)
- Camera preview (live webcam feed — mirror the feed so user sees themselves correctly)
- Coaching transcript (running text log of what the coach has said)
- Annotated frame display panel (shown when Tier 3 fires; hidden otherwise)
- Tutorial panel (shown when Tier 4 fires — YouTube embed or link + timestamp)
- Mic indicator (user can speak back)
- Session end button

### Skill Document Loading
- At session start, read skill document from Google Docs (or fallback JSON if no Docs credentials)
- Document is injected into Gemini Live system prompt verbatim (it's the coach's expertise)
- User model: empty string for new users ("No prior session history.")

### Logging for Phase 3
- `log_observation()` function call stores observations in server-side session state
- At session end, observations array passed to Phase 3's post-session API for summarization
- Session ID flows through: browser → WS server → Next.js API routes

### Claude's Discretion
- Exact WebSocket message protocol for audio chunks (PCM16 vs opus vs browser MediaRecorder output)
- How session state is managed in the WS server (in-memory Map<sessionId, SessionState>)
- Whether to use Next.js API route for annotation generation or call Gemini directly from WS server
- Frame capture interval implementation (setInterval in browser vs requestAnimationFrame)
- Exact Gemini Live session config (voice name, language, temperature)
- Error recovery if Gemini Live session drops mid-session

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Architecture & Decisions
- `Project.md` — §Live Coaching Session architecture, §Intervention Tiers, §Two-Tier Context Model, §Technical Constraints
- `Decisions.md` — §Architecture Decisions (WebSocket flow diagram), §MVP Scope Cut

### Phase 1 Artifacts (Phase 2 Depends On)
- `.planning/phases/01-foundation-research-pipeline/01-RESEARCH.md` — SDK versions, Gemini API patterns, @google/genai usage (same SDK used here)
- `.planning/phases/01-foundation-research-pipeline/01-CONTEXT.md` — skill document schema (Phase 2 injects this into system prompt)
- `lib/gemini.ts` — existing Gemini helper pattern to extend
- `server/index.ts` — WS server stub to wire up
- `server/types.ts` — WSMessage types already defined (frame, audio, coaching, annotation, tutorial)
- `src/app/session/page.tsx` — session page placeholder to build out

### Requirements
- `.planning/REQUIREMENTS.md` — Phase 2 covers LIVE-01 through LIVE-10, UI-02

</canonical_refs>

<specifics>
## Specific Ideas

- **Team split for Phase 2:** Person B owns WebSocket server + Gemini Live integration + intervention logic. Person C owns session UI. Plans should be separable along this split — UI can mock WebSocket messages until B's work is ready.
- **Critical path warning from ROADMAP:** "WebSocket + Gemini Live integration complexity — Person B starts this in hour 1, not hour 8"
- **Demo activity:** Cooking / knife skills (1 FPS is sufficient for slower movements). The demo coaching scenario is knife grip + blade angle corrections.
- **The "money shot":** Tier 3 annotated frame — user's actual hands on camera with circles drawn on wrist position. This is the demo moment that judges will remember. Make sure it works reliably.
- **User voice pushback:** "That was actually fine" — important for demo to show bidirectional conversation, not just one-way corrections.
- **Returning user:** For the demo, user model will be empty (new session). Pre-seeded history is Phase 3's job.
- **Session length:** Gemini Live sessions limited to ~10 minutes. Structure as a focused round — this is fine for the demo.

</specifics>

<deferred>
## Deferred Ideas

- Post-session summary generation — Phase 3
- Google Calendar scheduling — Phase 3
- Google Drive asset storage — Phase 3
- Multi-session user model update loop — Phase 5
- Between-session notifications — Phase 4
- Full escalation state persistence across sessions — Phase 5

</deferred>

---

*Phase: 02-live-coaching-session*
*Context gathered: 2026-03-27 via Project.md + Decisions.md synthesis*
