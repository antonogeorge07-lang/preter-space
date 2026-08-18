import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Data-layer helpers for background push. Kept out of `push.ts` because that
 * file runs in the Node runtime and cannot host database functions.
 */
export const publicKey = query({
  args: {},
  handler: async () => process.env.VAPID_PUBLIC_KEY ?? null,
});

export const subscribe = mutation({
  args: {
    userId: v.string(),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("push_subscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        userId: args.userId,
        p256dh: args.p256dh,
        auth: args.auth,
        updatedAt: Date.now(),
      });
      return existing._id;
    }
    return await ctx.db.insert("push_subscriptions", { ...args, updatedAt: Date.now() });
  },
});

export const unsubscribe = mutation({
  args: { endpoint: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("push_subscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .take(5);
    for (const row of rows) await ctx.db.delete(row._id);
    return null;
  },
});

export const recipientsFor = query({
  args: { conversationId: v.id("conversations"), senderId: v.string() },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return [];
    return conversation.participantIds.filter((id) => id !== args.senderId);
  },
});

export const subscriptionsFor = query({
  args: { userIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    const out: Array<{ endpoint: string; p256dh: string; auth: string }> = [];
    for (const userId of [...new Set(args.userIds)]) {
      const rows = await ctx.db
        .query("push_subscriptions")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .take(5);
      for (const row of rows) {
        out.push({ endpoint: row.endpoint, p256dh: row.p256dh, auth: row.auth });
      }
    }
    return out;
  },
});
