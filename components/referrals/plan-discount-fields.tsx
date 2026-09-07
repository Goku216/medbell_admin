"use client";

import { cn } from "@/lib/utils";
import {
  DEFAULT_LIFETIME_PRODUCT_ID,
  DISCOUNT_PLAN_ORDER,
  FIELD_LIMITS,
  PLANS_WITH_IOS_OFFER,
  PLAN_LABELS,
  type DiscountPlan,
} from "@/lib/constants";
import type { PlanDiscountForm, PlanDiscountsForm } from "@/lib/api/plan-discounts";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * First-payment discount cards, one per plan.
 *
 * These fields are the mechanism, not metadata: the app never computes a
 * discount, it asks the store for a named offer. A blank or wrong id means the
 * discount simply does not appear on that platform.
 */
export function PlanDiscountFields({
  value,
  errors,
  onChange,
  disabled,
}: {
  value: PlanDiscountsForm;
  errors: Record<string, string>;
  onChange: (plan: DiscountPlan, field: keyof PlanDiscountForm, next: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-3">
      {DISCOUNT_PLAN_ORDER.map((plan) => (
        <PlanCard
          key={plan}
          plan={plan}
          value={value[plan]}
          errors={errors}
          onChange={onChange}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

function PlanCard({
  plan,
  value,
  errors,
  onChange,
  disabled,
}: {
  plan: DiscountPlan;
  value: PlanDiscountForm;
  errors: Record<string, string>;
  onChange: (plan: DiscountPlan, field: keyof PlanDiscountForm, next: string) => void;
  disabled?: boolean;
}) {
  const showIosOffer = PLANS_WITH_IOS_OFFER.includes(plan);
  const percentError = errors[`${plan}.percent`];

  return (
    <fieldset
      className="space-y-4 rounded-lg border border-border px-4 py-3.5"
      disabled={disabled}
    >
      <legend className="px-1 text-sm font-medium">{PLAN_LABELS[plan]}</legend>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor={`${plan}-percent`}>Discount on the first payment</Label>
          <span className="tabular text-sm font-medium">{value.percent || "0"}%</span>
        </div>

        <input
          id={`${plan}-percent`}
          type="range"
          min={0}
          max={100}
          step={1}
          value={Number(value.percent) || 0}
          onChange={(event) => onChange(plan, "percent", event.target.value)}
          className="w-full accent-[var(--primary)]"
          aria-describedby={`${plan}-renewal-note`}
        />

        <p id={`${plan}-renewal-note`} className="text-xs text-muted-foreground">
          First payment only. Renewals are charged at full price, and commission still applies
          to them.
        </p>

        {percentError ? <FieldError>{percentError}</FieldError> : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StoreField
          id={`${plan}-android`}
          label="Play offer id"
          hint="Lowercase letters, digits and hyphens."
          placeholder="referral-first-month-50"
          maxLength={FIELD_LIMITS.androidOfferId}
          value={value.androidOfferId}
          error={errors[`${plan}.androidOfferId`]}
          onChange={(next) => onChange(plan, "androidOfferId", next)}
        />

        <StoreField
          id={`${plan}-ios-product`}
          label="App Store product id"
          hint={
            plan === "lifetime"
              ? `Lifetime's iOS discount is a separate product. Blank uses ${DEFAULT_LIFETIME_PRODUCT_ID}.`
              : "Optional. A separate App Store product, if one is used."
          }
          placeholder={plan === "lifetime" ? DEFAULT_LIFETIME_PRODUCT_ID : ""}
          maxLength={FIELD_LIMITS.iosProductId}
          value={value.iosProductId}
          error={errors[`${plan}.iosProductId`]}
          onChange={(next) => onChange(plan, "iosProductId", next)}
        />

        {showIosOffer ? (
          <StoreField
            id={`${plan}-ios-offer`}
            label="App Store promotional offer id"
            hint="Letters, digits, dots and underscores. Without it, iOS shows no referral discount for this plan."
            placeholder="referral_first_month_50"
            maxLength={FIELD_LIMITS.iosOfferId}
            value={value.iosOfferId}
            error={errors[`${plan}.iosOfferId`]}
            onChange={(next) => onChange(plan, "iosOfferId", next)}
          />
        ) : (
          <p className="self-end text-xs text-muted-foreground sm:col-span-1">
            No App Store promotional offer: lifetime is a non-consumable, and the App Store has
            none for those. The separate product above is its iOS discount.
          </p>
        )}

        <StoreField
          id={`${plan}-products`}
          label="Discounted product ids"
          hint={`Comma separated, up to ${FIELD_LIMITS.discountedProductIds}.`}
          placeholder=""
          value={value.discountedProductIds}
          error={errors[`${plan}.discountedProductIds`]}
          onChange={(next) => onChange(plan, "discountedProductIds", next)}
          className={showIosOffer ? "sm:col-span-2" : undefined}
        />
      </div>
    </fieldset>
  );
}

function StoreField({
  id,
  label,
  hint,
  placeholder,
  value,
  error,
  onChange,
  maxLength,
  className,
}: {
  id: string;
  label: string;
  hint: string;
  placeholder?: string;
  value: string;
  error?: string;
  onChange: (next: string) => void;
  maxLength?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={`${id}-hint`}
        className="font-mono text-xs"
      />
      {error ? (
        <FieldError>{error}</FieldError>
      ) : (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="text-xs text-destructive">
      {children}
    </p>
  );
}
