"use client";

import * as React from "react";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { useCreatePartner, useUpdatePartner } from "@/hooks/use-referrals";
import { mutationMessage } from "@/lib/api/callable-error";
import { omitUndefined, textChange } from "@/lib/api/patch";
import {
  emptyPlanDiscountsForm,
  planDiscountsToForm,
  planDiscountsToPayload,
  validatePlanDiscounts,
  type PlanDiscountForm,
  type PlanDiscountsForm,
} from "@/lib/api/plan-discounts";
import {
  COMMISSION_BASES,
  DEFAULT_COMMISSION_BASE,
  DEFAULT_COMMISSION_PERCENT,
  DEFAULT_OFFERING_ID,
  FIELD_LIMITS,
  POLICY_NOTES,
} from "@/lib/constants";
import type { CommissionBase, DiscountPlan } from "@/lib/constants";
import { titleCase } from "@/lib/format";
import type { Partner } from "@/lib/api/types";

import { PlanDiscountFields } from "@/components/referrals/plan-discount-fields";
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

export function PartnerFormDialog({
  open,
  onOpenChange,
  partner,
  defaultPercents,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partner?: Partner | null;
  defaultPercents?: Record<string, number>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        {/* Unmounted while closed, so the form seeds from `partner` on open. */}
        <PartnerForm
          partner={partner ?? null}
          defaultPercents={defaultPercents}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

function PartnerForm({
  partner,
  defaultPercents,
  onDone,
}: {
  partner: Partner | null;
  defaultPercents?: Record<string, number>;
  onDone: () => void;
}) {
  const create = useCreatePartner();
  const update = useUpdatePartner();
  const isEdit = Boolean(partner);

  const [name, setName] = React.useState(partner?.name ?? "");
  const [companyName, setCompanyName] = React.useState(partner?.companyName ?? "");
  const [contactEmail, setContactEmail] = React.useState(partner?.contactEmail ?? "");
  const [contactPhone, setContactPhone] = React.useState(partner?.contactPhone ?? "");
  const [notes, setNotes] = React.useState(partner?.notes ?? "");

  const [commissionPercent, setCommissionPercent] = React.useState(
    partner ? String(partner.commissionPercent) : String(DEFAULT_COMMISSION_PERCENT),
  );
  const [commissionBase, setCommissionBase] = React.useState<CommissionBase>(
    partner?.commissionBase ?? DEFAULT_COMMISSION_BASE,
  );

  const [discounts, setDiscounts] = React.useState<PlanDiscountsForm>(() =>
    partner
      ? planDiscountsToForm(partner.planDiscounts, defaultPercents)
      : emptyPlanDiscountsForm(defaultPercents),
  );

  const [offeringId, setOfferingId] = React.useState(partner?.offeringId ?? "");
  const [payoutMethod, setPayoutMethod] = React.useState(partner?.payoutMethod ?? "");
  const [payoutDetails, setPayoutDetails] = React.useState(partner?.payoutDetails ?? "");

  // Create-only: currency is fixed after creation because balances are keyed by
  // it, and the first code is a convenience the create callable offers.
  const [primaryCurrency, setPrimaryCurrency] = React.useState("INR");
  const [firstCode, setFirstCode] = React.useState("");

  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const pending = create.isPending || update.isPending;

  function onDiscountChange(plan: DiscountPlan, field: keyof PlanDiscountForm, next: string) {
    setDiscounts((current) => ({ ...current, [plan]: { ...current[plan], [field]: next } }));
    setFieldErrors((current) => {
      if (!current[`${plan}.${field}`]) return current;
      const next = { ...current };
      delete next[`${plan}.${field}`];
      return next;
    });
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      // updatePartner ignores an empty name rather than clearing it, so an
      // empty box would silently no-op. Stop it here.
      setError("A partner needs a name.");
      return;
    }

    const percent = Number(commissionPercent.trim());
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      // The server clamps with a fallback of 0, so garbage would quietly become
      // a zero-commission partner rather than an error.
      setError("Commission must be a percentage between 0 and 100.");
      return;
    }

    const discountErrors = validatePlanDiscounts(discounts);
    if (Object.keys(discountErrors).length > 0) {
      setFieldErrors(discountErrors);
      setError("Check the highlighted discount fields.");
      return;
    }
    setFieldErrors({});

    // Always the complete set: the server merges per field, so anything omitted
    // keeps its stored value and could never be cleared.
    const planDiscounts = planDiscountsToPayload(discounts);

    try {
      if (partner) {
        await update.mutateAsync({
          partnerId: partner.id,
          name: trimmedName,
          commissionPercent: percent,
          commissionBase,
          planDiscounts,
          ...omitUndefined({
            companyName: textChange(partner.companyName, companyName),
            contactEmail: textChange(partner.contactEmail, contactEmail),
            contactPhone: textChange(partner.contactPhone, contactPhone),
            notes: textChange(partner.notes, notes),
            offeringId: textChange(partner.offeringId, offeringId),
            payoutMethod: textChange(partner.payoutMethod, payoutMethod),
            payoutDetails: textChange(partner.payoutDetails, payoutDetails),
          }),
        });
        toast.success("Partner updated.");
        onDone();
      } else {
        const result = await create.mutateAsync({
          name: trimmedName,
          commissionPercent: percent,
          commissionBase,
          primaryCurrency: primaryCurrency.trim().toUpperCase() || "INR",
          planDiscounts,
          ...omitUndefined({
            companyName: companyName.trim() || undefined,
            contactEmail: contactEmail.trim() || undefined,
            contactPhone: contactPhone.trim() || undefined,
            notes: notes.trim() || undefined,
            offeringId: offeringId.trim() || undefined,
            payoutMethod: payoutMethod.trim() || undefined,
            payoutDetails: payoutDetails.trim() || undefined,
            code: firstCode.trim().toUpperCase() || undefined,
          }),
        });

        if (result.referralLink) {
          await navigator.clipboard.writeText(result.referralLink).catch(() => undefined);
          toast.success(`Partner created. Referral link copied: ${result.referralLink}`);
        } else {
          toast.success("Partner created.");
        }
        onDone();
      }
    } catch (caught) {
      setError(mutationMessage(caught));
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit partner" : "New partner"}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? "Status lives on the partner page, and the currency is fixed after creation."
            : "The currency is fixed once created, because balances are keyed by it."}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={onSubmit} className="space-y-6">
        <Section title="Partner">
          <div className="space-y-2">
            <Label htmlFor="partner-name">Name</Label>
            <Input
              id="partner-name"
              required
              maxLength={FIELD_LIMITS.partnerName}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="partner-company">Company name</Label>
            <Input
              id="partner-company"
              maxLength={FIELD_LIMITS.companyName}
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="partner-email">Contact email</Label>
              <Input
                id="partner-email"
                type="email"
                maxLength={FIELD_LIMITS.contactEmail}
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="partner-phone">Contact phone</Label>
              <Input
                id="partner-phone"
                maxLength={FIELD_LIMITS.contactPhone}
                value={contactPhone}
                onChange={(event) => setContactPhone(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="partner-notes">Notes</Label>
            <Textarea
              id="partner-notes"
              maxLength={FIELD_LIMITS.notes}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
        </Section>

        <Section title="Commission">
          <div className="grid gap-4 sm:grid-cols-2">
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
              <p className="text-xs text-muted-foreground">
                Applies to every successful transaction, renewals included.
              </p>
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
          </div>
        </Section>

        <Section title="First-payment discounts">
          <PlanDiscountFields
            value={discounts}
            errors={fieldErrors}
            onChange={onDiscountChange}
            disabled={pending}
          />
          <PolicyNote>{POLICY_NOTES.planDiscountsFullSend}</PolicyNote>
        </Section>

        <Section title="RevenueCat">
          <div className="space-y-2">
            <Label htmlFor="partner-offering">Offering id</Label>
            <Input
              id="partner-offering"
              maxLength={FIELD_LIMITS.offeringId}
              value={offeringId}
              onChange={(event) => setOfferingId(event.target.value)}
              placeholder={DEFAULT_OFFERING_ID}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Blank uses the programme default,{" "}
              <code className="font-mono">{DEFAULT_OFFERING_ID}</code>.
            </p>
          </div>
        </Section>

        <Section title="Payout details">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="partner-method">Payout method</Label>
              <Input
                id="partner-method"
                maxLength={FIELD_LIMITS.payoutMethod}
                value={payoutMethod}
                onChange={(event) => setPayoutMethod(event.target.value)}
                placeholder="Bank transfer"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="partner-payout">Payout details</Label>
              <Input
                id="partner-payout"
                maxLength={FIELD_LIMITS.payoutDetails}
                value={payoutDetails}
                onChange={(event) => setPayoutDetails(event.target.value)}
                placeholder="Account or UPI id"
              />
            </div>
          </div>
        </Section>

        {isEdit ? null : (
          <Section title="Currency and first code">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="partner-currency">Primary currency</Label>
                <Input
                  id="partner-currency"
                  value={primaryCurrency}
                  onChange={(event) => setPrimaryCurrency(event.target.value.toUpperCase())}
                  maxLength={3}
                  className="uppercase"
                />
                <p className="text-xs text-muted-foreground">
                  Fixed after creation — balances are keyed by it.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="partner-first-code">First referral code</Label>
                <Input
                  id="partner-first-code"
                  value={firstCode}
                  onChange={(event) => setFirstCode(event.target.value.toUpperCase())}
                  maxLength={FIELD_LIMITS.referralCode}
                  placeholder="Optional"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Created in the same call; the link is copied to your clipboard.
                </p>
              </div>
            </div>
          </Section>
        )}

        {error ? <ErrorState message={error} /> : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
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
