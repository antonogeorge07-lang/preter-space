import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("convex/authEmail.ts", "utf8");

test("session verification requires Convex identity", () => {
  assert.match(source, /requireIdentity\(ctx\)/);
});

test("requested email must match verified caller", () => {
  assert.match(
    source,
    /args\.email\.trim\(\)\.toLowerCase\(\)\s*!==\s*identity\.email\.trim\(\)\.toLowerCase\(\)/,
  );
  assert.match(source, /throw new Error\("Forbidden"\)/);
});

test("identity check precedes user lookup", () => {
  assert.ok(
    source.indexOf("await requireIdentity(ctx)") < source.indexOf('ctx.db\n      .query("users")'),
  );
});
