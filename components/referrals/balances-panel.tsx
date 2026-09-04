"use client";

import type { PayableBalance } from "@/lib/api/types";

import { Money } from "@/components/common/money";
import { EmptyState } from "@/components/common/states";
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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Balances are keyed by currency and are never summed across them — a partner
 * can hold more than one, and adding INR to USD would be a lie. Each currency
 * gets its own row.
 *
 * `payableMinor` (pending + approved) is the figure an operator acts on and can
 * legitimately be negative when a refund reverses commission already paid out.
 */
export function BalancesPanel({
  balances,
  title = "Balances by currency",
  description = "Payable is pending plus approved. It goes negative when a refund reverses commission already paid out.",
}: {
  balances: Record<string, PayableBalance> | undefined;
  title?: string;
  description?: string;
}) {
  const rows = Object.entries(balances ?? {});

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent className="px-0 pb-0">
        {rows.length === 0 ? (
          <EmptyState
            className="m-5"
            title="No balances yet"
            description="Balances appear once the programme records its first transaction."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Currency</TableHead>
                <TableHead className="text-right">Gross revenue</TableHead>
                <TableHead className="text-right">Customer discounts</TableHead>
                <TableHead className="text-right">Earned</TableHead>
                <TableHead className="text-right">Pending</TableHead>
                <TableHead className="text-right">Approved</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Payable</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {rows.map(([currency, balance]) => (
                <TableRow key={currency}>
                  <TableCell className="font-medium">{currency}</TableCell>
                  <TableCell className="text-right">
                    <Money minor={balance.grossRevenueMinor} currency={currency} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Money
                      minor={balance.customerDiscountMinor}
                      currency={currency}
                      emphasis="muted"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Money minor={balance.commissionEarnedMinor} currency={currency} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Money minor={balance.commissionPendingMinor} currency={currency} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Money minor={balance.commissionApprovedMinor} currency={currency} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Money
                      minor={balance.commissionPaidMinor}
                      currency={currency}
                      emphasis="positive"
                    />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    <Money
                      minor={balance.payableMinor}
                      currency={currency}
                      emphasis={balance.payableMinor < 0 ? "negative" : "default"}
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
