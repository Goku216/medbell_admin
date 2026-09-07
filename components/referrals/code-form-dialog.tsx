"use client";

import * as React from "react";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import {
  useCreateReferralCode,
  usePartnerAnalytics,
  useUpdateReferralCode,
} from "@/hooks/use-referrals";
import { mutationMessage } from "@/lib/api/callable-error";
import { dateChange, numberChange, omitUndefined } from "@/lib/api/patch";
import {
  planDiscountsToForm,
  planDiscountsToPayload,
  validatePlanDiscounts,
  type PlanDiscountForm,
  type PlanDiscountsForm,
} from "@/lib/api/plan-discounts";
import {
  DEFAULT_OFFERING_ID,
  FIELD_LIMITS,
  MAX_REDEMPTIONS_LIMIT,
  PARTNER_STATUSES,
  POLICY_NOTES,
} from "@/lib/constants";
import type { DiscountPlan, PartnerStatus } from "@/lib/constants";
import { formatNumber, titleCase, toDateInputValue } from "@/lib/format";
import type { ReferralCode } from "@/lib/api/types";

import { PartnerPicker } from "@/components/referrals/partner-picker";
import { PlanDiscountFields } from "@/components/referrals/plan-discount-fields";
import { PolicyNote } from "@/components/common/policy-note";
import { ErrorState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Switch } from "@/components/ui/switch";

export function CodeFormDialog({
  open,
  onOpenChange,
  code,
  defaultPartnerId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  code?: ReferralCode | null;
  defaultPartnerId?: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        {/* Unmounted while closed, so the form seeds from props on open. */}
        <CodeForm
          code={code ?? null}
          defaultPartnerId={defaultPartnerId ?? null}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function CodeForm({
  code,
  defaultPartnerId,
  onDone,
}: {
  code: ReferralCode | null;
  defaultPartnerId: string | null;
  onDone: () => void;
}) {
  const create = useCreateReferralCode();
  const update = useUpdateReferralCode();
  const isEdit = Boolean(code);

  const [partnerId, setPartnerId] = React.useState<string | null>(
    code?.partnerId ?? defaultPartnerId,
  );

  // Resolved partner values, so the form can show what a plan inherits rather
  // than leaving the operator to guess what "no override" means.
  const analytics = usePartnerAnalytics(partnerId);
  const inherited = analytics.data;

  const [value, setValue] = React.useState(code?.code ?? "");
  const [status, setStatus] = React.useState<PartnerStatus>(
    (code?.status as PartnerStatus) ?? "active",
  );

  const [overrideCommission, setOverrideCommission] = React.useState(
    code?.commissionPercent != null,
  );
  const [commissionPercent, setCommissionPercent] = React.useState(
    code?.commissionPercent != null ? String(code.commissionPercent) : "",
  );

  const [overrideDiscounts, setOverrideDiscounts] = React.useState(
    Boolean(code?.planDiscounts),
  );
  const [discounts, setDiscounts] = React.useState<PlanDiscountsForm>(() =>
    planDiscountsToForm(code?.planDiscounts, undefined),
  );
  const [seededFromPartner, setSeededFromPartner] = React.useState(
    Boolean(code?.planDiscounts),
  );

  const [offeringId, setOfferingId] = React.useState(code?.offeringId ?? "");
  const [maxRedemptions, setMaxRedemptions] = React.useState(
    code?.maxRedemptions != null ? String(code.maxRedemptions) : "",
  );
  const [validFrom, setValidFrom] = React.useState(toDateInputValue(code?.validFrom));
  const [validUntil, setValidUntil] = React.useState(toDateInputValue(code?.validUntil));
  const [makeDefault, setMakeDefault] = React.useState(false);

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

  /**
   * Turning overrides on seeds the fields from the partner's resolved values,
   * so switching it on and saving reproduces current behaviour rather than
   * blanking the store ids and silently killing the discount.
   */
  function onToggleOverrides(next: boolean) {
    setOverrideDiscounts(next);
    if (next && !seededFromPartner && inherited?.planDiscounts) {
      setDiscounts(planDiscountsToForm(inherited.planDiscounts, undefined));
      setSeededFromPartner(true);
    }
  }

  function validateShared(): string | null {
    if (overrideCommission) {
      const percent = Number(commissionPercent.trim());
      if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
        return "The commission override must be a percentage between 0 and 100.";
      }
    }

    if (maxRedemptions.trim()) {
      const max = Number(maxRedemptions.trim());
      if (!Number.isInteger(max) || max < 1 || max > MAX_REDEMPTIONS_LIMIT) {
        return `Maximum redemptions must be a whole number between 1 and ${formatNumber(MAX_REDEMPTIONS_LIMIT)}.`;
      }
    }

    if (overrideDiscounts) {
      const discountErrors = validatePlanDiscounts(discounts);
      if (Object.keys(discountErrors).length > 0) {
        setFieldErrors(discountErrors);
        return "Check the highlighted discount fields.";
      }
    }

    setFieldErrors({});
    return null;
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const invalid = validateShared();
    if (invalid) {
      setError(invalid);
      return;
    }

    try {
      if (code) {
        await update.mutateAsync({
          code: code.code,
          ...omitUndefined({
            status: code.status === status ? undefined : status,
            offeringId: (() => {
              const before = code.offeringId ?? null;
              const after = offeringId.trim() || null;
              return before === after ? undefined : after;
            })(),
            maxRedemptions: numberChange(code.maxRedemptions, maxRedemptions),
            validFrom: dateChange(toDateInputValue(code.validFrom), validFrom),
            validUntil: dateChange(toDateInputValue(code.validUntil), validUntil),
          }),
          // Both overrides are explicit three-state fields: a value sets it,
          // null clears it back to inheriting. Omitting would preserve.
          commissionPercent: overrideCommission ? Number(commissionPercent.trim()) : null,
          planDiscounts: overrideDiscounts ? planDiscountsToPayload(discounts) : null,
        });
        toast.success("Referral code updated.");
        onDone();
      } else {
        if (!partnerId) {
          setError("Choose the partner this code belongs to.");
          return;
        }
        if (!/^[A-Za-z0-9]{3,24}$/.test(value.trim())) {
          setError("A code is 3 to 24 letters and digits, with no spaces or punctuation.");
          return;
        }

        const result = await create.mutateAsync({
          partnerId,
          code: value.trim().toUpperCase(),
          makeDefault,
          ...omitUndefined({
            commissionPercent: overrideCommission
              ? Number(commissionPercent.trim())
              : undefined,
            planDiscounts: overrideDiscounts ? planDiscountsToPayload(discounts) : undefined,
            offeringId: offeringId.trim() || undefined,
            maxRedemptions: maxRedemptions.trim() ? Number(maxRedemptions) : undefined,
            validFrom: validFrom || undefined,
            validUntil: validUntil || undefined,
          }),
        });

        // The app copies the link on create; match that so the operator can
        // paste it straight into wherever it is going.
        await navigator.clipboard.writeText(result.referralLink).catch(() => undefined);
        toast.success(`Code ${result.code} created. Link copied: ${result.referralLink}`);
        onDone();
      }
    } catch (caught) {
      setError(mutationMessage(caught));
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit referral code" : "New referral code"}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? "The owning partner cannot change — moving a code would re-point every future renewal commission."
            : "The code is required: 3 to 24 letters and digits, stored upper-case."}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={onSubmit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="code-partner">Partner</Label>
            {isEdit ? (
              <Input id="code-partner" value={code?.partnerId ?? ""} disabled />
            ) : (
              <PartnerPicker
                id="code-partner"
                value={partnerId}
                onChange={setPartnerId}
                placeholder="Choose a partner"
                includeAll={false}
                className="w-full"
              />
            )}
          </div>

          {isEdit ? (
            <div className="space-y-2">
              <Label htmlFor="code-status">Status</Label>
              <Select value={status} onValueChange={(next) => setStatus(next as PartnerStatus)}>
                <SelectTrigger id="code-status">
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
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="code-value">Code</Label>
              <Input
                id="code-value"
                required
                value={value}
                onChange={(event) => setValue(event.target.value.toUpperCase())}
                placeholder="SPRING25"
                className="font-mono"
                maxLength={FIELD_LIMITS.referralCode}
              />
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-lg border border-border px-4 py-3.5">
          <div className="flex items-start gap-2.5">
            <Checkbox
              id="code-override-commission"
              checked={overrideCommission}
              onCheckedChange={(next) => setOverrideCommission(next === true)}
              className="mt-0.5"
            />
            <div className="space-y-0.5">
              <Label htmlFor="code-override-commission">Override the commission rate</Label>
              <p className="text-xs text-muted-foreground">
                {overrideCommission
                  ? "Pinned to this code, even if the partner's rate changes later."
                  : `Inheriting ${inherited ? `${inherited.commissionPercent}%` : "the partner's rate"}.`}
              </p>
            </div>
          </div>

          {overrideCommission ? (
            <Input
              type="number"
              min={0}
              max={100}
              step="0.01"
              className="tabular sm:max-w-40"
              value={commissionPercent}
              onChange={(event) => setCommissionPercent(event.target.value)}
              aria-label="Commission override percentage"
            />
          ) : null}
        </div>

        <div className="space-y-3 rounded-lg border border-border px-4 py-3.5">
          <div className="flex items-start gap-2.5">
            <Checkbox
              id="code-override-discounts"
              checked={overrideDiscounts}
              onCheckedChange={(next) => onToggleOverrides(next === true)}
              className="mt-0.5"
            />
            <div className="space-y-0.5">
              <Label htmlFor="code-override-discounts">Override the discounts</Label>
              <p className="text-xs text-muted-foreground">
                {overrideDiscounts
                  ? "Seeded from the partner's resolved values so nothing is lost by switching this on."
                  : "Inheriting the partner's discounts, so a later change to the partner follows through."}
              </p>
            </div>
          </div>

          {overrideDiscounts ? (
            <>
              <PlanDiscountFields
                value={discounts}
                errors={fieldErrors}
                onChange={onDiscountChange}
                disabled={pending}
              />
              <PolicyNote>
                Overrides are all-or-nothing on this code: the backend merges per field, so a
                single plan cannot be returned to inheriting on its own. Clearing the checkbox
                above clears every plan at once.
              </PolicyNote>
            </>
          ) : (
            <PolicyNote variant="locked">{POLICY_NOTES.codeOverride}</PolicyNote>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="code-offering">Offering id</Label>
            <Input
              id="code-offering"
              maxLength={FIELD_LIMITS.offeringId}
              value={offeringId}
              onChange={(event) => setOfferingId(event.target.value)}
              placeholder={DEFAULT_OFFERING_ID}
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="code-max">Maximum redemptions</Label>
            <Input
              id="code-max"
              type="number"
              min={1}
              max={MAX_REDEMPTIONS_LIMIT}
              className="tabular"
              value={maxRedemptions}
              onChange={(event) => setMaxRedemptions(event.target.value)}
              placeholder="Unlimited"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="code-from">Valid from</Label>
            <Input
              id="code-from"
              type="date"
              value={validFrom}
              onChange={(event) => setValidFrom(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="code-until">Valid until</Label>
            <Input
              id="code-until"
              type="date"
              value={validUntil}
              onChange={(event) => setValidUntil(event.target.value)}
            />
          </div>
        </div>

        {isEdit ? (
          <p className="text-xs text-muted-foreground">
            A code stays unusable while it is past its end date or at its redemption cap, even
            with an active status.
          </p>
        ) : (
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <div className="space-y-0.5">
              <Label htmlFor="code-default">Make this the default code</Label>
              <p className="text-xs text-muted-foreground">
                The default code backs the partner&rsquo;s referral link.
              </p>
            </div>
            <Switch id="code-default" checked={makeDefault} onCheckedChange={setMakeDefault} />
          </div>
        )}

        {error ? <ErrorState message={error} /> : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? <LoaderCircle className="animate-spin" /> : null}
            {isEdit ? "Save changes" : "Create code"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
