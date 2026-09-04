"use client";

import * as React from "react";
import { LoaderCircle, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";

import { useAdminStatus, useSetAdminRole } from "@/hooks/use-referrals";
import { errorMessage } from "@/lib/api/callable-error";
import { ADMIN_CLAIM, POLICY_NOTES } from "@/lib/constants";

import { PageHeader } from "@/components/common/page-header";
import { PolicyNote } from "@/components/common/policy-note";
import { ErrorState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Grant and revoke console access.
 *
 * Two things shape this screen. `setAdminRole` is keyed by **email**, not uid —
 * there is no lookup callable that reports another account's admin state, so
 * granting is a deliberate write against an address rather than a search-then-
 * toggle. And `getAdminStatus` reports on the **caller**, so it can only
 * confirm your own access.
 *
 * The claim itself is `medbellAdmin`, settable only by this function and read
 * by the Firestore rules. There is no admin field in the database to edit.
 */
export function AdminsView() {
  const status = useAdminStatus();
  const setRole = useSetAdminRole();

  const [email, setEmail] = React.useState("");
  const [grant, setGrant] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [lastResult, setLastResult] = React.useState<{ uid: string; admin: boolean } | null>(
    null,
  );

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    try {
      const result = await setRole.mutateAsync({ email: email.trim(), grant });
      setLastResult(result);
      toast.success(
        result.admin
          ? `Console access granted to ${email.trim()}.`
          : `Console access revoked from ${email.trim()}.`,
      );
    } catch (caught) {
      // The backend refuses to revoke your own access and says so.
      setError(errorMessage(caught));
    }
  }

  return (
    <>
      <PageHeader
        title="Console admins"
        description="Grant or revoke the medbellAdmin claim by email address."
      />

      <PolicyNote variant="locked">
        Console access is the <code className="font-mono">{ADMIN_CLAIM}</code> custom claim on
        the Firebase Auth account. It is set only by the setAdminRole function and is what the
        Firestore rules check — there is no admin flag in the database to edit.{" "}
        {POLICY_NOTES.selfAction}
      </PolicyNote>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Your access</CardTitle>
            <CardDescription>
              getAdminStatus reports on the signed-in caller, so this is the only account it can
              confirm.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {status.isPending ? (
              <Skeleton className="h-8 w-40" />
            ) : status.isError ? (
              <ErrorState
                message={errorMessage(status.error)}
                onRetry={() => void status.refetch()}
              />
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={status.data.isAdmin ? "success" : "muted"}>
                  {status.data.isAdmin ? "Console admin" : "No console access"}
                </Badge>
                <span className="font-mono text-xs text-muted-foreground">
                  {status.data.uid ?? "—"}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Grant or revoke</CardTitle>
            <CardDescription>The account must already exist in Firebase Auth.</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-email">Email address</Label>
                <Input
                  id="admin-email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="admin@medbell.app"
                />
              </div>

              {error ? <ErrorState message={error} /> : null}

              {lastResult ? (
                <p className="text-xs text-muted-foreground">
                  Last change: <span className="font-mono">{lastResult.uid}</span> is now{" "}
                  {lastResult.admin ? "a console admin" : "not a console admin"}.
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  disabled={setRole.isPending || !email.trim()}
                  onClick={() => setGrant(true)}
                >
                  {setRole.isPending && grant ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <ShieldCheck />
                  )}
                  Grant access
                </Button>

                <Button
                  type="submit"
                  variant="destructive"
                  disabled={setRole.isPending || !email.trim()}
                  onClick={() => setGrant(false)}
                >
                  {setRole.isPending && !grant ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <ShieldOff />
                  )}
                  Revoke access
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
