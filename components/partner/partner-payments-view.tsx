"use client";

import { Wallet } from "lucide-react";

import { useMyPayouts } from "@/hooks/use-partner-portal";
import { useLimit } from "@/hooks/use-limit";
import { formatDate, formatNumber, titleCase } from "@/lib/format";

import { PortalEmpty, PortalError, PortalLoading } from "@/components/partner/partner-states";
import { CopyButton } from "@/components/common/copy-button";
import { LimitFooter } from "@/components/common/load-more";
import { Money } from "@/components/common/money";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function PartnerPaymentsView() {
  const { limit, raise, atCap } = useLimit();
  const { data, isPending, isError, error, refetch, isFetching } = useMyPayouts(limit);

  if (isPending) return <PortalLoading rows={2} />;
  if (isError) return <PortalError error={error} onRetry={() => void refetch()} />;

  const payouts = data.payouts ?? [];

  return (
    <>
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Payments</h1>
        <p className="text-sm text-muted-foreground">
          Money we have sent you, with the reference to match against your bank.
        </p>
      </header>

      {payouts.length === 0 ? (
        <PortalEmpty
          icon={<Wallet className="size-6" />}
          title="No payments yet"
          description="When we send you a payment it appears here with its reference number. Anything you are owed in the meantime is on your dashboard."
        />
      ) : (
        <Card>
          <CardContent className="px-0 pb-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paid on</TableHead>
                  <TableHead>Covering</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {payouts.map((payout) => {
                  const isVoid = payout.status === "void";

                  return (
                    <TableRow key={payout.id}>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(payout.paidOn ?? payout.createdAt)}
                      </TableCell>

                      <TableCell className="text-sm text-muted-foreground">
                        {payout.periodStart && payout.periodEnd ? (
                          <>
                            {formatDate(payout.periodStart)} – {formatDate(payout.periodEnd)}
                          </>
                        ) : (
                          "—"
                        )}
                        <span className="block text-xs">
                          {formatNumber(payout.transactionCount)} payments
                        </span>
                      </TableCell>

                      <TableCell className="text-sm text-muted-foreground">
                        {titleCase(payout.method)}
                      </TableCell>

                      <TableCell className="max-w-44">
                        {payout.reference ? (
                          <span className="flex items-center gap-1">
                            <span className="truncate font-mono text-xs">
                              {payout.reference}
                            </span>
                            <CopyButton value={payout.reference} label="Copy reference" />
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      <TableCell>
                        {isVoid ? (
                          <Badge variant="destructive">Cancelled</Badge>
                        ) : (
                          <Badge variant="success">Paid</Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-right font-medium">
                        <Money
                          minor={payout.amountMinor}
                          currency={payout.currency}
                          emphasis={isVoid ? "muted" : "default"}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <LimitFooter
              noun="payment"
              count={payouts.length}
              limit={limit}
              atCap={atCap}
              isFetching={isFetching}
              onRaise={raise}
            />
          </CardContent>
        </Card>
      )}
    </>
  );
}
