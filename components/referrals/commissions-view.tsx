"use client";

import * as React from "react";
import Link from "next/link";
import { Ban, Check, LoaderCircle, Wallet } from "lucide-react";
import { toast } from "sonner";

import { useCommissions, useReviewCommissions } from "@/hooks/use-referrals";
import { useLimit } from "@/hooks/use-limit";
import { errorMessage } from "@/lib/api/callable-error";
import {
  COMMISSION_STATUSES,
  PAYABLE_COMMISSION_STATUSES,
  PLAN_KINDS,
  PLAN_LABELS,
  POLICY_NOTES,
} from "@/lib/constants";
import type { ListCommissionTransactionsRequest } from "@/lib/api/types";
import { formatDate, formatNumber, titleCase } from "@/lib/format";
import { sumMinor } from "@/lib/money";
import type { CommissionStatus, PlanKind } from "@/lib/constants";

import { MarkPaidDialog } from "@/components/referrals/mark-paid-dialog";
import { PartnerPicker } from "@/components/referrals/partner-picker";
import { LimitFooter } from "@/components/common/load-more";
import { Money } from "@/components/common/money";
import { PageHeader } from "@/components/common/page-header";
import { PolicyNote } from "@/components/common/policy-note";
import { StatusBadge } from "@/components/common/status-badge";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const ANY = "__any__";

export function CommissionsView() {
  const [partnerId, setPartnerId] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<CommissionStatus | null>(null);
  const [plan, setPlan] = React.useState<PlanKind | null>(null);
  const [firstPaymentOnly, setFirstPaymentOnly] = React.useState(false);
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [payoutOpen, setPayoutOpen] = React.useState(false);

  const { limit, raise, atCap, reset: resetLimit } = useLimit();

  // The callable filters eventAt on epoch milliseconds, so the date inputs are
  // converted here rather than sent as yyyy-MM-dd strings.
  const filters = React.useMemo<ListCommissionTransactionsRequest>(() => {
    const request: ListCommissionTransactionsRequest = { limit };
    if (partnerId) request.partnerId = partnerId;
    if (status) request.status = status;
    if (plan) request.plan = plan;
    if (firstPaymentOnly) request.firstPaymentOnly = true;

    const fromMs = from ? new Date(`${from}T00:00:00`).getTime() : NaN;
    const toMs = to ? new Date(`${to}T23:59:59.999`).getTime() : NaN;
    if (!Number.isNaN(fromMs)) request.from = fromMs;
    if (!Number.isNaN(toMs)) request.to = toMs;

    return request;
  }, [partnerId, status, plan, firstPaymentOnly, from, to, limit]);

  const query = useCommissions(filters);
  const review = useReviewCommissions();
  const rows = query.data?.transactions ?? [];
  const pageTotals = query.data?.totals;

  // Selection intersected with what is actually on screen, derived during
  // render. A refetch that drops a row therefore drops it from the selection
  // too, with no effect needed to prune phantom ids.
  const selectedRows = rows.filter((row) => selected.has(row.id));
  const selectedCount = selectedRows.length;
  const selectedTotal = sumMinor(selectedRows.map((row) => row.commissionMinor));

  const selectedPartnerIds = new Set(selectedRows.map((row) => row.partnerId));
  const singlePartner = selectedPartnerIds.size === 1 ? [...selectedPartnerIds][0] : null;
  const selectedCurrencies = new Set(selectedRows.map((row) => row.currency ?? "INR"));
  const singleCurrency = selectedCurrencies.size <= 1;

  // Only pending and approved rows are payable, and a payout is single-currency.
  const allPayable =
    selectedCount > 0 &&
    selectedRows.every((row) =>
      PAYABLE_COMMISSION_STATUSES.includes(row.status as CommissionStatus),
    );

  async function runReview(decision: "approve" | "cancel") {
    if (!singlePartner) return;

    try {
      // reviewCommissions is scoped to one partner and takes `decision`.
      const result = await review.mutateAsync({
        partnerId: singlePartner,
        transactionIds: selectedRows.map((row) => row.id),
        decision,
      });
      toast.success(
        `${formatNumber(result.count)} ${decision === "approve" ? "approved" : "cancelled"}.`,
      );
      setSelected(new Set());
    } catch (caught) {
      toast.error(errorMessage(caught));
    }
  }

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(selectedCount === rows.length ? new Set() : new Set(rows.map((row) => row.id)));
  }

  function resetFilters() {
    setPartnerId(null);
    setStatus(null);
    setPlan(null);
    setFirstPaymentOnly(false);
    setFrom("");
    setTo("");
    resetLimit();
  }

  return (
    <>
      <PageHeader
        title="Commission ledger"
        description="Every commission row the backend has recorded, including renewals at full price. Amounts are recomputed server-side on each review."
      />

      <PolicyNote variant="locked">{POLICY_NOTES.serverComputedPayout}</PolicyNote>

      <Card>
        <CardContent className="px-0 pb-0">
          <div className="flex flex-wrap items-end gap-3 border-b border-border px-3 py-3">
            <div className="space-y-1.5">
              <Label htmlFor="ledger-partner" className="text-xs text-muted-foreground">
                Partner
              </Label>
              <PartnerPicker
                id="ledger-partner"
                value={partnerId}
                onChange={setPartnerId}
                className="w-52"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ledger-status" className="text-xs text-muted-foreground">
                Status
              </Label>
              <Select
                value={status ?? ANY}
                onValueChange={(next) =>
                  setStatus(next === ANY ? null : (next as CommissionStatus))
                }
              >
                <SelectTrigger id="ledger-status" size="sm" className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Any status</SelectItem>
                  {COMMISSION_STATUSES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {titleCase(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ledger-plan" className="text-xs text-muted-foreground">
                Plan
              </Label>
              <Select
                value={plan ?? ANY}
                onValueChange={(next) => setPlan(next === ANY ? null : (next as PlanKind))}
              >
                <SelectTrigger id="ledger-plan" size="sm" className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Any plan</SelectItem>
                  {PLAN_KINDS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {PLAN_LABELS[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ledger-from" className="text-xs text-muted-foreground">
                From
              </Label>
              <Input
                id="ledger-from"
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className="h-8 w-40"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ledger-to" className="text-xs text-muted-foreground">
                To
              </Label>
              <Input
                id="ledger-to"
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className="h-8 w-40"
              />
            </div>

            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Reset
            </Button>
          </div>

          {selectedCount > 0 ? (
            <div className="flex flex-wrap items-center gap-3 border-b border-border bg-accent/40 px-3 py-2.5">
              <span className="text-sm font-medium">
                {formatNumber(selectedCount)} selected
              </span>
              <Money minor={selectedTotal} className="text-sm font-semibold" />

              <div className="ml-auto flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void runReview("approve")}
                  disabled={review.isPending || !singlePartner}
                  title={singlePartner ? undefined : "Select rows from a single partner"}
                >
                  {review.isPending ? <LoaderCircle className="animate-spin" /> : <Check />}
                  Approve
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void runReview("cancel")}
                  disabled={review.isPending || !singlePartner}
                  title={singlePartner ? undefined : "Select rows from a single partner"}
                >
                  <Ban />
                  Cancel
                </Button>

                <Button
                  size="sm"
                  onClick={() => setPayoutOpen(true)}
                  disabled={!singlePartner || !allPayable || !singleCurrency}
                  title={
                    !singlePartner
                      ? "Select rows from a single partner"
                      : !singleCurrency
                        ? "A payout is single-currency; select rows in one currency"
                        : !allPayable
                          ? "Only pending and approved rows are payable"
                          : undefined
                  }
                >
                  <Wallet />
                  Record payout
                </Button>
              </div>
            </div>
          ) : null}

          {query.isError ? (
            <div className="p-3">
              <ErrorState
                message={errorMessage(query.error)}
                onRetry={() => void query.refetch()}
              />
            </div>
          ) : query.isPending ? (
            <TableSkeleton columns={8} />
          ) : rows.length === 0 ? (
            <EmptyState
              className="m-3"
              title="No commission rows match these filters"
              description="Rows are created by the RevenueCat webhook on every successful transaction, renewals included."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={rows.length > 0 && selectedCount === rows.length}
                        onCheckedChange={toggleAll}
                        aria-label="Select all loaded rows"
                      />
                    </TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Partner</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Discount</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={selected.has(row.id) ? "selected" : undefined}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selected.has(row.id)}
                          onCheckedChange={() => toggle(row.id)}
                          aria-label={`Select commission ${row.id}`}
                        />
                      </TableCell>

                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(row.eventAt ?? row.createdAt)}
                      </TableCell>

                      <TableCell className="max-w-36 truncate">
                        <Link
                          href={`/referrals/partners/${row.partnerId}`}
                          className="hover:underline"
                        >
                          {row.partnerId}
                        </Link>
                      </TableCell>

                      <TableCell className="max-w-44 truncate text-sm">
                        {row.userId ? (
                          <Link href={`/users/${row.userId}`} className="hover:underline">
                            {row.userId}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">
                            {row.plan ? PLAN_LABELS[row.plan] : "—"}
                          </span>
                          {row.isFirstPayment === false ? (
                            <Badge variant="outline">Renewal</Badge>
                          ) : null}
                        </div>
                      </TableCell>

                      <TableCell>
                        <StatusBadge status={row.status} />
                      </TableCell>

                      <TableCell className="text-right">
                        <Money minor={row.grossMinor} currency={row.currency} />
                      </TableCell>

                      <TableCell className="text-right">
                        <Money
                          minor={row.discountMinor}
                          currency={row.currency}
                          emphasis="muted"
                        />
                      </TableCell>

                      <TableCell className="text-right font-medium">
                        <Money minor={row.commissionMinor} currency={row.currency} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* The callable returns totals over the returned page only, not
                  the whole filtered set — labelled as such so nobody reads it
                  as a grand total. */}
              {pageTotals ? (
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-border px-3 py-2.5 text-xs">
                  <span className="font-medium text-muted-foreground">Totals on this page</span>
                  <span className="text-muted-foreground">
                    Gross <Money minor={pageTotals.grossMinor} className="text-foreground" />
                  </span>
                  <span className="text-muted-foreground">
                    Discount{" "}
                    <Money minor={pageTotals.discountMinor} className="text-foreground" />
                  </span>
                  <span className="text-muted-foreground">
                    Commission{" "}
                    <Money minor={pageTotals.commissionMinor} className="text-foreground" />
                  </span>
                </div>
              ) : null}

              <LimitFooter
                noun="commission"
                count={rows.length}
                limit={limit}
                atCap={atCap}
                isFetching={query.isFetching}
                onRaise={raise}
                hasMore={query.data?.hasMore}
              />
            </>
          )}
        </CardContent>
      </Card>

      <MarkPaidDialog
        open={payoutOpen}
        onOpenChange={setPayoutOpen}
        partnerId={singlePartner}
        currency={selectedRows[0]?.currency ?? "INR"}
        transactions={selectedRows}
      />
    </>
  );
}
