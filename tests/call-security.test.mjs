import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("convex/calls.ts", "utf8");

function segment(first, last) {
  const start = source.indexOf(first);
  assert.ok(start >= 0, `Missing ${first}`);
  const end = last ? source.indexOf(last, start + first.length) : source.length;
  assert.ok(end > start, `Missing boundary ${last}`);
  return source.slice(start, end);
}

test("call access requires authenticated participants and current membership", () => {
  const s = segment("async function requireCallParticipant(", "export const getIncoming");
  assert.match(s, /requireIdentity\(ctx\)/);
  assert.match(s, /requireConversationMember\(ctx,\s*call\.conversationId\)/);
  assert.match(s, /Forbidden/);
});

test("incoming calls enforce identity and filter revoked members", () => {
  const s = segment("export const getIncoming", "export const get =");
  assert.match(s, /requireIdentity\(ctx\)/);
  assert.match(s, /normalized\(args\.userId\)/);
  assert.match(s, /conversation\.participantIds\.some/);
});

test("call creation verifies initiator and conversation recipient", () => {
  const s = segment("export const start", "export const answer");
  assert.match(s, /requireIdentity\(ctx\)/);
  assert.match(s, /normalized\(args\.callerId\)/);
  assert.match(s, /requireConversationMember\(/);
  assert.match(s, /normalized\(p\) === callee/);
});

test("only the verified recipient can answer", () => {
  const s = segment("export const answer", "export const addCandidate");
  assert.match(s, /requireCallParticipant\(ctx,\s*call\)/);
  assert.match(s, /normalized\(call!\.calleeId\)/);
  assert.match(s, /Invalid call state/);
});

test("ICE candidate updates prevent impersonation and unbounded growth", () => {
  const s = segment("export const addCandidate", "export const updateStatus");
  assert.match(s, /requireCallParticipant\(ctx,\s*call\)/);
  assert.match(s, /normalized\(args\.from\) !== email/);
  assert.match(s, /current\.length >= 100/);
});

test("call status changes enforce participant permissions", () => {
  const s = segment("export const updateStatus", null);
  assert.match(s, /requireCallParticipant\(ctx,\s*call\)/);
  assert.match(s, /"declined"/);
  assert.match(s, /"ended"/);
  assert.match(s, /Invalid call transition/);
});
