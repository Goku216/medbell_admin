"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, Plus } from "lucide-react";

import {
  usePartner,
  usePartnerAnalytics,
  usePartnerSubscriptions,
} from "@/hooks/use-referrals";
import { errorMessage } from "@/lib/api/callable-error";
import { formatDate, formatNumber, formatPercent, titleCase } from "@/lib/format";
import type { ReferralCode } from "@/lib/api/types";
import { PLAN_LABELS } from "@/lib/constants";

import { AuditView } from "@/components/referrals/audit-view";
import { BalancesPanel } from "@/components/referrals/balances-panel";
import { ReferredCustomersView } from "@/components/referrals/referred-customers-view";
import { CodeFormDialog } from "@/components/referrals/code-form-dialog";
import { PartnerFormDialog } from "@/components/referrals/partner-form-dialog";
import { PayoutsView } from "@/components/referrals/payouts-view";
import { ReferralLink } from "@/components/referrals/referral-link";
import { DefinitionList } from "@/components/common/definition-list";
import { Money } from "@/components/common/money";
import { StatCard } from "@/components/common/stat-card";
import { StatusBadge } from "@/components/common/status-badge";
import { EmptyState, ErrorState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function PartnerDetailView({ partnerId }: { partnerId: string }) {
  const partner = usePartner(partnerId);
  const analytics = usePartnerAnalytics(partnerId);
  const [editOpen, setEditOpen] = React.useState(false);

  if (partner.isError) {
    return (
      <>
        <BackLink />
        <ErrorState
          message={errorMessage(partner.error)}
          onRetry={() => void partner.refetch()}
        />
      </>
    );
  }

  const data = analytics.data;

  return (
    <>
      <BackLink />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          {partner.isPending ? (
            <Skeleton className="h-7 w-56" />
          ) : (
            <h1 className="truncate text-xl font-semibold tracking-tight">
              {partner.data?.partner.name ?? partnerId}
            </h1>
          )}

          <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            {partner.data?.partner.contactEmail ? (
              <span>{partner.data.partner.contactEmail}</span>
            ) : null}
            {partner.data?.partner.companyName ? (
              <span>· {partner.data.partner.companyName}</span>
            ) : null}
            <StatusBadge status={partner.data?.partner.status} />
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setEditOpen(true)}
          disabled={!partner.data}
        >
          <Pencil />
          Edit partner
        </Button>
      </div>

      {analytics.isError ? (
        <ErrorState
          message={errorMessage(analytics.error)}
          onRetry={() => void analytics.refetch()}
        />
      ) : null}

      <section aria-label="Reach" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Referred users"
          loading={analytics.isPending}
          value={formatNumber(data?.totals.referredUsers)}
          hint={`${formatNumber(data?.totals.convertedSubscribers)} converted`}
        />
        <StatCard
          label="Active subscribers"
          loading={analytics.isPending}
          value={formatNumber(data?.totals.activeSubscribers)}
        />
        <StatCard
          label="Renewals"
          loading={analytics.isPending}
          value={formatNumber(data?.totals.renewals)}
          hint="Commission applies at full price"
        />
        <StatCard
          label="Refunds"
          loading={analytics.isPending}
          tone={data && data.totals.refunds > 0 ? "warning" : "default"}
          value={formatNumber(data?.totals.refunds)}
        />
      </section>

      <section aria-label="Plan mix" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Monthly"
          loading={analytics.isPending}
          value={formatNumber(data?.totals.monthlySubscribers)}
        />
        <StatCard
          label="Yearly"
          loading={analytics.isPending}
          value={formatNumber(data?.totals.yearlySubscribers)}
        />
        <StatCard
          label="Lifetime"
          loading={analytics.isPending}
          value={formatNumber(data?.totals.lifetimeCustomers)}
        />
        <StatCard
          label="Commission rate"
          loading={analytics.isPending}
          value={formatPercent(data?.commissionPercent, 0)}
          hint={data ? `on ${titleCase(data.commissionBase)}` : undefined}
        />
      </section>

      <BalancesPanel
        balances={data?.balances}
        title="This partner's balances"
        description="Revenue generated, customer discounts given and commission earned, pending, approved, paid and payable — per currency."
      />

      <Tabs defaultValue="codes">
        <TabsList>
          <TabsTrigger value="codes">Codes</TabsTrigger>
          <TabsTrigger value="plans">By plan</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="codes">
          <PartnerCodes
            partnerId={partnerId}
            codes={partner.data?.codes ?? []}
            loading={partner.isPending}
          />
        </TabsContent>

        <TabsContent value="plans">
          <Card>
            <CardHeader>
              <CardTitle>Resolved plan discounts</CardTitle>
              <CardDescription>
                What this partner&rsquo;s codes actually apply, after partner and code overrides
                are resolved against the programme defaults.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {analytics.isPending ? (
                <Skeleton className="m-5 h-32" />
              ) : Object.keys(data?.planDiscounts ?? {}).length === 0 ? (
                <EmptyState className="m-5" title="No plan discounts configured" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plan</TableHead>
                      <TableHead className="text-right">Discount</TableHead>
                      <TableHead>Discounted products</TableHead>
                      <TableHead>Play offer</TableHead>
                      <TableHead>App Store offer</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(data?.planDiscounts ?? {}).map(([plan, discount]) => (
                      <TableRow key={plan}>
                        <TableCell className="font-medium">
                          {PLAN_LABELS[plan] ?? titleCase(plan)}
                        </TableCell>
                        <TableCell className="tabular text-right">
                          {formatPercent(discount.percent, 0)}
                        </TableCell>
                        <TableCell className="max-w-64 truncate font-mono text-xs">
                          {discount.discountedProductIds?.join(", ") || "—"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {discount.androidOfferId ?? "—"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {discount.iosOfferId ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers">
          <ReferredCustomersView partnerId={partnerId} />
        </TabsContent>

        <TabsContent value="subscriptions">
          <PartnerSubscriptions partnerId={partnerId} />
        </TabsContent>

        <TabsContent value="payouts">
          <PayoutsView partnerId={partnerId} />
        </TabsContent>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Partner details</CardTitle>
            </CardHeader>
            <CardContent>
              <DefinitionList
                columns={2}
                items={[
                  { label: "Name", value: partner.data?.partner.name ?? "—" },
                  { label: "Company", value: partner.data?.partner.companyName ?? "—" },
                  { label: "Contact email", value: partner.data?.partner.contactEmail ?? "—" },
                  { label: "Contact phone", value: partner.data?.partner.contactPhone ?? "—" },
                  {
                    label: "Commission",
                    value: `${formatPercent(partner.data?.partner.commissionPercent, 0)} on ${titleCase(partner.data?.partner.commissionBase)}`,
                  },
                  {
                    label: "Primary currency",
                    value: partner.data?.partner.primaryCurrency ?? "—",
                  },
                  {
                    label: "Offering",
                    value: partner.data?.partner.offeringId ?? "Programme default",
                  },
                  {
                    label: "Payout method",
                    value: titleCase(partner.data?.partner.payoutMethod),
                  },
                  {
                    label: "Payout details",
                    value: partner.data?.partner.payoutDetails ?? "—",
                  },
                  { label: "Default code", value: data?.defaultCode ?? "—" },
                  { label: "Added", value: formatDate(partner.data?.partner.createdAt) },
                  { label: "Last updated", value: formatDate(partner.data?.partner.updatedAt) },
                  { label: "Notes", value: partner.data?.partner.notes ?? "—" },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <AuditView partnerId={partnerId} />
        </TabsContent>
      </Tabs>

      <PartnerFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        partner={partner.data?.partner ?? null}
      />
    </>
  );
}

function BackLink() {
  return (
    <Link
      href="/referrals/partners"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" />
      All partners
    </Link>
  );
}

/**
 * getPartner already returns this partner's codes with their referral links, so
 * there is no second listReferralCodes call here.
 */
function PartnerCodes({
  partnerId,
  codes,
  loading,
}: {
  partnerId: string;
  codes: ReferralCode[];
  loading: boolean;
}) {
  const [createOpen, setCreateOpen] = React.useState(false);

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>Referral codes</CardTitle>
            <CardDescription>Every code issued to this partner.</CardDescription>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus />
            New code
          </Button>
        </CardHeader>

        <CardContent className="px-0 pb-0">
          {loading ? (
            <Skeleton className="m-5 h-32" />
          ) : codes.length === 0 ? (
            <EmptyState
              className="m-5"
              title="No codes yet"
              description="Issue a code so this partner has something to share."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code and link</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Redemptions</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead>Valid until</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.map((code) => (
                  <TableRow key={code.code}>
                    <TableCell className="max-w-72">
                      <ReferralLink code={code.code} referralLink={code.referralLink} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={code.status} />
                        {code.isDefault ? <Badge variant="secondary">Default</Badge> : null}
                      </div>
                    </TableCell>
                    <TableCell className="tabular text-right">
                      {formatNumber(code.redemptionCount ?? 0)}
                      {code.maxRedemptions ? (
                        <span className="text-muted-foreground"> / {code.maxRedemptions}</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="tabular text-right text-sm text-muted-foreground">
                      {code.commissionPercent != null
                        ? formatPercent(code.commissionPercent, 0)
                        : "Partner default"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {code.validUntil ? formatDate(code.validUntil) : "No end date"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CodeFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultPartnerId={partnerId}
      />
    </>
  );
}

function PartnerSubscriptions({ partnerId }: { partnerId: string }) {
  const query = usePartnerSubscriptions(partnerId);
  const subscriptions = query.data?.subscriptions ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscriptions from this partner</CardTitle>
        <CardDescription>
          Lifetime revenue per subscription, from the stored totalGrossMinor.
        </CardDescription>
      </CardHeader>

      <CardContent className="px-0 pb-0">
        {query.isPending ? (
          <Skeleton className="m-5 h-32" />
        ) : query.isError ? (
          <div className="p-3">
            <ErrorState
              message={errorMessage(query.error)}
              onRetry={() => void query.refetch()}
            />
          </div>
        ) : subscriptions.length === 0 ? (
          <EmptyState className="m-5" title="No subscriptions attributed to this partner yet" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Store</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Renewals</TableHead>
                <TableHead className="text-right">Lifetime revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.map((subscription) => (
                <TableRow key={subscription.id}>
                  <TableCell className="max-w-56 truncate">
                    {subscription.userId ? (
                      <Link href={`/users/${subscription.userId}`} className="hover:underline">
                        {subscription.email ?? subscription.userId}
                      </Link>
                    ) : (
                      (subscription.email ?? "—")
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {subscription.plan ? PLAN_LABELS[subscription.plan] : "—"}
                      {subscription.isTrial ? <Badge variant="warning">Trial</Badge> : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {titleCase(subscription.store)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={subscription.status} />
                  </TableCell>
                  <TableCell className="tabular text-right">
                    {formatNumber(subscription.renewalCount ?? 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Money
                      minor={subscription.totalGrossMinor}
                      currency={subscription.currency ?? "INR"}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
