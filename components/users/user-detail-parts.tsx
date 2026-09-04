"use client";

import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import Link from "next/link";

import type { AppUserDetail, Attribution, PatientRecord } from "@/lib/api/types";
import { POLICY_NOTES } from "@/lib/constants";
import { formatDate, formatDateTime, titleCase } from "@/lib/format";
import { sumMinor } from "@/lib/money";

import { DefinitionList } from "@/components/common/definition-list";
import { Money } from "@/components/common/money";
import { PolicyNote } from "@/components/common/policy-note";
import { ErrorState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Renders the patient record once it has loaded, and is honest about the
 * partial case: if one collection could not be read, the rest still shows and
 * the gap is named rather than silently rendered as "none".
 */
export function PatientGate({
  query,
  children,
}: {
  query: UseQueryResult<PatientRecord>;
  children: (record: PatientRecord) => ReactNode;
}) {
  if (query.isPending) {
    return <Skeleton className="h-48 w-full rounded-xl" />;
  }

  if (query.isError) {
    return (
      <ErrorState
        message={query.error instanceof Error ? query.error.message : "Could not load records."}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const record = query.data;

  return (
    <div className="space-y-4">
      {record.partial.length > 0 ? (
        <PolicyNote>
          Some records could not be read this time: {record.partial.join(", ")}. Everything else
          on this page loaded normally.
        </PolicyNote>
      ) : null}
      {children(record)}
    </div>
  );
}

export function ProfileCard({
  loading,
  user,
}: {
  loading: boolean;
  user: AppUserDetail | undefined;
}) {
  if (loading || !user) {
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }

  const profile = user.profile;
  const lifetime = sumMinor(user.subscriptions.map((item) => item.totalGrossMinor));

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Profile and account</CardTitle>
          <CardDescription>
            Auth state comes from Firebase Auth; the profile block from the user&rsquo;s
            document.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <DefinitionList
            columns={3}
            items={[
              { label: "Role", value: titleCase(profile?.role ?? null, "—") },
              { label: "Timezone", value: profile?.timezone ?? "—" },
              { label: "Email verified", value: user.emailVerified ? "Yes" : "No" },
              { label: "Account created", value: formatDateTime(user.createdAt) },
              { label: "Last sign-in", value: formatDateTime(user.lastSignInAt) },
              { label: "Token last refreshed", value: formatDateTime(user.lastRefreshAt) },
              {
                label: "Sign-in providers",
                value:
                  user.providers.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {user.providers.map((provider) => (
                        <Badge key={provider} variant="outline">
                          {titleCase(provider.replace(".com", ""))}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    "—"
                  ),
              },
              {
                label: "Daily summary",
                value: profile?.summaryNotificationEnabled
                  ? `On${profile.summaryTime ? ` at ${profile.summaryTime}` : ""}`
                  : "Off",
              },
              { label: "Profile updated", value: formatDateTime(profile?.updatedAt) },
            ]}
          />
        </CardContent>
      </Card>

      <AttributionCard attribution={user.attribution} lifetimeMinor={lifetime} />
    </div>
  );
}

function AttributionCard({
  attribution,
  lifetimeMinor,
}: {
  attribution: Attribution | null;
  lifetimeMinor: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue and attribution</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Lifetime revenue</p>
          <p className="tabular text-2xl font-semibold">
            <Money minor={lifetimeMinor} />
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Summed from each subscription&rsquo;s stored{" "}
            <code className="font-mono text-[11px]">totalGrossMinor</code>.
          </p>
        </div>

        {attribution?.partnerId ? (
          <>
            <DefinitionList
              columns={1}
              items={[
                {
                  label: "Partner",
                  value: (
                    <Link
                      href={`/referrals/partners/${attribution.partnerId}`}
                      className="hover:underline"
                    >
                      {attribution.partnerName ?? attribution.partnerId}
                    </Link>
                  ),
                },
                {
                  label: "Referral code",
                  value: attribution.code ? (
                    <code className="font-mono text-xs">{attribution.code}</code>
                  ) : (
                    "—"
                  ),
                },
                { label: "Source", value: titleCase(attribution.source) },
                { label: "Attributed", value: formatDate(attribution.attributedAt) },
                { label: "First purchase", value: formatDate(attribution.firstPurchaseAt) },
                {
                  label: "Discount",
                  value: attribution.discountRedeemed ? (
                    <Badge variant="success">
                      Redeemed
                      {attribution.discountPlan
                        ? ` · ${titleCase(attribution.discountPlan)}`
                        : ""}
                    </Badge>
                  ) : (
                    <Badge variant="muted">Not redeemed</Badge>
                  ),
                },
                {
                  label: "Attribution",
                  value: attribution.locked ? (
                    <Badge variant="secondary">Locked</Badge>
                  ) : (
                    <Badge variant="outline">Not yet locked</Badge>
                  ),
                },
              ]}
            />
            <PolicyNote variant="locked">{POLICY_NOTES.partnerLock}</PolicyNote>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Never used a referral code. Lifetime revenue is still tracked — the RevenueCat
            webhook writes the subscription mirror before it checks attribution.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
