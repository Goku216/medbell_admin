"use client";

import * as React from "react";

import { useReferralAudit } from "@/hooks/use-referrals";
import { useLimit } from "@/hooks/use-limit";
import { errorMessage } from "@/lib/api/callable-error";
import { formatDateTime, titleCase, truncateId } from "@/lib/format";
import type { AuditEntry } from "@/lib/api/types";

import { PartnerPicker } from "@/components/referrals/partner-picker";
import { LimitFooter } from "@/components/common/load-more";
import { Money } from "@/components/common/money";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function AuditView({ partnerId: fixedPartnerId }: { partnerId?: string } = {}) {
  const [partnerId, setPartnerId] = React.useState<string | null>(fixedPartnerId ?? null);
  const [actionFilter, setActionFilter] = React.useState("");
  const [inspecting, setInspecting] = React.useState<AuditEntry | null>(null);

  const { limit, raise, atCap } = useLimit();

  // listReferralAudit filters by partner only, so the action filter below is
  // applied here over what came back rather than pretending to be a query.
  const query = useReferralAudit({ partnerId, limit });
  const loaded = query.data?.entries ?? [];

  const needle = actionFilter.trim().toLowerCase();
  const entries = needle
    ? loaded.filter((entry) =>
        [entry.action, entry.summary, entry.targetId]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(needle)),
      )
    : loaded;

  return (
    <>
      {fixedPartnerId ? null : (
        <PageHeader
          title="Audit trail"
          description="An append-only record written by the callables themselves. Entries cannot be edited or removed from this console."
        />
      )}

      <Card>
        <CardContent className="px-0 pb-0">
          <div className="flex flex-wrap items-end gap-3 px-3 py-3">
            {fixedPartnerId ? null : (
              <div className="space-y-1.5">
                <Label htmlFor="audit-partner" className="text-xs text-muted-foreground">
                  Partner
                </Label>
                <PartnerPicker
                  id="audit-partner"
                  value={partnerId}
                  onChange={setPartnerId}
                  className="w-52"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="audit-action" className="text-xs text-muted-foreground">
                Filter loaded entries
              </Label>
              <Input
                id="audit-action"
                value={actionFilter}
                onChange={(event) => setActionFilter(event.target.value)}
                placeholder="e.g. markCommissionsPaid"
                className="h-8 w-64"
              />
            </div>

            <p className="pb-1.5 text-xs text-muted-foreground">
              The audit callable filters by partner only — this narrows the {loaded.length}{" "}
              entries already loaded.
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
            <TableSkeleton columns={6} />
          ) : entries.length === 0 ? (
            <EmptyState
              className="m-3"
              title="No audit entries"
              description="Entries are appended whenever a referral callable changes something."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Summary</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDateTime(entry.createdAt)}
                      </TableCell>

                      <TableCell>
                        <Badge variant="secondary" className="font-mono text-[11px]">
                          {entry.action}
                        </Badge>
                      </TableCell>

                      <TableCell className="max-w-44 truncate text-sm">
                        {entry.actorEmail ?? truncateId(entry.actorUid)}
                      </TableCell>

                      <TableCell className="max-w-40 truncate text-sm text-muted-foreground">
                        {entry.targetType ? `${titleCase(entry.targetType)} · ` : ""}
                        {truncateId(entry.targetId)}
                      </TableCell>

                      <TableCell className="max-w-72 truncate text-sm">
                        {entry.summary ?? "—"}
                      </TableCell>

                      <TableCell className="text-right">
                        {entry.amountMinor != null ? (
                          <Money minor={entry.amountMinor} />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setInspecting(entry)}>
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <LimitFooter
                noun="entry"
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

      <AuditDetailDialog entry={inspecting} onClose={() => setInspecting(null)} />
    </>
  );
}

function AuditDetailDialog({
  entry,
  onClose,
}: {
  entry: AuditEntry | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(entry)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm">{entry?.action}</DialogTitle>
          <DialogDescription>
            {formatDateTime(entry?.createdAt)} · {entry?.actorEmail ?? entry?.actorUid ?? "—"}
          </DialogDescription>
        </DialogHeader>

        {entry?.summary ? <p className="text-sm">{entry.summary}</p> : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <JsonBlock label="Before" value={entry?.before} />
          <JsonBlock label="After" value={entry?.after} />
        </div>

        {entry?.metadata ? <JsonBlock label="Metadata" value={entry.metadata} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <pre className="max-h-64 overflow-auto rounded-md border border-border bg-muted/50 p-2 font-mono text-[11px] leading-relaxed">
        {value ? JSON.stringify(value, null, 2) : "—"}
      </pre>
    </div>
  );
}
