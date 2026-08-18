import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

/** Keep `conversation_members` in sync with a conversation's participant list. */
async function syncMembers(
  ctx: MutationCtx,
  conversationId: Id<"conversations">,
  participantIds: string[],
) {
  const existing = await ctx.db
    .query("conversation_members")
    .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
    .collect();
  const want = new Set(participantIds);
  const have = new Set(existing.map((m) => m.userId));
  for (const row of existing) {
    if (!want.has(row.userId)) await ctx.db.delete(row._id);
  }
  for (const userId of want) {
    if (!have.has(userId)) await ctx.db.insert("conversation_members", { conversationId, userId });
  }
}

export const getForUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("conversation_members")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .take(500);

    let docs = (
      await Promise.all(memberships.map((m) => ctx.db.get(m.conversationId)))
    ).filter((c): c is NonNullable<typeof c> => !!c);

    // Fallback for conversations created before membership rows existed.
    if (docs.length === 0) {
      const all = await ctx.db.query("conversations").take(2000);
      docs = all.filter((c) => c.participantIds.includes(args.userId));
    }

    return docs.sort((a, b) => (b.lastMessageTime ?? 0) - (a.lastMessageTime ?? 0));
  },
});

export const get = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => await ctx.db.get(args.conversationId),
});

export const getByInviteCode = query({
  args: { inviteCode: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("conversations").take(2000);
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
    ...uiFields,
    participantIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const conversationId = await ctx.db.insert("conversations", {
      ...args,
      lastMessageTime: args.lastMessageTime ?? Date.now(),
    });
    await syncMembers(ctx, conversationId, args.participantIds);
    return conversationId;
  },
});

export const update = mutation({
  args: { conversationId: v.id("conversations"), ...uiFields },
  handler: async (ctx, args) => {
    const { conversationId, ...patch } = args;
    const clean = Object.fromEntries(Object.entries(patch).filter(([, v2]) => v2 !== undefined));
    if (Object.keys(clean).length === 0) return conversationId;
    await ctx.db.patch(conversationId, clean);
    if (Array.isArray(patch.participantIds)) {
      await syncMembers(ctx, conversationId, patch.participantIds);
    }
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
    const members = await ctx.db
      .query("conversation_members")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();
    for (const m of members) await ctx.db.delete(m._id);
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

/**
 * One-time backfill: create membership rows for conversations that predate
 * `conversation_members`. Safe to run repeatedly.
 */
export const backfillMembers = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("conversations").take(5000);
    let created = 0;
    for (const c of all) {
      for (const userId of c.participantIds) {
        const existing = await ctx.db
          .query("conversation_members")
          .withIndex("by_conversation_user", (q) =>
            q.eq("conversationId", c._id).eq("userId", userId),
          )
          .first();
        if (!existing) {
          await ctx.db.insert("conversation_members", { conversationId: c._id, userId });
          created++;
        }
      }
    }
    return { conversations: all.length, created };
  },
});
