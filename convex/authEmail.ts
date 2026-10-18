import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireIdentity } from "./lib/authorization";

export const verifySession = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    if (args.email.trim().toLowerCase() !== identity.email.trim().toLowerCase()) {
      throw new Error("Forbidden");
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    return { isValid: !!user, user };
  },
});
