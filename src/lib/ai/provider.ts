export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: unknown;
};

export type AiRequest = {
  messages: ChatMessage[];
  model?: string;
  json?: boolean;
};

type ChatCompletion = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

function config() {
  const baseUrl = process.env["PRETER_AI_BASE_URL"]?.replace(/\/$/, "");
  const apiKey = process.env["PRETER_AI_API_KEY"];
  const model = process.env["PRETER_AI_MODEL"];

  if (!baseUrl || !apiKey || !model) {
    throw new Error("Preter AI is not configured");
  }

  return { baseUrl, apiKey, model };
}

export async function requestAI({
  messages,
  model,
  json = false,
}: AiRequest): Promise<string> {
  const cfg = config();

  const response = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: model ?? cfg.model,
      messages,
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!response.ok) {
    console.error(`Preter AI request failed [${response.status}]`);
    throw new Error(`AI request failed [${response.status}]`);
  }

  const payload = (await response.json()) as ChatCompletion;
  return payload.choices?.[0]?.message?.content ?? "";
}

export function parseAIJson<T>(content: string): T | null {
  const cleaned = content
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);

    if (!match) return null;

    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
}
