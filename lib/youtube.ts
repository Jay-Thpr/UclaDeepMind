import { google } from "googleapis";

/**
 * YouTube Data API fallback — used when Gemini grounding returns < 3 YouTube URLs.
 * Costs 100 quota units per call (10,000 unit/day default quota — use sparingly).
 *
 * TODO: set YOUTUBE_API_KEY in .env.local
 * TODO: Implement real YouTube search here — returns mock data for now
 */
export async function searchYouTubeTutorials(skill: string, maxResults = 5): Promise<string[]> {
  if (!process.env.YOUTUBE_API_KEY) {
    console.warn("[youtube] YOUTUBE_API_KEY not set — skipping YouTube Data API fallback");
    return [];
  }

  const youtube = google.youtube({ version: "v3", auth: process.env.YOUTUBE_API_KEY });

  try {
    const res = await youtube.search.list({
      part: ["snippet", "id"],
      q: `${skill} tutorial technique`,
      type: ["video"],
      maxResults,
      relevanceLanguage: "en",
      videoDuration: "medium", // 4-20 minutes — typical tutorial length
    });

    const items = res.data.items ?? [];
    return items
      .map((item) => {
        const videoId = item.id?.videoId;
        return videoId ? `https://www.youtube.com/watch?v=${videoId}` : null;
      })
      .filter((url): url is string => url !== null);
  } catch (err: any) {
    if (err?.code === 403 && err?.message?.includes("quotaExceeded")) {
      console.error("[youtube] YouTube API quota exceeded — falling back to grounding results only");
      return [];
    }
    throw err;
  }
}
