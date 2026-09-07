"use client";

import * as React from "react";
import { LoaderCircle, Plus, Trash } from "lucide-react";
import { toast } from "sonner";

import { useUpdateReferralConfig } from "@/hooks/use-referrals";
import { mutationMessage } from "@/lib/api/callable-error";
import { DISCOUNT_PLAN_ORDER, PLAN_LABELS } from "@/lib/constants";
import type { DiscountPlan } from "@/lib/constants";
import { minorToMajorInput, parseMajorToMinor } from "@/lib/money";
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

type Row = { id: string; plan: DiscountPlan; currency: string; amount: string };

let rowSeq = 0;
const nextRowId = () => `price-${(rowSeq += 1)}`;

/**
 * Published list prices, plan to currency to minor units.
 *
 * Optional: when a pair is absent the original price is grossed back up from
 * what was actually paid. Entered in major units and converted by string,
 * never through a float.
 */
export function ListPricesEditor({ config }: { config: ReferralConfigDoc }) {
  const update = useUpdateReferralConfig();

  const [rows, setRows] = React.useState<Row[]>(() =>
    Object.entries(config.listPrices ?? {}).flatMap(([plan, byCurrency]) =>
      Object.entries(byCurrency ?? {}).map(([currency, minor]) => ({
        id: nextRowId(),
        plan: (DISCOUNT_PLAN_ORDER as readonly string[]).includes(plan)
          ? (plan as DiscountPlan)
          : "monthly",
        currency,
        amount: minorToMajorInput(minor),
      })),
    ),
  );
  const [error, setError] = React.useState<string | null>(null);

  function patchRow(id: string, patch: Partial<Row>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  async function onSave(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const listPrices: Record<string, Record<string, number>> = {};

    for (const row of rows) {
      const currency = row.currency.trim().toUpperCase();
      if (!currency) continue;

      if (currency.length !== 3) {
        setError(`"${currency}" is not a three-letter currency code.`);
        return;
      }

      const minor = parseMajorToMinor(row.amount);
      if (minor === null || minor < 0) {
        setError(
          `Enter the ${PLAN_LABELS[row.plan]} ${currency} price as an amount, for example 499 or 499.00.`,
        );
        return;
      }

      listPrices[row.plan] ??= {};
      if (listPrices[row.plan][currency] !== undefined) {
        setError(`${PLAN_LABELS[row.plan]} has two ${currency} prices.`);
        return;
      }
      listPrices[row.plan][currency] = minor;
    }

    try {
      await update.mutateAsync({ listPrices });
      toast.success("List prices saved.");
    } catch (caught) {
      setError(mutationMessage(caught));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Published list prices</CardTitle>
        <CardDescription>
          Optional. When a plan and currency pair is missing, the original price is grossed back
          up from what was actually paid. Stored as integer minor units.
        </CardDescription>
      </CardHeader>

      <form onSubmit={onSave}>
        <CardContent className="space-y-3">
          {rows.length === 0 ? <EmptyState title="No list prices configured" /> : null}

          {rows.map((row, index) => (
            <div key={row.id} className="flex flex-wrap items-end gap-2">
              <div className="w-40 space-y-1.5">
                <Label
                  htmlFor={`price-plan-${row.id}`}
                  className={index === 0 ? undefined : "sr-only"}
                >
                  Plan
                </Label>
                <Select
                  value={row.plan}
                  onValueChange={(next) => patchRow(row.id, { plan: next as DiscountPlan })}
                >
                  <SelectTrigger id={`price-plan-${row.id}`}>
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

              <div className="w-28 space-y-1.5">
                <Label
                  htmlFor={`price-currency-${row.id}`}
                  className={index === 0 ? undefined : "sr-only"}
                >
                  Currency
                </Label>
                <Input
                  id={`price-currency-${row.id}`}
                  value={row.currency}
                  onChange={(event) =>
                    patchRow(row.id, { currency: event.target.value.toUpperCase() })
                  }
                  maxLength={3}
                  className="uppercase"
                  placeholder="INR"
                />
              </div>

              <div className="min-w-0 flex-1 space-y-1.5">
                <Label
                  htmlFor={`price-amount-${row.id}`}
                  className={index === 0 ? undefined : "sr-only"}
                >
                  List price
                </Label>
                <Input
                  id={`price-amount-${row.id}`}
                  inputMode="decimal"
                  value={row.amount}
                  onChange={(event) => patchRow(row.id, { amount: event.target.value })}
                  className="tabular"
                  placeholder="499.00"
                />
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setRows((current) => current.filter((r) => r.id !== row.id))}
                aria-label="Remove price"
              >
                <Trash />
              </Button>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setRows((current) => [
                ...current,
                { id: nextRowId(), plan: "monthly", currency: "INR", amount: "" },
              ])
            }
          >
            <Plus />
            Add price
          </Button>

          {error ? <ErrorState message={error} /> : null}
        </CardContent>

        <CardFooter className="justify-end">
          <Button type="submit" disabled={update.isPending}>
            {update.isPending ? <LoaderCircle className="animate-spin" /> : null}
            Save prices
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
