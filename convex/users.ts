import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
  },
});

export const createOrUpdateUser = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    language: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        language: args.language ?? existing.language,
        avatarUrl: args.avatarUrl ?? existing.avatarUrl,
        isOnline: true,
        lastSeen: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      language: args.language || "en",
      avatarUrl: args.avatarUrl,
      isOnline: true,
      lastSeen: Date.now(),
      blockedUsers: [],
    });
  },
});

export const toggleBlockUser = mutation({
  args: {
    userId: v.id("users"),
    targetUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const currentBlocked = user.blockedUsers || [];
    const isBlocked = currentBlocked.includes(args.targetUserId);
    const updatedBlocked = isBlocked
      ? currentBlocked.filter((id) => id !== args.targetUserId)
      : [...currentBlocked, args.targetUserId];

    await ctx.db.patch(args.userId, { blockedUsers: updatedBlocked });
    return !isBlocked;
  },
});

export const deleteAccount = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return;

    // Remove user messages
    const userMessages = await ctx.db
      .query("messages")
      .filter((q) => q.eq(q.field("senderId"), args.userId))
      .collect();

    for (const msg of userMessages) {
      await ctx.db.delete(msg._id);
    }

    // Delete user profile
    await ctx.db.delete(args.userId);
  },
});
