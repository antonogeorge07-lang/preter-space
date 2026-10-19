import { createServerFn } from "@tanstack/react-start";
import { requestAI, parseAIJson } from "@/lib/ai/provider";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

const aiInput = z.object({
  prompt: z.string().trim().min(1).max(4000),
});

const emailInput = z.object({
  to: z.string().email().max(254),
  subject: z.string().trim().min(1).max(150),
  body: z.string().trim().min(1).max(4000),
});

export const invokeLLM = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => aiInput.parse(data))
  .handler(async ({ data }) => {
    const content = await requestAI({
      json: true,
      messages: [
        {
          role: "system",
          content: "You are a precise assistant. Always reply with valid JSON only.",
        },
        {
          role: "user",
          content: data.prompt,
        },
      ],
    });

    return parseAIJson(content) as Record<string, JsonValue>;
  });

export const transcribeAudio = createServerFn({ method: "POST" })
  .validator((data: { audioUrl: string }) => data)
  .handler(async () => {
    throw new Error(
      "Audio transcription temporarily unavailable pending secure storage integration",
    );
  });

export const sendInviteEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => emailInput.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];

    if (!apiKey) {
      throw new Error("Email is not configured");
    }

    const { sendLovableEmail } = await import("@lovable.dev/email-js");

    const html = `<div style="font-family:sans-serif;line-height:1.6;white-space:pre-wrap">${data.body
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")}</div>`;

    const result = await sendLovableEmail(
      {
        to: data.to,
        from: "invites@lovable.app",
        subject: data.subject,
        html,
        text: data.body,
      },
      { apiKey },
    );

    return { success: !!result?.success };
  });
