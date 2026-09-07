# Partner portal — frontend build prompt

**Hand this to whoever is building the web frontend.**

The backend is finished and described below exactly as it behaves. Nothing in
this document is aspirational — every callable, argument and response field
listed here exists in `functions/src/referral/partner_logins.ts` and
`functions/src/referral/partner_portal.ts`.

Two pieces of work:

- **Piece 1** — add partner-login management to the **existing admin panel**.
- **Piece 2** — build the **partner portal**, a separate, much smaller site (or
  a separate route group) that partners sign into.

---

## The shape of the system

A **referral partner** is a business record MedBell already creates. A
**partner login** is an optional Firebase Auth account attached to one partner,
created by an administrator. It carries two custom claims:

```
medbellPartner   = true
medbellPartnerId = "<the partner document id>"
```

Those claims are the whole authorisation model. Every portal endpoint reads the
partner id **out of the signed token**, never out of the request body. There is
no `partnerId` argument on any partner-facing call, so a partner cannot ask for
someone else's numbers — there is no parameter to tamper with. Do not try to
send one; it will be ignored.

Partners sign in with a **username**, not an email. Firebase Auth identifies
accounts by email, so the username is turned into
`<username>@partners.med-bell.com` internally. The frontend does that
conversion at sign-in. **That address is not a mailbox** — the domain need not
exist, no mail is ever sent to it, and there is no password-reset email. A
partner who forgets their password contacts MedBell and an administrator sets a
new one. Build the UI to say that, and do **not** put a "Forgot password?" link
that calls `sendPasswordResetEmail` — it would silently do nothing.

Put the domain in `NEXT_PUBLIC_PARTNER_LOGIN_DOMAIN` rather than hard-coding
it; the backend reads the same value from `REFERRAL_PARTNER_LOGIN_DOMAIN`, and
the two must agree.

---

# Piece 1 — Login management in the admin panel

Add a **Portal login** section to the partner detail page. Four callables, all
admin-only (`medbellAdmin` claim), all in `us-central1`.

### `getPartnerLogin({ partnerId })`

```jsonc
// no login yet
{ "partnerId": "abc", "hasLogin": false, "login": null }

// login exists
{
  "partnerId": "abc",
  "hasLogin": true,
  "login": {
    "uid": "…",
    "username": "priya.sharma",
    "loginEmail": "priya.sharma@partners.med-bell.com",
    "disabled": false,
    "createdAt": 1757000000000,   // ms since epoch, or null
    "lastSignInAt": 1757200000000 // ms since epoch, or null
  }
}
```

A third case: `{ hasLogin: false, login: null, orphaned: true }` means the
partner record points at an Auth account that no longer exists. Show it as a
warning with a "Create login" action, not as a normal empty state.

### `createPartnerLogin({ partnerId, username, password, displayName? })`

Returns `{ partnerId, uid, username, loginEmail }`.

- `username` — 3–40 characters, lowercase letters, digits, `.`, `_`, `-`, and
  must start and end with a letter or digit. The server lowercases and trims
  before validating, so the form may accept `Priya.Sharma` and it becomes
  `priya.sharma`. Show the normalised value back after saving.
- `password` — **minimum 8 characters** (deliberately stricter than the
  6-character minimum for app users; this login reads money).
- `displayName` — optional, defaults to the partner's name.

Fails with `failed-precondition` if the partner already has a login — one
partner, one login. To change it, use update; to replace it, delete then
create.

### `updatePartnerLogin({ partnerId, username?, password?, disabled? })`

Every field optional; only keys actually present are applied, so send just what
the operator changed. Returns
`{ partnerId, uid, username, loginEmail, disabled, passwordChanged }`.

- Changing `username` also changes the internal login email.
- `disabled: true` blocks sign-in immediately and is fully reversible. This is
  the right control for "suspend this partner's access" — prefer it over
  deleting.
- Throws `invalid-argument` "Nothing to update." if you send none of the three.

### `deletePartnerLogin({ partnerId })`

Returns `{ partnerId, deleted: true }`. Removes only the ability to sign in.
The partner, their codes, their customers and every commission they have earned
are untouched. Say that in the confirmation dialog, because "delete login"
reads like "delete partner" to a tired operator.

### Error handling for all four

| Code | Meaning | Message to show |
|---|---|---|
| `already-exists` | Username taken by another partner | "That username is already in use." |
| `failed-precondition` | Already has a login / has no login | Show the server message verbatim |
| `invalid-argument` | Username or password failed validation | Show the server message verbatim — it names the rule |
| `not-found` | No such partner | "Partner not found." |
| `permission-denied` | Caller is not an admin | "Your admin access could not be confirmed." |

### UI requirements

- **Never display a password.** None is stored; there is nothing to show. After
  creating a login, display the password the operator typed **once**, with a
  copy button and a line saying it cannot be retrieved later.
- Generate-a-strong-password button on both create and change-password forms.
- Show `lastSignInAt` — it is the quickest way to tell whether a partner has
  ever actually used the portal.
- Changing a password should not require knowing the old one. Administrators
  reset; they do not recover.

---

# Piece 2 — The partner portal

## What a partner may see

Their own earnings, their own payment status, the customers who used their
codes, and their codes and links. **Nothing else.** In particular a partner
must never see: another partner's anything, a customer's identity or contact
details, any medical data, the programme configuration, or the audit trail. The
backend already enforces all of this — the frontend's job is not to invent ways
around it.

## Sign-in flow

1. Username + password form.
2. `signInWithEmailAndPassword(auth, \`${username}@${DOMAIN}\`, password)`.
3. Read the ID token result. If `claims.medbellPartner !== true`, sign out
   immediately and show "This account is not a partner login." Do not leave a
   signed-in session with no access — that produces a portal that looks broken
   rather than one that refuses.
4. Route to the dashboard.

Notes:

- `auth/user-disabled` → "This login has been suspended. Contact MedBell."
- `auth/invalid-credential` / `auth/wrong-password` / `auth/user-not-found` →
  one generic "Incorrect username or password." Do not distinguish; that tells
  an attacker which usernames exist.
- An admin whose account also has `medbellAdmin` should not be routed here —
  keep the two sites' sessions separate, or check the claim and redirect.

## The five endpoints

All partner-only. All take **no partner id**. All in `us-central1`.

### `getMyPartnerProfile()` — everything the dashboard needs, one call

```jsonc
{
  "partnerId": "abc",
  "exists": true,
  "name": "Priya Sharma",
  "companyName": "Sharma Clinic",
  "status": "active",              // or "inactive"
  "commissionPercent": 10,
  "commissionBase": "gross",
  "primaryCurrency": "INR",
  "totals": {
    "referredUsers": 42, "convertedSubscribers": 31, "activeSubscribers": 28,
    "initialPurchases": 31, "renewals": 96, "refunds": 1,
    "monthlySubscribers": 20, "yearlySubscribers": 9, "lifetimeCustomers": 2
  },
  "balances": {
    "INR": {
      "currency": "INR",
      "grossRevenueMinor": 12500000,
      "customerDiscountMinor": 310000,
      "commissionEarnedMinor": 1250000,
      "commissionPendingMinor": 220000,
      "commissionApprovedMinor": 180000,
      "commissionPaidMinor": 850000,
      "payableMinor": 400000        // pending + approved, computed server-side
    }
  },
  "defaultCode": "PRIYA10",
  "referralLink": "https://www.med-bell.com/ref/PRIYA10",
  "payoutMethod": "UPI",
  "payoutDetails": "priya@okhdfc",
  "username": "priya.sharma"
}
```

`exists: false` means the login outlived its partner record — render a polite
"Your account needs attention, contact MedBell" page, not a crash.

### `listMyReferralCodes({ limit? })`

```jsonc
{ "codes": [{
  "code": "PRIYA10",
  "referralLink": "https://www.med-bell.com/ref/PRIYA10",
  "status": "active",
  "isDefault": true,
  "redemptionCount": 42,
  "maxRedemptions": null,      // or a number
  "validFrom": null, "validUntil": null,
  "createdAt": 1756000000000
}]}
```

Already sorted: default first, then active before inactive, then newest.
Partners **cannot create or edit codes** — that is an admin action. Show them
read-only with copy and share controls.

### `listMyReferredUsers({ limit? })`

```jsonc
{ "customers": [{
  "code": "PRIYA10",
  "source": "deeplink",          // "signup" | "deeplink" | "manual"
  "converted": true,             // have they actually paid
  "usedDiscount": true,
  "plan": "monthly",             // or null if not converted
  "joinedAt": 1756100000000,
  "firstPurchaseAt": 1756200000000,
  "customer": "p•••a@gmail.com"  // masked, or null
}]}
```

**There is no user id, no name and no full email, on purpose.** The masked
address exists only so a partner can match a row when someone tells them "I
used your code". Do not build anything that tries to de-anonymise it, and do
not present it as a contact address.

### `listMyCommissions({ status?, limit? })`

`status` is one of `pending`, `approved`, `paid`, `reversed`, `cancelled`, or
omitted for all. Sandbox (`void`) rows are filtered out server-side and never
appear, so a page can return slightly fewer rows than `limit`.

```jsonc
{
  "transactions": [{
    "id": "…",
    "eventAt": 1756200000000,
    "plan": "monthly",
    "currency": "INR",
    "amountMinor": 25000,          // what the customer paid
    "commissionAmountMinor": 2500, // what the partner earned
    "commissionPercent": 10,
    "status": "approved",
    "isFirstPayment": true,
    "isReversal": false,
    "referralCode": "PRIYA10",
    "paidAt": null
  }],
  "totals": { "commissionMinor": 2500, "grossMinor": 25000 },
  "hasMore": false
}
```

`totals` covers **the returned page only**, not the partner's lifetime — label
it accordingly ("this page") or the numbers will look wrong next to the
dashboard. Lifetime figures come from `getMyPartnerProfile().balances`.

`isReversal: true` rows are refund claw-backs and carry negative amounts.
Render them clearly as deductions.

### `listMyPayouts({ limit? })`

```jsonc
{ "payouts": [{
  "id": "…",
  "amountMinor": 850000,
  "currency": "INR",
  "status": "paid",              // or "void"
  "transactionCount": 34,
  "periodStart": 1753000000000, "periodEnd": 1755600000000,
  "method": "UPI", "reference": "UTR123456", "notes": null,
  "paidOn": 1755700000000,
  "createdAt": 1755700000000
}]}
```

## Pages to build

1. **Sign in** — username, password, the "no self-service reset" note.
2. **Dashboard** — payable balance as the hero figure, then paid-to-date,
   lifetime earned, and the customer counts. One `getMyPartnerProfile()` call.
3. **My link** — the default code, its link, a QR code, copy button, and
   native share. This is the page partners will open most; make it the fastest
   thing on the site.
4. **Customers** — the de-identified list, filterable by converted / not.
5. **Earnings** — the commission ledger with a status filter and the
   pending/approved/paid explanation.
6. **Payments** — payouts received, with reference numbers.
7. **Account** — their username, how they will be paid, and a line telling them
   to contact MedBell to change either.

## Money

Every field ending `Minor` is an **integer in minor units** — paise for INR.
Divide by 100 only when rendering, never for arithmetic. Sum the integers, then
format once. `Intl.NumberFormat(locale, { style: 'currency', currency })` on
`value / 100` is fine for display; parsing money into a float and adding it up
is not.

## Explaining the three statuses

Partners will ask. Use these words:

- **Pending** — the payment went through; we are letting the refund window pass.
- **Approved** — confirmed and safe; this money is yours.
- **Paid** — we have sent it to you.

`docs/REFERRAL_PROGRAMME_EXPLAINED.md` is the plain-language version of the
whole programme; the portal's help text should not contradict it.

## Security requirements

- Check `medbellPartner` on every protected route, not only at sign-in.
- Force a token refresh (`getIdToken(true)`) once after sign-in so a
  newly-granted claim is present.
- Never send `partnerId` to a partner endpoint. If you find yourself wanting
  to, something is wrong with the design.
- Do not read Firestore directly from the portal. Rules deny partners access to
  every referral collection, and that is intentional — all data comes through
  the five callables above.
- No admin callable is reachable with a partner token; do not build UI that
  assumes otherwise.

## Acceptance tests

1. A partner signs in with their username and lands on their dashboard.
2. A disabled login cannot sign in and sees the suspension message.
3. An app user's credentials cannot sign in to the portal.
4. Every figure on the dashboard matches the same partner's page in the admin
   panel, to the paise.
5. No response anywhere in the portal contains a customer uid or a full email
   address — check the network tab, not just the screen.
6. Changing a partner's username in the admin panel lets them sign in with the
   new one and not the old one.
7. Changing their password takes effect immediately.
8. Deleting the login leaves the partner's earnings intact in the admin panel.
9. A partner with no codes, no customers and no earnings sees empty states
   rather than errors or zeros-as-placeholders.
