const apiBase = import.meta.env.VITE_API_URL ?? ''

export type SkillOut = {
  id: string
  title: string
  notes: string | null
  context: Record<string, unknown> | null
  stats_sessions: number
  stats_practice_seconds: number
  stats_level: number
  stats_progress_percent: number
  stats_mastered: number
  stats_day_streak: number
  last_practice_at: string | null
  created_at: string
  updated_at: string
}

export type ResearchOut = {
  id: string
  skill_id: string
  title: string | null
  content: string
  extra: Record<string, unknown> | null
  created_at: string
}

export type SkillWithResearchResponse = {
  skill: SkillOut
  research: ResearchOut
}

export type SkillCreateWithResearchBody = {
  title: string
  goal: string
  level: string
  category?: string | null
}

export type SessionCompleteBody = {
  duration_seconds: number
  session_notes?: string | null
}

export type SkillSessionSummaryOut = {
  id: string
  skill_id: string
  session_number: number
  duration_seconds: number
  summary_text: string
  coach_note: string | null
  progress_delta: number
  level_ups: number
  mastered_delta: number
  input_notes: string | null
  extra: Record<string, unknown> | null
  created_at: string
}

export type SessionCompleteResponse = {
  skill: SkillOut
  coach_note: string
  progress_delta: number
  level_ups: number
  mastered_delta: number
  session_summary: SkillSessionSummaryOut
  docs_export_url: string | null
}

export type ProgressEventOut = {
  id: string
  skill_id: string
  kind: string
  label: string | null
  detail: Record<string, unknown> | null
  metric_value: number | null
  created_at: string
}

export async function fetchSkills(): Promise<SkillOut[]> {
  const res = await fetch(`${apiBase}/api/skills`, { credentials: 'include' })
  if (res.status === 401) {
    throw new Error('Sign in to load skills.')
  }
  if (!res.ok) {
    throw new Error(`Failed to load skills: ${res.status}`)
  }
  const data = (await res.json()) as { skills: SkillOut[] }
  return data.skills
}

export async function fetchSkill(skillId: string): Promise<SkillOut> {
  const res = await fetch(`${apiBase}/api/skills/${encodeURIComponent(skillId)}`, {
    credentials: 'include',
  })
  if (res.status === 401) {
    throw new Error('Sign in to load this skill.')
  }
  if (!res.ok) {
    throw new Error(`Failed to load skill: ${res.status}`)
  }
  return res.json() as Promise<SkillOut>
}

function errorFromResponse(res: Response, bodyText: string): string {
  try {
    const data = JSON.parse(bodyText) as { detail?: unknown }
    if (typeof data.detail === 'string') return data.detail
  } catch {
    /* ignore */
  }
  return bodyText || `Request failed: ${res.status}`
}

export async function createSkillWithResearch(
  body: SkillCreateWithResearchBody,
): Promise<SkillWithResearchResponse> {
  const res = await fetch(`${apiBase}/api/skills/create-with-research`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(errorFromResponse(res, text))
  }
  return JSON.parse(text) as SkillWithResearchResponse
}

export type CheckpointOut = {
  id: number
  goal: string
  confirm_strategy: string
}

export type LessonPlanData = {
  coaching_mode: string
  sensory_cues: string[]
  safety_flags: string[]
  checkpoints: CheckpointOut[]
  common_mistakes: string[]
  tone: string
}

export type LessonPlanOut = {
  skill_id: string
  source_research_id: string | null
  lesson_plan: LessonPlanData
}

export async function fetchLessonPlan(skillId: string): Promise<LessonPlanOut> {
  const res = await fetch(
    `${apiBase}/api/skills/${encodeURIComponent(skillId)}/lesson-plan`,
    { credentials: 'include' },
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(errorFromResponse(res, text))
  }
  return res.json() as Promise<LessonPlanOut>
}

// ---------------------------------------------------------------------------
// SSE streaming research creation
// ---------------------------------------------------------------------------

export type ResearchStreamStatus = {
  type: 'status'
  phase: string
  message: string
  pct: number
}

export type ResearchStreamDone = {
  type: 'done'
  skill: SkillOut
  research: ResearchOut
}

export type ResearchStreamError = {
  type: 'error'
  message: string
}

export type ResearchStreamEvent =
  | ResearchStreamStatus
  | ResearchStreamDone
  | ResearchStreamError

export async function* createSkillWithResearchStream(
  body: SkillCreateWithResearchBody,
): AsyncGenerator<ResearchStreamEvent> {
  const res = await fetch(`${apiBase}/api/skills/create-with-research-stream`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(errorFromResponse(res, text))
  }
  if (!res.body) {
    throw new Error('No response body for research stream')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      try {
        const payload = JSON.parse(line.slice(6)) as ResearchStreamEvent
        yield payload
      } catch {
        // skip malformed frame
      }
    }
  }
  // flush any remaining buffer
  if (buffer.startsWith('data: ')) {
    try {
      yield JSON.parse(buffer.slice(6)) as ResearchStreamEvent
    } catch {
      // ignore
    }
  }
}

export async function completeSession(
  skillId: string,
  body: SessionCompleteBody,
): Promise<SessionCompleteResponse> {
  const res = await fetch(
    `${apiBase}/api/skills/${encodeURIComponent(skillId)}/complete-session`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
  const text = await res.text()
  if (!res.ok) {
    throw new Error(errorFromResponse(res, text))
  }
  return JSON.parse(text) as SessionCompleteResponse
}

// ---------------------------------------------------------------------------
// Character endpoints
// ---------------------------------------------------------------------------

export type CharacterOut = {
  id: string
  skill_id: string
  user_sub: string
  name: string
  personality: string
  coaching_style: string
  appearance_description: string | null
  image_url: string | null
  created_at: string
  updated_at: string
}

export type CharacterCreate = {
  name: string
  personality: string
  coaching_style: string
  appearance_description?: string | null
  image_url?: string | null
}

export async function fetchCharacter(skillId: string): Promise<CharacterOut | null> {
  const res = await fetch(
    `${apiBase}/api/skills/${encodeURIComponent(skillId)}/character`,
    { credentials: 'include' },
  )
  if (res.status === 404 || res.status === 204) {
    return null
  }
  if (!res.ok) {
    const text = await res.text()
    throw new Error(errorFromResponse(res, text))
  }
  return res.json() as Promise<CharacterOut>
}

export async function createCharacter(
  skillId: string,
  body: CharacterCreate,
): Promise<CharacterOut> {
  const res = await fetch(
    `${apiBase}/api/skills/${encodeURIComponent(skillId)}/character`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
  const text = await res.text()
  if (!res.ok) {
    throw new Error(errorFromResponse(res, text))
  }
  return JSON.parse(text) as CharacterOut
}

export async function deleteCharacter(skillId: string): Promise<void> {
  const res = await fetch(
    `${apiBase}/api/skills/${encodeURIComponent(skillId)}/character`,
    {
      method: 'DELETE',
      credentials: 'include',
    },
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(errorFromResponse(res, text))
  }
}

// ---------------------------------------------------------------------------
// Dashboard / cross-skill endpoints
// ---------------------------------------------------------------------------

export async function fetchRecentSessions(limit = 10): Promise<SkillSessionSummaryOut[]> {
  const res = await fetch(
    `${apiBase}/api/skills/sessions/recent?limit=${limit}`,
    { credentials: 'include' },
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(errorFromResponse(res, text))
  }
  const data = (await res.json()) as { items: SkillSessionSummaryOut[] }
  return data.items
}
