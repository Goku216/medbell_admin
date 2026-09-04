"use client";

import * as React from "react";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { useUpdatePartnerPayout, useVoidPartnerPayout } from "@/hooks/use-referrals";
import { errorMessage } from "@/lib/api/callable-error";
import { PAYOUT_METHODS, SETTLEMENT_STATUSES, POLICY_NOTES } from "@/lib/constants";
import type { SettlementStatus } from "@/lib/constants";
import { titleCase, toDateInputValue } from "@/lib/format";
import { minorToMajorInput, parseMajorToMinor } from "@/lib/money";
import { dateChange, minorChange, omitUndefined, textChange } from "@/lib/api/patch";
import type { PartnerPayout } from "@/lib/api/types";

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
 * Settlement details for an existing payout.
 *
 * The base amount is not editable — it was computed from the commission rows.
 * The one money field here is the settlement correction, entered in rupees and
 * converted to integer paise by string parsing before it leaves the browser;
 * the backend applies and audits it.
 */
export function EditPayoutDialog({
  open,
  onOpenChange,
  payout,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payout: PartnerPayout | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Unmounted while closed, so the form seeds from `payout` on open. */}
        {payout ? <EditPayoutForm payout={payout} onDone={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function EditPayoutForm({ payout, onDone }: { payout: PartnerPayout; onDone: () => void }) {
  const update = useUpdatePartnerPayout();

  const [method, setMethod] = React.useState(payout.method ?? "bank_transfer");
  const [settlementStatus, setSettlementStatus] = React.useState<SettlementStatus>(
    (payout.settlementStatus as SettlementStatus) ?? "pending",
  );
  const [reference, setReference] = React.useState(payout.reference ?? "");
  const [paidOn, setPaidOn] = React.useState(toDateInputValue(payout.paidOn));
  const [notes, setNotes] = React.useState(payout.notes ?? "");
  const [settledAmount, setSettledAmount] = React.useState(
    payout.settledAmountMinor != null ? minorToMajorInput(payout.settledAmountMinor) : "",
  );
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    let settledAmountMinor: number | null = null;
    if (settledAmount.trim()) {
      const parsed = parseMajorToMinor(settledAmount);
      if (parsed === null) {
        setError("Enter the settled amount as a figure, for example 12500 or 12500.50.");
        return;
      }
      settledAmountMinor = parsed;
    }

    try {
      // Patch semantics: only what changed is sent. This touches the settlement
      // record alone — amountMinor and the commission rows are not editable.
      await update.mutateAsync({
        payoutId: payout.id,
        ...omitUndefined({
          method: textChange(payout.method, method),
          settlementStatus:
            payout.settlementStatus === settlementStatus ? undefined : settlementStatus,
          reference: textChange(payout.reference, reference),
          paidOn: dateChange(toDateInputValue(payout.paidOn), paidOn),
          notes: textChange(payout.notes, notes),
          settledAmountMinor: minorChange(payout.settledAmountMinor, settledAmountMinor),
        }),
      });

      toast.success("Settlement record updated.");
      onDone();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit payout</DialogTitle>
        <DialogDescription>
          {payout.partnerId} · <Money minor={payout.amountMinor} currency={payout.currency} />{" "}
          over {payout.count ?? payout.transactionIds?.length ?? 0} commission rows.
        </DialogDescription>
      </DialogHeader>

      <PolicyNote variant="locked">{POLICY_NOTES.serverComputedPayout}</PolicyNote>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="edit-method">Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger id="edit-method">
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
            <Label htmlFor="edit-status">Settlement status</Label>
            <Select
              value={settlementStatus}
              onValueChange={(next) => setSettlementStatus(next as SettlementStatus)}
            >
              <SelectTrigger id="edit-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SETTLEMENT_STATUSES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {titleCase(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="edit-reference">Reference</Label>
            <Input
              id="edit-reference"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-date">Payment date</Label>
            <Input
              id="edit-date"
              type="date"
              value={paidOn}
              onChange={(event) => setPaidOn(event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-settled">Amount actually settled</Label>
          <Input
            id="edit-settled"
            inputMode="decimal"
            value={settledAmount}
            onChange={(event) => setSettledAmount(event.target.value)}
            placeholder={minorToMajorInput(payout.amountMinor)}
            className="tabular"
          />
          <p className="text-xs text-muted-foreground">
            In major units. Record what actually left the account when it differs from the
            computed amount — a bank charge, or a partial transfer. This does not change the
            payout amount or the commission rows.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-notes">Notes</Label>
          <Textarea
            id="edit-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>

        {error ? <ErrorState message={error} /> : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" disabled={update.isPending}>
            {update.isPending ? <LoaderCircle className="animate-spin" /> : null}
            Save changes
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

/**
 * Voiding returns the payout's commissions to their approved state so they can
 * be settled again. The reason is mandatory because it lands in the audit trail.
 */
export function VoidPayoutDialog({
  open,
  onOpenChange,
  payout,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payout: PartnerPayout | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Unmounted while closed, so the reason field starts empty each time. */}
        {payout ? <VoidPayoutForm payout={payout} onDone={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function VoidPayoutForm({ payout, onDone }: { payout: PartnerPayout; onDone: () => void }) {
  const voidPayout = useVoidPartnerPayout();
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  async function onConfirm() {
    setError(null);

    try {
      // The callable takes an optional reason; the console insists on one
      // because voiding is the only action that moves money back.
      await voidPayout.mutateAsync({ payoutId: payout.id, reason: reason.trim() });
      toast.success("Payout voided.");
      onDone();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Void this payout?</DialogTitle>
        <DialogDescription>
          The commissions it covers return to approved and become payable again. The payout
          record itself is kept and marked void.
        </DialogDescription>
      </DialogHeader>

      <div className="rounded-lg border border-border px-3 py-2.5">
        <p className="text-xs text-muted-foreground">{payout.partnerId}</p>
        <p className="tabular text-lg font-semibold">
          <Money minor={payout.amountMinor} currency={payout.currency} />
        </p>
        {payout.reference ? (
          <p className="text-xs text-muted-foreground">Reference {payout.reference}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="void-reason">Reason</Label>
        <Textarea
          id="void-reason"
          required
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Recorded in the audit trail"
        />
      </div>

      {error ? <ErrorState message={error} /> : null}

      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={() => void onConfirm()}
          disabled={!reason.trim() || voidPayout.isPending}
        >
          {voidPayout.isPending ? <LoaderCircle className="animate-spin" /> : null}
          Void payout
        </Button>
      </DialogFooter>
    </>
  );
}
