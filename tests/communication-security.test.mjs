import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function implementation(file, exportName) {
  const source = readFileSync(file, "utf8");
  const start = source.indexOf(`export const ${exportName} =`);
  assert.ok(start >= 0, `Missing ${exportName}`);
  const next = source.indexOf("export const ", start + 1);
  return source.slice(start, next < 0 ? undefined : next);
}

const checks = [
  ["convex/presence.ts", "listForConversation", "requireConversationMember"],
  ["convex/presence.ts", "getForUser", "requireIdentity"],
  ["convex/presence.ts", "heartbeat", "requireIdentity"],
  ["convex/presence.ts", "heartbeat", "requireConversationMember"],
  ["convex/reactions.ts", "listForMessage", "requireConversationMember"],
  ["convex/reactions.ts", "listForConversation", "requireConversationMember"],
  ["convex/reactions.ts", "toggle", "requireConversationMember"],
  ["convex/readReceipts.ts", "listForConversation", "requireConversationMember"],
  ["convex/readReceipts.ts", "markRead", "requireConversationMember"],
];

for (const [file, name, guard] of checks) {
  test(`${file}:${name} uses ${guard}`, () => {
    assert.match(implementation(file, name), new RegExp(`\\b${guard}\\s*\\(`));
  });
}

for (const [file, name] of [
  ["convex/presence.ts", "getForUser"],
  ["convex/presence.ts", "heartbeat"],
  ["convex/reactions.ts", "toggle"],
  ["convex/readReceipts.ts", "markRead"],
]) {
  test(`${file}:${name} rejects identity mismatch`, () => {
    assert.match(implementation(file, name), /identity\.email\.toLowerCase\(\)/);
    assert.match(implementation(file, name), /throw new Error\("Forbidden"\)/);
  });
}
