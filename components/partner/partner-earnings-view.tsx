"use client";

import * as React from "react";
import { Receipt } from "lucide-react";

import { useMyCommissions } from "@/hooks/use-partner-portal";
import { useLimit } from "@/hooks/use-limit";
import { formatDate, formatNumber, titleCase } from "@/lib/format";
import { PLAN_LABELS } from "@/lib/constants";
import type { MyCommissionStatus } from "@/lib/partner/types";

import { CommissionStatusNote, STATUS_COPY } from "@/components/partner/commission-status-note";
import { PortalEmpty, PortalError, PortalLoading } from "@/components/partner/partner-states";
import { LimitFooter } from "@/components/common/load-more";
import { Money } from "@/components/common/money";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ALL = "__all__";
const STATUSES: MyCommissionStatus[] = ["pending", "approved", "paid", "reversed", "cancelled"];

export function PartnerEarningsView() {
  const [status, setStatus] = React.useState<MyCommissionStatus | null>(null);
  const { limit, raise, atCap } = useLimit();
  const { data, isPending, isError, error, refetch, isFetching } = useMyCommissions(
    status,
    limit,
  );

  if (isPending) return <PortalLoading />;
  if (isError) return <PortalError error={error} onRetry={() => void refetch()} />;

  const rows = data.transactions ?? [];

  return (
    <>
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Earnings</h1>
        <p className="text-sm text-muted-foreground">
          Every payment your customers have made, and what you earned from it.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>What the statuses mean</CardTitle>
          <CardDescription>Every payment moves through these in order.</CardDescription>
        </CardHeader>
        <CardContent>
          <CommissionStatusNote />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="px-0 pb-0">
          <div className="flex flex-wrap items-center gap-2 px-3 py-3">
            <Select
              value={status ?? ALL}
              onValueChange={(next) =>
                setStatus(next === ALL ? null : (next as MyCommissionStatus))
              }
            >
              <SelectTrigger size="sm" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                {STATUSES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {STATUS_COPY[option]?.label ?? titleCase(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {rows.length === 0 ? (
            <div className="px-3 pb-4">
              <PortalEmpty
                icon={<Receipt className="size-6" />}
                title={status ? "Nothing with that status" : "No earnings yet"}
                description={
                  status
                    ? "Try another status, or clear the filter to see everything."
                    : "Once a customer subscribes with your code, every payment they make appears here."
                }
              />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Customer paid</TableHead>
                    <TableHead className="text-right">You earned</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(row.eventAt)}
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm">
                            {row.plan ? (PLAN_LABELS[row.plan] ?? titleCase(row.plan)) : "—"}
                          </span>
                          <Badge variant="outline">
                            {row.isFirstPayment ? "First payment" : "Renewal"}
                          </Badge>
                        </div>
                      </TableCell>

                      <TableCell>
                        <code className="font-mono text-xs">{row.referralCode ?? "—"}</code>
                      </TableCell>

                      <TableCell>
                        {/* A reversal is a claw-back, not a status among equals —
                            name it, so a negative amount is never a surprise. */}
                        {row.isReversal ? (
                          <Badge variant="destructive">Refunded</Badge>
                        ) : (
                          <Badge
                            variant={
                              row.status === "paid"
                                ? "success"
                                : row.status === "approved"
                                  ? "default"
                                  : row.status === "cancelled"
                                    ? "muted"
                                    : "warning"
                            }
                          >
                            {STATUS_COPY[row.status]?.label ?? titleCase(row.status)}
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <Money
                          minor={row.amountMinor}
                          currency={row.currency}
                          emphasis="muted"
                        />
                      </TableCell>

                      <TableCell className="text-right font-medium">
                        <Money
                          minor={row.commissionAmountMinor}
                          currency={row.currency}
                          emphasis={row.commissionAmountMinor < 0 ? "negative" : "default"}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Labelled "this page" on purpose: these cover the rows above,
                  not a lifetime. The dashboard carries the lifetime figures. */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-border px-3 py-2.5 text-xs">
                <span className="font-medium text-muted-foreground">Totals on this page</span>
                <span className="text-muted-foreground">
                  Customers paid{" "}
                  <Money minor={data.totals?.grossMinor} className="text-foreground" />
                </span>
                <span className="text-muted-foreground">
                  You earned{" "}
                  <Money minor={data.totals?.commissionMinor} className="text-foreground" />
                </span>
                <span className="ml-auto text-muted-foreground">
                  {formatNumber(rows.length)} payments
                </span>
              </div>

              <LimitFooter
                noun="payment"
                count={rows.length}
                limit={limit}
                atCap={atCap}
                isFetching={isFetching}
                onRaise={raise}
                hasMore={data.hasMore}
              />
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}
