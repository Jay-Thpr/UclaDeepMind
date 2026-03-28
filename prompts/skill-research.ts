/**
 * Prompt templates for the three-step Gemini research pipeline.
 * Keep prompts here — not inside lib/gemini.ts — so they can be tuned
 * independently of the pipeline infrastructure.
 */

/**
 * Step 1: Discovery prompt — finds YouTube tutorial URLs via search grounding.
 * The grounding tool handles the search; this prompt guides relevance ranking.
 */
export function buildDiscoveryPrompt(skill: string): string {
  return `Find the 5 best YouTube tutorial videos for learning "${skill}" technique.

Requirements for good tutorial videos:
- Instructional content showing hands-on demonstration
- Clear form cues and technique breakdown
- Suitable for a coaching AI that watches students via webcam

Return ONLY a JSON array of YouTube video URLs, no other text:
["https://www.youtube.com/watch?v=...", "https://www.youtube.com/watch?v=...", ...]`;
}

/**
 * Step 2: Analysis prompt — extracts coaching data from tutorial videos.
 * CRITICAL: All mistakes must be OBSERVABLE from a camera (position, angle, grip, posture).
 * Not subjective ("don't rush") — only things a camera can detect.
 */
export function buildAnalysisPrompt(skill: string): string {
  return `You are building a coaching AI that watches a student via webcam and gives real-time corrections.
Analyze these "${skill}" tutorial videos to extract coaching knowledge.

Return ONLY valid JSON matching this exact schema — no markdown, no extra text:
{
  "skill": "${skill}",
  "techniqueSteps": [
    "step with specific body/tool positioning description"
  ],
  "commonMistakes": [
    {
      "mistake": "OBSERVABLE description — what the camera sees (e.g., 'wrist drops below cutting board level during the stroke')",
      "correction": "specific fix with body/tool positioning (e.g., 'keep wrist at board level, drive motion from elbow')",
      "severity": "high"
    }
  ],
  "progressionMilestones": [
    "beginner milestone",
    "intermediate milestone",
    "advanced milestone"
  ],
  "keyTimestamps": [
    {
      "videoUrl": "https://www.youtube.com/watch?v=...",
      "timestamp": "MM:SS",
      "coachingNote": "what technique principle this timestamp demonstrates"
    }
  ]
}

CRITICAL RULES:
1. All mistakes must be OBSERVABLE from a camera — position, angle, grip, posture only
   BAD: "students often rush through the motion"
   GOOD: "elbow flares outward at 45 degrees instead of tracking close to the body"
2. Technique steps must reference specific body parts and positions, not general advice
3. Severity ranking: high = safety risk or fundamental error; medium = prevents progression; low = polish
4. Include at least 3 commonMistakes, 3 techniqueSteps, 3 progressionMilestones
5. keyTimestamps must reference actual timestamps from the videos you analyzed`;
}

/**
 * Step 3: Synthesis prompt — converts raw JSON analysis into a clean coaching document.
 * Output is plain text with ALL CAPS headers (compatible with plain insertText to Docs API).
 */
export function buildSynthesisPrompt(skill: string, rawAnalysis: string): string {
  return `Convert this raw coaching analysis into a clean, structured skill document for "${skill}".

Raw analysis data:
${rawAnalysis}

Format as plain text with these exact ALL CAPS section headers in order:
SKILL OVERVIEW
TECHNIQUE STEPS
COMMON MISTAKES AND CORRECTIONS
PROGRESSION MILESTONES
KEY VIDEO REFERENCES

Rules:
- Use plain text only (no markdown, no asterisks, no bullet dashes — use numbers or plain lines)
- Under COMMON MISTAKES AND CORRECTIONS, list each mistake then its correction on the next line
- Under KEY VIDEO REFERENCES, format each as: VIDEO_URL | TIMESTAMP | coaching note
- Write as a coaching manual, not a Wikipedia article
- Be specific: reference body parts, positions, angles
- This document will be injected into a live coaching AI system prompt`;
}
