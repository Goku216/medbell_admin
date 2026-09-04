import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatDate, formatDateTime, toDate, toDateInputValue } from "@/lib/format";
import { summariseAdherence } from "@/lib/data/adherence";

const MILLIS = Date.UTC(2026, 6, 15, 9, 30, 0);

describe("toDate", () => {
  it("treats numbers as epoch milliseconds, the callable contract", () => {
    assert.equal(toDate(MILLIS)?.toISOString(), "2026-07-15T09:30:00.000Z");
    assert.equal(formatDate(MILLIS), "15 Jul 2026");
    assert.equal(toDateInputValue(MILLIS), "2026-07-15");
  });

  it("treats epoch 0 as a real date rather than a missing one", () => {
    assert.equal(toDate(0)?.getUTCFullYear(), 1970);
  });

  it("tolerates values the console itself produces", () => {
    assert.equal(toDate("2026-07-15T09:30:00.000Z")?.toISOString(), "2026-07-15T09:30:00.000Z");
    assert.equal(toDate("2026-07-15")?.getUTCFullYear(), 2026);
    assert.equal(toDate(new Date(MILLIS))?.getTime(), MILLIS);
  });

  it("returns null for anything unusable", () => {
    for (const value of [
      null,
      undefined,
      "",
      "not a date",
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ]) {
      assert.equal(toDate(value as never), null);
    }
    assert.equal(formatDateTime(undefined), "—");
  });
});

describe("summariseAdherence", () => {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  it("applies the window to epoch-millis timestamps", () => {
    // Regression guard: parsing via `new Date(String(millis))` yields an
    // Invalid Date, which silently disables the window and counts every log.
    const summary = summariseAdherence(
      [
        { id: "1", status: "taken", scheduledAt: now - day },
        { id: "2", status: "missed", scheduledAt: now - 2 * day },
        { id: "3", status: "skipped", scheduledAt: now - 3 * day },
        { id: "4", status: "pending", scheduledAt: now - 4 * day },
        { id: "5", status: "taken", scheduledAt: now - 400 * day },
        { id: "6", status: "taken", scheduledAt: now - 90 * day },
      ] as never,
      30,
    );

    assert.equal(summary.total, 4);
    assert.equal(summary.taken, 1);
  });

  it("excludes not-yet-due doses from the rate", () => {
    const summary = summariseAdherence(
      [
        { id: "1", status: "taken", scheduledAt: now },
        { id: "2", status: "missed", scheduledAt: now },
        { id: "3", status: "skipped", scheduledAt: now },
        { id: "4", status: "pending", scheduledAt: now },
      ] as never,
      30,
    );

    assert.equal(summary.pending, 1);
    assert.equal(summary.ratePercent?.toFixed(2), (100 / 3).toFixed(2));
  });

  it("reports null rather than 0% when there is nothing to measure", () => {
    assert.equal(summariseAdherence([], 30).ratePercent, null);
  });

  it("counts a dose with a takenAt even if the status vocabulary drifted", () => {
    assert.equal(summariseAdherence([{ id: "x", takenAt: now } as never], 30).taken, 1);
  });
});
