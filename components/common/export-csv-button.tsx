"use client";

import { Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { csvFilename, downloadCsv, toCsv, type CsvColumn } from "@/lib/csv";

/** Exports whatever rows are currently loaded, which the label says out loud. */
export function ExportCsvButton<T>({
  rows,
  columns,
  filenamePrefix,
  label = "Export CSV",
}: {
  rows: T[];
  columns: Array<CsvColumn<T>>;
  filenamePrefix: string;
  label?: string;
}) {
  function onExport() {
    if (rows.length === 0) {
      toast.info("Nothing to export yet.");
      return;
    }
    downloadCsv(csvFilename(filenamePrefix), toCsv(rows, columns));
    toast.success(`Exported ${rows.length} rows.`);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onExport}
      title={`Exports the ${rows.length} rows loaded here`}
    >
      <Download />
      {label}
    </Button>
  );
}
