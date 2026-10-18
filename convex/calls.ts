import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { requireIdentity, requireConversationMember } from "./lib/authorization";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

const RING_WINDOW_MS = 45_000;

function normalized(email: string) {
  return email.trim().toLowerCase();
}

async function requireCallParticipant(ctx: QueryCtx | MutationCtx, call: Doc<"calls"> | null) {
  const identity = await requireIdentity(ctx);
  if (!call) throw new Error("Call unavailable");

  const email = normalized(identity.email);

  if (normalized(call.callerId) !== email && normalized(call.calleeId) !== email) {
    throw new Error("Forbidden");
  }

  if (call.conversationId) {
    await requireConversationMember(ctx, call.conversationId);
  }

  return { identity, email, call };
}

export const getIncoming = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);

    if (normalized(args.userId) !== normalized(identity.email)) {
      throw new Error("Forbidden");
    }

    const calls = await ctx.db
      .query("calls")
      .withIndex("by_callee", (q) => q.eq("calleeId", args.userId))
      .order("desc")
      .take(10);

    const cutoff = Date.now() - RING_WINDOW_MS;
    const active = [];

    for (const call of calls) {
      if (call.status !== "ringing" || call.startedAt < cutoff) {
        continue;
      }

      // Check conversation membership; unexpected errors propagate.
      if (call.conversationId) {
        const conversation = await ctx.db.get(call.conversationId);
        if (!conversation) continue;

        const member = conversation.participantIds.some(
          (p) => normalized(p) === normalized(identity.email),
        );
        if (!member) continue;
      }

      active.push(call);
    }

    return active;
  },
});

export const get = query({
  args: { callId: v.id("calls") },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId);
    await requireCallParticipant(ctx, call);
    return call;
  },
});

export const expireIfRinging = internalMutation({
  args: { callId: v.id("calls") },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId);
    if (call?.status === "ringing") {
      await ctx.db.patch(args.callId, {
        status: "missed",
        endedAt: Date.now(),
      });
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
    const identity = await requireIdentity(ctx);
    const caller = normalized(identity.email);
    const callee = normalized(args.calleeId);

    if (normalized(args.callerId) !== caller) {
      throw new Error("Forbidden");
    }

    if (!callee || caller === callee) {
      throw new Error("Invalid callee");
    }

    if (args.conversationId) {
      const { conversation } = await requireConversationMember(ctx, args.conversationId);

      if (!conversation.participantIds.some((p) => normalized(p) === callee)) {
        throw new Error("Forbidden");
      }
    }

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

    await ctx.scheduler.runAfter(0, internal.push.notifyCall, {
      calleeId: args.calleeId,
      callerName: args.callerName,
      isVideo: args.isVideo ?? false,
      ...(args.conversationId ? { conversationId: args.conversationId } : {}),
    });

    await ctx.scheduler.runAfter(RING_WINDOW_MS, internal.calls.expireIfRinging, { callId });

    return callId;
  },
});

export const answer = mutation({
  args: {
    callId: v.id("calls"),
    answer: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId);
    const { email } = await requireCallParticipant(ctx, call);

    if (email !== normalized(call!.calleeId)) {
      throw new Error("Forbidden");
    }

    if (call!.status !== "ringing") {
      throw new Error("Invalid call state");
    }

    await ctx.db.patch(args.callId, {
      status: "accepted",
      answer: args.answer,
    });
  },
});

export const addCandidate = mutation({
  args: {
    callId: v.id("calls"),
    from: v.string(),
    candidate: v.any(),
  },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId);
    const { email } = await requireCallParticipant(ctx, call);

    if (normalized(args.from) !== email) {
      throw new Error("Forbidden");
    }

    if (!["ringing", "accepted"].includes(call!.status)) {
      throw new Error("Invalid call state");
    }

    const isCaller = email === normalized(call!.callerId);
    const key = isCaller ? "callerCandidates" : "calleeCandidates";
    const current = isCaller ? (call!.callerCandidates ?? []) : (call!.calleeCandidates ?? []);

    if (current.length >= 100) {
      throw new Error("Candidate limit exceeded");
    }

    await ctx.db.patch(args.callId, {
      [key]: [...current, args.candidate],
    });
  },
});

export const updateStatus = mutation({
  args: {
    callId: v.id("calls"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId);
    const { email } = await requireCallParticipant(ctx, call);

    const caller = email === normalized(call!.callerId);
    const callee = email === normalized(call!.calleeId);

    const allowed =
      (args.status === "declined" && callee && call!.status === "ringing") ||
      (args.status === "ended" &&
        (caller || callee) &&
        ["ringing", "accepted"].includes(call!.status));

    if (!allowed) {
      throw new Error("Invalid call transition");
    }

    await ctx.db.patch(args.callId, {
      status: args.status,
      endedAt: Date.now(),
    });
  },
});
