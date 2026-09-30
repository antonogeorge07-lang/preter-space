type ChatCompletion = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

function config() {
  const baseUrl = process.env.PRETER_AI_BASE_URL?.replace(/\/$/, "");
  const apiKey = process.env.PRETER_AI_API_KEY;
  const model = process.env.PRETER_AI_MODEL;

  if (!baseUrl || !apiKey || !model) {
    return null;
  }

  return { baseUrl, apiKey, model };
}

export function isAIConfigured() {
  return config() !== null;
}

export async function requestAIJson(
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: unknown;
  }>,
): Promise<string> {
  const cfg = config();

  if (!cfg) {
    throw new Error("Preter AI is not configured");
  }

  const response = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    throw new Error(`AI request failed (${response.status})`);
  }

  const payload = (await response.json()) as ChatCompletion;
  return payload.choices?.[0]?.message?.content ?? "{}";
}
