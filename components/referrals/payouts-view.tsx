"use client";

import * as React from "react";
import { Building2 } from "lucide-react";

import { usePartnerPayouts } from "@/hooks/use-referrals";
import { useLimit } from "@/hooks/use-limit";
import { errorMessage } from "@/lib/api/callable-error";
import { POLICY_NOTES } from "@/lib/constants";
import { formatDate, formatDateTime, formatNumber, titleCase } from "@/lib/format";
import type { CsvColumn } from "@/lib/csv";
import type { PartnerPayout } from "@/lib/api/types";

import { EditPayoutDialog, VoidPayoutDialog } from "@/components/referrals/payout-dialogs";
import { PartnerPicker } from "@/components/referrals/partner-picker";
import { LimitFooter } from "@/components/common/load-more";
import { Money } from "@/components/common/money";
import { ExportCsvButton } from "@/components/common/export-csv-button";
import { PageHeader } from "@/components/common/page-header";
import { PolicyNote } from "@/components/common/policy-note";
import { StatusBadge } from "@/components/common/status-badge";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function PayoutsView({ partnerId: fixedPartnerId }: { partnerId?: string } = {}) {
  const [partnerId, setPartnerId] = React.useState<string | null>(fixedPartnerId ?? null);
  const [editing, setEditing] = React.useState<PartnerPayout | null>(null);
  const [voiding, setVoiding] = React.useState<PartnerPayout | null>(null);

  const { limit, raise, atCap } = useLimit();

  // listPartnerPayouts requires a partnerId — there is no cross-partner listing.
  const query = usePartnerPayouts(partnerId, limit);
  const payouts = query.data?.payouts ?? [];

  return (
    <>
      {fixedPartnerId ? null : (
        <>
          <PageHeader
            title="Payouts"
            description="Settlements recorded against commission rows, listed per partner."
            actions={
              <ExportCsvButton
                rows={payouts}
                columns={PAYOUT_COLUMNS}
                filenamePrefix="payouts"
              />
            }
          />
          <PolicyNote variant="locked">
            {POLICY_NOTES.serverComputedPayout} {POLICY_NOTES.settlementOnly}
          </PolicyNote>
        </>
      )}

      <Card>
        <CardContent className="px-0 pb-0">
          {fixedPartnerId ? null : (
            <div className="flex flex-wrap items-end gap-3 px-3 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="payouts-partner" className="text-xs text-muted-foreground">
                  Partner
                </Label>
                <PartnerPicker
                  id="payouts-partner"
                  value={partnerId}
                  onChange={setPartnerId}
                  placeholder="Choose a partner"
                  includeAll={false}
                  className="w-56"
                />
              </div>
            </div>
          )}

          {!partnerId ? (
            <EmptyState
              className="m-3"
              icon={<Building2 className="size-6" />}
              title="Choose a partner"
              description="Payouts are listed per partner — the backend has no cross-partner view."
            />
          ) : query.isError ? (
            <div className="p-3">
              <ErrorState
                message={errorMessage(query.error)}
                onRetry={() => void query.refetch()}
              />
            </div>
          ) : query.isPending ? (
            <TableSkeleton columns={7} />
          ) : payouts.length === 0 ? (
            <EmptyState
              className="m-3"
              title="No payouts recorded"
              description="Select payable commissions in the ledger, then record a payout from there."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paid on</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Settlement</TableHead>
                    <TableHead className="text-right">Rows</TableHead>
                    <TableHead className="text-right">Computed</TableHead>
                    <TableHead className="text-right">Settled</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {payouts.map((payout) => {
                    const isVoid = Boolean(payout.voided);
                    const settledDiffers =
                      payout.settledAmountMinor != null &&
                      payout.settledAmountMinor !== payout.amountMinor;

                    return (
                      <TableRow key={payout.id}>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {formatDate(payout.paidOn ?? payout.createdAt)}
                        </TableCell>

                        <TableCell className="text-sm text-muted-foreground">
                          {titleCase(payout.method)}
                        </TableCell>

                        <TableCell className="max-w-40 truncate font-mono text-xs">
                          {payout.reference ?? "—"}
                        </TableCell>

                        <TableCell>
                          {isVoid ? (
                            <Badge variant="destructive">Void</Badge>
                          ) : (
                            <StatusBadge status={payout.settlementStatus ?? "pending"} />
                          )}
                        </TableCell>

                        <TableCell className="tabular text-right">
                          {formatNumber(payout.count ?? payout.transactionIds?.length ?? 0)}
                        </TableCell>

                        <TableCell className="text-right">
                          <Money minor={payout.amountMinor} currency={payout.currency} />
                        </TableCell>

                        <TableCell className="text-right font-medium">
                          {payout.settledAmountMinor != null ? (
                            <Money
                              minor={payout.settledAmountMinor}
                              currency={payout.currency}
                              emphasis={settledDiffers ? "negative" : "default"}
                            />
                          ) : (
                            <span className="text-muted-foreground">Not recorded</span>
                          )}
                        </TableCell>

                        <TableCell className="whitespace-nowrap text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isVoid}
                            onClick={() => setEditing(payout)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isVoid}
                            onClick={() => setVoiding(payout)}
                          >
                            Void
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <LimitFooter
                noun="payout"
                count={payouts.length}
                limit={limit}
                atCap={atCap}
                isFetching={query.isFetching}
                onRaise={raise}
              />
            </>
          )}
        </CardContent>
      </Card>

      <EditPayoutDialog
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        payout={editing}
      />

      <VoidPayoutDialog
        open={Boolean(voiding)}
        onOpenChange={(open) => !open && setVoiding(null)}
        payout={voiding}
      />
    </>
  );
}

const PAYOUT_COLUMNS: Array<CsvColumn<PartnerPayout>> = [
  { header: "Payout id", value: (row) => row.id },
  { header: "Partner id", value: (row) => row.partnerId },
  { header: "Paid on", value: (row) => formatDateTime(row.paidOn ?? row.createdAt) },
  { header: "Method", value: (row) => row.method },
  { header: "Reference", value: (row) => row.reference },
  { header: "Settlement status", value: (row) => (row.voided ? "void" : row.settlementStatus) },
  { header: "Rows", value: (row) => row.count ?? row.transactionIds?.length ?? 0 },
  { header: "Currency", value: (row) => row.currency },
  { header: "Computed (minor)", value: (row) => row.amountMinor },
  { header: "Settled (minor)", value: (row) => row.settledAmountMinor },
  { header: "Void reason", value: (row) => row.voidReason },
  { header: "Notes", value: (row) => row.notes },
];
