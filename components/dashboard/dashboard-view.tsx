"use client";

import Link from "next/link";
import { Building2, CreditCard, Receipt, Ticket, TrendingUp, Users } from "lucide-react";

import { useReferralOverview } from "@/hooks/use-referrals";
import { errorMessage } from "@/lib/api/callable-error";
import { formatNumber } from "@/lib/format";
import type { PartnerTotals } from "@/lib/api/types";

import { BalancesPanel } from "@/components/referrals/balances-panel";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { ErrorState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DefinitionList } from "@/components/common/definition-list";

/**
 * Programme and revenue figures, all computed server-side.
 *
 * There is deliberately no trend chart: the overview exposes no time series,
 * and deriving one from a capped page of the ledger would be a chart of the
 * paging window rather than of the business.
 */
export function DashboardView() {
  const { data, isPending, isError, error, refetch } = useReferralOverview();

  const totals = data?.totals;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Programme reach and money, summed by the backend from stored subscription and commission rows."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/referrals/commissions">Review commissions</Link>
          </Button>
        }
      />

      {isError ? (
        <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
      ) : null}

      <section
        aria-label="Programme reach"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard
          label="Partners"
          loading={isPending}
          value={formatNumber(data?.partnerCount)}
          hint={`${formatNumber(data?.activePartners)} active`}
          icon={<Building2 />}
        />
        <StatCard
          label="Referral codes"
          loading={isPending}
          value={formatNumber(data?.codeCount)}
          hint={`${formatNumber(data?.activeCodeCount)} active`}
          icon={<Ticket />}
        />
        <StatCard
          label="Referred users"
          loading={isPending}
          value={formatNumber(totals?.referredUsers)}
          hint={`${formatNumber(totals?.convertedSubscribers)} converted`}
          icon={<Users />}
        />
        <StatCard
          label="Transactions"
          loading={isPending}
          value={formatNumber(data?.transactionCount)}
          hint="Renewals included"
          icon={<Receipt />}
        />
      </section>

      <section aria-label="Subscribers" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active subscribers"
          loading={isPending}
          value={formatNumber(totals?.activeSubscribers)}
          icon={<CreditCard />}
        />
        <StatCard
          label="Initial purchases"
          loading={isPending}
          value={formatNumber(totals?.initialPurchases)}
          icon={<TrendingUp />}
        />
        <StatCard
          label="Renewals"
          loading={isPending}
          value={formatNumber(totals?.renewals)}
          hint="Commission applies at full price"
        />
        <StatCard
          label="Refunds"
          loading={isPending}
          tone={totals && totals.refunds > 0 ? "warning" : "default"}
          value={formatNumber(totals?.refunds)}
          hint="Reverse commission already earned"
        />
      </section>

      <BalancesPanel balances={data?.balances} />

      <PlanMix totals={totals} loading={isPending} />
    </>
  );
}

function PlanMix({ totals, loading }: { totals: PartnerTotals | undefined; loading: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Plan mix</CardTitle>
        <CardDescription>
          Referred customers by the plan they bought. Discounts differ per plan and apply to the
          first payment only.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <DefinitionList
            columns={3}
            items={[
              { label: "Monthly subscribers", value: formatNumber(totals?.monthlySubscribers) },
              { label: "Yearly subscribers", value: formatNumber(totals?.yearlySubscribers) },
              { label: "Lifetime customers", value: formatNumber(totals?.lifetimeCustomers) },
            ]}
          />
        )}
      </CardContent>
    </Card>
  );
}
