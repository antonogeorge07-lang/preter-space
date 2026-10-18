import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = (path) => readFileSync(path, "utf8");

function operation(path, name) {
  const text = source(path);
  const re = new RegExp(
    `export const ${name} = (query|mutation|action|internalMutation|internalQuery|internalAction)\\s*\\(`,
    "g",
  );
  const match = re.exec(text);
  assert.ok(match, `${name} is missing`);
  const rest = text.slice(match.index);
  const next = rest.slice(match[0].length).search(
    /\nexport const \w+ = /,
  );
  return next < 0 ? rest : rest.slice(0, match[0].length + next);
}

const memberGuard = /requireConversationMember\s*\(/;
const identityGuard =
  /requireIdentity\s*\(|ctx\.auth\.getUserIdentity\s*\(/;

for (const name of ["list", "listPage", "send"]) {
  test(`message ${name} checks membership`, () => {
    assert.match(operation("convex/messages.ts", name), memberGuard);
  });
}

for (const name of ["update", "remove", "insertMessage"]) {
  test(`message ${name} has authorization`, () => {
    const body = operation("convex/messages.ts", name);
    assert.match(
      body,
      /requireConversationMember\s*\(|requireIdentity\s*\(|ctx\.auth\.getUserIdentity\s*\(|internalMutation\s*\(/,
    );
  });
}

test("translation action validates caller identity", () => {
  assert.match(
    operation("convex/messages.ts", "sendWithTranslation"),
    identityGuard,
  );
});

for (const name of [
  "getForUser",
  "get",
  "getByInviteCode",
  "create",
  "update",
  "remove",
  "addParticipant",
  "reportConversation",
  "backfillMembers",
]) {
  test(`conversation ${name} has an authorization boundary`, () => {
    const body = operation("convex/conversations.ts", name);
    assert.match(
      body,
      /requireConversationMember\s*\(|requireIdentity\s*\(|ctx\.auth\.getUserIdentity\s*\(|internalMutation\s*\(|internalQuery\s*\(/,
    );
  });
}

for (const name of ["generateUploadUrl", "getUrl"]) {
  test(`file ${name} checks authenticated identity`, () => {
    assert.match(
      operation("convex/files.ts", name),
      identityGuard,
    );
  });
}

test("Convex has JWT authentication configuration", () => {
  assert.match(
    source("convex/auth.config.ts"),
    /customJwt/,
  );
});

test("Convex client attaches an auth provider", () => {
  assert.match(
    source("src/lib/convex.tsx"),
    /ConvexProviderWithAuth/,
  );
});

test("logout does not silently discard sign-out failure", () => {
  const text = source("src/lib/db.js");
  const start = text.indexOf("async logout(");
  assert.ok(start >= 0);
  const body = text.slice(start, start + 300);
  assert.doesNotMatch(body, /catch\s*\{\s*\/\*\s*ignore\s*\*\//);
});

test("audio transcription does not fetch arbitrary input URLs", () => {
  const text = source("src/lib/backend.functions.ts");
  assert.doesNotMatch(text, /fetch\(data\.audioUrl\)/);
});
