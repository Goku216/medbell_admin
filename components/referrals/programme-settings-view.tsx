"use client";

import * as React from "react";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { useReferralConfig, useUpdateReferralConfig } from "@/hooks/use-referrals";
import { errorMessage } from "@/lib/api/callable-error";
import { PLAN_LABELS, POLICY_NOTES } from "@/lib/constants";
import { formatPercent, titleCase } from "@/lib/format";
import { formatMinor } from "@/lib/money";
import { omitUndefined, requiredTextChange } from "@/lib/api/patch";
import type { GetReferralConfigResponse } from "@/lib/api/types";

import { PageHeader } from "@/components/common/page-header";
import { PolicyNote } from "@/components/common/policy-note";
import { EmptyState, ErrorState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Programme configuration.
 *
 * `updateReferralConfig` accepts only `offeringId`, `productPlans` and
 * `listPrices` — the store mapping. Discount percentages and the commission
 * rate come back under `defaults` and are NOT writable here, so they are shown
 * read-only rather than as inputs that would silently do nothing.
 */
export function ProgrammeSettingsView() {
  const config = useReferralConfig();

  if (config.isPending) {
    return (
      <>
        <PageHeader title="Programme settings" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </>
    );
  }

  if (config.isError) {
    return (
      <>
        <PageHeader title="Programme settings" />
        <ErrorState
          message={errorMessage(config.error)}
          onRetry={() => void config.refetch()}
        />
      </>
    );
  }

  return <SettingsView loaded={config.data} />;
}

function SettingsView({ loaded }: { loaded: GetReferralConfigResponse }) {
  const update = useUpdateReferralConfig();
  const { config, defaults } = loaded;

  const [offeringId, setOfferingId] = React.useState(config.offeringId ?? "");
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const change = requiredTextChange(config.offeringId, offeringId);
    if (change === undefined) {
      toast.info("Nothing changed.");
      return;
    }

    try {
      await update.mutateAsync(omitUndefined({ offeringId: change }));
      toast.success("Offering saved.");
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  const planRows = Object.keys(defaults.planDiscountPercents ?? {});
  const productRows = Object.entries(config.productPlans ?? {});
  const priceRows = Object.entries(config.listPrices ?? {});

  return (
    <>
      <PageHeader
        title="Programme settings"
        description="The store mapping the referral programme runs on, and the rates it applies."
      />

      <PolicyNote variant="locked">
        Discount percentages and the commission rate are backend defaults, not console fields —
        changing them is a deploy, not a form. {POLICY_NOTES.oneDiscount}
      </PolicyNote>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Rates in force</CardTitle>
            <CardDescription>Applied by the backend on every transaction.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {planRows.map((plan) => (
                <div key={plan} className="rounded-lg border border-border px-3 py-2.5">
                  <p className="text-xs text-muted-foreground">
                    {PLAN_LABELS[plan] ?? titleCase(plan)}
                  </p>
                  <p className="tabular text-xl font-semibold">
                    {formatPercent(defaults.planDiscountPercents[plan], 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">off the first payment</p>
                </div>
              ))}

              <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5">
                <p className="text-xs text-muted-foreground">Commission</p>
                <p className="tabular text-xl font-semibold">
                  {formatPercent(defaults.commissionPercent, 0)}
                </p>
                <p className="text-xs text-muted-foreground">
                  on {titleCase(defaults.commissionBase)}, every transaction
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Default currency {defaults.currency} · default offering{" "}
              <code className="font-mono">{defaults.offeringId}</code>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Offering</CardTitle>
            <CardDescription>
              The RevenueCat offering the programme resolves products against.
            </CardDescription>
          </CardHeader>
          <form onSubmit={onSubmit}>
            <CardContent className="space-y-2">
              <Label htmlFor="config-offering">Offering id</Label>
              <Input
                id="config-offering"
                value={offeringId}
                onChange={(event) => setOfferingId(event.target.value)}
                className="font-mono"
              />
              {error ? <ErrorState message={error} /> : null}
            </CardContent>
            <CardFooter className="justify-end">
              <Button type="submit" disabled={update.isPending}>
                {update.isPending ? <LoaderCircle className="animate-spin" /> : null}
                Save offering
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product to plan mapping</CardTitle>
          <CardDescription>
            How a purchased product id resolves to a plan for discount and commission.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {productRows.length === 0 ? (
            <EmptyState className="m-5" title="No product mapping configured" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product id</TableHead>
                  <TableHead>Plan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productRows.map(([productId, plan]) => (
                  <TableRow key={productId}>
                    <TableCell className="font-mono text-xs">{productId}</TableCell>
                    <TableCell>{PLAN_LABELS[plan] ?? titleCase(plan)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>List prices</CardTitle>
          <CardDescription>
            Stored as integer minor units, per plan and currency.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {priceRows.length === 0 ? (
            <EmptyState className="m-5" title="No list prices configured" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead className="text-right">List price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {priceRows.flatMap(([plan, byCurrency]) =>
                  Object.entries(byCurrency ?? {}).map(([currency, minor]) => (
                    <TableRow key={`${plan}-${currency}`}>
                      <TableCell>{PLAN_LABELS[plan] ?? titleCase(plan)}</TableCell>
                      <TableCell className="text-muted-foreground">{currency}</TableCell>
                      <TableCell className="tabular text-right">
                        {formatMinor(minor, { currency })}
                      </TableCell>
                    </TableRow>
                  )),
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
