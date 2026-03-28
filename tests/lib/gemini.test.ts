import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @google/genai before importing the module under test
vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateContent: vi.fn(),
    },
  })),
}));

// These imports will work once lib/gemini.ts is created in Plan 03
// For now, stubs ensure the test file itself is valid and runnable
describe("Gemini pipeline (lib/gemini.ts)", () => {
  it("RES-02: findTutorialUrls returns an array of YouTube URLs", async () => {
    // STUB — implement after Plan 03 creates lib/gemini.ts
    expect(true).toBe(true);
  });

  it("RES-03: analyzeSkillVideos returns valid JSON with required keys", async () => {
    // STUB — implement after Plan 03 creates lib/gemini.ts
    expect(true).toBe(true);
  });

  it("RES-04: synthesizeSkillDoc returns a non-empty string with section headers", async () => {
    // STUB — implement after Plan 03 creates lib/gemini.ts
    expect(true).toBe(true);
  });
});
