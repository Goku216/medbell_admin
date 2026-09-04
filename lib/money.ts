/**
 * Money in MedBell is stored — everywhere, without exception — as an INTEGER
 * number of minor units (paise). The backend computes every amount from those
 * integers and the console must never re-derive one in floating point: we
 * divide by 100 exactly once, inside the formatter, at the display boundary.
 */

export const MINOR_UNITS_PER_MAJOR = 100;

export type Minor = number;

/** Adds minor-unit amounts. Integer arithmetic only. */
export function sumMinor(values: Array<Minor | null | undefined>): Minor {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

function toParts(minor: Minor): { negative: boolean; major: number; cents: number } {
  const negative = minor < 0;
  const absolute = Math.abs(Math.trunc(minor));
  return {
    negative,
    major: Math.trunc(absolute / MINOR_UNITS_PER_MAJOR),
    cents: absolute % MINOR_UNITS_PER_MAJOR,
  };
}

/**
 * Formats minor units for display. The integer is split into major/minor parts
 * with integer maths and only the already-exact decimal string is handed to
 * Intl, so no amount ever round-trips through a float.
 */
export function formatMinor(
  minor: Minor | null | undefined,
  options: { currency?: string; locale?: string; showDecimals?: boolean } = {},
): string {
  const { currency = "INR", locale = "en-IN", showDecimals = true } = options;

  if (minor === null || minor === undefined || Number.isNaN(minor)) {
    return "—";
  }

  const { negative, major, cents } = toParts(minor);
  const rounded = cents === 0 && !showDecimals;

  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: rounded ? 0 : 2,
    maximumFractionDigits: rounded ? 0 : 2,
  });

  const decimalString = rounded ? String(major) : `${major}.${String(cents).padStart(2, "0")}`;

  const formatted = formatter.format(Number(decimalString));
  return negative ? `-${formatted}` : formatted;
}

/** Compact form for dashboard tiles: ₹1.2L, ₹4.5Cr — still derived from integers. */
export function formatMinorCompact(
  minor: Minor | null | undefined,
  options: { currency?: string; locale?: string } = {},
): string {
  const { currency = "INR", locale = "en-IN" } = options;
  if (minor === null || minor === undefined || Number.isNaN(minor)) return "—";

  const { negative, major } = toParts(minor);
  if (major < 100_000) return formatMinor(minor, { currency, locale, showDecimals: false });

  const formatted = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(major);

  return negative ? `-${formatted}` : formatted;
}

/**
 * Parses operator input (major units, e.g. "1499.50") into minor units.
 * Parsing is string-based so "1499.50" becomes exactly 149950, never 149949.
 * Returns null when the input is not a well-formed amount.
 */
export function parseMajorToMinor(input: string): Minor | null {
  const trimmed = input.trim().replace(/[,\s₹]/g, "");
  if (!trimmed) return null;
  if (!/^-?\d+(\.\d{0,2})?$/.test(trimmed)) return null;

  const negative = trimmed.startsWith("-");
  const [majorPart, minorPart = ""] = trimmed.replace("-", "").split(".");
  const cents = Number(minorPart.padEnd(2, "0"));
  const value = Number(majorPart) * MINOR_UNITS_PER_MAJOR + cents;
  return negative ? -value : value;
}

/** Renders minor units as a bare major-unit string for prefilling inputs. */
export function minorToMajorInput(minor: Minor | null | undefined): string {
  if (minor === null || minor === undefined) return "";
  const { negative, major, cents } = toParts(minor);
  return `${negative ? "-" : ""}${major}.${String(cents).padStart(2, "0")}`;
}
