# Web admin panel — parity specification

**Audience:** whoever is building the Next.js admin panel at `med-bell.com`.

**Relationship to other docs:** [`ADMIN_API.md`](ADMIN_API.md) is the *contract* —
every callable, its arguments, its return shape. This file is the *work order*:
what the panel is missing today, why it is missing, and exactly what to build.
Where the two disagree, `ADMIN_API.md` wins, because it is generated from the
same source tree as the functions.

Two problems are in scope:

- **Part A** — deleting a user does not work.
- **Part B** — the store-identifier fields (App Store offer id, Play offer id,
  App Store product id, discounted product ids) cannot be entered at all.

Parts C–F are the remaining parity gap, so the panel stops trailing the app.

Everything below was read out of the deployed source. Nothing is guessed.

---

## Ground rules that apply to the whole panel

1. **Never write referral, commission, payout, partner, or audit collections
   directly from the browser.** `firestore.rules` denies it (`allow write: if
   false`) and always will. Those collections are server-owned. Every mutation
   goes through a callable.
2. **Authorization is the `medbellAdmin` custom claim.** There is no `isAdmin`
   field in Firestore and there must never be one — a Firestore flag is
   editable by anything holding the user's credentials, a custom claim is
   signed into the ID token and only the Admin SDK can set it.
3. **Region is `us-central1`.** Every callable. If the panel builds its
   functions client without a region it will default to `us-central1` too, but
   state it explicitly so a later config change cannot silently break it.
4. **Money is integer minor units** (paise for INR) in every field ending
   `Minor`. Never parse it into a float, never `toFixed`, never round-trip
   through a JSON number you then multiply. Divide by 100 only at the moment
   you render, and only for display.
5. **A callable that throws returns a typed error code.** Map them to messages
   (tables below); never surface a raw `[firebase_functions/internal]` string
   to an operator.

---

# Part A — Fixing user deletion

## A.1 The callable exists and is live

`deleteAppUser` is deployed in `us-central1`. It is not missing, so if the panel
reports "not found" the problem is on the calling side.

```
deleteAppUser({ uid: string })  →  { uid: string, deleted: true }
```

`uid` is required, max 128 characters. There are no other arguments.

## A.2 What it actually does, in order

Read this before designing the confirmation dialog, because the panel must
describe the consequences honestly.

1. Verifies the caller's `medbellAdmin` claim.
2. **Refuses if `uid` is the caller's own uid** — you cannot delete yourself.
3. Reads `users/{uid}` to capture the email for the audit record.
4. Deletes the `users/{uid}` profile document, if it exists.
   - This fires the `cleanupDeletedUser` Firestore trigger, which removes that
     person's care-network documents (relationships, connection requests).
5. Deletes the Firebase Auth account.
6. Writes a `user.delete` audit entry.

**Clinical data is deliberately kept.** Medications, medication logs, vitals,
vital reminder plans and appointments are *not* deleted. That is a considered
decision, not an oversight — a caregiver may still need the history, and a
medication log is a health record. The confirmation dialog must say this
plainly, otherwise an operator will assume "delete user" means "delete
everything" and be wrong about what they just did.

**There is a half-failure state.** The profile is deleted before the Auth
account. If the Auth deletion then fails, the function throws `internal` with
the message `Profile deleted but the account could not be removed: …`. The
profile is already gone at that point. The panel must show that message
verbatim rather than a generic failure, because the recovery action (delete the
Auth record from the Firebase console) is different from a retry.

## A.3 Why it is probably failing right now

Ranked by how often each one is the actual cause. Work down the list.

### 1. The panel is deleting from Firestore directly

The most likely cause by a wide margin. A `deleteDoc(doc(db, 'users', uid))`
from the browser cannot work and never will — rules deny it, and even if they
did not, it would leave the Auth account alive and the person could still sign
in. Deleting an Auth account requires the Admin SDK, which only runs
server-side.

**Symptom:** `FirebaseError: Missing or insufficient permissions`.
**Fix:** call `deleteAppUser`. Delete the client-side Firestore delete entirely.

### 2. The payload is double-wrapped by the proxy

If the panel routes callables through a server-side `proxy.ts`, note that the
Firebase callable protocol already wraps the body as `{ "data": { … } }`. A
proxy that adds its own `{ data: … }` produces `{ data: { data: { uid } } }`,
and the function then sees no `uid`.

**Symptom:** `invalid-argument` — `"uid" is required.`
**Fix:** send `{ uid }` as the callable payload; let the SDK do the wrapping. If
the proxy hand-rolls the HTTP call, the body must be exactly
`{"data":{"uid":"…"}}` and the response unwrapped from `{"result":{…}}`.

### 3. The operator is deleting their own account

**Symptom:** `failed-precondition` — `You cannot delete your own account.`
**Fix:** this is correct behaviour. Disable the delete control on the row whose
uid equals the signed-in admin's uid, and explain why in a tooltip rather than
letting them click into an error.

### 4. The admin claim is missing or the token is stale

A claim granted after the current ID token was minted is not in that token.
The token refreshes on its own roughly hourly, or immediately on
`getIdToken(true)`.

**Symptom:** `permission-denied`.
**Fix:** after any claim change, call `user.getIdToken(true)` before retrying.
The panel should do a forced refresh once on sign-in, exactly as
`lib/features/admin/admin_state.dart` does in the app: read the cached token
first so the UI is not blocked, then force-refresh and re-render if the answer
changed.

### 5. App Check

If App Check enforcement is on for callables and the web app is not registered,
every call fails before reaching the function body.

**Symptom:** `unauthenticated`, with nothing in the function logs — that
absence is the tell.
**Fix:** register the web app with App Check, or leave enforcement off.

### A.4 Error → message mapping

| Code | Server message | Show the operator |
|---|---|---|
| `permission-denied` | (from `requireAdmin`) | "Your admin access could not be confirmed. Sign out and back in." |
| `invalid-argument` | `"uid" is required.` | "Something went wrong sending the request." — and log it; this is a panel bug |
| `failed-precondition` | `You cannot delete your own account.` | Show verbatim |
| `internal` | `Profile deleted but the account could not be removed: …` | Show verbatim, plus "Remove the account in the Firebase console." |
| `not-found` | — | `deleteAppUser` does not throw this; if you see it, you called the wrong function |

## A.5 The UI this deserves

Deletion is irreversible and hits a real person's account, so:

- Put it behind a **type-to-confirm** dialog — the operator types the account's
  email address. A single "Are you sure?" is not enough for an action that
  destroys an Auth record.
- List in the dialog exactly what goes and what stays (§A.2).
- Disable the control for the operator's own row.
- On success, remove the row optimistically **and** invalidate the user list
  query — `listAppUsers` pages through Auth, so a stale cache will resurrect the
  row on the next page change.
- Consider offering **disable** as the default action and delete as the
  destructive alternative. `updateAppUser({ uid, disabled: true })` blocks
  sign-in immediately and is completely reversible. Most of the time that is
  what the operator actually wants.

---

# Part B — The store-identifier fields

## B.1 Why these fields matter more than they look

The app never computes a discount. The store applies it; the server only
decides *eligibility* and names *which* store offer to ask for. These
identifiers are that name. With them blank, there is nothing to ask for.

Concretely, since the strictness fix in `selectPromotionalOffer`:

- **A blank or wrong `iosOfferId` means iOS monthly/yearly show no referral
  discount at all** — no badge on the paywall, and the plan is not listed in
  the app's referral section. The panel is currently the only place these can
  be entered on the web, and it cannot enter them. That is the bug.
- On Android the equivalent is `androidOfferId`; without it the app cannot
  select the referral offer and falls back to the standard price.

So: these are not optional metadata. They are the mechanism.

## B.2 The exact `planDiscounts` shape

Sent to `createPartner`, `updatePartner`, `createReferralCode` and
`updateReferralCode` under the key `planDiscounts`:

```jsonc
{
  "monthly": {
    "percent": 50,
    "discountedProductIds": [],
    "androidOfferId": "referral-first-month-50",
    "iosProductId": null,
    "iosOfferId": "referral_first_month_50"
  },
  "yearly": {
    "percent": 20,
    "discountedProductIds": [],
    "androidOfferId": "referral-first-year-20",
    "iosProductId": null,
    "iosOfferId": "referral_first_year_20"
  },
  "lifetime": {
    "percent": 10,
    "discountedProductIds": ["medbell_lifetime_ref10"],
    "androidOfferId": null,
    "iosProductId": "medbell_lifetime_ref10",
    "iosOfferId": null
  }
}
```

Only `monthly`, `yearly` and `lifetime` are read. Any other key is ignored
silently — do not rely on sending `weekly`.

| Field | Type | Max | Notes |
|---|---|---|---|
| `percent` | number 0–100 | — | Clamped server-side. The business rule is 50 / 20 / 10 |
| `discountedProductIds` | string[] | 20 items | Trimmed; empty strings dropped |
| `androidOfferId` | string \| null | 120 | Play offer id |
| `iosProductId` | string \| null | 200 | A *separate* App Store product, used for lifetime |
| `iosOfferId` | string \| null | 200 | App Store **promotional offer** identifier |

## B.3 Merge semantics — the part that will bite you

The server merges per key, and the rule is not "replace the whole map":

- If a **plan key is absent** from your submitted `planDiscounts`, every field
  for that plan keeps its stored value.
- If a plan key is present but a **field key is absent** from it, that field
  keeps its stored value.
- To **clear** a field, you must send it explicitly as `""` or `null`. Both
  become `null`. Omitting it preserves the old value.

The practical consequence: **always send all three plans with all five fields**,
populated from what you loaded. A form that only sends changed fields will
appear to work and will quietly fail to clear anything.

`discountedProductIds` is the exception — it is replaced whenever you send an
array, and only falls back to the previous value when the value is not an array
at all.

For `updateReferralCode` only, sending `planDiscounts: null` clears the code's
overrides entirely so it inherits the partner's. That is a distinct operation
from sending an object and worth its own control in the UI.

## B.4 Identifier formats — the two stores disagree

This is a genuine trap. The same conceptual identifier has **mutually
exclusive** character rules per store:

| Store | Field | Allowed | Example |
|---|---|---|---|
| App Store | `iosOfferId` | letters, digits, `.`, `_` — **no hyphens** | `referral_first_month_50` |
| Google Play | `androidOfferId` | lowercase letters, digits, `-` — **no underscores** | `referral-first-month-50` |

Validate each field against its own rule as the operator types and show the
reason inline. An operator who copies the Play id into the Apple field will
otherwise get a form that saves fine and a discount that never appears, which
is the single most expensive failure mode in this whole system.

App Store Connect's own field enforces this on creation, so the id the operator
pastes will already be valid — the risk is pasting the *wrong store's* id.

## B.5 Lifetime is different

- **`iosOfferId` must not be offered for lifetime.** Lifetime is a
  non-consumable; the App Store has no promotional offers for non-consumables.
  The app's form hides the field on the lifetime card and the panel must too —
  showing it invites an operator to fill in something that can never work.
- Lifetime's iOS discount is a **separate product** instead, named in
  `iosProductId` (and/or `discountedProductIds`). The default is
  `medbell_lifetime_ref10`, applied server-side when the field is blank.
- Lifetime is always treated as store-exclusive on both platforms, because a
  distinct product is only ever offered to eligible users.

## B.6 The form to build

Mirror `lib/screens/admin/admin_partner_form_screen.dart`. Sections, in order:

**PARTNER** — `name` (required, ≤120), `companyName` (≤160), `contactEmail`
(≤320), `contactPhone` (≤40), `notes` (≤2000).

**COMMISSION** — `commissionPercent` (0–100, default 10), `commissionBase`
(`gross` | `net`, default `gross`).

**FIRST-PAYMENT DISCOUNTS** — one card per plan, in the order Monthly, Yearly,
Lifetime. Each card:

| Control | Bound to | Shown for |
|---|---|---|
| Percentage slider, 0–100, integer steps | `percent` | all three |
| Renewal note (static text) | — | all three |
| "Play offer id (optional)" | `androidOfferId` | all three |
| "App Store product id (optional)" | `iosProductId` | all three |
| "App Store promotional offer id" | `iosOfferId` | **monthly, yearly only** |
| "Discounted product ids (comma separated, optional)" | `discountedProductIds` | all three |

The comma-separated field splits on `,`, trims each entry, drops empties, and
caps at 20.

**REVENUECAT** — `offeringId` (≤120). Blank means the programme default,
`referral_discount`.

**PAYOUT DETAILS** — `payoutMethod` (≤60), `payoutDetails` (≤500).

**Create-only extras** — `primaryCurrency` (3 letters, uppercased, default
`INR`) and an optional first referral code. Neither appears when editing;
currency is fixed after creation because balances are keyed by it.

**Status** — `active` | `inactive`, on the partner detail screen rather than the
form. Setting `inactive` also deactivates every one of that partner's codes, so
the confirmation must say so.

## B.7 Field-level gotchas in `updatePartner`

- `name` is only applied when non-empty. Sending `""` does **not** clear it —
  it is ignored. Enforce "required" in the form.
- `commissionPercent` is clamped to 0–100 with a fallback of 0, so a garbage
  value silently becomes 0 rather than erroring. Validate before sending.
- `partnerId` is required and is not part of the editable body.
- `status` accepts only `active` or `inactive`; anything else throws
  `invalid-argument`.

---

# Part C — Referral code form

Mirror `lib/screens/admin/admin_code_form_sheet.dart`.

**`createReferralCode`** — `partnerId` (required), `code` (required, ≤24),
`commissionPercent?`, `planDiscounts?`, `offeringId?` (≤120), `maxRedemptions?`
(1–10,000,000), `validFrom?`, `validUntil?`, `makeDefault?` (boolean).
Returns `{ code, referralLink }` — surface the link with a copy button, the app
copies it to the clipboard automatically on create.

**`updateReferralCode`** — `code` (required), then any of `status`
(`active`|`inactive`), `commissionPercent` (`null` clears the override),
`planDiscounts` (`null` clears all overrides), `offeringId`, `maxRedemptions`,
`validFrom`, `validUntil`.

**`partnerId` is deliberately not updatable.** Moving a code between partners
would silently re-point every future renewal commission. Do not add a control
for it; if an operator asks, the answer is to deactivate the code and issue a
new one.

Code-level `planDiscounts` and `commissionPercent` are *overrides* — when null,
the partner's values apply. The UI must distinguish "inheriting 50%" from
"overridden to 50%", because clearing the override later gives different
behaviour if the partner's value changes. A checkbox per plan ("override this
plan") is the clearest way.

Note that the app's code sheet exposes only the percentage sliders, not the
store id fields, because resolution is `code → partner → default` and codes
have never needed their own store ids. The panel may expose them for
completeness, but partner-level is the expected place.

---

# Part D — Programme settings

Mirror `lib/screens/admin/admin_settings_screen.dart`, backed by
`getReferralConfig` / `updateReferralConfig`.

- **DEFAULTS** — **read-only.** The per-plan first-payment percentages
  (50 / 20 / 10) and the default commission (10%, `gross`) applied to a partner
  that has never been configured. These are server constants, not stored
  config, and `updateReferralConfig` does not accept them — render them as
  reference values, not as editable fields.
- **REVENUECAT OFFERING** — `offeringId`, the offering holding the discounted
  packages. Currently `referral_discount`. This must stay a *non-current*
  offering in RevenueCat; the normal offering remains Current.
- **PRODUCT → PLAN** — `productPlans`, a map of store product id → plan
  (`monthly` | `yearly` | `lifetime`). An explicit mapping beats every
  heuristic, which matters for the separate lifetime referral product.
- **PUBLISHED LIST PRICES** — `listPrices`, `plan → currency → minor units`.
  Optional; when a pair is absent the original price is grossed back up from
  what was actually paid. Integer minor units only.
- **ADMINISTRATORS** — grant and revoke via `setAdminRole` by e-mail.
  `REFERRAL_ADMIN_EMAILS` is a first-admin bootstrap only and must not be
  presented as the ongoing mechanism.

---

# Part E — Remaining parity checklist

Everything an admin can do in the app. Tick these off.

| Area | Callables | State |
|---|---|---|
| Dashboard — plan mix, money, partner list | `getReferralOverview`, `listPartners` | |
| Partner create / edit incl. store ids | `createPartner`, `updatePartner` | **Part B** |
| Partner detail — codes, totals, balances | `getPartner`, `getPartnerAnalytics` | |
| Partner activate / deactivate | `updatePartner` (`status`) | |
| Referral codes — create, edit, default | `createReferralCode`, `updateReferralCode`, `listReferralCodes` | **Part C** |
| Referred customers | `listReferredUsers` | |
| Subscriptions per partner | `listPartnerSubscriptions` | |
| Commission ledger | `listCommissionTransactions` | |
| Approve / cancel commissions | `reviewCommissions` | |
| Mark commissions paid | `markCommissionsPaid` | |
| Payouts — list, update, void | `listPartnerPayouts`, `updatePartnerPayout`, `voidPartnerPayout` | |
| Audit trail | `listReferralAudit` | |
| Programme settings | `getReferralConfig`, `updateReferralConfig` | **Part D** |
| Admin roles | `getAdminStatus`, `setAdminRole` | |
| User directory — list, search by email | `listAppUsers` | |
| User detail — auth, profile, subscriptions, attribution | `getAppUser` | |
| Create user | `createAppUser` | |
| Edit user — email, name, password, role, disable | `updateAppUser` | |
| Delete user | `deleteAppUser` | **Part A** |

Web-only additions the app does not have, and which are the reason for building
the panel at all: cross-partner search, CSV export of the ledger and payouts,
bulk commission review, and date-range analytics.

## E.1 `listAppUsers` paging

Two modes, and they are mutually exclusive:

- `{ email }` — exact lookup, lowercased. Returns 0 or 1 user,
  `nextPageToken: null`. This is not a prefix search; there is no substring
  search over Auth. If the panel needs fuzzy search, query the `users`
  collection on `emailLower` instead and read the rules for what admins may
  read.
- `{ limit, pageToken }` — `limit` 1–200, default 50. Page forward with
  the returned `nextPageToken`. Auth paging is **forward-only**; there is no
  backward cursor, so keep a stack of tokens if you want a Previous button.

Each row is the Auth record plus `profile`, which is `null` when the person has
an Auth account but no profile document — a real state worth rendering
distinctly rather than as blank fields.

---

# Part F — Acceptance tests

The panel is done when all of these pass against the real backend:

**Part A**
1. Deleting another user removes them from `listAppUsers` and from Firebase Auth.
2. Deleting yourself is impossible — the control is disabled, and the callable
   would refuse anyway.
3. Deleting a user leaves their medications and logs in Firestore.
4. A non-admin session cannot call `deleteAppUser` — verify with a forged
   `medbellAdmin` field in the Firestore profile, which must change nothing.

**Part B**
5. Entering `referral_first_month_50` in Monthly → App Store promotional offer
   id, saving, and reloading the page shows the value still there.
6. The same value appears in the app's partner form, and the app's referral
   section then lists the monthly and yearly discounts on iOS.
7. Clearing the field and saving actually clears it — reload confirms empty.
8. The Lifetime card offers no App Store promotional offer id field.
9. Pasting a hyphenated id into the Apple field is rejected inline with the
   reason; pasting an underscored id into the Play field likewise.
10. Editing only the commission percent does not wipe the store ids.

**General**
11. Every money figure matches the app's for the same partner, to the paise.
12. An expired ID token refreshes and the call succeeds rather than showing a
    permission error.

---

## One caveat about the current backend

The referral functions carrying `iosOfferId` may not be deployed yet — the last
`updatePartner` deployment predates the commit that added the field, which is
why the app's own form does not persist it either. Until
`firebase deploy --only functions:updatePartner,functions:createPartner,functions:getPartner,functions:listPartners,functions:getReferralStatus,functions:createReferralCode,functions:updateReferralCode`
has run, the panel will hit the same wall: the field will be accepted, silently
dropped, and come back empty. Verify that deploy has happened before spending
time debugging the panel's form.
