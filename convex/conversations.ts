import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getForUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const allConversations = await ctx.db.query("conversations").collect();
    return allConversations
      .filter((c) => c.participantIds.includes(args.userId))
      .sort((a, b) => (b.lastMessageTime ?? 0) - (a.lastMessageTime ?? 0));
  },
});

export const get = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => await ctx.db.get(args.conversationId),
});

export const getByInviteCode = query({
  args: { inviteCode: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("conversations").collect();
    return all.find((c) => c.inviteCode === args.inviteCode) ?? null;
  },
});

const uiFields = {
  title: v.optional(v.string()),
  avatarUrl: v.optional(v.string()),
  participantIds: v.optional(v.array(v.string())),
  participantNames: v.optional(v.array(v.string())),
  participantLanguages: v.optional(v.any()),
  preferredLanguage: v.optional(v.string()),
  lastMessagePreview: v.optional(v.string()),
  lastMessageTime: v.optional(v.number()),
  unreadCounts: v.optional(v.any()),
  typingUserIds: v.optional(v.array(v.string())),
  pinned: v.optional(v.boolean()),
  archived: v.optional(v.boolean()),
  muted: v.optional(v.boolean()),
  inviteCode: v.optional(v.string()),
  inviteOpen: v.optional(v.boolean()),
};

export const create = mutation({
  args: {
    isGroup: v.boolean(),
    creatorId: v.string(),
    participantIds: v.array(v.string()),
    ...uiFields,
    participantIds_unused: v.optional(v.null()),
  },
  handler: async (ctx, args) => {
    const { participantIds_unused: _ignored, ...rest } = args;
    return await ctx.db.insert("conversations", {
      ...rest,
      participantIds: args.participantIds,
      isGroup: args.isGroup,
      creatorId: args.creatorId,
      lastMessageTime: args.lastMessageTime ?? Date.now(),
    });
  },
});

export const update = mutation({
  args: { conversationId: v.id("conversations"), ...uiFields },
  handler: async (ctx, args) => {
    const { conversationId, ...patch } = args;
    const clean = Object.fromEntries(Object.entries(patch).filter(([, v2]) => v2 !== undefined));
    if (Object.keys(clean).length === 0) return conversationId;
    await ctx.db.patch(conversationId, clean);
    return conversationId;
  },
});

export const remove = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();
    for (const m of messages) {
      const reactions = await ctx.db
        .query("reactions")
        .withIndex("by_message", (q) => q.eq("messageId", m._id))
        .collect();
      for (const r of reactions) await ctx.db.delete(r._id);
      await ctx.db.delete(m._id);
    }
    const receipts = await ctx.db
      .query("read_receipts")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();
    for (const r of receipts) await ctx.db.delete(r._id);
    await ctx.db.delete(args.conversationId);
    return null;
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
