import { toDate } from "@/lib/format";
import type { AdherenceSummary, MedicationLog } from "@/lib/api/types";

export const ADHERENCE_WINDOW_DAYS = 30;

/**
 * Dose-log adherence over a trailing window.
 *
 * Log status vocabularies have drifted across app versions, so buckets are
 * matched loosely and only logs that actually resolved (taken, missed or
 * skipped) count toward the rate — counting a dose that has not come due yet
 * as a failure would understate every active user.
 *
 * Pure and free of Firestore imports so it can be reasoned about, and tested,
 * on its own.
 */
export function summariseAdherence(
  logs: MedicationLog[],
  windowDays = ADHERENCE_WINDOW_DAYS,
): AdherenceSummary {
  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;

  let taken = 0;
  let missed = 0;
  let skipped = 0;
  let pending = 0;

  for (const log of logs) {
    // Parsed with toDate, not `new Date(String(stamp))`: timestamps arrive as
    // epoch millis, and stringifying a number first yields an Invalid Date,
    // which would silently disable the window and count every log ever.
    const at = toDate(log.scheduledAt ?? log.takenAt ?? log.createdAt);
    if (at && at.getTime() < cutoff) continue;

    const status = String(log.status ?? "").toLowerCase();
    if (status.includes("taken") || status.includes("complete") || status.includes("done")) {
      taken += 1;
    } else if (status.includes("miss")) {
      missed += 1;
    } else if (status.includes("skip")) {
      skipped += 1;
    } else if (log.takenAt) {
      taken += 1;
    } else {
      pending += 1;
    }
  }

  const resolved = taken + missed + skipped;

  return {
    windowDays,
    total: taken + missed + skipped + pending,
    taken,
    missed,
    skipped,
    pending,
    ratePercent: resolved > 0 ? (taken / resolved) * 100 : null,
  };
}
