import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getForUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const allConversations = await ctx.db.query("conversations").collect();
    return allConversations.filter((c) => c.participantIds.includes(args.userId));
  },
});

export const create = mutation({
  args: {
    title: v.optional(v.string()),
    isGroup: v.boolean(),
    creatorId: v.string(),
    participantIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("conversations", {
      title: args.title,
      isGroup: args.isGroup,
      creatorId: args.creatorId,
      participantIds: args.participantIds,
      lastMessageTime: Date.now(),
    });
  },
});

export const reportConversation = mutation({
  args: {
    reporterId: v.string(),
    targetId: v.string(),
    conversationId: v.optional(v.id("conversations")),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("conversation_reports", {
      reporterId: args.reporterId,
      targetId: args.targetId,
      conversationId: args.conversationId,
      reason: args.reason,
      createdAt: Date.now(),
    });
  },
});
