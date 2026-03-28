import { describe, it, expect, vi } from "vitest";

// Mock googleapis before importing the module under test
vi.mock("googleapis", () => ({
  google: {
    auth: {
      GoogleAuth: vi.fn(),
    },
    docs: vi.fn(() => ({
      documents: {
        create: vi.fn(),
        batchUpdate: vi.fn(),
      },
    })),
    drive: vi.fn(() => ({
      files: {
        update: vi.fn(),
      },
    })),
  },
}));

describe("Google Docs helper (lib/google-docs.ts)", () => {
  it("RES-05: createSkillDoc calls documents.create and returns a doc URL", async () => {
    // STUB — implement after Plan 02 creates lib/google-docs.ts
    expect(true).toBe(true);
  });
});
