"use client";

import * as React from "react";
import { Users } from "lucide-react";

import { useMyReferredUsers } from "@/hooks/use-partner-portal";
import { useLimit } from "@/hooks/use-limit";
import { formatDate, formatNumber, titleCase } from "@/lib/format";
import { PLAN_LABELS } from "@/lib/constants";

import { PortalEmpty, PortalError, PortalLoading } from "@/components/partner/partner-states";
import { LimitFooter } from "@/components/common/load-more";
import { PolicyNote } from "@/components/common/policy-note";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const FILTERS = [
  { value: "all", label: "Everyone" },
  { value: "converted", label: "Subscribed" },
  { value: "not-converted", label: "Not yet subscribed" },
] as const;

/**
 * The de-identified customer list.
 *
 * There is no user id, no name and no full email in this response, by design.
 * The masked address exists only so a partner can match a row when someone
 * says "I used your code" — it is not a contact address, and the UI says so
 * rather than leaving someone to try emailing it.
 */
export function PartnerCustomersView() {
  const [filter, setFilter] = React.useState<(typeof FILTERS)[number]["value"]>("all");
  const { limit, raise, atCap } = useLimit();
  const { data, isPending, isError, error, refetch, isFetching } = useMyReferredUsers(limit);

  if (isPending) return <PortalLoading />;
  if (isError) return <PortalError error={error} onRetry={() => void refetch()} />;

  const all = data.customers ?? [];
  const rows =
    filter === "all"
      ? all
      : all.filter((row) => (filter === "converted" ? row.converted : !row.converted));

  return (
    <>
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Customers</h1>
        <p className="text-sm text-muted-foreground">
          Everyone who signed up with one of your codes.
        </p>
      </header>

      {all.length === 0 ? (
        <PortalEmpty
          icon={<Users className="size-6" />}
          title="No customers yet"
          description="When someone signs up with your code they will appear here, whether or not they subscribe straight away."
        />
      ) : (
        <>
          <PolicyNote variant="locked">
            Customers are shown anonymously. The partial address is only here so you can match
            someone who tells you they used your code — it is not an address you can write to,
            and MedBell will not share customer contact details.
          </PolicyNote>

          <Card>
            <CardContent className="px-0 pb-0">
              <div className="flex flex-wrap items-center gap-2 px-3 py-3">
                <Select
                  value={filter}
                  onValueChange={(next) => setFilter(next as typeof filter)}
                >
                  <SelectTrigger size="sm" className="w-52">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FILTERS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <p className="text-xs text-muted-foreground">
                  {formatNumber(rows.length)} of {formatNumber(all.length)} shown
                </p>
              </div>

              {rows.length === 0 ? (
                <p className="px-3 pb-4 text-sm text-muted-foreground">
                  Nobody matches that filter yet.
                </p>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>First payment</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {rows.map((row, index) => (
                        <TableRow key={`${row.code}-${row.joinedAt}-${index}`}>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {row.customer ?? "Hidden"}
                          </TableCell>
                          <TableCell>
                            <code className="font-mono text-xs">{row.code ?? "—"}</code>
                          </TableCell>
                          <TableCell>
                            {row.converted ? (
                              <Badge variant="success">Subscribed</Badge>
                            ) : (
                              <Badge variant="muted">Signed up</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {row.plan ? (PLAN_LABELS[row.plan] ?? titleCase(row.plan)) : "—"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                            {formatDate(row.joinedAt)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                            {formatDate(row.firstPurchaseAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <LimitFooter
                    noun="customer"
                    count={all.length}
                    limit={limit}
                    atCap={atCap}
                    isFetching={isFetching}
                    onRaise={raise}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}
