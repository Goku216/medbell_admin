import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatMinor,
  formatMinorCompact,
  minorToMajorInput,
  parseMajorToMinor,
  sumMinor,
} from "@/lib/money";

/** Intl inserts a narrow no-break space; compare on plain spaces. */
const plain = (value: string) => value.replace(/ /g, " ");

describe("formatMinor", () => {
  it("renders paise as rupees", () => {
    assert.equal(plain(formatMinor(149950)), "₹1,499.50");
    assert.equal(plain(formatMinor(0)), "₹0.00");
    assert.equal(plain(formatMinor(1)), "₹0.01");
  });

  it("renders negatives, which payable amounts legitimately are", () => {
    assert.equal(plain(formatMinor(-2550)), "-₹25.50");
    assert.equal(plain(formatMinorCompact(-25_00_000_00)), "-₹25L");
  });

  it("shows an em dash rather than a confident zero for a missing amount", () => {
    assert.equal(formatMinor(null), "—");
    assert.equal(formatMinor(undefined), "—");
    assert.equal(formatMinorCompact(null), "—");
  });

  it("never accumulates float error", () => {
    assert.equal(plain(formatMinor(1_000_000 * 3 + 7)), "₹30,000.07");
    assert.equal(plain(formatMinor(sumMinor([10, 20, 0.0 + 3]))), "₹0.33");
  });
});

describe("parseMajorToMinor", () => {
  it("parses operator input by string, not parseFloat", () => {
    assert.equal(parseMajorToMinor("1499.50"), 149950);
    assert.equal(parseMajorToMinor("1499.5"), 149950);
    assert.equal(parseMajorToMinor("0.07"), 7);
    assert.equal(parseMajorToMinor("1,499.50"), 149950);
    assert.equal(parseMajorToMinor("₹1499"), 149900);
  });

  it("accepts negative corrections", () => {
    assert.equal(parseMajorToMinor("-125.50"), -12550);
  });

  it("rejects anything that is not a well-formed amount", () => {
    assert.equal(parseMajorToMinor("1.234"), null);
    assert.equal(parseMajorToMinor("abc"), null);
    assert.equal(parseMajorToMinor("   "), null);
  });

  it("round-trips through the input formatter", () => {
    assert.equal(minorToMajorInput(parseMajorToMinor("99.05")!), "99.05");
    assert.equal(minorToMajorInput(-12550), "-125.50");
  });
});

describe("integer arithmetic", () => {
  it("sums minor units, skipping missing values", () => {
    assert.equal(sumMinor([149950, 7, null, undefined, 43]), 150000);
    assert.equal(sumMinor([]), 0);
  });
});
