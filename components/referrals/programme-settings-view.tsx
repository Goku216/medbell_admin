"use client";

import * as React from "react";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { useReferralConfig, useUpdateReferralConfig } from "@/hooks/use-referrals";
import { errorMessage, mutationMessage } from "@/lib/api/callable-error";
import { PLAN_LABELS, POLICY_NOTES } from "@/lib/constants";
import { formatPercent, titleCase } from "@/lib/format";
import { omitUndefined, requiredTextChange } from "@/lib/api/patch";
import type { GetReferralConfigResponse } from "@/lib/api/types";

import Link from "next/link";

import { ListPricesEditor } from "@/components/referrals/list-prices-editor";
import { ProductPlanEditor } from "@/components/referrals/product-plan-editor";
import { PageHeader } from "@/components/common/page-header";
import { PolicyNote } from "@/components/common/policy-note";
import { ErrorState } from "@/components/common/states";
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
      setError(mutationMessage(caught));
    }
  }

  const planRows = Object.keys(defaults.planDiscountPercents ?? {});

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

      <ProductPlanEditor config={config} />

      <ListPricesEditor config={config} />

      <Card>
        <CardHeader>
          <CardTitle>Administrators</CardTitle>
          <CardDescription>
            Console access is granted and revoked by email address.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            The <code className="font-mono">REFERRAL_ADMIN_EMAILS</code> environment variable is
            a first-admin bootstrap only, not the ongoing mechanism.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/admins">Manage console admins</Link>
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
