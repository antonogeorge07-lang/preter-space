import { db } from '@/lib/db';


/**
 * Generate 3 smart reply suggestions given conversation context.
 * Returns string[]
 */
export async function getSmartReplies(messages, targetLangCode) {
  const recent = messages.slice(-6).map(m => ({
    role: m.sender === 'me' ? 'me' : 'them',
    text: m.translated_content || m.content,
  }));

  const result = await db.integrations.Core.InvokeLLM({
    model: 'gemini_3_flash',
    prompt: `Given this conversation history, suggest 3 short, natural reply options the user ("me") could send next.
Replies should be in language code "${targetLangCode}". Keep each reply under 12 words. Be conversational.
Conversation:
${recent.map(m => `${m.role}: ${m.text}`).join('\n')}

Respond with valid JSON only: {"replies": ["reply1", "reply2", "reply3"]}`,
    response_json_schema: {
      type: 'object',
      properties: { replies: { type: 'array', items: { type: 'string' } } }
    }
  });

  return result?.replies?.slice(0, 3) || [];
}

/**
 * Detect tone/sentiment of a message.
 * Returns { tone: string, emoji: string }
 */
export async function detectTone(text) {
  if (!text?.trim() || text.length < 4) return null;

  const result = await db.integrations.Core.InvokeLLM({
    model: 'gemini_3_flash',
    prompt: `Detect the emotional tone of this message in one word (e.g. friendly, excited, sad, angry, sarcastic, formal, neutral, grateful, confused).
Also pick a matching single emoji.
Message: ${JSON.stringify(text)}
Respond with valid JSON only: {"tone": "word", "emoji": "emoji"}`,
    response_json_schema: {
      type: 'object',
      properties: { tone: { type: 'string' }, emoji: { type: 'string' } }
    }
  });

  return result || null;
}

/**
 * Summarize a conversation into 2-3 sentences.
 * Returns string
 */
export async function summarizeConversation(messages, targetLangCode) {
  const content = messages
    .slice(-30)
    .map(m => `${m.sender === 'me' ? 'Me' : 'Them'}: ${m.translated_content || m.content}`)
    .join('\n');

  const result = await db.integrations.Core.InvokeLLM({
    model: 'gemini_3_flash',
    prompt: `Summarize this conversation in 2-3 sentences in language code "${targetLangCode}". Be concise and highlight key points.
Conversation:
${content}
Respond with valid JSON only: {"summary": "..."}`,
    response_json_schema: {
      type: 'object',
      properties: { summary: { type: 'string' } }
    }
  });

  return result?.summary || '';
}