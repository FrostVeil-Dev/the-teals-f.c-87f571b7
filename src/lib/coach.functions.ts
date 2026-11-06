import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const COACH_MODELS = ["google/gemini-3.8-flash", "google/gemini-3.1-flash-lite"] as const;
export type CoachModel = (typeof COACH_MODELS)[number];
export type CoachMode = "tactical" | "matchday" | "drills";

const inputSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(6000) }))
    .min(1)
    .max(40),
  model: z.enum(COACH_MODELS),
  roleMode: z.enum(["tactical", "matchday", "drills"]),
});

type CoachResult = { ok: true; text: string; model: string } | { ok: false; error: string };

function statusOf(error: unknown): number | undefined {
  if (error && typeof error === "object" && "statusCode" in error) {
    const s = (error as { statusCode?: unknown }).statusCode;
    return typeof s === "number" ? s : undefined;
  }
  return undefined;
}

function messageOf(error: unknown): string {
  if (error && typeof error === "object") {
    const body = (error as { responseBody?: unknown }).responseBody;
    if (typeof body === "string") {
      try {
        const parsed = JSON.parse(body) as { message?: string; error?: { message?: string } | string };
        const msg = parsed.message ?? (typeof parsed.error === "string" ? parsed.error : parsed.error?.message);
        if (msg) return msg;
      } catch {
        /* not JSON */
      }
    }
    if ("message" in error && typeof (error as { message: unknown }).message === "string") {
      return (error as { message: string }).message;
    }
  }
  return "Coach Teal could not respond right now.";
}

export const askCoachTeal = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<CoachResult> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false, error: "Coach Teal is not configured yet." };

    const { streamText } = await import("ai");
    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const { TEALS_SYSTEM_INSTRUCTION, MODE_FOCUS } = await import("./coach-prompt.server");

    // Gemini conversations must begin with a user turn: drop leading assistant greetings.
    const turns = data.messages.filter((m) => m.text.trim().length > 0);
    while (turns.length > 0 && turns[0]?.role === "assistant") turns.shift();
    if (turns.length === 0) return { ok: false, error: "No question found to answer." };

    const system = TEALS_SYSTEM_INSTRUCTION + (MODE_FOCUS[data.roleMode] ?? "");
    const gateway = createLovableAiGatewayProvider(apiKey);

    const run = async (model: CoachModel) => {
      const result = streamText({
        model: gateway(model),
        system,
        messages: turns.map((m) => ({ role: m.role, content: m.text })),
        maxRetries: 0,
      });
      let text = "";
      for await (const part of result.fullStream) {
        if (part.type === "text-delta") text += part.text;
        else if (part.type === "error") throw part.error;
      }
      return text;
    };

    try {
      let usedModel: CoachModel = data.model;
      let text: string;
      try {
        text = await run(data.model);
      } catch (primaryErr) {
        // Same behaviour as the original portal: on a demand spike fall back once to the fast model.
        const status = statusOf(primaryErr);
        if (data.model !== "google/gemini-3.1-flash-lite" && (status === 429 || status === 503)) {
          usedModel = "google/gemini-3.1-flash-lite";
          text = await run(usedModel);
        } else {
          throw primaryErr;
        }
      }
      return {
        ok: true,
        text: text.trim() || "Coach Teal is reviewing the playbook. Please try again.",
        model: usedModel,
      };
    } catch (error) {
      const status = statusOf(error);
      console.error("[Coach Teal] gateway error", status, error);
      if (status === 429) return { ok: false, error: "Coach Teal is busy right now. Please wait a moment and try again." };
      if (status === 402) return { ok: false, error: messageOf(error) || "AI credits have run out for this workspace." };
      return { ok: false, error: messageOf(error) };
    }
  });
