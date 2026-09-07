# MedBell Admin

Operations console for [MedBell](https://medbell.app), the medication-reminder app.

Two audiences, one deployment: the **partner portal** at `/` and the **admin
console** behind `/admin/login`.

It is a **pure interface** over the existing Firebase project `pill-reminder-e8f19`.
There is no database of its own, no ORM, and no business logic: every figure it
shows is computed by a deployed Cloud Function or read from Firestore as-is, and
every change it makes goes through a callable that re-checks permissions,
recomputes money from stored data, and appends an immutable audit entry.

## Stack

- Next.js 16 (App Router) · React 19 · TypeScript
- Tailwind CSS v4 with shadcn/ui-style primitives
- TanStack Query for client caching
- Firebase Auth + Firebase Admin SDK
- Deployed on Vercel

## Routes

| Path | Who | Credential |
|---|---|---|
| `/` | Partners | Sign-in page. The home page belongs to partners — they arrive from a referral link or a phone bookmark. |
| `/partner/*` | Partners | Dashboard, link, customers, earnings, payments, account. Gated client-side on the `medbellPartner` claim. |
| `/admin/login` | Administrators | Reached from the green marker in the corner of `/`. |
| `/dashboard`, `/users`, `/referrals/*`, `/admins` | Administrators | Gated on the `medbellAdmin` claim. |

`/login` and `/partner/login` redirect to their new homes, so existing bookmarks
still work.

The marker on the home page is discreet, not secret: the console is protected by
the claim, never by its address being hard to find. It is a real link with an
accessible name, reachable by keyboard, and it reveals its label on focus.

## Authorisation model

Access is the **`medbellAdmin` custom claim** and nothing else. There is
deliberately no `isAdmin` database field: the claim is settable only by the
`setAdminRole` Cloud Function, and it is what the Firestore security rules
themselves check.

The claim is enforced in three places, and only the last two grant anything:

| Layer | File | What it does | Trusted? |
|---|---|---|---|
| Routing | [proxy.ts](proxy.ts) | Decodes the session cookie *without verifying it* and decides console vs `/admin/login` | **No** — routing hint only |
| Rendering | [app/(admin)/layout.tsx](app/(admin)/layout.tsx) | `verifySessionCookie(..., checkRevoked)` then reads the claim off the verified token | Yes |
| Data | [lib/auth/route-guard.ts](lib/auth/route-guard.ts) | Same verification at the top of every route handler | Yes |

A forged cookie therefore reaches a shell that immediately refuses it. This is
verifiable: a JWT carrying `medbellAdmin: true` and a junk signature gets past
the proxy and is then bounced to `/admin/login`, while `/api/patients/<uid>` answers
`401`.

Sign-in mints an HttpOnly session cookie via `POST /api/session`, which only
issues one for an ID token Google signed that already carries the claim.

## Read and write paths

Everything is typed from [docs/ADMIN_API.md](docs/ADMIN_API.md) — the contract —
and built to [docs/WEB_ADMIN_PARITY.md](docs/WEB_ADMIN_PARITY.md) — the work
order. Where the two disagree, `ADMIN_API.md` wins, as it says itself.

**Reads** are split by what the data is:

- *Programme and directory data* — the callables, called from the browser
  through TanStack Query so each callable's own error message reaches the
  operator verbatim.
- *Clinical and care-circle data* — `GET /api/patients/[uid]`, a route handler
  that reads Firestore with the Admin SDK after re-verifying the claim
  ([lib/data/patient.ts](lib/data/patient.ts)). Read-only by construction: the
  module contains queries and no writes, and the route has no `POST`/`PATCH`/`DELETE`.

**Writes** go through `httpsCallable` in `us-central1` and nowhere else. All 27
admin callables are wired; `claimAdminRole` is deliberately not, since it is a
one-shot bootstrap fuse. The console never writes to Firestore.

### Owner fields

Not uniform, and not guessed — the clinical collections predate the referral
system, which was written against `userId`:

| Collection | Owner field |
|---|---|
| `medications`, `medicationLogs`, `appointments` | `patientId` |
| `vitals/{patientId}/records`, `vitalReminderPlans/{patientId}/plans` | path segment |
| `careRelationships` | `patientId` + `caregiverId` (doc id joins them with `_`) |
| `connectionRequests` | `createdBy`, `patientId`, `caregiverId` |
| `subscriptions`, `referral_transactions` | `userId` |
| `users/{uid}` | document id |

### Paging

Only `listAppUsers` has a cursor (`pageToken`). Every other list takes a `limit`
and returns a plain array, so "load more" raises the limit
([hooks/use-limit.ts](hooks/use-limit.ts)) and the footer says out loud when the
server's cap of 200 is reached rather than implying there is nothing further.

`listReferredUsers` and `listPartnerPayouts` require a `partnerId`, so those
screens ask for one instead of firing a request that would fail. `listPartners`
and `listReferralAudit` have no search or action filter, so the filtering on
those screens runs over the loaded rows and is labelled as such.

## Money

All amounts are **integer minor units**. `lib/money.ts` is the only place a
value is divided by 100, and only to build a display string; sums use integer
addition and operator input is parsed from its decimal string rather than
through `parseFloat`.

Balances are keyed by currency and are never summed across them — a partner can
hold more than one, and adding INR to USD would be a lie. `payableMinor`
(pending + approved) is legitimately **negative** when a refund reverses
commission already paid out; it is surfaced in a warning tone, never clamped.

Payout amounts are never sent from the client: `markCommissionsPaid` takes ids
and settlement detail only, and the returned `amountMinor` is what gets shown
afterwards. `updatePartnerPayout` edits the settlement record alone — voiding is
the only thing that moves money back.

## Two contract details that bite

**Update callables are patches, not snapshots.** An omitted key leaves the stored
value alone; an explicit `null` clears it. The trap is that `undefined` does *not*
omit a key over this transport — `@firebase/functions` `encode()` walks own
enumerable keys and turns `undefined` into `null`, so `{ email: undefined }`
arrives as `{ email: null }` and **clears the field**. Every form therefore builds
its payload through [lib/api/patch.ts](lib/api/patch.ts), which produces
`undefined` for "unchanged" and then physically strips those keys.

**Timestamps are epoch milliseconds.** `serialize()` converts every Firestore
`Timestamp` in a callable response, recursively, including inside nested maps
and arrays. Direct Firestore reads are the exception — they hand back
`Timestamp` objects — so [lib/data/serialize.ts](lib/data/serialize.ts)
normalises them to the same convention and the client has one representation
rather than three.

## Store identifiers are the mechanism, not metadata

The app never computes a discount: it asks the store for a *named offer*. Those
names are `androidOfferId` and `iosOfferId`, and a blank or wrong one means the
discount simply never appears on that platform. Three things follow, all
implemented in [lib/api/plan-discounts.ts](lib/api/plan-discounts.ts):

- **The two stores' formats are mutually exclusive.** App Store ids allow
  letters, digits, dots and underscores but no hyphens; Play ids allow lowercase
  letters, digits and hyphens but no underscores. Each field is validated
  against its own rule and names the *other* store when the value looks like
  it was pasted from there — that swap is the most expensive failure mode in the
  system, because the form saves cleanly and the discount silently never shows.
- **Discounts are always sent as a complete set.** The backend merges per field:
  an absent plan keeps its stored value, an absent field keeps its stored value,
  and only an explicit `null` clears one. A form sending only what changed would
  appear to work and could never clear anything.
- **Lifetime has no App Store promotional offer field.** It is a non-consumable
  and the App Store has none for those; its iOS discount is a separate product
  named in `iosProductId`. The field is hidden, and `iosOfferId` is forced to
  `null` for lifetime on the way out so a stale value cannot survive.

> **Before debugging the form:** the referral functions carrying `iosOfferId`
> may not be deployed. If a saved value comes back empty, check that
> `updatePartner`, `createPartner`, `getPartner`, `listPartners`,
> `createReferralCode` and `updateReferralCode` have been redeployed — the panel
> will otherwise hit the same wall the app's own form does.

## Rules the UI states because the backend enforces them

- Discount percentages and the commission rate come from `getReferralConfig`
  under `defaults` and are **not** writable — `updateReferralConfig` accepts only
  the store mapping, so the settings screen shows them read-only rather than as
  inputs that would silently do nothing.
- Commission applies to every successful transaction, **including full-price
  renewals**; discounts apply to the first payment only.
- Attribution locks to one partner on first purchase, and each user redeems at
  most one discount ever.
- A code can be `active` and still unusable — past its end date, not yet started,
  or at its redemption cap. The codes list shows that distinction.
- Only `pending` and `approved` rows are payable, a payout is single-currency,
  and at most 400 rows go in one call.
- Admin access to patient data is read-only; `deleteAppUser` removes the account
  and profile but preserves medications, dose logs, vitals and appointments.
- The backend refuses to let an admin disable, delete or de-admin themselves, so
  those controls are disabled on your own account with a tooltip rather than
  letting you click into an error.
- Deleting a user removes the profile *before* the Auth record. If the second
  step fails, the callable says so and the fix is a console deletion, not a
  retry — that message reaches the operator intact.
- A code's owning partner is not editable: moving one would re-point every
  future renewal commission.
- Code-level overrides are all-or-nothing. The merge rules make per-plan
  clearing impossible, so the UI offers one toggle and says why.

## Local setup

```bash
pnpm install
cp .env.example .env.local   # then fill it in
pnpm dev
```

`.env.local` needs the Firebase web config (`NEXT_PUBLIC_FIREBASE_*`) and an
Admin SDK service account (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`,
`FIREBASE_PRIVATE_KEY`). See [.env.example](.env.example) for where each value
comes from.

To sign in you need an account carrying `medbellAdmin`. If none exists yet, an
existing admin grants it from **Console admins**, or it is set directly with the
`setAdminRole` callable.

## Deploying to Vercel

Add the same variables as Vercel Environment Variables — the service-account
values are secrets and must never carry a `NEXT_PUBLIC_` prefix. `FIREBASE_PRIVATE_KEY`
may be pasted with escaped `\n`; the app restores the newlines.

## Scripts

```bash
pnpm dev      # Turbopack dev server
pnpm build    # production build
pnpm lint     # ESLint (flat config)
pnpm test     # contract tests (Node's built-in runner, no extra dependency)
```

`pnpm test` covers the places where a silent regression would be expensive:
integer-minor-unit arithmetic and parsing, the omit-vs-clear patch semantics of
the update callables, the epoch-millis timestamp contract (including the
adherence window), the store-identifier rules and full-set discount payload, the
error-code mapping, and CSV escaping. It runs project modules directly via
`--experimental-strip-types` plus a small `@/` alias resolver in
[scripts/](scripts/), so the tests import exactly what the app imports.
