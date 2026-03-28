import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted so mock functions are available inside the vi.mock factory
// (vi.mock calls are hoisted to the top of the file by vitest, before const declarations)
const {
  mockFindTutorialUrls,
  mockAnalyzeSkillVideos,
  mockSynthesizeSkillDoc,
  mockCreateSkillDoc,
} = vi.hoisted(() => ({
  mockFindTutorialUrls: vi.fn(),
  mockAnalyzeSkillVideos: vi.fn(),
  mockSynthesizeSkillDoc: vi.fn(),
  mockCreateSkillDoc: vi.fn(),
}));

vi.mock("../../lib/gemini", () => ({
  findTutorialUrls: mockFindTutorialUrls,
  analyzeSkillVideos: mockAnalyzeSkillVideos,
  synthesizeSkillDoc: mockSynthesizeSkillDoc,
}));

vi.mock("../../lib/google-docs", () => ({
  createSkillDoc: mockCreateSkillDoc,
}));

// Import the route handler after mocks are set up
import { POST } from "../../src/app/api/research/route";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/research", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/research (RES-01)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.GLITCH_USE_DEMO_DOC;

    // Default happy path mocks
    mockFindTutorialUrls.mockResolvedValue([
      "https://www.youtube.com/watch?v=abc",
      "https://www.youtube.com/watch?v=def",
    ]);
    mockAnalyzeSkillVideos.mockResolvedValue('{"skill":"knife skills","techniqueSteps":["step1"]}');
    mockSynthesizeSkillDoc.mockResolvedValue("SKILL OVERVIEW\nKnife skills are...");
    mockCreateSkillDoc.mockResolvedValue("https://docs.google.com/document/d/doc-id-123");
  });

  it("RES-01: returns 400 when request body has no skill field", async () => {
    const res = await POST(makeRequest({}) as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("skill required");
  });

  it("RES-01: returns 400 when skill is an empty string", async () => {
    const res = await POST(makeRequest({ skill: "  " }) as any);
    expect(res.status).toBe(400);
  });

  it("RES-01: returns 200 with docUrl and skillDoc on success", async () => {
    const res = await POST(makeRequest({ skill: "knife skills" }) as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.docUrl).toBe("https://docs.google.com/document/d/doc-id-123");
    expect(body.skillDoc).toBeTruthy();
  });

  it("RES-01: calls all three Gemini steps in order", async () => {
    await POST(makeRequest({ skill: "knife skills" }) as any);
    expect(mockFindTutorialUrls).toHaveBeenCalledWith("knife skills");
    expect(mockAnalyzeSkillVideos).toHaveBeenCalledWith(
      "knife skills",
      expect.arrayContaining(["https://www.youtube.com/watch?v=abc"])
    );
    expect(mockSynthesizeSkillDoc).toHaveBeenCalledWith(
      "knife skills",
      expect.stringContaining("techniqueSteps")
    );
  });

  it("RES-01: calls createSkillDoc with title '{skill} — Skill Model'", async () => {
    await POST(makeRequest({ skill: "knife skills" }) as any);
    expect(mockCreateSkillDoc).toHaveBeenCalledWith(
      "knife skills — Skill Model",
      expect.any(String)
    );
  });

  it("RES-01: returns 500 when pipeline throws", async () => {
    mockFindTutorialUrls.mockRejectedValue(new Error("API unavailable"));
    const res = await POST(makeRequest({ skill: "knife skills" }) as any);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Research pipeline failed");
  });

  it("RES-01: returns demo doc when GLITCH_USE_DEMO_DOC=true without calling Gemini", async () => {
    process.env.GLITCH_USE_DEMO_DOC = "true";
    mockCreateSkillDoc.mockResolvedValue("https://docs.google.com/document/d/demo-doc");
    const res = await POST(makeRequest({ skill: "knife skills" }) as any);
    expect(res.status).toBe(200);
    // Gemini pipeline should NOT be called in demo mode
    expect(mockFindTutorialUrls).not.toHaveBeenCalled();
    expect(mockAnalyzeSkillVideos).not.toHaveBeenCalled();
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
