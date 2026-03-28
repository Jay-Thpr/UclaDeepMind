import { NextRequest } from "next/server";
import {
  generateSkillIllustration,
} from "../../../../lib/gemini";
import { assembleSystemPrompt } from "../../../../lib/session-context";
import { getUserOAuthClient } from "../../../../lib/getUserAuth";
import {
  appendResearchLogEntry,
  buildResearchBrief,
  conductStructuredVideoResearch,
  conductStructuredWebResearch,
  finalizeResearchWorkspace,
  generateClarificationQuestions,
  initializeResearchWorkspace,
  mapResearchModelToSkillModel,
  parseLearnerProfile,
  synthesizeResearchModel,
} from "../../../../lib/research";
import type {
  ClarificationAnswer,
  ResearchIntakeInput,
  SkillLevel,
} from "../../../../lib/research-types";

export const runtime = "nodejs"; // Required for SSE

export async function POST(req: NextRequest) {
  let intake: ResearchIntakeInput;
  try {
    const body = await req.json();
    const skill = body?.skill?.trim() || "";
    intake = {
      skill,
      goal: body?.goal?.trim() || `Learn ${skill}`,
      level: (body?.level || "beginner") as SkillLevel,
      preferences: body?.preferences?.trim() || undefined,
      constraints: body?.constraints?.trim() || undefined,
      environment: body?.environment?.trim() || undefined,
      equipment: Array.isArray(body?.equipment)
        ? body.equipment.map((item: unknown) => String(item))
        : undefined,
    };
  } catch {
    return new Response(JSON.stringify({ error: "invalid body" }), { status: 400 });
  }

  if (!intake.skill) {
    return new Response(JSON.stringify({ error: "skill required" }), { status: 400 });
  }

  // SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let oauthClient: any | null = null;
      let researchLogTarget: { documentId: string; researchLogTabId: string } | null = null;
      let workspaceState: {
        rootFolderUrl: string;
        researchDocUrl: string;
        researchDocId: string;
        researchLogTabId: string;
        finalResearchTabId: string;
        progressFolderId: string;
      } | null = null;

      const emit = async (type: string, data: object | string) => {
        const payload: Record<string, unknown> = typeof data === "string" ? { message: data } : (data as Record<string, unknown>);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type, ...payload })}\n\n`)
        );

        if (type === "status" && researchLogTarget && typeof payload.message === "string" && oauthClient) {
          try {
            await appendResearchLogEntry(
              researchLogTarget.documentId,
              researchLogTarget.researchLogTabId,
              payload.message,
              oauthClient
            );
          } catch (error) {
            console.error("[research] Failed to append log entry:", error);
          }
        }
      };

      try {
        // Demo fallback
        if (process.env.GLITCH_USE_DEMO_DOC === "true") {
          const { default: demoDoc } = await import("../../../../data/cooking-skill-demo.json");
          await emit("status", { message: "Loading demo coaching plan..." });
          await new Promise(r => setTimeout(r, 800));
          emit("done", { skillModel: demoDoc, docUrl: null, systemPrompt: "" });
          controller.close();
          return;
        }

        await emit("status", { message: `🔍 Starting research for "${intake.skill}"...` });

        await emit("status", { message: "🧾 Parsing learner profile..." });
        const learnerProfile = await parseLearnerProfile(intake);

        const clarificationAnswers = Array.isArray((intake as any).clarificationAnswers)
          ? ((intake as any).clarificationAnswers as ClarificationAnswer[])
          : [];

        await emit("status", { message: "❓ Checking whether clarification is needed..." });
        const clarificationQuestions = await generateClarificationQuestions(learnerProfile);
        if (clarificationQuestions.length > 0 && clarificationAnswers.length === 0) {
          await emit("clarification_required", { questions: clarificationQuestions });
          await emit("status", { message: `❓ ${clarificationQuestions.length} clarification questions identified` });
          controller.close();
          return;
        } else {
          await emit("status", { message: "✅ No clarification questions needed" });
        }

        await emit("status", { message: "🗺️ Building research brief..." });
        const researchBrief = await buildResearchBrief(learnerProfile, clarificationAnswers);

        try {
          oauthClient = await getUserOAuthClient();
          if (oauthClient) {
            workspaceState = await initializeResearchWorkspace(researchBrief.skill, oauthClient);
            researchLogTarget = {
              documentId: workspaceState.researchDocId,
              researchLogTabId: workspaceState.researchLogTabId,
            };
            await emit("status", { message: "🗂️ Research workspace initialized" });
          }
        } catch {
          oauthClient = null;
        }

        const [illustrationUrl, webResearch, videoResearch] = await Promise.all([
          generateSkillIllustration(intake.skill).then(url => {
            void emit("status", { message: "🎨 Skill illustration generated" });
            void emit("illustration", { url });
            return url;
          }),
          conductStructuredWebResearch(researchBrief).then((result) => {
            const firstFinding = result.findings[0];
            if (firstFinding) {
              void emit("status", {
                message: `✅ Web research captured ${firstFinding.properForm.slice(0, 3).length} proper-form signals`,
              });
            }
            return result;
          }),
          conductStructuredVideoResearch(researchBrief, (title) =>
            void emit("status", { message: `✅ Analyzed: "${title}"` })
          ).then((result) => {
            void emit("status", { message: `📺 Analyzed ${result.videos.length} tutorial videos` });
            return result;
          }),
        ]);

        await emit("status", { message: "🧠 Synthesizing research model..." });
        const researchModel = await synthesizeResearchModel(
          researchBrief,
          webResearch.findings,
          videoResearch.videos
        );
        const skillModel = mapResearchModelToSkillModel(researchModel, illustrationUrl);
        await emit("status", { message: "✅ Coaching plan ready" });

        await emit("status", { message: "📄 Saving research workspace..." });
        let docUrl: string | null = null;
        let progressDocUrl: string | null = null;
        let rootFolderUrl: string | null = null;
        try {
          if (oauthClient && workspaceState) {
            const finalized = await finalizeResearchWorkspace(
              researchModel,
              clarificationQuestions,
              oauthClient
              ,
              workspaceState.researchDocId,
              workspaceState.finalResearchTabId,
              workspaceState.progressFolderId
            );
            docUrl = workspaceState.researchDocUrl;
            progressDocUrl = finalized.progressDocUrl;
            rootFolderUrl = workspaceState.rootFolderUrl;
          }
          await emit("status", { message: "✅ Saved research and progress docs to Drive" });
        } catch (err: any) {
          if (err?.message !== "NO_CREDENTIALS") {
            console.error("[research] Docs write failed:", err);
          }
        }

        // ── ASSEMBLE SYSTEM PROMPT ──
        const systemPrompt = assembleSystemPrompt(skillModel, null);

        await emit("done", {
          skillModel,
          researchModel,
          skillModelJson: JSON.stringify(skillModel),
          systemPrompt,
          docUrl,
          progressDocUrl,
          rootFolderUrl,
        });

      } catch (err) {
        console.error("[research] Pipeline error:", err);
        await emit("error", { message: "Research pipeline failed" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
