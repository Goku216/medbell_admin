"use client";

import Link from "next/link";
import { Link2, TrendingUp, Users } from "lucide-react";

import { useMyPartnerProfile } from "@/hooks/use-partner-portal";
import { formatNumber } from "@/lib/format";
import { formatMinor } from "@/lib/money";
import type { PayableBalance } from "@/lib/api/types";

import { CommissionStatusNote } from "@/components/partner/commission-status-note";
import { PortalError, PortalLoading } from "@/components/partner/partner-states";
import { Money } from "@/components/common/money";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function PartnerDashboard() {
  const { data, isPending, isError, error, refetch } = useMyPartnerProfile();

  if (isPending) return <PortalLoading />;
  if (isError) return <PortalError error={error} onRetry={() => void refetch()} />;

  // The login outlived its partner record. Not a crash, and not something the
  // partner can fix themselves.
  if (!data.exists) {
    return (
      <Card>
        <CardContent className="space-y-2 py-10 text-center">
          <p className="text-sm font-medium">Your account needs attention</p>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            We could not find your partner record. Please contact MedBell and we will sort it
            out — nothing you have earned is affected.
          </p>
        </CardContent>
      </Card>
    );
  }

  const currencies = Object.keys(data.balances ?? {});
  const primary =
    data.balances?.[data.primaryCurrency] ??
    (currencies.length > 0 ? data.balances[currencies[0]] : undefined);
  const others = currencies.filter((code) => code !== primary?.currency);

  return (
    <>
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">
          {data.companyName || data.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          {data.commissionPercent}% commission on every payment your customers make, renewals
          included.
          {data.status !== "active" ? " Your account is currently inactive." : ""}
        </p>
      </header>

      <PayableHero balance={primary} />

      {others.map((code) => (
        <SecondaryBalance key={code} balance={data.balances[code]} />
      ))}

      <section className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Customers referred"
          value={formatNumber(data.totals?.referredUsers)}
          hint={`${formatNumber(data.totals?.convertedSubscribers)} have subscribed`}
          icon={<Users className="size-4" />}
        />
        <Stat
          label="Still subscribed"
          value={formatNumber(data.totals?.activeSubscribers)}
          hint="Earning you renewals"
          icon={<TrendingUp className="size-4" />}
        />
        <Stat
          label="Renewals paid"
          value={formatNumber(data.totals?.renewals)}
          hint="Each one earns commission"
        />
      </section>

      {data.defaultCode ? (
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>Your referral code</CardTitle>
              <CardDescription>
                <code className="font-mono text-sm">{data.defaultCode}</code>
              </CardDescription>
            </div>
            <Button asChild size="sm">
              <Link href="/partner/link">
                <Link2 />
                Share it
              </Link>
            </Button>
          </CardHeader>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>What the statuses mean</CardTitle>
          <CardDescription>Every payment moves through these in order.</CardDescription>
        </CardHeader>
        <CardContent>
          <CommissionStatusNote />
        </CardContent>
      </Card>
    </>
  );
}

/**
 * The one hero figure on the site: what the partner is owed right now.
 *
 * Proportional figures rather than tabular-nums — this is a display number, not
 * a column that has to align with anything.
 */
function PayableHero({ balance }: { balance: PayableBalance | undefined }) {
  if (!balance) {
    return (
      <Card>
        <CardContent className="space-y-1 py-8">
          <p className="text-sm text-muted-foreground">Owed to you right now</p>
          <p className="text-4xl font-semibold tracking-tight sm:text-5xl">&mdash;</p>
          <p className="text-sm text-muted-foreground">
            Nothing yet. Once someone subscribes with your code, your earnings appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="space-y-5 py-8">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Owed to you right now</p>
          <p className="text-4xl font-semibold tracking-tight sm:text-5xl">
            {formatMinor(balance.payableMinor, { currency: balance.currency })}
          </p>
          <p className="text-sm text-muted-foreground">
            Pending plus approved, in {balance.currency}.
          </p>
        </div>

        <dl className="grid gap-3 sm:grid-cols-3">
          <SubFigure
            label="Waiting on the refund window"
            minor={balance.commissionPendingMinor}
            currency={balance.currency}
          />
          <SubFigure
            label="Confirmed and yours"
            minor={balance.commissionApprovedMinor}
            currency={balance.currency}
          />
          <SubFigure
            label="Already paid to you"
            minor={balance.commissionPaidMinor}
            currency={balance.currency}
            tone="positive"
          />
        </dl>
      </CardContent>
    </Card>
  );
}

function SubFigure({
  label,
  minor,
  currency,
  tone,
}: {
  label: string;
  minor: number;
  currency: string;
  tone?: "positive";
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-lg font-medium">
        <Money minor={minor} currency={currency} emphasis={tone ?? "default"} />
      </dd>
    </div>
  );
}

/** A second currency is shown separately — never summed with the first. */
function SecondaryBalance({ balance }: { balance: PayableBalance }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Also owed in {balance.currency}</CardTitle>
        <CardDescription>Held separately; currencies are never added together.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">
          {formatMinor(balance.payableMinor, { currency: balance.currency })}
        </p>
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon?: React.ReactNode;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {icon ? <span className="text-muted-foreground">{icon}</span> : null}
      </div>
      <p className="tabular mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </Card>
  );
}
