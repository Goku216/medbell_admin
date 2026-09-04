import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  dateChange,
  flagChange,
  minorChange,
  numberChange,
  omitUndefined,
  requiredTextChange,
  textChange,
} from "@/lib/api/patch";

/**
 * The update callables apply fields with hasOwnProperty semantics, so what
 * matters is whether a key is physically present, not what it holds. These
 * tests assert presence, because `undefined` reaches the function as `null`
 * and would clear the field.
 */
describe("omitUndefined", () => {
  it("physically removes undefined keys", () => {
    const patch = omitUndefined({ a: "keep", b: undefined, c: null });
    assert.deepEqual(Object.keys(patch).sort(), ["a", "c"]);
    assert.equal("b" in patch, false);
  });

  it("leaves an untouched form sending nothing at all", () => {
    const patch = omitUndefined({
      name: requiredTextChange("Acme", "Acme"),
      email: textChange("a@b.com", "a@b.com"),
      notes: textChange(null, ""),
      active: flagChange(true, true),
    });
    assert.deepEqual(Object.keys(patch), []);
  });

  it("sends an explicit null for a field the operator emptied", () => {
    const patch = omitUndefined({
      email: textChange("a@b.com", ""),
      phone: textChange("123", "123"),
    });
    assert.deepEqual(Object.keys(patch), ["email"]);
    assert.equal(patch.email, null);
    assert.equal("phone" in patch, false);
  });
});

describe("textChange", () => {
  it("omits an unchanged value, including whitespace-only edits", () => {
    assert.equal(textChange("Acme", "Acme"), undefined);
    assert.equal(textChange("Acme", "  Acme  "), undefined);
    assert.equal(textChange(null, "   "), undefined);
  });

  it("sends the new value when it changed", () => {
    assert.equal(textChange("Acme", "Acme Health"), "Acme Health");
    assert.equal(textChange(null, "new"), "new");
  });

  it("clears with null when emptied", () => {
    assert.equal(textChange("a@b.com", ""), null);
  });
});

describe("requiredTextChange", () => {
  it("refuses to clear a field that must keep a value", () => {
    assert.equal(requiredTextChange("Acme", ""), undefined);
  });

  it("still sends a genuine change", () => {
    assert.equal(requiredTextChange("Acme", "Beta"), "Beta");
  });
});

describe("numberChange", () => {
  it("omits unchanged and unparseable input", () => {
    assert.equal(numberChange(100, "100"), undefined);
    assert.equal(numberChange(100, "abc"), undefined);
    assert.equal(numberChange(null, ""), undefined);
  });

  it("sends a change and clears when emptied", () => {
    assert.equal(numberChange(100, "250"), 250);
    assert.equal(numberChange(100, ""), null);
  });
});

describe("minorChange", () => {
  it("handles a negative settlement correction", () => {
    assert.equal(minorChange(null, -12550), -12550);
    assert.equal(minorChange(5000, 5000), undefined);
    assert.equal(minorChange(5000, null), null);
  });
});

describe("flagChange and dateChange", () => {
  it("omits an unflipped switch", () => {
    assert.equal(flagChange(true, true), undefined);
    assert.equal(flagChange(undefined, false), undefined);
    assert.equal(flagChange(true, false), false);
  });

  it("compares dates on the calendar day", () => {
    assert.equal(dateChange("2026-07-15", "2026-07-15"), undefined);
    assert.equal(dateChange("2026-07-15", "2026-08-01"), "2026-08-01");
    assert.equal(dateChange("2026-07-15", ""), null);
  });
});
