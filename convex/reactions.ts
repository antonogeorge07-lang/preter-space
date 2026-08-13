import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listForMessage = query({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("reactions")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .collect();
  },
});

export const toggle = mutation({
  args: {
    messageId: v.id("messages"),
    userId: v.string(),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("reactions")
      .withIndex("by_message_user", (q) =>
        q.eq("messageId", args.messageId).eq("userId", args.userId),
      )
      .collect();

    const same = existing.find((r) => r.emoji === args.emoji);
    if (same) {
      await ctx.db.delete(same._id);
      return false;
    }

    for (const r of existing) await ctx.db.delete(r._id);

    await ctx.db.insert("reactions", {
      messageId: args.messageId,
      userId: args.userId,
      emoji: args.emoji,
      createdAt: Date.now(),
    });
    return true;
  },
});
