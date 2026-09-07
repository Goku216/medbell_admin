import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  generatePassword,
  normaliseUsername,
  partnerLoginEmail,
  validatePartnerPassword,
  validateUsername,
} from "@/lib/partner/username";

describe("normaliseUsername", () => {
  it("lowercases and trims, as the server does before validating", () => {
    assert.equal(normaliseUsername("  Priya.Sharma "), "priya.sharma");
  });
});

describe("validateUsername", () => {
  it("accepts the documented shape", () => {
    for (const value of ["priya.sharma", "abc", "a-b_c.9", "clinic99"]) {
      assert.equal(validateUsername(value), null, value);
    }
  });

  it("accepts mixed case because it normalises first", () => {
    assert.equal(validateUsername("Priya.Sharma"), null);
  });

  it("rejects anything too short or too long", () => {
    assert.notEqual(validateUsername("ab"), null);
    assert.notEqual(validateUsername("a".repeat(41)), null);
  });

  it("requires a letter or digit at each end", () => {
    assert.notEqual(validateUsername(".priya"), null);
    assert.notEqual(validateUsername("priya."), null);
    assert.notEqual(validateUsername("-priya-"), null);
  });

  it("rejects characters outside the allowed set", () => {
    assert.notEqual(validateUsername("priya sharma"), null);
    assert.notEqual(validateUsername("priya@clinic"), null);
    assert.notEqual(validateUsername("priya+1"), null);
  });

  it("rejects an empty username", () => {
    assert.notEqual(validateUsername("   "), null);
  });
});

describe("validatePartnerPassword", () => {
  it("is stricter than the six characters app users get", () => {
    assert.notEqual(validatePartnerPassword("short12"), null);
    assert.equal(validatePartnerPassword("eightchr"), null);
  });
});

describe("partnerLoginEmail", () => {
  it("builds the internal address from the normalised username", () => {
    assert.match(partnerLoginEmail("  Priya.Sharma "), /^priya\.sharma@/);
  });
});

describe("generatePassword", () => {
  it("meets the minimum and the requested length", () => {
    assert.equal(generatePassword().length, 16);
    assert.equal(generatePassword(24).length, 24);
    assert.equal(validatePartnerPassword(generatePassword()), null);
  });

  it("omits glyphs that are misread when a password is dictated", () => {
    const sample = Array.from({ length: 40 }, () => generatePassword(64)).join("");
    for (const confusable of ["l", "I", "O", "0", "1"]) {
      assert.ok(!sample.includes(confusable), `contained ${confusable}`);
    }
  });

  it("does not repeat itself", () => {
    assert.notEqual(generatePassword(), generatePassword());
  });
});
