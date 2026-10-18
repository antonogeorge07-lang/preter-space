import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = (file) => readFileSync(file, "utf8");

const declarations = [
  ["convex/translations.ts", "getCached", "internalQuery"],
  ["convex/translations.ts", "putCached", "internalMutation"],
  ["convex/pushData.ts", "recipientsFor", "internalQuery"],
  ["convex/pushData.ts", "subscriptionsFor", "internalQuery"],
  ["convex/pushData.ts", "unsubscribeExpired", "internalMutation"],
  ["convex/push.ts", "notifyMessage", "internalAction"],
  ["convex/push.ts", "notifyCall", "internalAction"],
];

for (const [file, name, kind] of declarations) {
  test(`${file}:${name} is ${kind}`, () => {
    assert.match(source(file), new RegExp(`export const ${name} = ${kind}\\(`));
  });
}

test("message delivery invokes internal push and translation helpers", () => {
  const s = source("convex/messages.ts");
  assert.match(s, /internal\.push\.notifyMessage/);
  assert.match(s, /internal\.translations\.getCached/);
  assert.match(s, /internal\.translations\.putCached/);
});

test("call notifications invoke internal delivery", () => {
  assert.match(source("convex/calls.ts"), /internal\.push\.notifyCall/);
});

test("push subscriptions verify caller identity", () => {
  const s = source("convex/pushData.ts");
  assert.match(s, /requireIdentity\(ctx\)/);
  assert.match(s, /existing\.userId\.toLowerCase\(\)/);
  assert.match(s, /row\.userId\.toLowerCase\(\)/);
});
