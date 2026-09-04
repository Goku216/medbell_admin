"use client";

import { CreditCard } from "lucide-react";

import type { Subscription } from "@/lib/api/types";
import { formatDate, formatNumber, titleCase } from "@/lib/format";
import { sumMinor } from "@/lib/money";
import { PLAN_LABELS } from "@/lib/constants";

import { Money } from "@/components/common/money";
import { StatusBadge } from "@/components/common/status-badge";
import { EmptyState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Every subscription the user has ever held.
 *
 * Lifetime revenue reads `subscriptions.totalGrossMinor`, which the RevenueCat
 * webhook mirrors for EVERY purchaser — referred or not — so this column is
 * populated whether or not the user came through a partner. The total row sums
 * the stored integers; it never re-derives an amount from a rate.
 */
export function SubscriptionsPanel({ subscriptions }: { subscriptions: Subscription[] }) {
  if (subscriptions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={<CreditCard className="size-6" />}
            title="No subscriptions"
            description="This account has never completed a purchase."
          />
        </CardContent>
      </Card>
    );
  }

  // getAppUser exposes no separate lifetime total, so it is summed here from
  // the stored per-subscription integers.
  const lifetime = sumMinor(subscriptions.map((subscription) => subscription.totalGrossMinor));
  const currency = subscriptions.find((item) => item.currency)?.currency ?? "INR";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscriptions</CardTitle>
        <CardDescription>
          Lifetime revenue comes from each subscription&rsquo;s stored{" "}
          <code className="font-mono text-[11px]">totalGrossMinor</code>, mirrored by the
          RevenueCat webhook for every purchaser.
        </CardDescription>
      </CardHeader>

      <CardContent className="px-0 pb-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plan</TableHead>
              <TableHead>Store</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Purchased</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead className="text-right">Renewals</TableHead>
              <TableHead className="text-right">Lifetime revenue</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {subscriptions.map((subscription) => (
              <TableRow key={subscription.id}>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium">
                      {subscription.plan
                        ? (PLAN_LABELS[subscription.plan] ?? titleCase(subscription.plan))
                        : "—"}
                    </span>
                    {subscription.isTrial ? <Badge variant="warning">Trial</Badge> : null}
                  </div>
                  {subscription.productId ? (
                    <span className="block truncate font-mono text-[11px] text-muted-foreground">
                      {subscription.productId}
                    </span>
                  ) : null}
                </TableCell>

                <TableCell className="text-sm text-muted-foreground">
                  {titleCase(subscription.store)}
                </TableCell>

                <TableCell>
                  <StatusBadge status={subscription.status} />
                </TableCell>

                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {formatDate(subscription.purchasedAt)}
                </TableCell>

                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {formatDate(subscription.expiresAt)}
                </TableCell>

                <TableCell className="tabular text-right">
                  {formatNumber(subscription.renewalCount ?? 0)}
                </TableCell>

                <TableCell className="text-right font-medium">
                  <Money
                    minor={subscription.totalGrossMinor}
                    currency={subscription.currency ?? currency}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>

          <TableFooter>
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={6} className="text-xs text-muted-foreground">
                Lifetime revenue across all subscriptions
              </TableCell>
              <TableCell className="text-right">
                <Money minor={lifetime} currency={currency} className="font-semibold" />
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  );
}
