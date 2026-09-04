"use client";

import * as React from "react";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { useCreateReferralCode, useUpdateReferralCode } from "@/hooks/use-referrals";
import { errorMessage } from "@/lib/api/callable-error";
import { dateChange, numberChange, omitUndefined } from "@/lib/api/patch";
import { PARTNER_STATUSES, POLICY_NOTES } from "@/lib/constants";
import type { PartnerStatus } from "@/lib/constants";
import { titleCase, toDateInputValue } from "@/lib/format";
import type { ReferralCode } from "@/lib/api/types";

import { PartnerPicker } from "@/components/referrals/partner-picker";
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
import { Switch } from "@/components/ui/switch";

/**
 * Codes carry optional overrides; the plan discounts and commission rate they
 * fall back on are programme-wide. Discount *structure* (product ids, store
 * offer ids) is deliberately not editable here — it is set up alongside the
 * store products and a console typo would silently break redemption.
 */
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
      <DialogContent>
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
  const [value, setValue] = React.useState(code?.code ?? "");
  const [status, setStatus] = React.useState<PartnerStatus>(
    (code?.status as PartnerStatus) ?? "active",
  );
  const [commissionPercent, setCommissionPercent] = React.useState(
    code?.commissionPercent != null ? String(code.commissionPercent) : "",
  );
  const [maxRedemptions, setMaxRedemptions] = React.useState(
    code?.maxRedemptions != null ? String(code.maxRedemptions) : "",
  );
  const [validFrom, setValidFrom] = React.useState(toDateInputValue(code?.validFrom));
  const [validUntil, setValidUntil] = React.useState(toDateInputValue(code?.validUntil));
  const [makeDefault, setMakeDefault] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const pending = create.isPending || update.isPending;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    try {
      if (code) {
        // Keyed by `code`; the owning partner is not updatable by design.
        await update.mutateAsync({
          code: code.code,
          ...omitUndefined({
            status: code.status === status ? undefined : status,
            commissionPercent:
              numberChange(code.commissionPercent, commissionPercent) ?? undefined,
            maxRedemptions: numberChange(code.maxRedemptions, maxRedemptions),
            validFrom: dateChange(toDateInputValue(code.validFrom), validFrom),
            validUntil: dateChange(toDateInputValue(code.validUntil), validUntil),
          }),
        });
        toast.success("Referral code updated.");
      } else {
        if (!partnerId) {
          setError("Choose the partner this code belongs to.");
          return;
        }
        if (!/^[A-Za-z0-9]{3,24}$/.test(value.trim())) {
          setError("A code is 3 to 24 letters and digits, with no spaces or punctuation.");
          return;
        }

        await create.mutateAsync({
          partnerId,
          code: value.trim().toUpperCase(),
          makeDefault,
          ...omitUndefined({
            commissionPercent: commissionPercent.trim() ? Number(commissionPercent) : undefined,
            maxRedemptions: maxRedemptions.trim() ? Number(maxRedemptions) : undefined,
            validFrom: validFrom || undefined,
            validUntil: validUntil || undefined,
          }),
        });
        toast.success("Referral code created.");
      }
      onDone();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit referral code" : "New referral code"}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? "The owning partner cannot change — attribution already made from this code is permanent."
            : "The code itself is required: 3 to 24 letters and digits, stored upper-case."}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={onSubmit} className="space-y-4">
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

        {isEdit ? null : (
          <div className="space-y-2">
            <Label htmlFor="code-value">Code</Label>
            <Input
              id="code-value"
              required
              value={value}
              onChange={(event) => setValue(event.target.value.toUpperCase())}
              placeholder="SPRING25"
              className="font-mono"
              maxLength={24}
            />
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="code-commission">Commission override (%)</Label>
            <Input
              id="code-commission"
              type="number"
              min={0}
              max={100}
              step="0.01"
              className="tabular"
              value={commissionPercent}
              onChange={(event) => setCommissionPercent(event.target.value)}
              placeholder="Partner default"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="code-max">Maximum redemptions</Label>
            <Input
              id="code-max"
              type="number"
              min={1}
              className="tabular"
              value={maxRedemptions}
              onChange={(event) => setMaxRedemptions(event.target.value)}
              placeholder="Unlimited"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
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
            <p className="text-xs text-muted-foreground">
              An active code is still unusable once it is past its end date or has hit its
              redemption cap.
            </p>
          </div>
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

        <PolicyNote>
          Discounts and the commission rate come from the programme configuration unless this
          code overrides the rate above. {POLICY_NOTES.oneDiscount}
        </PolicyNote>

        {error ? <ErrorState message={error} /> : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone}>
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
