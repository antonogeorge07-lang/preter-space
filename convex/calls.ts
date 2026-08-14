import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getIncoming = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const calls = await ctx.db
      .query("calls")
      .withIndex("by_callee", (q) => q.eq("calleeId", args.userId))
      .order("desc")
      .take(10);
    return calls.filter((c) => c.status === "ringing");
  },
});

export const get = query({
  args: { callId: v.id("calls") },
  handler: async (ctx, args) => await ctx.db.get(args.callId),
});

export const start = mutation({
  args: {
    conversationId: v.optional(v.id("conversations")),
    callerId: v.string(),
    calleeId: v.string(),
    callerName: v.optional(v.string()),
    calleeName: v.optional(v.string()),
    isVideo: v.optional(v.boolean()),
    offer: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("calls", {
      conversationId: args.conversationId,
      callerId: args.callerId,
      calleeId: args.calleeId,
      callerName: args.callerName,
      calleeName: args.calleeName,
      status: "ringing",
      isVideo: args.isVideo ?? false,
      offer: args.offer,
      callerCandidates: [],
      calleeCandidates: [],
      startedAt: Date.now(),
    });
  },
});


export const answer = mutation({
  args: { callId: v.id("calls"), answer: v.optional(v.any()) },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.callId, { status: "accepted", answer: args.answer });
  },
});

export const addCandidate = mutation({
  args: { callId: v.id("calls"), from: v.string(), candidate: v.any() },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId);
    if (!call) throw new Error("Call not found");
    const isCaller = args.from === call.callerId;
    const key = isCaller ? "callerCandidates" : "calleeCandidates";
    const current = (isCaller ? call.callerCandidates : call.calleeCandidates) ?? [];
    await ctx.db.patch(args.callId, { [key]: [...current, args.candidate] });
  },
});

export const updateStatus = mutation({
  args: { callId: v.id("calls"), status: v.string() },
  handler: async (ctx, args) => {
    const ended = ["ended", "declined", "missed"].includes(args.status);
    await ctx.db.patch(args.callId, {
      status: args.status,
      ...(ended ? { endedAt: Date.now() } : {}),
    });
  },
});
