"use client";

import * as React from "react";
import { LoaderCircle, Plus, Trash } from "lucide-react";
import { toast } from "sonner";

import { useUpdateReferralConfig } from "@/hooks/use-referrals";
import { mutationMessage } from "@/lib/api/callable-error";
import { DISCOUNT_PLAN_ORDER, PLAN_LABELS } from "@/lib/constants";
import type { DiscountPlan, PlanKind } from "@/lib/constants";
import type { ReferralConfigDoc } from "@/lib/api/types";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Row = { id: string; productId: string; plan: DiscountPlan };

let rowSeq = 0;
const nextRowId = () => `row-${(rowSeq += 1)}`;

/**
 * Product id → plan.
 *
 * An explicit mapping beats every heuristic, which is exactly why the separate
 * lifetime referral product needs a row here: nothing about
 * `medbell_lifetime_ref10` says "lifetime" to a parser.
 */
export function ProductPlanEditor({ config }: { config: ReferralConfigDoc }) {
  const update = useUpdateReferralConfig();
  const [rows, setRows] = React.useState<Row[]>(() =>
    Object.entries(config.productPlans ?? {}).map(([productId, plan]) => ({
      id: nextRowId(),
      productId,
      plan: (DISCOUNT_PLAN_ORDER as readonly string[]).includes(plan)
        ? (plan as DiscountPlan)
        : "monthly",
    })),
  );
  const [error, setError] = React.useState<string | null>(null);

  function update_(id: string, patch: Partial<Row>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  async function onSave(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const productPlans: Record<string, PlanKind> = {};
    for (const row of rows) {
      const productId = row.productId.trim();
      if (!productId) continue;
      if (productPlans[productId]) {
        setError(`"${productId}" is mapped twice. Product ids must be unique.`);
        return;
      }
      productPlans[productId] = row.plan;
    }

    try {
      // Sent as a complete map. The response carries the stored config back, so
      // a removal that did not take effect can be reported rather than assumed.
      const result = await update.mutateAsync({ productPlans });
      const stored = Object.keys(result.config?.productPlans ?? {});
      const missing = stored.filter((productId) => !productPlans[productId]);

      if (missing.length > 0) {
        toast.warning(
          `Saved, but these are still mapped server-side: ${missing.join(", ")}. Removals may need a backend change.`,
        );
      } else {
        toast.success("Product mapping saved.");
      }
    } catch (caught) {
      setError(mutationMessage(caught));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Product to plan mapping</CardTitle>
        <CardDescription>
          How a purchased product id resolves to a plan for discount and commission.
        </CardDescription>
      </CardHeader>

      <form onSubmit={onSave}>
        <CardContent className="space-y-3">
          {rows.length === 0 ? (
            <EmptyState title="No product mapping configured" />
          ) : (
            rows.map((row, index) => (
              <div key={row.id} className="flex flex-wrap items-end gap-2">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Label
                    htmlFor={`product-${row.id}`}
                    className={index === 0 ? undefined : "sr-only"}
                  >
                    Product id
                  </Label>
                  <Input
                    id={`product-${row.id}`}
                    value={row.productId}
                    onChange={(event) => update_(row.id, { productId: event.target.value })}
                    className="font-mono text-xs"
                    placeholder="medbell_monthly"
                  />
                </div>

                <div className="w-40 space-y-1.5">
                  <Label
                    htmlFor={`plan-${row.id}`}
                    className={index === 0 ? undefined : "sr-only"}
                  >
                    Plan
                  </Label>
                  <Select
                    value={row.plan}
                    onValueChange={(next) => update_(row.id, { plan: next as DiscountPlan })}
                  >
                    <SelectTrigger id={`plan-${row.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DISCOUNT_PLAN_ORDER.map((plan) => (
                        <SelectItem key={plan} value={plan}>
                          {PLAN_LABELS[plan]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setRows((current) => current.filter((r) => r.id !== row.id))}
                  aria-label={`Remove ${row.productId || "row"}`}
                >
                  <Trash />
                </Button>
              </div>
            ))
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setRows((current) => [
                ...current,
                { id: nextRowId(), productId: "", plan: "monthly" },
              ])
            }
          >
            <Plus />
            Add product
          </Button>

          {error ? <ErrorState message={error} /> : null}
        </CardContent>

        <CardFooter className="justify-end">
          <Button type="submit" disabled={update.isPending}>
            {update.isPending ? <LoaderCircle className="animate-spin" /> : null}
            Save mapping
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
