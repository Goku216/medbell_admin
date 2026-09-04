"use client";

import * as React from "react";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { useMarkCommissionsPaid } from "@/hooks/use-referrals";
import { errorMessage } from "@/lib/api/callable-error";
import { MAX_PAYOUT_TRANSACTIONS, PAYOUT_METHODS, POLICY_NOTES } from "@/lib/constants";
import { formatNumber, titleCase } from "@/lib/format";
import { formatMinor, sumMinor } from "@/lib/money";
import { omitUndefined } from "@/lib/api/patch";
import type { ReferralTransaction } from "@/lib/api/types";

import { Money } from "@/components/common/money";
import { PolicyNote } from "@/components/common/policy-note";
import { ErrorState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

/**
 * Records a payout against approved commissions.
 *
 * The amount shown is a preview summed from the selected rows so the operator
 * knows roughly what they are settling — it is NOT sent. markCommissionsPaid
 * recomputes the total from the stored commission rows and is the only figure
 * that ends up on the payout.
 */
export function MarkPaidDialog({
  open,
  onOpenChange,
  partnerId,
  currency,
  transactions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerId: string | null;
  currency: string;
  transactions: ReferralTransaction[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Unmounted while closed, so the form starts clean on every open. */}
        <MarkPaidForm
          partnerId={partnerId}
          currency={currency}
          transactions={transactions}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function MarkPaidForm({
  partnerId,
  currency,
  transactions,
  onDone,
}: {
  partnerId: string | null;
  currency: string;
  transactions: ReferralTransaction[];
  onDone: () => void;
}) {
  const markPaid = useMarkCommissionsPaid();

  const [method, setMethod] = React.useState<string>("bank_transfer");
  const [reference, setReference] = React.useState("");
  const [paidAt, setPaidAt] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const preview = sumMinor(transactions.map((row) => row.commissionMinor));

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!partnerId) {
      setError("Select rows belonging to a single partner before recording a payout.");
      return;
    }
    if (transactions.length > MAX_PAYOUT_TRANSACTIONS) {
      setError(
        `A payout covers at most ${MAX_PAYOUT_TRANSACTIONS} rows. Narrow the selection and record more than one.`,
      );
      return;
    }

    try {
      // No amount is sent. The callable sums the stored commission rows inside
      // its transaction; anything the console sent would be ignored anyway.
      const payout = await markPaid.mutateAsync({
        partnerId,
        transactionIds: transactions.map((row) => row.id),
        method,
        paidOn: paidAt,
        ...omitUndefined({
          reference: reference.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      // amountMinor from the response is the authoritative figure, not the
      // preview above — report that back to the operator.
      toast.success(
        `Payout recorded: ${formatMinor(payout.amountMinor, { currency: payout.currency })} over ${formatNumber(payout.count)} rows.`,
      );
      onDone();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Record a payout</DialogTitle>
        <DialogDescription>
          Settling {formatNumber(transactions.length)} payable{" "}
          {transactions.length === 1 ? "row" : "rows"} in {currency}. Only pending and approved
          rows are payable, and the net must be positive.
        </DialogDescription>
      </DialogHeader>

      <div className="rounded-lg border border-border px-3 py-2.5">
        <p className="text-xs text-muted-foreground">Selected commission total (preview)</p>
        <p className="tabular text-xl font-semibold">
          <Money minor={preview} />
        </p>
      </div>

      <PolicyNote variant="locked">{POLICY_NOTES.serverComputedPayout}</PolicyNote>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="payout-method">Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger id="payout-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYOUT_METHODS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {titleCase(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payout-date">Payment date</Label>
            <Input
              id="payout-date"
              type="date"
              value={paidAt}
              onChange={(event) => setPaidAt(event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="payout-reference">Reference</Label>
          <Input
            id="payout-reference"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            placeholder="UTR, transaction id or cheque number"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="payout-notes">Notes</Label>
          <Textarea
            id="payout-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>

        {error ? <ErrorState message={error} /> : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" disabled={markPaid.isPending || transactions.length === 0}>
            {markPaid.isPending ? <LoaderCircle className="animate-spin" /> : null}
            Record payout
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
