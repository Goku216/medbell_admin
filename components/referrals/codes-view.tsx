"use client";

import * as React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

import { useReferralCodes } from "@/hooks/use-referrals";
import { useLimit } from "@/hooks/use-limit";
import { errorMessage } from "@/lib/api/callable-error";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";
import type { ReferralCode } from "@/lib/api/types";

import { CodeFormDialog } from "@/components/referrals/code-form-dialog";
import { PartnerPicker } from "@/components/referrals/partner-picker";
import { ReferralLink } from "@/components/referrals/referral-link";
import { LimitFooter } from "@/components/common/load-more";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export function CodesView() {
  const [partnerId, setPartnerId] = React.useState<string | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ReferralCode | null>(null);

  const { limit, raise, atCap } = useLimit();
  const query = useReferralCodes({ partnerId, limit });
  const codes = query.data?.codes ?? [];

  return (
    <>
      <PageHeader
        title="Referral codes"
        description="Each code belongs to one partner. Share the link — it carries the code through signup so attribution lands on the right partner."
        actions={
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus />
            New code
          </Button>
        }
      />

      <Card>
        <CardContent className="px-0 pb-0">
          <div className="flex flex-wrap items-end gap-3 px-3 py-3">
            <div className="space-y-1.5">
              <Label htmlFor="codes-partner" className="text-xs text-muted-foreground">
                Partner
              </Label>
              <PartnerPicker
                id="codes-partner"
                value={partnerId}
                onChange={setPartnerId}
                className="w-56"
              />
            </div>
          </div>

          {query.isError ? (
            <div className="p-3">
              <ErrorState
                message={errorMessage(query.error)}
                onRetry={() => void query.refetch()}
              />
            </div>
          ) : query.isPending ? (
            <TableSkeleton columns={6} />
          ) : codes.length === 0 ? (
            <EmptyState
              className="m-3"
              title="No referral codes"
              description="Create a code to give a partner something to share."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code and link</TableHead>
                    <TableHead>Partner</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Redemptions</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead>Valid until</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {codes.map((code) => (
                    <TableRow key={code.code}>
                      <TableCell className="max-w-72">
                        <ReferralLink code={code.code} referralLink={code.referralLink} />
                      </TableCell>

                      <TableCell className="max-w-40 truncate">
                        <Link
                          href={`/referrals/partners/${code.partnerId}`}
                          className="hover:underline"
                        >
                          {code.partnerId}
                        </Link>
                      </TableCell>

                      <TableCell>
                        <CodeStatus code={code} />
                      </TableCell>

                      <TableCell className="tabular text-right">
                        {formatNumber(code.redemptionCount ?? 0)}
                        {code.maxRedemptions ? (
                          <span className="text-muted-foreground">
                            {" "}
                            / {code.maxRedemptions}
                          </span>
                        ) : null}
                      </TableCell>

                      <TableCell className="tabular text-right text-sm text-muted-foreground">
                        {code.commissionPercent != null
                          ? formatPercent(code.commissionPercent, 0)
                          : "Partner default"}
                      </TableCell>

                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {code.validUntil ? formatDate(code.validUntil) : "No end date"}
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditing(code);
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
                noun="code"
                count={codes.length}
                limit={limit}
                atCap={atCap}
                isFetching={query.isFetching}
                onRaise={raise}
              />
            </>
          )}
        </CardContent>
      </Card>

      <CodeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        code={editing}
        defaultPartnerId={partnerId}
      />
    </>
  );
}

/**
 * A code can be `active` and still unusable — past its end date, not yet
 * started, or at its redemption cap. Showing only the stored status would
 * mislead an operator wondering why a link stopped working.
 */
function CodeStatus({ code }: { code: ReferralCode }) {
  // Read the clock once at mount rather than during every render: the rule
  // against impure render also spares the badges from flickering on refetch.
  const [now] = React.useState(() => Date.now());
  const notStarted = code.validFrom != null && code.validFrom > now;
  const expired = code.validUntil != null && code.validUntil < now;
  const exhausted =
    code.maxRedemptions != null && (code.redemptionCount ?? 0) >= code.maxRedemptions;

  if (code.status !== "active") return <StatusBadge status={code.status} />;

  if (expired || exhausted || notStarted) {
    return (
      <div className="flex flex-col items-start gap-1">
        <StatusBadge status="active" />
        <Badge variant="warning">
          {expired ? "Past end date" : exhausted ? "Cap reached" : "Not started"}
        </Badge>
      </div>
    );
  }

  return <StatusBadge status="active" />;
}
