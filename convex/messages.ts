import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

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
    translations: v.optional(v.any()),
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
    translations: v.optional(v.any()),
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
