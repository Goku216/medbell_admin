"use client";

import Link from "next/link";
import { Building2, Receipt, ScrollText, Settings, Ticket, Users, Wallet } from "lucide-react";

import { useReferralConfig, useReferralOverview } from "@/hooks/use-referrals";
import { errorMessage } from "@/lib/api/callable-error";
import { PLAN_LABELS, POLICY_NOTES } from "@/lib/constants";
import { formatNumber, formatPercent, titleCase } from "@/lib/format";

import { PageHeader } from "@/components/common/page-header";
import { PolicyNote } from "@/components/common/policy-note";
import { BalancesPanel } from "@/components/referrals/balances-panel";
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

const SHORTCUTS = [
  { href: "/referrals/partners", label: "Partners", icon: Building2, hint: "Who refers" },
  { href: "/referrals/codes", label: "Codes", icon: Ticket, hint: "What they share" },
  {
    href: "/referrals/customers",
    label: "Referred customers",
    icon: Users,
    hint: "Who arrived",
  },
  {
    href: "/referrals/commissions",
    label: "Commission ledger",
    icon: Receipt,
    hint: "What is owed",
  },
  { href: "/referrals/payouts", label: "Payouts", icon: Wallet, hint: "What was settled" },
  { href: "/referrals/audit", label: "Audit trail", icon: ScrollText, hint: "What changed" },
];

export function ProgrammeView() {
  const overview = useReferralOverview();
  const config = useReferralConfig();

  const totals = overview.data?.totals;
  const defaults = config.data?.defaults;
  const planPercents = defaults?.planDiscountPercents ?? {};

  return (
    <>
      <PageHeader
        title="Referral programme"
        description="The rules in force, and where to go to act on them."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/referrals/settings">
              <Settings />
              Settings
            </Link>
          </Button>
        }
      />

      {overview.isError ? (
        <ErrorState
          message={errorMessage(overview.error)}
          onRetry={() => void overview.refetch()}
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Rates in force</CardTitle>
          <CardDescription>
            Applied by the backend on every transaction. The console only displays them.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.keys(planPercents).map((plan) => (
              <div key={plan} className="rounded-lg border border-border px-3 py-2.5">
                <p className="text-xs text-muted-foreground">
                  {PLAN_LABELS[plan] ?? titleCase(plan)}
                </p>
                <p className="tabular text-xl font-semibold">
                  {formatPercent(planPercents[plan], 0)}
                </p>
                <p className="text-xs text-muted-foreground">off the first payment</p>
              </div>
            ))}

            <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5">
              <p className="text-xs text-muted-foreground">Partner commission</p>
              <p className="tabular text-xl font-semibold">
                {formatPercent(defaults?.commissionPercent, 0)}
              </p>
              <p className="text-xs text-muted-foreground">
                on {titleCase(defaults?.commissionBase)}, renewals included
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <PolicyNote variant="locked">{POLICY_NOTES.partnerLock}</PolicyNote>
            <PolicyNote variant="locked">{POLICY_NOTES.oneDiscount}</PolicyNote>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active partners"
          loading={overview.isPending}
          value={formatNumber(overview.data?.activePartners)}
          hint={`${formatNumber(overview.data?.partnerCount)} in total`}
        />
        <StatCard
          label="Active codes"
          loading={overview.isPending}
          value={formatNumber(overview.data?.activeCodeCount)}
          hint={`${formatNumber(overview.data?.codeCount)} issued`}
        />
        <StatCard
          label="Referred users"
          loading={overview.isPending}
          value={formatNumber(totals?.referredUsers)}
          hint={`${formatNumber(totals?.convertedSubscribers)} converted`}
        />
        <StatCard
          label="Refunds"
          loading={overview.isPending}
          tone={totals && totals.refunds > 0 ? "warning" : "default"}
          value={formatNumber(totals?.refunds)}
          hint="Reverse commission already earned"
        />
      </section>

      <BalancesPanel balances={overview.data?.balances} />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SHORTCUTS.map((shortcut) => {
          const Icon = shortcut.icon;
          return (
            <Link
              key={shortcut.href}
              href={shortcut.href}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 shadow-xs transition-colors hover:border-primary/40 hover:bg-accent/40"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{shortcut.label}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {shortcut.hint}
                </span>
              </span>
            </Link>
          );
        })}
      </section>
    </>
  );
}
