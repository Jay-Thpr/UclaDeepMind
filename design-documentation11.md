# Design Documentation: Real-Time AI Coaching Engine

---

## 1. App Flow Overview

```
Start Screen
    ↓
Skill Selection
    ↓
Session Prep (research triggers here)
    ↓
Research Loading (visible — system learns the skill)
    ↓
Session Briefing (goals, past sessions, context)
    ↓
Live Coaching Session
    ↓
Post-Session Report
    ↓
[Loop] → Session Briefing (returning user)
```

---

## 2. Screen-by-Screen Design

---

### 2.1 Start Screen

**Purpose:** First impression. Communicate that this is not a chatbot — it's a coach.

**Layout:**

- Minimal top bar with app logo/name
- Center-aligned hero block:
  - Headline: "Learn anything. Get coached live."
  - Subline: "AI that teaches itself your skill, then teaches you — with real-time video feedback."
- Primary CTA button: `[ Start Learning ]`
- Below CTA: subtle text — "Powered by Gemini Live, Nano Banana, and Google Workspace"

**Behavior:**

- `[ Start Learning ]` → navigates to Skill Selection
- If returning user with existing sessions → redirect straight to Session Briefing with their last skill pre-loaded and a "Continue where you left off" prompt

**Returning user variant:**

- Hero text changes to: "Welcome back"
- Shows last skill and session summary card below the CTA
- Two CTAs: `[ Continue: Knife Skills ]` and `[ New Skill ]`

---

### 2.2 Skill Selection

**Purpose:** User picks what they want to learn. Must communicate that ANY skill is possible, not just preset options.

**Layout:**

- Header: "What do you want to learn?"
- Primary input field (large, prominent):
  - Placeholder: "Describe any skill — origami, free throws, guitar chords..."
  - On focus: subtle suggestions appear below ("Try: knife techniques, watercolor basics, jump rope tricks")
- Below input: horizontal scrollable row of **suggestion cards**
- Each card contains:
  - A Nano Banana-generated illustration of the skill (small, square, stylized — generated at app build time for preset suggestions, generated on-the-fly for custom skills)
  - Skill name (bold)
  - One-line description
  - If user has past sessions for this skill: a small badge showing session count ("3 sessions")

**Preset suggestion cards (examples):**

| Card | Illustration | Label | Subtext |
|---|---|---|---|
| 1 | Nano Banana: stylized chef's hands with knife on cutting board | Knife skills | Grip, cuts, safety |
| 2 | Nano Banana: basketball player mid-shot, clean line art style | Free throw | Form, arc, follow-through |
| 3 | Nano Banana: hands on guitar fretboard, warm tones | Guitar chords | Finger placement, transitions |
| 4 | Nano Banana: watercolor brush on paper with color bloom | Watercolor | Brush control, washes, blending |

**Illustration generation:**

- Preset cards: illustrations pre-generated using Nano Banana at build/deploy time. Stored as static assets.
- Custom skill input: when user types a custom skill and confirms, Nano Banana generates an illustration in real-time (~3-5 seconds) that becomes the skill's visual identity throughout the app (session cards, progress reports, etc.)
- Prompt pattern for Nano Banana: "A minimal, stylized illustration of [skill]. Clean lines, warm palette, square format, no text, suitable as an app icon."

**Behavior:**

- User can either type a custom skill OR tap a suggestion card
- On selection → navigates to Session Prep
- Data passed forward:
  ```
  {
    skill: string,           // "knife skills"
    isCustom: boolean,       // true if typed, false if preset
    illustration: image,     // Nano Banana generated/cached image
    existingSessions: int    // 0 if new skill
  }
  ```

---

### 2.3 Session Prep

**Purpose:** Define session parameters and trigger the research pipeline. This is the bridge between selecting a skill and entering a live session.

**Layout:**

- Header: "Set up your session"
- Skill identity card (top): shows the Nano Banana illustration + skill name from selection

**Section 1 — Goal input:**

- Label: "What do you want to focus on?"
- Text input field
- Placeholder dynamically changes based on skill:
  - Knife skills: "Learn the rocking cut technique"
  - Free throw: "Improve follow-through consistency"
  - Custom: "Describe your goal..."
- Below input: if returning user, show AI-suggested goal based on last session's "recommended next focus"
  - Displayed as a tappable chip: "Suggested: work on dice cuts (based on last session)"

**Section 2 — Experience level:**

- Label: "Your experience level"
- Three-option segmented control: `Beginner` | `Intermediate` | `Advanced`
- If returning user: pre-filled based on progression model, with option to override
- If new user and existing skill: default to Beginner

**Section 3 — Environment check:**

- Label: "Quick setup"
- Dynamic checklist based on skill type:
  - Video-based skills (cooking, sports, crafts):
    - ☐ Camera positioned to see your workspace
    - ☐ Good lighting on your hands/body
    - ☐ Materials ready (brief description based on goal)
  - Screen-based skills (coding, design):
    - ☐ Screen share ready
    - ☐ Development environment open
- These are advisory, not blocking — user can proceed without checking all

**Section 4 — Context sources (toggles):**

- Label: "Connect your tools"
- Toggle switches:
  - ☑ YouTube tutorials (on by default) — "AI will find relevant tutorials"
  - ☑ Google Docs (on by default) — "Save session notes and progress"
  - ☑ Google Calendar (on by default) — "Schedule follow-up sessions"
- If returning user: show a note — "Your last session notes and progress will be loaded automatically"

**CTA:**

- `[ Prepare Session ]` (not "Start Session" — because research happens next)

**Backend trigger on CTA click:**

```
prepareSession({
  skill: string,
  goal: string,
  skillLevel: "beginner" | "intermediate" | "advanced",
  contextSources: {
    youtube: boolean,
    docs: boolean,
    calendar: boolean
  },
  userId: string,
  existingSessionCount: int
})
```

This triggers the research pipeline → navigates to Research Loading screen.

---

### 2.4 Research Loading

**Purpose:** Make the research phase VISIBLE. This is a key differentiator — judges and users should see the system teaching itself. Not a generic loading spinner.

**Layout:**

- Center-aligned content
- Skill illustration (Nano Banana) at top, large
- Animated headline: "Learning about [skill]..."
- Live-updating research feed (scrolling list of discoveries):
  - Each item appears with a subtle slide-in animation
  - Items are categorized with small labels:

**Example feed for "knife skills - rocking cut":**

```
🔍 Searching for rocking cut technique...
📺 Found: "Jacques Pépin's Knife Skills" — analyzing technique at 2:43
📺 Found: "Gordon Ramsay's Basic Knife Skills" — analyzing at 1:15
✅ Proper form identified: pinch grip, curved blade motion, wrist pivot
⚠️ Common mistakes cataloged: lifting blade too high, flat palm guide hand
📋 Progression plan: grip → basic rock → speed → consistency
✅ Session plan ready
```

- Progress bar at bottom showing overall preparation progress
- Items should feel like watching an expert prepare to teach — not a technical log

**Timing:**

- Research phase takes ~10-20 seconds depending on skill complexity
- YouTube analysis is the longest step
- If returning user with existing skill model: research is shorter (just checking for new content), loading screen reflects this — "Reviewing your progress and checking for new techniques..."

**Completion:**

- When research finishes, feed shows: "✅ Ready to coach"
- Auto-transitions to Session Briefing after 1 second, OR user can tap `[ Begin ]` immediately

**Backend process during this screen:**

1. Gemini + Google Search grounding → find technique fundamentals
2. Gemini + YouTube URL understanding → analyze top tutorial videos
3. Synthesize into structured skill model
4. If returning user: load existing user model from Docs, merge with any new research
5. Save/update skill model to Google Docs
6. Prepare session system prompt (skill model + user model + session goals)

---

### 2.5 Session Briefing

**Purpose:** The final screen before going live. Shows the user everything the AI knows and what the session will focus on. This is where past session data, progression, and the current plan come together.

**Layout:**

- Header: "Session [N] — [Skill Name]"
- Skill illustration in header area

**Section 1 — Session plan (always shown):**

- Card with:
  - "Today's focus": the session goal (from prep screen or AI-suggested)
  - "Key techniques": 2-3 bullet points the AI will watch for (pulled from research)
  - "Common mistakes to avoid": 1-2 items the AI will actively correct

**Section 2 — Past sessions (shown if returning user, N > 1):**

- Horizontal scrollable timeline of past session cards:
  - Each card shows:
    - Session number and date
    - Nano Banana illustration (the skill's icon)
    - Brief summary (1 line): "Focused on grip, improved blade angle"
    - Key annotated frame thumbnail if available (the visual correction from that session)
    - Status indicator: ✅ Completed, 📈 Improved, 🔄 Needs work
- Below timeline: progression summary
  - "Overall progress": visual progress indicator
  - "Mastered": list of things the AI will no longer correct
  - "Improving": things showing positive trend
  - "Focus areas": things still being worked on
  - If annotated frames exist from past sessions: show a small before/after comparison

**Section 3 — Recommended tutorials (shown if YouTube is enabled):**

- 1-2 YouTube video cards with:
  - Thumbnail
  - Title
  - Specific timestamp callout: "Watch from 2:43 — shows the exact grip technique for today's focus"
  - Optional: `[ Watch Now ]` button (opens inline or in new tab)
- Note: "Your coach learned from these tutorials and will reference them during the session"

**Section 4 — Session settings (collapsible, advanced):**

- Coaching style preference: Encouraging | Balanced | Direct
- Feedback frequency: Less (only major corrections) | Normal | More (detailed feedback)
- These map to system prompt modifiers for the Live API session

**CTA:**

- `[ Start Live Session ]` — large, prominent
- Below: "Session will last up to 10 minutes. Your coach is ready."

**Behavior:**

- `[ Start Live Session ]` → initializes Gemini Live API WebSocket connection → navigates to Live Coaching Screen
- System prompt is fully assembled and injected at connection time

---

### 2.6 Live Coaching Session

**Purpose:** The core product. Real-time video coaching with tiered AI feedback.

**Layout — Desktop (primary demo layout):**

```
┌─────────────────────────────────────────────────────────┐
│  Session: Knife Skills — Rocking Cut     ⏱ 7:42  [End] │
├───────────────────────────────┬──────────────────────────┤
│                               │  COACH PANEL             │
│                               │                          │
│     LIVE VIDEO FEED           │  [Current instruction]   │
│     (user's camera)           │                          │
│                               │  ─────────────────────   │
│                               │                          │
│                               │  [Visual aid area]       │
│                               │  (annotated frames,      │
│                               │   tutorial clips)        │
│                               │                          │
│                               │  ─────────────────────   │
│                               │                          │
│                               │  [Session log]           │
│                               │  (scrolling feed of      │
│                               │   past corrections)      │
├───────────────────────────────┴──────────────────────────┤
│  🎤 Mic   🎥 Camera   ⏸ Pause   💬 Ask Coach   ❌ End  │
└─────────────────────────────────────────────────────────┘
```

**Left panel — Live video feed:**

- User's camera feed, large and prominent
- Subtle overlay in corner: session timer counting down from 10:00
- When the AI is speaking, a small waveform animation appears in the corner indicating active coaching

**Right panel — Coach panel (3 sections, stacked):**

**Section A — Current instruction (top):**

- Shows the most recent instruction or feedback from the AI
- Text updates in real-time as the AI speaks
- Visual styling differs by intervention tier:
  - **Tier 1 (acknowledgment):** green-tinted card, subtle — "Good, that cut was cleaner"
  - **Tier 2 (verbal correction):** neutral card — "Try to keep the blade tip on the board"
  - **Tier 3 (annotated frame):** amber-tinted card with "See visual below ↓" indicator
  - **Tier 4 (tutorial reference):** purple-tinted card with "Watch this technique ↓" indicator
- Each card fades in, replacing the previous one
- Old instructions move down to the session log

**Section B — Visual aid area (middle):**

- Default state: empty or showing the session's key technique points as a reference card
- **Annotated frame mode (Tier 3):**
  - When triggered, this area shows:
    - Left half: the captured frame from the user's video (what they did)
    - Right half: Nano Banana annotated version (circles, arrows, overlays showing the correction)
  - Caption below: brief text explaining the correction
  - `[ Got it ]` button to dismiss and return to default state
  - Generation time: ~3-8 seconds. During generation, show: "Preparing visual feedback..." with a subtle animation
- **Tutorial mode (Tier 4):**
  - Embedded YouTube player, auto-seeking to the specific timestamp
  - Caption: "Watch this technique, then try again"
  - `[ Done watching ]` button to dismiss

**Section C — Session log (bottom, scrollable):**

- Chronological feed of all coaching interactions this session
- Each entry shows:
  - Timestamp (session time, not clock time)
  - Tier indicator (small colored dot: green/neutral/amber/purple)
  - Brief text of the instruction
- Tapping any entry with an annotated frame re-displays it in the visual aid area
- This becomes the raw material for the post-session summary

**Bottom controls bar:**

| Control | Icon | Behavior |
|---|---|---|
| Mic | 🎤 | Toggle microphone on/off. Mic is on by default. |
| Camera | 🎥 | Toggle camera on/off. Camera is on by default. |
| Pause | ⏸ | Pauses the coaching session. AI stops analyzing. Timer pauses. Resume to continue. |
| Ask Coach | 💬 | Opens a text input or voice prompt for the user to ask a question: "Can you show me that again?" / "What am I doing wrong?" |
| End | ❌ | Ends the session. Confirmation dialog: "End session? Your progress will be saved." → Post-Session Report |

**AI behavior during session:**

- Input streams: video (1 FPS), audio (continuous)
- System prompt contains: skill model, user model, session goals, intervention tier logic
- The AI prioritizes ONE correction at a time (feedback calibration)
- Positive reinforcement is delivered regularly, not just corrections
- The AI uses function calling to:
  - `log_observation(type, description, timestamp)` — logs to session record
  - `generate_annotation(frame, correction_description)` — triggers Nano Banana pipeline
  - `reference_tutorial(youtube_url, timestamp, reason)` — surfaces a tutorial clip
  - `update_skill_status(skill_area, status)` — marks something as improved/mastered
- User speech is processed for:
  - Questions ("how should I hold this?")
  - Pushback ("that felt fine to me") → system acknowledges and adjusts
  - Redirect ("let's work on something else") → system adjusts session goals

**Session end conditions:**

- User taps End
- 10-minute timer expires (with 1-minute warning: "One minute left — let's do one more rep")
- Connection drops (auto-save session data, show reconnection option)

---

### 2.7 Post-Session Report

**Purpose:** Structured summary of the session. This is the tangible artifact that makes coaching feel real and progressive. Saved to Google Docs.

**Layout:**

- Header: "Session [N] Complete — [Skill Name]"
- Skill illustration + date/duration

**Section 1 — Session summary:**

- Card: "What we worked on"
  - The session goal
  - Key areas addressed (auto-generated from session log)

**Section 2 — What improved:**

- Card with green accent
- List of improvements observed during the session
- If annotated frames were generated: show the frame pair (before = captured frame, after = annotated correction) with a note: "You corrected this during the session"
- These visual artifacts are the proof of progress

**Section 3 — What still needs work:**

- Card with amber accent
- Prioritized list (most important first, max 3 items)
- Each item includes a brief note on why and what to try next time

**Section 4 — Visual progression (shown if N > 1):**

- Timeline showing annotated frames from across sessions
- Example: "Session 1: elbow flaring out → Session 3: elbow corrected → Session 5: consistent form"
- This is the visual evidence of the coaching relationship over time

**Section 5 — Next session:**

- AI-recommended focus for next session
- Suggested timing: "Based on your progress, practice again in [2 days]"
- `[ Schedule in Calendar ]` button → creates Google Calendar event with:
  - Title: "[Skill] Coaching Session [N+1]"
  - Description: "Focus: [recommended goal]. Prep: [tutorial link]"
  - Time: suggested based on user's calendar availability
- `[ Save to Docs ]` button (or auto-save toggle) → writes full report to Google Docs
  - Doc title: "[Skill] — Session [N] — [Date]"
  - Includes all text content + embedded annotated frame images
  - Appended to an ongoing coaching document, not a new doc each time

**Section 6 — Quick actions:**

- `[ Start Another Session ]` → goes to Session Briefing with updated context
- `[ View All Sessions ]` → opens progression dashboard
- `[ Share Progress ]` → exports a visual progress card (optional, stretch feature)

**Auto-save behavior:**

- Session summary is auto-saved to Google Docs immediately on session end
- User model is updated in Docs (mastered skills, focus areas, preferences)
- If Calendar is connected: event is auto-suggested, not auto-created (user confirms)

---

## 3. Interaction Patterns

### 3.1 Intervention tier visual language

Each feedback tier has a distinct visual treatment in the coach panel so the user intuitively understands the severity/type of feedback:

| Tier | Card style | Audio | Visual aid | Session log dot |
|---|---|---|---|---|
| 1 — Acknowledgment | Green-tinted, minimal | Warm, brief voice | None | 🟢 |
| 2 — Verbal correction | Default card, standard | Clear coaching voice | None | ⚪ |
| 3 — Annotated frame | Amber-tinted, expanded | "Let me show you..." | Nano Banana frame pair | 🟠 |
| 4 — Tutorial reference | Purple-tinted, expanded | "Watch this technique" | YouTube embed at timestamp | 🟣 |

### 3.2 Annotated frame generation flow

```
AI decides Tier 3 intervention needed
    ↓
Audio: "Hold on, let me show you something"
    ↓
System captures current frame from live video feed
    ↓
Frame sent to Nano Banana with prompt:
  "Take this image of a person [doing X]. Draw [correction]:
   - Circle the [body part/tool] in [color]
   - Draw an arrow showing the correct [trajectory/position/angle]
   - Keep the original image intact, only add overlay annotations"
    ↓
Visual aid area shows: "Preparing visual feedback..." (~3-8 sec)
    ↓
Annotated frame appears in visual aid area
    Left: original frame | Right: annotated version
    ↓
AI voice: explains the correction referencing the visual
    ↓
User taps [ Got it ] or AI auto-dismisses after 15 seconds
    ↓
Frame pair saved to session log and Google Docs
```

### 3.3 User-initiated interaction patterns

| User says | System response |
|---|---|
| "Can you show me that again?" | Re-displays the last annotated frame or replays the last instruction |
| "What am I doing wrong?" | AI analyzes current video more carefully, provides targeted assessment |
| "I think that was fine" | AI acknowledges, adjusts confidence on that correction, notes in user model |
| "Let's work on something else" | AI pivots session goal, announces new focus |
| "How am I doing overall?" | AI gives a brief mid-session progress summary |
| "Show me the right way" | AI surfaces the most relevant YouTube tutorial clip |

---

## 4. Data Models

### 4.1 Skill model (stored in Google Docs)

```json
{
  "skill": "knife skills",
  "illustration": "nano_banana_generated_url",
  "researchSources": [
    {
      "type": "youtube",
      "url": "https://youtube.com/...",
      "title": "Jacques Pépin's Knife Skills",
      "keyTimestamps": [
        { "time": "2:43", "description": "Proper pinch grip demonstration" },
        { "time": "4:12", "description": "Rocking cut technique" }
      ]
    }
  ],
  "properForm": {
    "grip": "Pinch blade between thumb and index finger, curl remaining fingers around handle",
    "bodyPosition": "Stand square to cutting board, elbow at 90 degrees",
    "bladeAngle": "15-20 degrees for rocking cut, blade tip stays on board",
    "guideHand": "Claw grip — fingertips curled, knuckles forward, nail guards"
  },
  "commonMistakes": [
    { "issue": "Flat palm on food", "severity": "high", "correction": "Curl fingers into claw" },
    { "issue": "Lifting blade too high", "severity": "medium", "correction": "Blade tip stays on board" },
    { "issue": "Looking away while cutting", "severity": "high", "correction": "Eyes on blade at all times" }
  ],
  "progressionOrder": [
    "Grip and safety fundamentals",
    "Basic slice (uniform thickness)",
    "Rocking cut technique",
    "Dice and brunoise",
    "Speed and consistency"
  ],
  "lastUpdated": "2026-03-27T10:00:00Z"
}
```

### 4.2 User model (stored in Google Docs)

```json
{
  "userId": "user_123",
  "skill": "knife skills",
  "totalSessions": 5,
  "currentLevel": "intermediate",
  "mastered": [
    "Pinch grip",
    "Claw guide hand"
  ],
  "improving": [
    { "area": "Blade angle consistency", "trend": "positive", "sessionsTracked": 3 }
  ],
  "needsWork": [
    { "area": "Speed under pressure", "priority": 1 },
    { "area": "Uniform dice size", "priority": 2 }
  ],
  "preferences": {
    "pushesBackOn": ["pace corrections"],
    "respondsWellTo": ["visual demonstrations", "positive reinforcement"],
    "coachingStyle": "encouraging"
  },
  "sessionHistory": [
    {
      "sessionNumber": 5,
      "date": "2026-03-25",
      "duration": "9:42",
      "goal": "Dice cuts — uniform size",
      "improvements": ["Blade angle more consistent", "Guide hand position locked in"],
      "stillWorking": ["Dice uniformity under speed"],
      "annotatedFrames": ["frame_url_1", "frame_url_2"],
      "recommendedNext": "Dice cuts — increase speed while maintaining size"
    }
  ],
  "lastUpdated": "2026-03-25T15:30:00Z"
}
```

### 4.3 Session state (runtime, not persisted)

```json
{
  "sessionId": "session_abc",
  "skill": "knife skills",
  "goal": "Rocking cut technique",
  "startTime": "2026-03-27T10:05:00Z",
  "timerRemaining": 542,
  "interventionLog": [
    {
      "timestamp": "2:15",
      "tier": 1,
      "content": "Good, that slice was much more even"
    },
    {
      "timestamp": "3:42",
      "tier": 2,
      "content": "Try to keep the blade tip on the board — lift from the heel, not the tip"
    },
    {
      "timestamp": "5:10",
      "tier": 3,
      "content": "Let me show you the wrist position",
      "annotatedFrame": {
        "originalFrame": "frame_url",
        "annotatedFrame": "annotated_url",
        "correction": "Wrist should pivot, not the whole arm"
      }
    }
  ],
  "currentFocus": "rocking cut — blade tip contact",
  "escalationState": {
    "currentCorrection": "blade tip on board",
    "timesGiven": 2,
    "currentTier": 2,
    "nextEscalation": 3
  }
}
```

---

## 5. Google Workspace Integration Points

| Integration | When | What | How |
|---|---|---|---|
| **YouTube** (read) | Research phase | Find and analyze tutorial videos | Gemini API with YouTube URL understanding |
| **YouTube** (read) | Live session, Tier 4 | Surface specific tutorial clips at timestamps | Embed player in visual aid area |
| **Google Docs** (write) | After research | Save/update skill model | Docs API — create or append to skill document |
| **Google Docs** (read) | Session start | Load skill model + user model | Docs API — read document content |
| **Google Docs** (write) | After session | Save session summary + annotated frames + update user model | Docs API — append to coaching document |
| **Google Calendar** (write) | After session | Schedule next practice session | Calendar API — create event with details |
| **Google Calendar** (read) | Session prep | Check availability for suggested session time | Calendar API — freebusy query |
| **Google Drive** (write) | After session | Store annotated frame images | Drive API — upload to coaching folder |

---

## 6. Technical Implementation Notes

### 6.1 Gemini Live API session configuration

```javascript
const sessionConfig = {
  model: "gemini-2.5-flash-native-audio-preview",
  config: {
    response_modalities: ["AUDIO"],
    tools: [
      { google_search: {} },
      {
        function_declarations: [
          {
            name: "log_observation",
            description: "Log a coaching observation to the session record",
            parameters: {
              type: "object",
              properties: {
                tier: { type: "integer", description: "Intervention tier 1-4" },
                description: { type: "string" },
                timestamp: { type: "string" }
              }
            }
          },
          {
            name: "generate_annotation",
            description: "Capture current frame and generate visual correction overlay",
            parameters: {
              type: "object",
              properties: {
                correction: { type: "string", description: "What to draw on the frame" },
                bodyPart: { type: "string", description: "What area to highlight" }
              }
            }
          },
          {
            name: "reference_tutorial",
            description: "Show a YouTube tutorial clip at a specific timestamp",
            parameters: {
              type: "object",
              properties: {
                url: { type: "string" },
                timestamp: { type: "string" },
                reason: { type: "string" }
              }
            }
          },
          {
            name: "update_skill_status",
            description: "Mark a skill area as improved or mastered",
            parameters: {
              type: "object",
              properties: {
                area: { type: "string" },
                status: { type: "string", enum: ["needs_work", "improving", "mastered"] }
              }
            }
          }
        ]
      }
    ],
    system_instruction: systemPrompt // Assembled from skill model + user model + session goals
  }
};
```

### 6.2 Nano Banana annotation prompt template

```
You are annotating a coaching frame. The user is practicing [skill].

Input image: a frame captured from the user's live video.

Task: [correction_description]

Instructions:
- Keep the original image fully intact
- Add ONLY overlay annotations:
  - Draw a bright circle or outline around [body_part]
  - Draw an arrow showing the correct [trajectory/position/angle]
  - Use bright, high-contrast colors (lime green for correct, red for incorrect)
  - Keep annotations clean and minimal — not cluttered
- Do not add text to the image (text appears in the UI separately)
- Output a single annotated image
```

### 6.3 System prompt structure for Live API

```
[ROLE]
You are a real-time coaching assistant. You watch the user via video
and provide live feedback through voice.

[SKILL MODEL]
{Injected from structured skill document — proper form, common mistakes,
progression order, tutorial references}

[USER MODEL]
{Injected from user document — mastered skills, improving areas,
focus areas, preferences, coaching style}

[SESSION GOALS]
Primary focus: {goal from session prep}
Session number: {N}
Skill level: {level}

[INTERVENTION RULES]
- Prioritize ONE correction at a time
- Use this escalation hierarchy:
  Tier 1: Brief positive acknowledgment when user does something well
  Tier 2: Short verbal correction for minor adjustments
  Tier 3: Call generate_annotation() when correction is spatial/visual
           and verbal hasn't worked after 2-3 attempts
  Tier 4: Call reference_tutorial() when the issue is fundamental technique
- Do NOT correct everything at once — pick the highest impact issue
- Deliver positive reinforcement regularly
- If user pushes back on a correction, acknowledge and adjust

[FUNCTION CALLING]
- Call log_observation() for every piece of feedback you give
- Call generate_annotation() when you need to show a visual correction
- Call reference_tutorial() when you want to show a specific tutorial clip
- Call update_skill_status() when you observe clear improvement or mastery

[VOICE STYLE]
{coaching style preference: encouraging/balanced/direct}
Keep responses concise — this is real-time coaching, not a lecture.
```

---

## 7. Demo Strategy Considerations

### 7.1 Demo flow (5 minutes)

1. **Open app** — show start screen (5 sec)
2. **Type a custom skill** — "knife skills - rocking cut" (10 sec)
3. **Watch Nano Banana generate the skill illustration** (5 sec)
4. **Session prep** — set goal, beginner level (15 sec)
5. **Research loading** — PAUSE HERE. Let judges watch the system learn from YouTube tutorials. Narrate what's happening. (30 sec)
6. **Session briefing** — show what the system learned, the tutorials it found, the plan (20 sec)
7. **Live coaching session** — the main event. Cook on camera for 2-3 minutes. Show:
   - Tier 1: positive feedback
   - Tier 2: verbal correction
   - Tier 3: annotated frame (the money shot)
   - User asks a question mid-session
8. **End session** — show post-session report being generated (30 sec)
9. **Show pre-loaded returning user** — switch to a demo account with 5 sessions of history. Show the progression timeline with annotated frames across sessions. (30 sec)
10. **Speed round** — type a completely different skill, show the system research it in 15 seconds, proving generalizability (20 sec)

### 7.2 Pre-built demo assets needed

- 5 fake past sessions with realistic data for the returning user view
- Annotated frames for the progression timeline (can be pre-generated with Nano Banana)
- A second skill (e.g., "guitar chord transitions") partially researched for the speed round
- Backup: pre-recorded video of a successful live session in case live demo has issues
