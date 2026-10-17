import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

type DatabaseContext = QueryCtx | MutationCtx;

export async function requireIdentity(ctx: DatabaseContext) {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity?.subject || !identity.email) {
    throw new Error("Unauthorized");
  }

  return identity;
}

export async function requireConversationMember(
  ctx: DatabaseContext,
  conversationId: Id<"conversations">,
) {
  const identity = await requireIdentity(ctx);

  const conversation = await ctx.db.get(conversationId);

  if (!conversation) {
    throw new Error("Conversation unavailable");
  }

  const verifiedEmail = identity.email.toLowerCase();

  const isMember = conversation.participantIds.some(
    (email) => email.toLowerCase() === verifiedEmail,
  );

  if (!isMember) {
    throw new Error("Forbidden");
  }

  return { identity, conversation };
}
