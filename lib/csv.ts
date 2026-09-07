/**
 * CSV export for the ledger and payout screens — one of the things the panel
 * exists to add over the app.
 *
 * Money is exported as the stored integer minor units alongside its currency,
 * not as a formatted string: a spreadsheet should receive the exact figure the
 * backend holds, and "₹1,499.50" is neither summable nor unambiguous.
 */

export type CsvColumn<T> = {
  header: string;
  value: (row: T) => string | number | null | undefined;
};

/**
 * Escapes one field.
 *
 * Beyond the usual quoting, a leading =, +, - or @ is prefixed with a single
 * quote: spreadsheets treat those as formulas, and an exported value like
 * `=1+1` (or worse, a crafted one in a partner name) would execute on open.
 */
export function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";

  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;

  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsv<T>(rows: T[], columns: Array<CsvColumn<T>>): string {
  const header = columns.map((column) => escapeCsvField(column.header)).join(",");
  const body = rows.map((row) =>
    columns.map((column) => escapeCsvField(column.value(row))).join(","),
  );

  // CRLF and a UTF-8 BOM keep Excel happy with both line endings and accents.
  return `﻿${[header, ...body].join("\r\n")}\r\n`;
}

/** Builds a timestamped filename so repeated exports do not collide. */
export function csvFilename(prefix: string): string {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return `medbell-${prefix}-${stamp}.csv`;
}

/** Triggers a browser download. Client-side only. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}
