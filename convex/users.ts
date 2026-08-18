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

/** Directory search by display name or email (case-insensitive substring). */
export const search = query({
  args: { term: v.string(), excludeEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const term = args.term.trim();
    if (term.length < 2) return [];

    // Search indexes keep this O(matches) instead of scanning the user table.
    const [byName, byEmail] = await Promise.all([
      ctx.db
        .query("users")
        .withSearchIndex("search_name", (q) => q.search("name", term))
        .take(20),
      ctx.db
        .query("users")
        .withSearchIndex("search_email", (q) => q.search("email", term))
        .take(20),
    ]);

    const seen = new Set<string>();
    const out = [];
    for (const u of [...byName, ...byEmail]) {
      if (u.email === args.excludeEmail || seen.has(u._id)) continue;
      seen.add(u._id);
      out.push(u);
      if (out.length >= 20) break;
    }
    return out;
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

/** Block/unblock using emails, which is how participants are identified. */
export const toggleBlockByEmail = mutation({
  args: { email: v.string(), targetEmail: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
    if (!user) throw new Error("User not found");

    const currentBlocked = user.blockedUsers || [];
    const isBlocked = currentBlocked.includes(args.targetEmail);
    await ctx.db.patch(user._id, {
      blockedUsers: isBlocked
        ? currentBlocked.filter((id) => id !== args.targetEmail)
        : [...currentBlocked, args.targetEmail],
    });
    return !isBlocked;
  },
});

export const deleteAccount = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    const userMessages = await ctx.db
      .query("messages")
      .filter((q) => q.eq(q.field("senderId"), user.email))
      .collect();

    for (const msg of userMessages) {
      await ctx.db.delete(msg._id);
    }

    await ctx.db.delete(args.userId);
    return null;
  },
});

/**
 * Language preferences for a set of accounts, keyed by email.
 * The user document is the source of truth for "which language do I read in",
 * so message translation targets stay correct even if a conversation row is stale.
 */
export const languagesByEmail = query({
  args: { emails: v.array(v.string()) },
  handler: async (ctx, args) => {
    const out: Record<string, string> = {};
    for (const email of args.emails) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .unique();
      if (user?.language) out[email] = user.language;
    }
    return out;
  },
});
