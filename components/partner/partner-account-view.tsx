"use client";

import { useMyPartnerProfile } from "@/hooks/use-partner-portal";
import { titleCase } from "@/lib/format";

import { PortalError, PortalLoading } from "@/components/partner/partner-states";
import { DefinitionList } from "@/components/common/definition-list";
import { PolicyNote } from "@/components/common/policy-note";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Read-only by design. Nothing here is a partner-editable field: the portal has
 * no callable that writes, so offering an input would be a lie.
 */
export function PartnerAccountView() {
  const { data, isPending, isError, error, refetch } = useMyPartnerProfile();

  if (isPending) return <PortalLoading rows={2} />;
  if (isError) return <PortalError error={error} onRetry={() => void refetch()} />;

  return (
    <>
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Account</h1>
        <p className="text-sm text-muted-foreground">Your details as MedBell holds them.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Your details</CardTitle>
        </CardHeader>
        <CardContent>
          <DefinitionList
            columns={2}
            items={[
              { label: "Name", value: data.name || "—" },
              { label: "Business", value: data.companyName || "—" },
              {
                label: "Username",
                value: data.username ? (
                  <code className="font-mono text-sm">{data.username}</code>
                ) : (
                  "—"
                ),
              },
              {
                label: "Account status",
                value:
                  data.status === "active" ? (
                    <Badge variant="success">Active</Badge>
                  ) : (
                    <Badge variant="warning">{titleCase(data.status)}</Badge>
                  ),
              },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How you get paid</CardTitle>
          <CardDescription>
            You earn {data.commissionPercent}% of every payment your customers make, renewals
            included.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DefinitionList
            columns={2}
            items={[
              { label: "Method", value: titleCase(data.payoutMethod) },
              {
                label: "Paid to",
                value: data.payoutDetails ? (
                  <span className="font-mono text-sm break-all">{data.payoutDetails}</span>
                ) : (
                  "Not set up yet"
                ),
              },
              { label: "Currency", value: data.primaryCurrency },
            ]}
          />

          <PolicyNote variant="locked">
            To change your username, password, or where payments go, contact MedBell — these are
            set for you, and there is no self-service reset because a partner login has no email
            address attached.
          </PolicyNote>
        </CardContent>
      </Card>
    </>
  );
}
