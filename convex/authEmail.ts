import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const verifySession = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    return { isValid: !!user, user };
  },
});
