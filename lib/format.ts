import { format, isValid } from "date-fns";

/**
 * Every timestamp reaching the console is **epoch milliseconds**.
 *
 * That is the callables' documented wire format, and `lib/data/serialize.ts`
 * converts Firestore `Timestamp` objects to the same thing on the direct-read
 * path, so there is one representation rather than three.
 *
 * `Date` and date strings are accepted as tolerance for values the console
 * itself produces (a `yyyy-MM-dd` input round-tripping through a form), not as
 * part of the contract.
 */
export type TimestampLike = string | number | Date | null | undefined;

export function toDate(value: TimestampLike): Date | null {
  if (value === null || value === undefined || value === "") return null;

  if (value instanceof Date) return isValid(value) ? value : null;

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    const date = new Date(value);
    return isValid(date) ? date : null;
  }

  if (typeof value === "string") {
    // A numeric string is still epoch millis; anything else is parsed as a date.
    const numeric = Number(value);
    const date =
      Number.isFinite(numeric) && value.trim() !== "" ? new Date(numeric) : new Date(value);
    return isValid(date) ? date : null;
  }

  return null;
}

export function formatDate(value: TimestampLike, fallback = "—"): string {
  const date = toDate(value);
  return date ? format(date, "d MMM yyyy") : fallback;
}

export function formatDateTime(value: TimestampLike, fallback = "—"): string {
  const date = toDate(value);
  return date ? format(date, "d MMM yyyy, HH:mm") : fallback;
}

/** `2026-09-04` — the shape `<input type="date">` expects. */
export function toDateInputValue(value: TimestampLike): string {
  const date = toDate(value);
  return date ? format(date, "yyyy-MM-dd") : "";
}

export function formatNumber(value: number | null | undefined, fallback = "—"): string {
  if (value === null || value === undefined || Number.isNaN(value)) return fallback;
  return new Intl.NumberFormat("en-IN").format(value);
}

export function formatPercent(value: number | null | undefined, fractionDigits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(fractionDigits)}%`;
}

export function titleCase(value: string | null | undefined, fallback = "—"): string {
  if (!value) return fallback;
  return value
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function initialsOf(name: string | null | undefined, email?: string | null): string {
  const source = name?.trim() || email?.split("@")[0] || "";
  if (!source) return "?";
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function truncateId(value: string | null | undefined, head = 6, tail = 4): string {
  if (!value) return "—";
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}
