# Admin API contract

The authoritative shapes for anything consuming this backend — the Next.js
console, or any other client. Written from the deployed source, not from
memory: `functions/src/referral/admin_api.ts`, `functions/src/admin/users.ts`
and `firestore.rules`.

Project `pill-reminder-e8f19`, region **us-central1**, 42 deployed functions of
which **27** are the admin surface below.

---

## Conventions that apply to every callable

**Auth.** Every one begins with `requireAdmin`, which checks `medbellAdmin`
on the Firebase-verified ID token. There is no `isAdmin` field anywhere and
none should ever be added — the rules check the same claim.

**Timestamps.** `serialize()` walks every response and converts Firestore
`Timestamp` to **epoch milliseconds** (a JS `number`), recursively, including
inside nested maps and arrays. Nothing returns an ISO string or a
`{_seconds, _nanoseconds}` pair.

**Money.** Always an **integer of minor units** (paise for INR). Field names
end in `Minor`. Never divide except to build a display string.

**List/get shapes.** Unless documented otherwise, a document comes back as
`{id, ...everyStoredField}` with the timestamp rule above. The stored fields
are the ones in `functions/src/referral/types.ts`.

**Errors.** `HttpsError` with a specific, operator-readable `message`. Surface
it verbatim — the message *is* the answer ("This referral code has expired.",
"None of the selected transactions are payable for this partner."). Do not
retry a `failed-precondition` or `permission-denied`; nothing about them is
transient.

**Partial input.** Update callables check `hasOwnProperty` per field, so
omitting a key leaves it untouched while sending `null` clears it. This is a
real distinction — do not send a full object with nulls for "unchanged".

---

## 1. Owner fields — the answer to "which field links a record to a user"

Do not probe. Each collection has exactly one, and they are **not** uniform:

| Collection | Owner field | Notes |
|---|---|---|
| `users/{uid}` | **document id** | also carries a redundant `uid` field |
| `medications` | **`patientId`** | plus `createdBy` and `participantIds[]` |
| `medicationLogs` | **`patientId`** | plus `medicationId`, `doseKey`, `status`, `scheduledAt` |
| `appointments` | **`patientId`** | plus `appointmentDateTime`, `deletedAt` |
| `vitals/{patientId}/records/{id}` | **path segment** | `patientId` also stored on the doc |
| `vitalReminderPlans/{patientId}/plans/{id}` | **path segment** | same |
| `careRelationships/{patientId}_{caregiverId}` | **`patientId` + `caregiverId`** | doc id is the two joined by `_` |
| `connectionRequests` | `createdBy`, `patientId`, `caregiverId`, `targetEmailLower` | any of the four may identify a party |
| `subscriptions` | **`userId`** | ← the odd one out |
| `referral_transactions` | **`userId`** (+ `partnerId`) | |
| `users/{uid}/referral/attribution` | **parent path** | single doc, id is literally `attribution` |

So: **`patientId` for clinical data, `userId` for money.** The split is
historical — the clinical collections predate the referral system, which was
written against `userId` — but it is stable and both are indexed.

Two consequences for a console:

- `careRelationships` can be fetched by document id when you know both parties
  (`${patientId}_${caregiverId}`), which is cheaper than a query.
- A "everything for this user" page needs `patientId ==` on four collections
  and `userId ==` on two. `getAppUser` already does the `userId` half for you.

---

## 2. User directory — `functions/src/admin/users.ts`

### `listAppUsers`

```ts
// request
{ email?: string }                      // EXACT match, returns 0 or 1
{ limit?: number, pageToken?: string }  // limit 1–200, default 50

// response
{
  users: Array<{
    uid: string; email: string | null; emailVerified: boolean;
    displayName: string | null; photoUrl: string | null;
    disabled: boolean; isAdmin: boolean;
    providers: string[];                // e.g. ["google.com", "password"]
    createdAt: number | null;           // epoch ms
    lastSignInAt: number | null;
    lastRefreshAt: number | null;
    profile: {
      displayName: string | null; email: string | null; photoUrl: string | null;
      role: "patient" | "caregiver" | null;
      timezone: string | null;          // the only location-ish signal stored
      summaryNotificationEnabled: boolean; summaryTime: string | null;
      createdAt: number | null; updatedAt: number | null;
    } | null;
  }>;
  nextPageToken: string | null;
}
```

Firebase Auth has **no substring search**. `email` is exact; everything else is
paging. Build the UI as "jump to e-mail" plus pagination rather than a search
box that silently fails on partial input.

### `getAppUser`

```ts
// request
{ uid: string }

// response — the listAppUsers user shape, plus:
{
  subscriptions: Array<{
    id: string; productId: string | null;
    plan: "monthly" | "yearly" | "lifetime" | "weekly" | "unknown" | null;
    status: string | null;              // active | cancelled | expired | refunded | billing_issue | paused
    store: string | null; environment: string | null; isTrial: boolean;
    currency: string | null;
    totalGrossMinor: number;            // lifetime revenue from this user
    renewalCount: number;
    partnerId: string | null; referralCode: string | null;
    purchasedAt: number | null; expiresAt: number | null;
    cancelledAt: number | null; refundedAt: number | null; updatedAt: number | null;
  }>;
  attribution: {
    code: string | null; partnerId: string | null; partnerName: string | null;
    source: "signup" | "deeplink" | "manual" | null;
    locked: boolean; discountRedeemed: boolean; discountPlan: string | null;
    attributedAt: number | null; firstPurchaseAt: number | null;
  } | null;
}
```

`subscriptions` covers **every** purchaser, referred or not — the RevenueCat
webhook writes the mirror before it checks attribution. So this is the revenue
view for the whole user base, and `totalGrossMinor` is the per-user lifetime
figure. `attribution` is null for anyone who never used a referral code.

### `createAppUser` / `updateAppUser` / `deleteAppUser`

```ts
createAppUser: { email, password, displayName?, role? } -> { uid }
// password ≥ 6 chars; role is "patient" | "caregiver"; the account is created
// emailVerified: true because an admin vouched for the address.

updateAppUser: { uid, email?, displayName?, password?, disabled?, role? }
            -> { uid, updated: true }
// Refuses to disable your own account.

deleteAppUser: { uid } -> { uid, deleted: true }
// Refuses to delete your own account. Removes the Auth record and the profile
// document — which fires cleanupDeletedUser to clear connection requests and
// care relationships. Medications, logs, vitals and appointments are KEPT: the
// clinical record is not collateral damage of closing an account.
```

---

## 3. Admin roles

```ts
getAdminStatus: {} -> { signedIn: boolean, isAdmin: boolean, uid: string | null }
setAdminRole:   { email: string, grant?: boolean } -> { uid, admin: boolean }
                // grant defaults to true; refuses to revoke your own access
```

`claimAdminRole` exists but is a one-shot bootstrap fuse for the very first
administrator and should not be wired into a console.

---

## 4. Programme configuration

```ts
getReferralConfig: {} -> {
  config: {
    offeringId: string;
    productPlans: Record<string, PlanKind>;              // productId -> plan
    listPrices: Record<PlanKind, Record<string, number>>; // plan -> ISO4217 -> minor
  };
  defaults: {
    planDiscountPercents: Record<PlanKind, number>;      // monthly 50, yearly 20, lifetime 10
    commissionPercent: number;                            // 10
    commissionBase: "gross" | "net";
    offeringId: string; currency: string;
  };
}

updateReferralConfig: { offeringId?, productPlans?, listPrices? } -> { config }
```

`PlanKind` = `"monthly" | "yearly" | "lifetime" | "weekly" | "unknown"`.

---

## 5. Partners

```ts
listPartners: { status?: "active"|"inactive", limit? } -> { partners: Partner[] }

getPartner: { partnerId } -> {
  partner: Partner;
  codes: Array<ReferralCode & { referralLink: string }>;
}

getPartnerAnalytics: { partnerId } -> {
  partnerId; name; status; commissionPercent; commissionBase;
  planDiscounts: Record<PlanKind, PlanDiscount>;   // fully resolved
  primaryCurrency; defaultCode: string | null; referralLink: string | null;
  totals: PartnerTotals;
  balances: Record<string, PartnerBalance & { payableMinor: number }>;
}

createPartner: {
  name;                                    // required
  companyName?; contactEmail?; contactPhone?; notes?;
  commissionPercent?;                      // default 10
  commissionBase?: "gross" | "net";        // default "gross"
  primaryCurrency?;                        // default INR
  offeringId?; payoutMethod?; payoutDetails?;
  planDiscounts?: Record<PlanKind, PlanDiscount>;
  code?;                                   // creates the first code in the same call
  maxRedemptions?; validFrom?; validUntil?;
} -> { partnerId, code: string | null, referralLink: string | null }

updatePartner: { partnerId, ...any of the above } -> { partnerId, updated: true }
// status: "inactive" also deactivates every code for that partner.
```

```ts
type PartnerTotals = {
  referredUsers; convertedSubscribers; activeSubscribers;
  initialPurchases; renewals; refunds;
  monthlySubscribers; yearlySubscribers; lifetimeCustomers;   // all number
};

type PartnerBalance = {
  currency: string;
  grossRevenueMinor; customerDiscountMinor;
  commissionEarnedMinor; commissionPendingMinor;
  commissionApprovedMinor; commissionPaidMinor;               // all number
};

type PlanDiscount = {
  percent: number;
  discountedProductIds: string[];       // lifetime defaults to ["medbell_lifetime_ref10"]
  androidOfferId: string | null;        // Play offer id, hyphens
  iosProductId: string | null;
  iosOfferId: string | null;            // App Store promotional offer id, underscores
};
```

`payableMinor` = pending + approved. It is the figure an operator acts on, and
it can legitimately be **negative** when a refund reverses commission that was
already paid out — do not clamp it to zero.

---

## 6. Referral codes

```ts
createReferralCode: {
  partnerId; code;                       // 3–24 alphanumerics, normalised upper-case
  commissionPercent?; planDiscounts?; offeringId?;
  maxRedemptions?; validFrom?; validUntil?;   // dates: epoch ms or a Date.parse-able string
  makeDefault?: boolean;
} -> { code, referralLink }

updateReferralCode: {
  code;                                  // partnerId is NOT updatable, by design
  status?: "active"|"inactive"; commissionPercent?; planDiscounts?;
  offeringId?; maxRedemptions?; validFrom?; validUntil?;
} -> { code, updated: true, referralLink }

listReferralCodes: { partnerId?, status?, limit? }
                -> { codes: Array<ReferralCode & { referralLink }> }
```

A code is `active` yet still unusable when it is past `validUntil` or at
`maxRedemptions`. Show that distinction — the app's own console does.

---

## 7. Customers, ledger, payouts

```ts
listReferredUsers: { partnerId, limit? } -> {
  users: Array<{
    userId: string | null; code; locked; discountRedeemed; discountApplied;
    discountPlan: string | null; source;
    attributedAt: number | null; firstPurchaseAt: number | null;
    displayName: string | null; email: string | null;
  }>;
}

listPartnerSubscriptions: { partnerId, limit? } -> { subscriptions: [...] }

listCommissionTransactions: {
  partnerId?; status?; plan?; code?;
  from?; to?;                            // epoch ms, filters on eventAt
  firstPaymentOnly?: boolean; limit?;    // limit 1–200, default 50
} -> {
  transactions: ReferralTransaction[];
  totals: { grossMinor, discountMinor, commissionMinor };   // over the page only
  hasMore: boolean;
}

reviewCommissions: { partnerId, transactionIds: string[], decision: "approve"|"cancel" }
                -> { count: number, transactionIds: string[] }

markCommissionsPaid: {
  partnerId; transactionIds: string[];   // max 400
  method?; reference?; notes?; paidOn?;  // settlement detail only
} -> { payoutId, amountMinor, currency, count }

updatePartnerPayout: {
  payoutId; method?; reference?; notes?; paidOn?;
  settledAmountMinor?; settlementStatus?: "pending"|"partial"|"settled"|"failed";
} -> { payoutId, updated: true }

voidPartnerPayout: { payoutId, reason? } -> { payoutId, voided: true }

listPartnerPayouts: { partnerId, limit? } -> { payouts: PartnerPayout[] }

listReferralAudit: { partnerId?, limit? } -> { entries: AuditEntry[] }
```

**`markCommissionsPaid` takes no amount.** The server sums it from the stored
rows inside the transaction. Show the selected total as a labelled *preview*;
the returned `amountMinor` is the truth. Sending an amount would be ignored.

Only `pending` and `approved` rows are payable, single-currency per payout, and
the net must be positive. `updatePartnerPayout` corrects the *settlement*
record and never touches `amountMinor` or the commission rows — `voidPartnerPayout`
is the only thing that moves money back.

Commission status: `pending → approved → paid`, plus `reversed` (refund),
`cancelled` (written off), `void` (sandbox, never payable).

---

## 8. Overview

```ts
getReferralOverview: {} -> {
  partnerCount: number; activePartners: number;
  codeCount: number | null;              // null when the count aggregate failed
  activeCodeCount: number | null;
  transactionCount: number | null;
  totals: PartnerTotals;                 // summed across partners
  balances: Record<string, PartnerBalance & { payableMinor: number }>;
}
```

The three counts are Firestore aggregate queries and are `null` — not `0` — if
the aggregate errors. Render "—", never "0".

---

## 9. Direct Firestore reads

Admins may read, and only read: `users` (+ `fcmTokens`), `medications`,
`medicationLogs`, `appointments`, `vitals/*/records`,
`vitalReminderPlans/*/plans`, `careRelationships`, `connectionRequests`,
`subscriptions`, `partners`, `referral_codes`, `referral_config`,
`referral_transactions`, `partner_payouts`, `referral_audit`.

Never readable by any client: `referral_webhook_events`,
`referral_rate_limits`.

Every one of them is `allow write: if false` for clients, or restricted to the
owning patient. **A console must never write Firestore directly.** Reads here
return raw Firestore types, so a client SDK gives you `Timestamp` objects — the
epoch-millis convention applies to *callable* responses only.

Composite indexes exist for `referral_transactions` on
(partnerId, eventAt desc), (status, eventAt desc) and
(partnerId, status, eventAt desc), for `partner_payouts` and `referral_audit`
on (partnerId, createdAt desc), and a COLLECTION_GROUP single-field override on
`referral.partnerId`. Any other ordered filter needs a new index.
