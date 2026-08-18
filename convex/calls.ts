import { query, mutation, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";

/** A call only rings for this long before it is treated as missed. */
const RING_WINDOW_MS = 45_000;

export const getIncoming = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const calls = await ctx.db
      .query("calls")
      .withIndex("by_callee", (q) => q.eq("calleeId", args.userId))
      .order("desc")
      .take(10);
    const cutoff = Date.now() - RING_WINDOW_MS;
    // Ignore stale "ringing" docs so an old call can never block a new one.
    return calls.filter((c) => c.status === "ringing" && c.startedAt >= cutoff);
  },
});

export const get = query({
  args: { callId: v.id("calls") },
  handler: async (ctx, args) => await ctx.db.get(args.callId),
});

export const expireIfRinging = internalMutation({
  args: { callId: v.id("calls") },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId);
    if (call && call.status === "ringing") {
      await ctx.db.patch(args.callId, { status: "missed", endedAt: Date.now() });
    }
  },
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
    const callId = await ctx.db.insert("calls", {
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

    // Ring the callee even when their app is closed/backgrounded.
    await ctx.scheduler.runAfter(0, api.push.notifyCall, {
      calleeId: args.calleeId,
      callerName: args.callerName,
      isVideo: args.isVideo ?? false,
      ...(args.conversationId ? { conversationId: args.conversationId } : {}),
    });

    // Mark as missed if nobody picks up.
    await ctx.scheduler.runAfter(RING_WINDOW_MS, internal.calls.expireIfRinging, { callId });

    return callId;
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
