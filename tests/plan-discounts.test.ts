import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  emptyPlanDiscountsForm,
  formatProductIds,
  parseProductIds,
  planDiscountsToForm,
  planDiscountsToPayload,
  validateAndroidOfferId,
  validateIosOfferId,
  validateIosProductId,
  validatePlanDiscounts,
} from "@/lib/api/plan-discounts";
import { DISCOUNT_PLAN_ORDER } from "@/lib/constants";

describe("store identifier rules", () => {
  it("accepts a well-formed Play offer id", () => {
    assert.equal(validateAndroidOfferId("referral-first-month-50"), null);
    assert.equal(validateAndroidOfferId(""), null);
  });

  it("rejects an App Store id pasted into the Play field, by name", () => {
    const error = validateAndroidOfferId("referral_first_month_50");
    assert.match(String(error), /App Store/);
  });

  it("rejects uppercase and punctuation in a Play offer id", () => {
    assert.notEqual(validateAndroidOfferId("Referral-First"), null);
    assert.notEqual(validateAndroidOfferId("referral.first"), null);
  });

  it("accepts a well-formed App Store offer id", () => {
    assert.equal(validateIosOfferId("referral_first_month_50"), null);
    assert.equal(validateIosOfferId("com.medbell.offer_1"), null);
  });

  it("rejects a Play id pasted into the App Store field, by name", () => {
    const error = validateIosOfferId("referral-first-month-50");
    assert.match(String(error), /Play/);
  });

  it("enforces the length caps", () => {
    assert.notEqual(validateAndroidOfferId("a".repeat(121)), null);
    assert.notEqual(validateIosOfferId("a".repeat(201)), null);
    assert.notEqual(validateIosProductId("a".repeat(201)), null);
    assert.notEqual(validateIosProductId("has a space"), null);
  });
});

describe("discounted product ids", () => {
  it("splits, trims and drops empties", () => {
    assert.deepEqual(parseProductIds(" a , b ,, c "), ["a", "b", "c"]);
    assert.deepEqual(parseProductIds(""), []);
  });

  it("caps at the server's twenty", () => {
    const many = Array.from({ length: 25 }, (_, index) => `p${index}`).join(",");
    assert.equal(parseProductIds(many).length, 20);
  });

  it("round-trips through the display format", () => {
    assert.deepEqual(parseProductIds(formatProductIds(["a", "b"])), ["a", "b"]);
  });
});

describe("planDiscountsToPayload", () => {
  it("always sends all three plans with all five fields", () => {
    const payload = planDiscountsToPayload(emptyPlanDiscountsForm({ monthly: 50 }));

    assert.deepEqual(Object.keys(payload).sort(), [...DISCOUNT_PLAN_ORDER].sort());

    for (const plan of DISCOUNT_PLAN_ORDER) {
      assert.deepEqual(Object.keys(payload[plan]).sort(), [
        "androidOfferId",
        "discountedProductIds",
        "iosOfferId",
        "iosProductId",
        "percent",
      ]);
    }
  });

  it("sends null rather than omitting, so a cleared field actually clears", () => {
    const form = planDiscountsToForm(
      {
        monthly: {
          percent: 50,
          discountedProductIds: ["old"],
          androidOfferId: "old-offer",
          iosProductId: null,
          iosOfferId: "old_offer",
        },
      },
      undefined,
    );

    form.monthly.androidOfferId = "";
    form.monthly.iosOfferId = "";
    form.monthly.discountedProductIds = "";

    const payload = planDiscountsToPayload(form);
    assert.equal(payload.monthly.androidOfferId, null);
    assert.equal(payload.monthly.iosOfferId, null);
    assert.deepEqual(payload.monthly.discountedProductIds, []);
  });

  it("never sends an App Store offer id for lifetime", () => {
    const form = emptyPlanDiscountsForm();
    // Even if a stale value somehow reached the state, it must not go out:
    // lifetime is a non-consumable and has no promotional offers.
    form.lifetime.iosOfferId = "should_not_be_sent";

    assert.equal(planDiscountsToPayload(form).lifetime.iosOfferId, null);
  });

  it("rounds the percentage to an integer and floors garbage to zero", () => {
    const form = emptyPlanDiscountsForm();
    form.monthly.percent = "49.6";
    form.yearly.percent = "not a number";

    const payload = planDiscountsToPayload(form);
    assert.equal(payload.monthly.percent, 50);
    assert.equal(payload.yearly.percent, 0);
  });

  it("seeds percentages from programme defaults when nothing is stored", () => {
    const form = emptyPlanDiscountsForm({ monthly: 50, yearly: 20, lifetime: 10 });
    assert.equal(planDiscountsToPayload(form).yearly.percent, 20);
  });
});

describe("validatePlanDiscounts", () => {
  it("reports errors keyed by plan and field", () => {
    const form = emptyPlanDiscountsForm();
    form.monthly.androidOfferId = "has_underscore";
    form.yearly.iosOfferId = "has-hyphen";

    const errors = validatePlanDiscounts(form);
    assert.ok(errors["monthly.androidOfferId"]);
    assert.ok(errors["yearly.iosOfferId"]);
  });

  it("does not validate an App Store offer id for lifetime", () => {
    const form = emptyPlanDiscountsForm();
    form.lifetime.iosOfferId = "definitely-invalid";

    assert.equal(validatePlanDiscounts(form)["lifetime.iosOfferId"], undefined);
  });

  it("passes a clean form", () => {
    const form = emptyPlanDiscountsForm({ monthly: 50, yearly: 20, lifetime: 10 });
    form.monthly.androidOfferId = "referral-first-month-50";
    form.monthly.iosOfferId = "referral_first_month_50";
    form.lifetime.iosProductId = "medbell_lifetime_ref10";

    assert.deepEqual(validatePlanDiscounts(form), {});
  });
});
