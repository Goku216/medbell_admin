"use client";

import type { AdherenceSummary } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Adherence as a meter, not a chart: it is one ratio against a limit.
 * The unfilled track is a lighter step of the same ramp so the state reads
 * across the whole bar.
 */
export function AdherenceCard({ adherence }: { adherence: AdherenceSummary }) {
  const rate = adherence.ratePercent;
  const resolved = adherence.taken + adherence.missed + adherence.skipped;

  const tone =
    rate === null ? "muted" : rate >= 85 ? "good" : rate >= 60 ? "warning" : "critical";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dose-log adherence</CardTitle>
        <CardDescription>
          Doses taken as a share of doses that resolved, over the last {adherence.windowDays}{" "}
          days. Pending doses are excluded from the rate.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              "text-4xl font-semibold tracking-tight",
              tone === "good" && "text-success",
              tone === "warning" && "text-warning",
              tone === "critical" && "text-destructive",
              tone === "muted" && "text-muted-foreground",
            )}
          >
            {rate === null ? "—" : `${rate.toFixed(0)}%`}
          </span>
          {rate !== null ? (
            <span className="text-xs text-muted-foreground">
              {formatNumber(adherence.taken)} of {formatNumber(resolved)} doses
            </span>
          ) : null}
        </div>

        <div
          className="h-2 w-full overflow-hidden rounded-full bg-muted"
          role="meter"
          aria-valuenow={rate ?? 0}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Adherence rate"
        >
          <div
            className={cn(
              "h-full rounded-full transition-[width]",
              tone === "good" && "bg-success",
              tone === "warning" && "bg-warning",
              tone === "critical" && "bg-destructive",
              tone === "muted" && "bg-muted-foreground/30",
            )}
            style={{ width: `${Math.min(Math.max(rate ?? 0, 0), 100)}%` }}
          />
        </div>

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Taken", value: adherence.taken },
            { label: "Missed", value: adherence.missed },
            { label: "Skipped", value: adherence.skipped },
            { label: "Pending", value: adherence.pending },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-border px-3 py-2">
              <dt className="text-xs text-muted-foreground">{item.label}</dt>
              <dd className="tabular text-lg font-medium">{formatNumber(item.value)}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
