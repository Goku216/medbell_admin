import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CallableError,
  bareCode,
  errorMessage,
  mutationMessage,
} from "@/lib/api/callable-error";

const callable = (code: string, message: string) =>
  new CallableError(message, `functions/${code}`);

describe("bareCode", () => {
  it("strips the SDK prefix", () => {
    assert.equal(bareCode(callable("failed-precondition", "x")), "failed-precondition");
    assert.equal(bareCode(new Error("plain")), null);
  });
});

describe("mutationMessage", () => {
  it("replaces permission-denied with the action that fixes it", () => {
    const message = mutationMessage(callable("permission-denied", "Admin required."));
    assert.match(message, /Sign out and back in/);
  });

  it("does not blame the operator for a malformed request", () => {
    const message = mutationMessage(callable("invalid-argument", '"uid" is required.'));
    assert.match(message, /logged/);
    assert.ok(!message.includes("uid"));
  });

  it("shows failed-precondition verbatim", () => {
    const text = "You cannot delete your own account.";
    assert.equal(mutationMessage(callable("failed-precondition", text)), text);
  });

  it("appends the recovery step to a half-failed delete", () => {
    const text = "Profile deleted but the account could not be removed: quota exceeded";
    const message = mutationMessage(callable("internal", text));

    assert.ok(message.startsWith(text));
    assert.match(message, /Firebase console/);
  });

  it("leaves an unrelated internal error alone", () => {
    const text = "Something exploded.";
    assert.equal(mutationMessage(callable("internal", text)), text);
  });

  it("shows any other code's message verbatim", () => {
    const text = "This referral code has expired.";
    assert.equal(mutationMessage(callable("not-found", text)), text);
  });

  it("falls back for a non-callable throw", () => {
    assert.equal(mutationMessage(new Error("boom")), "boom");
    assert.equal(errorMessage(undefined, "fallback"), "fallback");
  });
});
