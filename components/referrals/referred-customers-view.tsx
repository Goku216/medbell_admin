"use client";

import * as React from "react";
import Link from "next/link";
import { Building2 } from "lucide-react";

import { useReferredUsers } from "@/hooks/use-referrals";
import { useLimit } from "@/hooks/use-limit";
import { errorMessage } from "@/lib/api/callable-error";
import { POLICY_NOTES } from "@/lib/constants";
import { formatDate, titleCase } from "@/lib/format";

import { PartnerPicker } from "@/components/referrals/partner-picker";
import { LimitFooter } from "@/components/common/load-more";
import { PageHeader } from "@/components/common/page-header";
import { PolicyNote } from "@/components/common/policy-note";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function ReferredCustomersView({
  partnerId: fixedPartnerId,
}: { partnerId?: string } = {}) {
  const [partnerId, setPartnerId] = React.useState<string | null>(fixedPartnerId ?? null);
  const { limit, raise, atCap } = useLimit();

  // listReferredUsers requires a partnerId — there is no cross-partner listing,
  // so the screen asks for one rather than firing a request that would fail.
  const query = useReferredUsers(partnerId, limit);
  const customers = query.data?.users ?? [];

  return (
    <>
      {fixedPartnerId ? null : (
        <>
          <PageHeader
            title="Referred customers"
            description="Users attributed to a partner, with the discount they redeemed and when they first purchased."
          />
          <PolicyNote variant="locked">
            {POLICY_NOTES.partnerLock} {POLICY_NOTES.oneDiscount}
          </PolicyNote>
        </>
      )}

      <Card>
        <CardContent className="px-0 pb-0">
          {fixedPartnerId ? null : (
            <div className="flex flex-wrap items-end gap-3 px-3 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="customers-partner" className="text-xs text-muted-foreground">
                  Partner
                </Label>
                <PartnerPicker
                  id="customers-partner"
                  value={partnerId}
                  onChange={setPartnerId}
                  placeholder="Choose a partner"
                  includeAll={false}
                  className="w-56"
                />
              </div>
            </div>
          )}

          {!partnerId ? (
            <EmptyState
              className="m-3"
              icon={<Building2 className="size-6" />}
              title="Choose a partner"
              description="Referred customers are listed per partner — the backend has no cross-partner view."
            />
          ) : query.isError ? (
            <div className="p-3">
              <ErrorState
                message={errorMessage(query.error)}
                onRetry={() => void query.refetch()}
              />
            </div>
          ) : query.isPending ? (
            <TableSkeleton columns={6} />
          ) : customers.length === 0 ? (
            <EmptyState
              className="m-3"
              title="No referred customers"
              description="Customers appear once someone signs up with one of this partner's codes."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Attribution</TableHead>
                    <TableHead>Attributed</TableHead>
                    <TableHead>First purchase</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={`${customer.userId}-${customer.code}`}>
                      <TableCell className="max-w-56">
                        {customer.userId ? (
                          <Link
                            href={`/users/${customer.userId}`}
                            className="block truncate font-medium hover:underline"
                          >
                            {customer.displayName || customer.email || customer.userId}
                          </Link>
                        ) : (
                          <span className="block truncate">
                            {customer.displayName || customer.email || "—"}
                          </span>
                        )}
                        {customer.displayName && customer.email ? (
                          <span className="block truncate text-xs text-muted-foreground">
                            {customer.email}
                          </span>
                        ) : null}
                      </TableCell>

                      <TableCell>
                        <code className="font-mono text-xs">{customer.code ?? "—"}</code>
                      </TableCell>

                      <TableCell className="text-sm text-muted-foreground">
                        {titleCase(customer.source)}
                      </TableCell>

                      <TableCell>
                        {customer.discountRedeemed ? (
                          <Badge variant="success">
                            Redeemed
                            {customer.discountPlan
                              ? ` · ${titleCase(customer.discountPlan)}`
                              : ""}
                          </Badge>
                        ) : customer.discountApplied ? (
                          <Badge variant="warning">Applied, not redeemed</Badge>
                        ) : (
                          <Badge variant="muted">None</Badge>
                        )}
                      </TableCell>

                      <TableCell>
                        {customer.locked ? (
                          <Badge variant="secondary">Locked</Badge>
                        ) : (
                          <Badge variant="outline">Not locked</Badge>
                        )}
                      </TableCell>

                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(customer.attributedAt)}
                      </TableCell>

                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(customer.firstPurchaseAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <LimitFooter
                noun="customer"
                count={customers.length}
                limit={limit}
                atCap={atCap}
                isFetching={query.isFetching}
                onRaise={raise}
              />
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}
