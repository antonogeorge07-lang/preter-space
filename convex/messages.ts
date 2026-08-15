import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const list = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .order("asc")
      .collect();
  },
});

/**
 * Newest `limit` messages for a conversation, returned oldest-first for the UI.
 * `hasMore` tells the client whether older history exists above the window.
 */
export const listPage = query({
  args: {
    conversationId: v.id("conversations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 40, 1), 500);
    const newestFirst = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .order("desc")
      .take(limit + 1);

    const hasMore = newestFirst.length > limit;
    const page = hasMore ? newestFirst.slice(0, limit) : newestFirst;
    return { messages: page.reverse(), hasMore };
  },
});

export const send = mutation({
  args: {
    conversationId: v.id("conversations"),
    senderId: v.string(),
    text: v.string(),
    translations: v.optional(v.record(v.string(), v.string())),
    audioStorageId: v.optional(v.id("_storage")),
    fileStorageId: v.optional(v.id("_storage")),
    replyToId: v.optional(v.id("messages")),
    meta: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    // Guard: Verify sender is not blocked by any conversation participant
    for (const participantId of conversation.participantIds) {
      if (participantId === args.senderId) continue;

      const participant = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", participantId))
        .first();

      if (participant?.blockedUsers?.includes(args.senderId)) {
        throw new Error("Message not delivered: Recipient has blocked sender.");
      }
    }

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: args.senderId,
      text: args.text,
      translations: args.translations,
      audioStorageId: args.audioStorageId,
      fileStorageId: args.fileStorageId,
      replyToId: args.replyToId,
      meta: args.meta,
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.conversationId, { lastMessageTime: Date.now() });

    return messageId;
  },
});

export const update = mutation({
  args: {
    messageId: v.id("messages"),
    text: v.optional(v.string()),
    translations: v.optional(v.record(v.string(), v.string())),
    meta: v.optional(v.any()),
    deleted: v.optional(v.boolean()),
    edited: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { messageId, ...patch } = args;
    const clean = Object.fromEntries(Object.entries(patch).filter(([, v2]) => v2 !== undefined));
    if (Object.keys(clean).length === 0) return messageId;
    await ctx.db.patch(messageId, clean);
    return messageId;
  },
});

export const remove = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const reactions = await ctx.db
      .query("reactions")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .collect();
    for (const r of reactions) await ctx.db.delete(r._id);
    await ctx.db.delete(args.messageId);
    return null;
  },
});

/**
 * Direct DB write for a message (used by the translation action below).
 */
export const insertMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    senderId: v.string(),
    text: v.string(),
    translations: v.optional(v.record(v.string(), v.string())),
    audioStorageId: v.optional(v.id("_storage")),
    fileStorageId: v.optional(v.id("_storage")),
    replyToId: v.optional(v.id("messages")),
    meta: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("messages", { ...args, createdAt: Date.now() });
    await ctx.db.patch(args.conversationId, { lastMessageTime: Date.now() });
    return messageId;
  },
});

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function translateOnce(text: string, lang: string, apiKey: string) {
  const response = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
    body: JSON.stringify({
      model: "google/gemini-3.6-flash",
      messages: [
        {
          role: "system",
          content:
            `Detect the ISO 639-1 language of the user text and translate it to language code "${lang}". ` +
            `If it is already in "${lang}", return the exact same text. ` +
            `Respond with JSON only: {"detected":"<iso639-1>","translation":"<translated text>"}`,
        },
        { role: "user", content: text },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) throw new Error(`Translation failed (${response.status})`);
  const data = await response.json();
  const raw = data?.choices?.[0]?.message?.content ?? "{}";
  let parsed: { detected?: string; translation?: string } = {};
  try {
    parsed = JSON.parse(raw.replace(/^```(?:json)?|```$/g, "").trim());
  } catch {
    parsed = {};
  }
  return {
    detected: parsed.detected || "",
    translation: parsed.detected === lang ? text : parsed.translation || text,
  };
}

/**
 * Server-side translate-then-persist. Keeps the AI key in the backend and
 * fans out to every recipient language in one round trip.
 */
export const sendWithTranslation = action({
  args: {
    conversationId: v.id("conversations"),
    senderId: v.string(),
    text: v.string(),
    targetLanguages: v.array(v.string()),
    replyToId: v.optional(v.id("messages")),
    meta: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    const translations: Record<string, string> = {};
    let detectedLanguage = "";

    if (apiKey && args.text.trim()) {
      const langs = [...new Set(args.targetLanguages.filter(Boolean))];
      const results = await Promise.all(
        langs.map(async (lang) => {
          try {
            return { lang, ...(await translateOnce(args.text, lang, apiKey)) };
          } catch {
            return { lang, detected: "", translation: "" };
          }
        }),
      );
      for (const r of results) {
        if (r.translation) translations[r.lang] = r.translation;
        if (!detectedLanguage && r.detected) detectedLanguage = r.detected;
      }
    }

    const meta = {
      ...(args.meta ?? {}),
      ...(detectedLanguage ? { originalLanguage: detectedLanguage } : {}),
      ...(args.targetLanguages[0] && translations[args.targetLanguages[0]]
        ? { translatedContent: translations[args.targetLanguages[0]] }
        : {}),
    };

    const messageId: string = await ctx.runMutation(api.messages.send, {
      conversationId: args.conversationId,
      senderId: args.senderId,
      text: args.text,
      translations: Object.keys(translations).length > 0 ? translations : undefined,
      replyToId: args.replyToId,
      meta,
    });

    return { messageId, translations, detectedLanguage };
  },
});
