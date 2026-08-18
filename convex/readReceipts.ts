import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listForConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("read_receipts")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .take(100);
  },
});

export const markRead = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.string(),
    lastReadMessageId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("read_receipts")
      .withIndex("by_conversation_user", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", args.userId),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastReadMessageId: args.lastReadMessageId ?? existing.lastReadMessageId,
        lastReadAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("read_receipts", {
      conversationId: args.conversationId,
      userId: args.userId,
      lastReadMessageId: args.lastReadMessageId,
      lastReadAt: Date.now(),
    });
  },
});
