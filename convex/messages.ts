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

export const send = mutation({
  args: {
    conversationId: v.id("conversations"),
    senderId: v.string(),
    text: v.string(),
    translations: v.optional(v.any()),
    audioStorageId: v.optional(v.id("_storage")),
    fileStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    // Guard: Verify sender is not blocked by any conversation participant
    for (const participantId of conversation.participantIds) {
      if (participantId === args.senderId) continue;

      const participant = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("email"), participantId))
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
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.conversationId, { lastMessageTime: Date.now() });

    return messageId;
  },
});
