"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";

import { usePartners } from "@/hooks/use-referrals";
import { useLimit } from "@/hooks/use-limit";
import { errorMessage } from "@/lib/api/callable-error";
import { formatDate, formatPercent, titleCase } from "@/lib/format";
import type { Partner } from "@/lib/api/types";

import { PartnerFormDialog } from "@/components/referrals/partner-form-dialog";
import { LimitFooter } from "@/components/common/load-more";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function PartnersView() {
  const [search, setSearch] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Partner | null>(null);

  const { limit, raise, atCap } = useLimit();
  const query = usePartners({ limit });

  // listPartners has no search parameter, so filtering is done here over what
  // the server returned — and the UI says so rather than implying a full search.
  const loaded = query.data?.partners ?? [];
  const needle = search.trim().toLowerCase();
  const partners = needle
    ? loaded.filter((partner) =>
        [partner.name, partner.companyName, partner.contactEmail]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(needle)),
      )
    : loaded;

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  return (
    <>
      <PageHeader
        title="Partners"
        description="Everyone who can refer customers. Revenue, commission and payable figures are computed server-side from stored transactions."
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus />
            New partner
          </Button>
        }
      />

      <Card>
        <CardContent className="px-0 pb-0">
          <div className="flex flex-wrap items-center gap-2 px-3 py-3">
            <div className="relative min-w-0 flex-1 sm:max-w-sm">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Filter the loaded partners"
                className="pl-8"
                aria-label="Filter the loaded partners"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Filters the {loaded.length} partners loaded here — the backend has no partner
              search.
            </p>
          </div>

          {query.isError ? (
            <div className="p-3">
              <ErrorState
                message={errorMessage(query.error)}
                onRetry={() => void query.refetch()}
              />
            </div>
          ) : query.isPending ? (
            <TableSkeleton columns={7} />
          ) : partners.length === 0 ? (
            <EmptyState
              className="m-3"
              title="No partners yet"
              description="Create a partner, then issue them a referral code."
              action={
                <Button size="sm" onClick={openCreate}>
                  <Plus />
                  New partner
                </Button>
              }
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Partner</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead>Base</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {partners.map((partner) => (
                    <TableRow key={partner.id}>
                      <TableCell className="max-w-56">
                        <Link
                          href={`/referrals/partners/${partner.id}`}
                          className="block truncate font-medium hover:underline"
                        >
                          {partner.name}
                        </Link>
                        {partner.contactEmail ? (
                          <span className="block truncate text-xs text-muted-foreground">
                            {partner.contactEmail}
                          </span>
                        ) : null}
                      </TableCell>

                      <TableCell>
                        <StatusBadge status={partner.status} />
                      </TableCell>

                      {/* Revenue and commission totals are not on the partner
                          document — they come from getPartnerAnalytics, which
                          is per-partner. The detail page shows them. */}
                      <TableCell className="tabular text-right">
                        {formatPercent(partner.commissionPercent, 0)}
                      </TableCell>

                      <TableCell className="text-sm text-muted-foreground">
                        {titleCase(partner.commissionBase)}
                      </TableCell>

                      <TableCell className="text-sm text-muted-foreground">
                        {partner.primaryCurrency}
                      </TableCell>

                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(partner.createdAt)}
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditing(partner);
                            setFormOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <LimitFooter
                noun="partner"
                count={loaded.length}
                limit={limit}
                atCap={atCap}
                isFetching={query.isFetching}
                onRaise={raise}
              />
            </>
          )}
        </CardContent>
      </Card>

      <PartnerFormDialog open={formOpen} onOpenChange={setFormOpen} partner={editing} />
    </>
  );
}
