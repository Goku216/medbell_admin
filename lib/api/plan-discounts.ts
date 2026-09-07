import {
  DISCOUNT_PLAN_ORDER,
  FIELD_LIMITS,
  PLANS_WITH_IOS_OFFER,
  type DiscountPlan,
} from "@/lib/constants";
import type { PlanDiscount } from "@/lib/api/types";

/**
 * The store-identifier fields are the mechanism, not metadata: the app never
 * computes a discount, it asks the store for a named offer. A blank or wrong
 * `iosOfferId` means iOS shows no referral discount at all.
 *
 * Everything here is pure so the rules can be tested directly.
 */

export type PlanDiscountForm = {
  percent: string;
  androidOfferId: string;
  iosProductId: string;
  iosOfferId: string;
  discountedProductIds: string;
};

export type PlanDiscountsForm = Record<DiscountPlan, PlanDiscountForm>;

const EMPTY_PLAN: PlanDiscountForm = {
  percent: "",
  androidOfferId: "",
  iosProductId: "",
  iosOfferId: "",
  discountedProductIds: "",
};

/* -------------------------------------------------------- identifier rules */

/**
 * The two stores disagree, and the character sets are mutually exclusive. An
 * operator who pastes a Play id into the Apple field gets a form that saves
 * fine and a discount that never appears — the most expensive failure mode in
 * the system, so each field is checked against its own rule.
 */
const ANDROID_OFFER_ID = /^[a-z0-9-]+$/;
const IOS_OFFER_ID = /^[A-Za-z0-9._]+$/;

export function validateAndroidOfferId(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.length > FIELD_LIMITS.androidOfferId) {
    return `Play offer ids are at most ${FIELD_LIMITS.androidOfferId} characters.`;
  }
  if (trimmed.includes("_")) {
    return "Play offer ids use hyphens, not underscores — this looks like an App Store id.";
  }
  if (!ANDROID_OFFER_ID.test(trimmed)) {
    return "Play offer ids use lowercase letters, digits and hyphens only.";
  }
  return null;
}

export function validateIosOfferId(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.length > FIELD_LIMITS.iosOfferId) {
    return `App Store offer ids are at most ${FIELD_LIMITS.iosOfferId} characters.`;
  }
  if (trimmed.includes("-")) {
    return "App Store offer ids use underscores, not hyphens — this looks like a Play id.";
  }
  if (!IOS_OFFER_ID.test(trimmed)) {
    return "App Store offer ids use letters, digits, dots and underscores only.";
  }
  return null;
}

export function validateIosProductId(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.length > FIELD_LIMITS.iosProductId) {
    return `App Store product ids are at most ${FIELD_LIMITS.iosProductId} characters.`;
  }
  if (/\s/.test(trimmed)) return "App Store product ids contain no spaces.";
  return null;
}

export function validatePercent(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    return "A discount is a percentage between 0 and 100.";
  }
  return null;
}

/* --------------------------------------------------- product id list field */

/** Splits on commas, trims, drops empties, caps at the server's 20. */
export function parseProductIds(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, FIELD_LIMITS.discountedProductIds);
}

export function formatProductIds(ids: string[] | null | undefined): string {
  return (ids ?? []).join(", ");
}

export function validateProductIds(value: string): string | null {
  const entries = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (entries.length > FIELD_LIMITS.discountedProductIds) {
    return `At most ${FIELD_LIMITS.discountedProductIds} product ids; the rest would be dropped.`;
  }
  return null;
}

/* ---------------------------------------------------------- form <-> wire */

function toFormValue(value: string | null | undefined): string {
  return value ?? "";
}

/** Seeds the form from stored values, falling back to programme defaults. */
export function planDiscountsToForm(
  stored: Record<string, PlanDiscount> | null | undefined,
  defaultPercents: Record<string, number> | undefined,
): PlanDiscountsForm {
  const form = {} as PlanDiscountsForm;

  for (const plan of DISCOUNT_PLAN_ORDER) {
    const discount = stored?.[plan];
    form[plan] = {
      ...EMPTY_PLAN,
      percent:
        discount?.percent != null
          ? String(discount.percent)
          : defaultPercents?.[plan] != null
            ? String(defaultPercents[plan])
            : "",
      androidOfferId: toFormValue(discount?.androidOfferId),
      iosProductId: toFormValue(discount?.iosProductId),
      iosOfferId: toFormValue(discount?.iosOfferId),
      discountedProductIds: formatProductIds(discount?.discountedProductIds),
    };
  }

  return form;
}

export function emptyPlanDiscountsForm(
  defaultPercents?: Record<string, number>,
): PlanDiscountsForm {
  return planDiscountsToForm(null, defaultPercents);
}

/**
 * Builds the wire payload.
 *
 * The server merges per key: an absent plan keeps its whole stored value, an
 * absent field keeps its stored value, and only an explicit "" or null clears
 * one. So this deliberately sends **all three plans with all five fields** on
 * every save. A payload of only-what-changed would appear to work and would
 * quietly never clear anything.
 *
 * `discountedProductIds` is the exception — an array always replaces — but it
 * is sent unconditionally too, for the same predictability.
 */
export function planDiscountsToPayload(
  form: PlanDiscountsForm,
): Record<DiscountPlan, PlanDiscount> {
  const payload = {} as Record<DiscountPlan, PlanDiscount>;

  for (const plan of DISCOUNT_PLAN_ORDER) {
    const entry = form[plan];
    const percent = Number(entry.percent.trim());

    payload[plan] = {
      percent: Number.isFinite(percent) ? Math.round(percent) : 0,
      discountedProductIds: parseProductIds(entry.discountedProductIds),
      androidOfferId: entry.androidOfferId.trim() || null,
      iosProductId: entry.iosProductId.trim() || null,
      // Never sent for lifetime: the field is not offered, and a stale value
      // would otherwise survive because omitting a key preserves it.
      iosOfferId: PLANS_WITH_IOS_OFFER.includes(plan) ? entry.iosOfferId.trim() || null : null,
    };
  }

  return payload;
}

/** Every validation error in the discount section, keyed `plan.field`. */
export function validatePlanDiscounts(form: PlanDiscountsForm): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const plan of DISCOUNT_PLAN_ORDER) {
    const entry = form[plan];

    const percent = validatePercent(entry.percent);
    if (percent) errors[`${plan}.percent`] = percent;

    const android = validateAndroidOfferId(entry.androidOfferId);
    if (android) errors[`${plan}.androidOfferId`] = android;

    const iosProduct = validateIosProductId(entry.iosProductId);
    if (iosProduct) errors[`${plan}.iosProductId`] = iosProduct;

    if (PLANS_WITH_IOS_OFFER.includes(plan)) {
      const iosOffer = validateIosOfferId(entry.iosOfferId);
      if (iosOffer) errors[`${plan}.iosOfferId`] = iosOffer;
    }

    const products = validateProductIds(entry.discountedProductIds);
    if (products) errors[`${plan}.discountedProductIds`] = products;
  }

  return errors;
}
