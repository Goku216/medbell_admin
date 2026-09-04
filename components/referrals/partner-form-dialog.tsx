"use client";

import * as React from "react";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { useCreatePartner, useUpdatePartner } from "@/hooks/use-referrals";
import { errorMessage } from "@/lib/api/callable-error";
import { numberChange, omitUndefined, requiredTextChange, textChange } from "@/lib/api/patch";
import {
  COMMISSION_BASES,
  DEFAULT_COMMISSION_PERCENT,
  PARTNER_STATUSES,
  PAYOUT_METHODS,
} from "@/lib/constants";
import type { CommissionBase, PartnerStatus } from "@/lib/constants";
import { titleCase } from "@/lib/format";
import type { Partner } from "@/lib/api/types";

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

export function PartnerFormDialog({
  open,
  onOpenChange,
  partner,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partner?: Partner | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Unmounted while closed, so the form seeds from `partner` on open. */}
        <PartnerForm partner={partner ?? null} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function PartnerForm({ partner, onDone }: { partner: Partner | null; onDone: () => void }) {
  const create = useCreatePartner();
  const update = useUpdatePartner();
  const isEdit = Boolean(partner);

  const [name, setName] = React.useState(partner?.name ?? "");
  const [contactEmail, setContactEmail] = React.useState(partner?.contactEmail ?? "");
  const [contactPhone, setContactPhone] = React.useState(partner?.contactPhone ?? "");
  const [companyName, setCompanyName] = React.useState(partner?.companyName ?? "");
  const [payoutMethod, setPayoutMethod] = React.useState(
    partner?.payoutMethod ?? "bank_transfer",
  );
  const [payoutDetails, setPayoutDetails] = React.useState(partner?.payoutDetails ?? "");
  const [notes, setNotes] = React.useState(partner?.notes ?? "");
  const [commissionPercent, setCommissionPercent] = React.useState(
    partner ? String(partner.commissionPercent) : String(DEFAULT_COMMISSION_PERCENT),
  );
  const [commissionBase, setCommissionBase] = React.useState<CommissionBase>(
    partner?.commissionBase ?? "gross",
  );
  const [primaryCurrency, setPrimaryCurrency] = React.useState(
    partner?.primaryCurrency ?? "INR",
  );
  const [status, setStatus] = React.useState<PartnerStatus>(
    (partner?.status as PartnerStatus) ?? "active",
  );
  const [error, setError] = React.useState<string | null>(null);

  const pending = create.isPending || update.isPending;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const percent = commissionPercent.trim() ? Number(commissionPercent) : null;
    if (percent !== null && (!Number.isFinite(percent) || percent < 0 || percent > 100)) {
      setError("Commission must be a percentage between 0 and 100.");
      return;
    }

    try {
      if (partner) {
        // A patch, not a snapshot: keys the operator did not touch are omitted
        // so the callable leaves them alone, and an emptied field sends null to
        // clear it deliberately.
        await update.mutateAsync({
          partnerId: partner.id,
          ...omitUndefined({
            name: requiredTextChange(partner.name, name),
            companyName: textChange(partner.companyName, companyName),
            contactEmail: textChange(partner.contactEmail, contactEmail),
            contactPhone: textChange(partner.contactPhone, contactPhone),
            notes: textChange(partner.notes, notes),
            payoutMethod: textChange(partner.payoutMethod, payoutMethod),
            payoutDetails: textChange(partner.payoutDetails, payoutDetails),
            commissionPercent:
              numberChange(partner.commissionPercent, commissionPercent) ?? undefined,
            commissionBase:
              partner.commissionBase === commissionBase ? undefined : commissionBase,
            primaryCurrency: requiredTextChange(partner.primaryCurrency, primaryCurrency),
            status: partner.status === status ? undefined : status,
          }),
        });
        toast.success("Partner updated.");
      } else {
        await create.mutateAsync({
          name: name.trim(),
          commissionBase,
          primaryCurrency: primaryCurrency.trim() || "INR",
          ...omitUndefined({
            companyName: companyName.trim() || undefined,
            contactEmail: contactEmail.trim() || undefined,
            contactPhone: contactPhone.trim() || undefined,
            notes: notes.trim() || undefined,
            payoutMethod: payoutMethod.trim() || undefined,
            payoutDetails: payoutDetails.trim() || undefined,
            commissionPercent: percent ?? undefined,
          }),
        });
        toast.success("Partner created.");
      }
      onDone();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit partner" : "New partner"}</DialogTitle>
        <DialogDescription>
          Commission is fixed at {DEFAULT_COMMISSION_PERCENT}% of every successful transaction,
          renewals included, and is calculated server-side.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="partner-name">Name</Label>
          <Input
            id="partner-name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="partner-email">Contact email</Label>
            <Input
              id="partner-email"
              type="email"
              value={contactEmail}
              onChange={(event) => setContactEmail(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="partner-phone">Contact phone</Label>
            <Input
              id="partner-phone"
              value={contactPhone}
              onChange={(event) => setContactPhone(event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="partner-company">Company name</Label>
          <Input
            id="partner-company"
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="partner-method">Payout method</Label>
            <Select value={payoutMethod} onValueChange={setPayoutMethod}>
              <SelectTrigger id="partner-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYOUT_METHODS.map((method) => (
                  <SelectItem key={method} value={method}>
                    {titleCase(method)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="partner-details">Payout details</Label>
            <Input
              id="partner-details"
              value={payoutDetails}
              onChange={(event) => setPayoutDetails(event.target.value)}
              placeholder="Account or UPI id"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="partner-notes">Notes</Label>
          <Textarea
            id="partner-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="partner-commission">Commission (%)</Label>
            <Input
              id="partner-commission"
              type="number"
              min={0}
              max={100}
              step="0.01"
              className="tabular"
              value={commissionPercent}
              onChange={(event) => setCommissionPercent(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="partner-base">Commission base</Label>
            <Select
              value={commissionBase}
              onValueChange={(next) => setCommissionBase(next as CommissionBase)}
            >
              <SelectTrigger id="partner-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMMISSION_BASES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {titleCase(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="partner-currency">Primary currency</Label>
            <Input
              id="partner-currency"
              value={primaryCurrency}
              onChange={(event) => setPrimaryCurrency(event.target.value.toUpperCase())}
              maxLength={3}
              className="uppercase"
            />
          </div>
        </div>

        {partner ? (
          <div className="space-y-2">
            <Label htmlFor="partner-status">Status</Label>
            <Select value={status} onValueChange={(next) => setStatus(next as PartnerStatus)}>
              <SelectTrigger id="partner-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PARTNER_STATUSES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {titleCase(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Setting a partner inactive also deactivates every one of their codes.
            </p>
          </div>
        ) : null}

        {error ? <ErrorState message={error} /> : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? <LoaderCircle className="animate-spin" /> : null}
            {isEdit ? "Save changes" : "Create partner"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
