import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireIdentity } from "./lib/authorization";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireIdentity(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const getUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    await requireIdentity(ctx);

    // Ownership and conversation binding are not implemented.
    // Do not issue a storage URL until those checks exist.
    void args;
    throw new Error("File access temporarily unavailable");
  },
});
