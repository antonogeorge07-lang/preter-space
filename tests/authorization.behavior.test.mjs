import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { requireIdentity, requireConversationMember } from "../convex/lib/authorization.ts";

const A = "alice@example.test";
const B = "bob@example.test";
const C = "outsider@example.test";

const conversationId = "conversation-test-1";

function context(email, participants = [A, B], options = {}) {
  let reads = 0;

  return {
    auth: {
      async getUserIdentity() {
        if (email === null) return null;
        return {
          subject: options.subject ?? "user-subject",
          email: options.emailOverride ?? email,
        };
      },
    },
    db: {
      async get(id) {
        reads++;
        if (options.missing || id !== conversationId) return null;
        return {
          _id: conversationId,
          creatorId: A,
          participantIds: participants,
          title: "Private team conversation",
        };
      },
    },
    getReadCount() {
      return reads;
    },
  };
}

describe("Verified identity", () => {
  test("anonymous request is rejected", async () => {
    await assert.rejects(requireIdentity(context(null)), /Unauthorized/);
  });

  test("missing email is rejected", async () => {
    await assert.rejects(requireIdentity(context(A, [A], { emailOverride: "" })), /Unauthorized/);
  });

  test("missing subject is rejected", async () => {
    await assert.rejects(requireIdentity(context(A, [A], { subject: "" })), /Unauthorized/);
  });

  test("authenticated user is accepted", async () => {
    const result = await requireIdentity(context(A));
    assert.equal(result.email, A);
  });
});

describe("Conversation membership", () => {
  test("creator can access own conversation", async () => {
    const result = await requireConversationMember(context(A), conversationId);
    assert.equal(result.identity.email, A);
  });

  test("invited participant can access conversation", async () => {
    const result = await requireConversationMember(context(B), conversationId);
    assert.equal(result.identity.email, B);
  });

  test("outsider cannot access conversation", async () => {
    await assert.rejects(requireConversationMember(context(C), conversationId), /Forbidden/);
  });

  test("anonymous request cannot access conversation", async () => {
    const ctx = context(null);

    await assert.rejects(requireConversationMember(ctx, conversationId), /Unauthorized/);

    assert.equal(ctx.getReadCount(), 0);
  });

  test("unknown conversation cannot be accessed", async () => {
    await assert.rejects(
      requireConversationMember(context(A, [A], { missing: true }), conversationId),
      /Conversation unavailable/,
    );
  });

  test("email comparison is case-insensitive", async () => {
    const result = await requireConversationMember(
      context("ALICE@EXAMPLE.TEST", [A, B]),
      conversationId,
    );
    assert.equal(result.conversation._id, conversationId);
  });

  test("removed member is immediately rejected", async () => {
    const members = [A, B];
    const ctx = context(B, members);

    await requireConversationMember(ctx, conversationId);

    members.splice(members.indexOf(B), 1);

    await assert.rejects(requireConversationMember(ctx, conversationId), /Forbidden/);
  });

  test("newly added member receives access", async () => {
    const members = [A];
    const ctx = context(B, members);

    await assert.rejects(requireConversationMember(ctx, conversationId), /Forbidden/);

    members.push(B);

    const result = await requireConversationMember(ctx, conversationId);

    assert.equal(result.identity.email, B);
  });
});

describe("Sensitive operation ordering", () => {
  test("translation checks membership before AI operations", () => {
    const source = readFileSync("convex/messages.ts", "utf8");

    const action = source.slice(source.indexOf("export const sendWithTranslation ="));

    const membership = action.indexOf("ctx.runQuery(api.conversations.get");

    const ai = action.indexOf("const aiConfigured = isAIConfigured()");

    assert.ok(membership >= 0);
    assert.ok(ai > membership);
  });

  test("invitation preview never spreads the full conversation", () => {
    const source = readFileSync("convex/conversations.ts", "utf8");

    const start = source.indexOf("export const getByInviteCode =");
    const end = source.indexOf("const uiFields =", start);

    assert.ok(start >= 0);
    assert.ok(end > start);

    const implementation = source.slice(start, end);

    assert.doesNotMatch(implementation, /\.\.\.conversation/);

    assert.doesNotMatch(implementation, /participantIds:\s*conversation\.participantIds/);
  });
});
