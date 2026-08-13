import { createServerFn } from "@tanstack/react-start";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

function extractJson(text: string) {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

export const invokeLLM = createServerFn({ method: "POST" })
  .inputValidator((data: { prompt: string }) => data)
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured");

    const res = await fetch(GATEWAY, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-3.5-flash",
        messages: [
          { role: "system", content: "You are a precise assistant. Always reply with valid JSON only." },
          { role: "user", content: data.prompt },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`AI gateway failed [${res.status}]: ${body}`);
      throw new Error(`AI request failed [${res.status}]`);
    }

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content ?? "";
    return extractJson(content);
  });

export const transcribeAudio = createServerFn({ method: "POST" })
  .inputValidator((data: { audioUrl: string }) => data)
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured");

    const audioRes = await fetch(data.audioUrl);
    if (!audioRes.ok) throw new Error("Could not read the audio file");
    const buffer = Buffer.from(await audioRes.arrayBuffer());
    const base64 = buffer.toString("base64");

    const res = await fetch(GATEWAY, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-3.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Transcribe this audio verbatim. Reply with the transcript text only." },
              { type: "input_audio", input_audio: { data: base64, format: "webm" } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`Transcription failed [${res.status}]: ${body}`);
      throw new Error(`Transcription failed [${res.status}]`);
    }

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return (json.choices?.[0]?.message?.content ?? "").trim();
  });

export const sendInviteEmail = createServerFn({ method: "POST" })
  .inputValidator((data: { to: string; subject: string; body: string }) => data)
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Email is not configured");
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
