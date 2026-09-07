"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Ban, BadgeCheck, LoaderCircle, Pencil, Trash } from "lucide-react";
import { toast } from "sonner";

import { useAppUser, usePatientRecord, useUpdateAppUser } from "@/hooks/use-users";
import { useAdminAuth } from "@/components/auth/admin-auth-provider";
import { mutationMessage } from "@/lib/api/callable-error";
import { POLICY_NOTES } from "@/lib/constants";
import { initialsOf, titleCase } from "@/lib/format";

import { AdherenceCard } from "@/components/users/adherence-card";
import { CareCirclePanel } from "@/components/users/care-circle-panel";
import {
  AppointmentsPanel,
  DevicesPanel,
  DoseLogPanel,
  MedicationsPanel,
  VitalsPanel,
} from "@/components/users/clinical-panels";
import { DeleteUserDialog } from "@/components/users/delete-user-dialog";
import { PatientGate, ProfileCard } from "@/components/users/user-detail-parts";
import { SubscriptionsPanel } from "@/components/users/subscriptions-panel";
import { UserFormDialog } from "@/components/users/user-form-dialog";

import { CopyButton } from "@/components/common/copy-button";
import { PolicyNote } from "@/components/common/policy-note";
import { StatusBadge } from "@/components/common/status-badge";
import { ErrorState } from "@/components/common/states";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function UserDetailView({ uid }: { uid: string }) {
  const user = useAppUser(uid);
  const patient = usePatientRecord(uid);
  const update = useUpdateAppUser();
  const { user: signedInAdmin } = useAdminAuth();

  // The backend refuses to disable or delete your own account. Disabling the
  // controls and saying why beats letting an operator click into an error.
  const isSelf = signedInAdmin?.uid === uid;
  const selfHint = isSelf ? "You cannot do this to your own account." : undefined;

  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const detail = user.data;

  // The response is flat: no `auth` wrapper, and isAdmin is a top-level field
  // rather than something dug out of custom claims.
  const displayName = detail?.displayName ?? detail?.profile?.displayName ?? null;
  const email = detail?.email ?? detail?.profile?.email ?? null;

  async function toggleDisabled() {
    if (!detail) return;
    try {
      await update.mutateAsync({ uid, disabled: !detail.disabled });
      toast.success(detail.disabled ? "Account enabled." : "Account disabled.");
    } catch (caught) {
      // The backend refuses to let an admin disable their own account, and
      // says so; show that message rather than a generic failure.
      toast.error(mutationMessage(caught));
    }
  }

  if (user.isError) {
    return (
      <>
        <BackLink />
        <ErrorState message={mutationMessage(user.error)} onRetry={() => void user.refetch()} />
      </>
    );
  }

  return (
    <>
      <BackLink />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Avatar className="size-11">
            {detail?.photoUrl ? <AvatarImage src={detail.photoUrl} alt="" /> : null}
            <AvatarFallback>{initialsOf(displayName, email)}</AvatarFallback>
          </Avatar>

          <div className="min-w-0 space-y-1.5">
            {user.isPending ? (
              <Skeleton className="h-6 w-48" />
            ) : (
              <h1 className="truncate text-xl font-semibold tracking-tight">
                {displayName || email || uid}
              </h1>
            )}

            <div className="flex flex-wrap items-center gap-1.5">
              {email ? <span className="text-sm text-muted-foreground">{email}</span> : null}
              {detail?.emailVerified ? (
                <BadgeCheck className="size-3.5 text-success" aria-label="Email verified" />
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary">{titleCase(detail?.profile?.role ?? null, "—")}</Badge>
              {detail?.isAdmin ? <Badge>Console admin</Badge> : null}
              <StatusBadge status={detail?.disabled ? "disabled" : "active"} />
              <span className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                {uid}
                <CopyButton value={uid} label="Copy user id" />
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditOpen(true)}
            disabled={!detail}
          >
            <Pencil />
            Edit
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => void toggleDisabled()}
            disabled={!detail || update.isPending || isSelf}
            title={selfHint}
          >
            {update.isPending ? <LoaderCircle className="animate-spin" /> : <Ban />}
            {detail?.disabled ? "Enable" : "Disable"}
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteOpen(true)}
            disabled={isSelf}
            title={selfHint}
          >
            <Trash />
            Delete
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="medications">Medications</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="vitals">Vitals</TabsTrigger>
          <TabsTrigger value="care">Care circle</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <ProfileCard loading={user.isPending} user={detail} />
          <PolicyNote variant="locked">{POLICY_NOTES.readOnlyClinical}</PolicyNote>
          <PatientGate query={patient}>
            {(record) => <AdherenceCard adherence={record.adherence} />}
          </PatientGate>
        </TabsContent>

        <TabsContent value="subscriptions">
          {user.isPending ? (
            <Skeleton className="h-56 w-full rounded-xl" />
          ) : (
            <SubscriptionsPanel subscriptions={detail?.subscriptions ?? []} />
          )}
        </TabsContent>

        <TabsContent value="medications" className="space-y-4">
          <PatientGate query={patient}>
            {(record) => (
              <>
                <AdherenceCard adherence={record.adherence} />
                <MedicationsPanel medications={record.medications} />
                <DoseLogPanel logs={record.medicationLogs} />
              </>
            )}
          </PatientGate>
        </TabsContent>

        <TabsContent value="appointments">
          <PatientGate query={patient}>
            {(record) => <AppointmentsPanel appointments={record.appointments} />}
          </PatientGate>
        </TabsContent>

        <TabsContent value="vitals">
          <PatientGate query={patient}>
            {(record) => (
              <VitalsPanel vitals={record.vitals} plans={record.vitalReminderPlans} />
            )}
          </PatientGate>
        </TabsContent>

        <TabsContent value="care">
          <PatientGate query={patient}>
            {(record) => (
              <CareCirclePanel
                uid={uid}
                relationships={record.careRelationships}
                requests={record.connectionRequests}
              />
            )}
          </PatientGate>
        </TabsContent>

        <TabsContent value="devices">
          <PatientGate query={patient}>
            {(record) => <DevicesPanel tokens={record.fcmTokens} />}
          </PatientGate>
        </TabsContent>
      </Tabs>

      {detail ? (
        <UserFormDialog
          mode="edit"
          open={editOpen}
          onOpenChange={setEditOpen}
          user={{
            uid,
            email: detail.email,
            displayName: detail.displayName,
            disabled: detail.disabled,
            role: detail.profile?.role ?? null,
          }}
        />
      ) : null}

      <DeleteUserDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        uid={uid}
        email={email}
      />
    </>
  );
}

function BackLink() {
  return (
    <Link
      href="/users"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" />
      All users
    </Link>
  );
}
