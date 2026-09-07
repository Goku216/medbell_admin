import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { escapeCsvField, toCsv } from "@/lib/csv";

describe("escapeCsvField", () => {
  it("passes plain values through", () => {
    assert.equal(escapeCsvField("Acme"), "Acme");
    assert.equal(escapeCsvField(149950), "149950");
    assert.equal(escapeCsvField(null), "");
    assert.equal(escapeCsvField(undefined), "");
  });

  it("quotes separators, quotes and newlines", () => {
    assert.equal(escapeCsvField("Acme, Inc"), '"Acme, Inc"');
    assert.equal(escapeCsvField('He said "hi"'), '"He said ""hi"""');
    assert.equal(escapeCsvField("line1\nline2"), '"line1\nline2"');
  });

  it("neutralises spreadsheet formulas", () => {
    // A partner name is operator-supplied and lands in a spreadsheet: =, +, -
    // and @ would otherwise be evaluated on open.
    assert.equal(escapeCsvField("=1+1"), "'=1+1");
    assert.equal(escapeCsvField("+cmd"), "'+cmd");
    assert.equal(escapeCsvField("-2"), "'-2");
    assert.equal(escapeCsvField("@SUM(A1)"), "'@SUM(A1)");
  });
});

describe("toCsv", () => {
  const rows = [
    { id: "a", amountMinor: 149950, note: "with, comma" },
    { id: "b", amountMinor: -2550, note: null },
  ];
  const columns = [
    { header: "Id", value: (row: (typeof rows)[number]) => row.id },
    { header: "Amount (minor)", value: (row: (typeof rows)[number]) => row.amountMinor },
    { header: "Note", value: (row: (typeof rows)[number]) => row.note },
  ];

  it("writes a header row and CRLF line endings", () => {
    const csv = toCsv(rows, columns);
    const lines = csv.replace(/^﻿/, "").split("\r\n");

    assert.equal(lines[0], "Id,Amount (minor),Note");
    assert.equal(lines[1], 'a,149950,"with, comma"');
  });

  it("exports money as the stored integer, not a formatted string", () => {
    const csv = toCsv(rows, columns);
    assert.ok(csv.includes("149950"));
    assert.ok(!csv.includes("1,499.50"));
  });

  it("quotes a negative amount so a spreadsheet does not read it as a formula", () => {
    const csv = toCsv(rows, columns);
    assert.ok(csv.includes("'-2550"));
  });

  it("starts with a BOM so Excel reads it as UTF-8", () => {
    assert.ok(toCsv(rows, columns).startsWith("﻿"));
  });

  it("handles an empty row set", () => {
    const csv = toCsv([], columns).replace(/^﻿/, "");
    assert.equal(csv, "Id,Amount (minor),Note\r\n");
  });
});
