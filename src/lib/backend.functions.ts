import { createServerFn } from "@tanstack/react-start";
import { requestAI, parseAIJson } from "@/lib/ai/provider";

export const invokeLLM = createServerFn({ method: "POST" })
  .validator((data: { prompt: string }) => data)
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

    return parseAIJson(content) as Record<string, any>;
  });

export const transcribeAudio = createServerFn({ method: "POST" })
  .validator((data: { audioUrl: string }) => data)
  .handler(async () => {
    throw new Error(
      "Audio transcription temporarily unavailable pending secure storage integration",
    );
  });

export const sendInviteEmail = createServerFn({ method: "POST" })
  .validator((data: { to: string; subject: string; body: string }) => data)
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
