import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Hoisted mocks ---
const mockGenerateContent = vi.fn();

vi.mock("@google/genai", () => ({
  GoogleGenAI: function () {
    return {
      models: {
        generateContent: mockGenerateContent,
      },
    };
  },
}));

vi.mock("../../prompts/skill-research", () => ({
  buildDiscoveryPrompt: vi.fn(() => "find tutorials prompt"),
  buildAnalysisPrompt: vi.fn(() => "analyze videos prompt"),
  buildSynthesisPrompt: vi.fn(() => "synthesize prompt"),
}));

import { findTutorialUrls, analyzeSkillVideos, synthesizeSkillDoc, GEMINI_MODEL } from "../../lib/gemini";

describe("Gemini pipeline constants", () => {
  it("GEMINI_MODEL is gemini-2.5-flash (not deprecated 2.0)", () => {
    expect(GEMINI_MODEL).toBe("gemini-2.5-flash");
    expect(GEMINI_MODEL).not.toContain("2.0");
  });
});

describe("findTutorialUrls (RES-02)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = "test-key";
    delete process.env.YOUTUBE_API_KEY;
  });

  it("RES-02: returns YouTube URLs extracted from grounding metadata", async () => {
    mockGenerateContent.mockResolvedValue({
      candidates: [{
        groundingMetadata: {
          groundingChunks: [
            { web: { uri: "https://www.youtube.com/watch?v=abc123" } },
            { web: { uri: "https://www.example.com/article" } },
            { web: { uri: "https://youtu.be/def456" } },
          ],
        },
      }],
    });

    const urls = await findTutorialUrls("knife skills");
    expect(urls).toContain("https://www.youtube.com/watch?v=abc123");
    expect(urls).toContain("https://youtu.be/def456");
    expect(urls).not.toContain("https://www.example.com/article");
  });

  it("RES-02: returns at most 5 URLs", async () => {
    mockGenerateContent.mockResolvedValue({
      candidates: [{
        groundingMetadata: {
          groundingChunks: Array(10).fill(null).map((_, i) => ({
            web: { uri: `https://www.youtube.com/watch?v=video${i}` },
          })),
        },
      }],
    });
    const urls = await findTutorialUrls("knife skills");
    expect(urls.length).toBeLessThanOrEqual(5);
  });

  it("RES-02: returns empty array when no YouTube URLs found in grounding chunks", async () => {
    mockGenerateContent.mockResolvedValue({
      candidates: [{
        groundingMetadata: {
          groundingChunks: [{ web: { uri: "https://example.com/article" } }],
        },
      }],
    });
    const urls = await findTutorialUrls("knife skills");
    expect(Array.isArray(urls)).toBe(true);
  });
});

describe("analyzeSkillVideos (RES-03)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = "test-key";
  });

  it("RES-03: throws when urls array is empty", async () => {
    await expect(analyzeSkillVideos("knife skills", [])).rejects.toThrow(
      "No video URLs to analyze"
    );
  });

  it("RES-03: passes video URLs as fileData.fileUri content parts", async () => {
    mockGenerateContent.mockResolvedValue({ text: '{"skill":"knife skills"}' });
    await analyzeSkillVideos("knife skills", ["https://www.youtube.com/watch?v=abc"]);
    const call = mockGenerateContent.mock.calls[0][0];
    const videoContent = call.contents[0];
    expect(videoContent).toHaveProperty("fileData.fileUri", "https://www.youtube.com/watch?v=abc");
  });

  it("RES-03: returns the response text from Gemini", async () => {
    const mockJson = JSON.stringify({ skill: "knife skills", techniqueSteps: ["step 1"] });
    mockGenerateContent.mockResolvedValue({ text: mockJson });
    const result = await analyzeSkillVideos("knife skills", ["https://www.youtube.com/watch?v=abc"]);
    expect(result).toBe(mockJson);
  });
});

describe("synthesizeSkillDoc (RES-04)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = "test-key";
  });

  it("RES-04: returns non-empty string from Gemini", async () => {
    mockGenerateContent.mockResolvedValue({ text: "SKILL OVERVIEW\nKnife skills..." });
    const result = await synthesizeSkillDoc("knife skills", "{}");
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });

  it("RES-04: throws when Gemini returns empty text", async () => {
    mockGenerateContent.mockResolvedValue({ text: "" });
    await expect(synthesizeSkillDoc("knife skills", "{}")).rejects.toThrow(
      "Gemini returned empty synthesis"
    );
  });
});
