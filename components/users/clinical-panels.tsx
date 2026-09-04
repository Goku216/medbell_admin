"use client";

import { Activity, Calendar, Heart, Pill, Smartphone } from "lucide-react";

import type {
  Appointment,
  FcmToken,
  Medication,
  MedicationLog,
  VitalRecord,
  VitalReminderPlan,
} from "@/lib/api/types";
import { formatDate, formatDateTime, titleCase } from "@/lib/format";

import { StatusBadge } from "@/components/common/status-badge";
import { EmptyState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
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

function PanelShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="px-0 pb-0">{children}</CardContent>
    </Card>
  );
}

export function MedicationsPanel({ medications }: { medications: Medication[] }) {
  return (
    <PanelShell
      title="Medications"
      description="Read-only. Medications are created and edited by the patient in the app."
    >
      {medications.length === 0 ? (
        <EmptyState
          className="m-5"
          icon={<Pill className="size-6" />}
          title="No medications"
          description="This user has not added any medications."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Medication</TableHead>
              <TableHead>Dosage</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Started</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {medications.map((medication) => (
              <TableRow key={medication.id}>
                <TableCell>
                  <span className="font-medium">{medication.name ?? "—"}</span>
                  {medication.instructions ? (
                    <span className="block text-xs text-muted-foreground">
                      {medication.instructions}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {[medication.dosage, medication.form].filter(Boolean).join(" · ") || "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {medication.times?.length
                    ? medication.times.join(", ")
                    : titleCase(medication.frequency)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={medication.active === false ? "inactive" : "active"} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {formatDate(medication.startDate ?? medication.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </PanelShell>
  );
}

export function DoseLogPanel({ logs }: { logs: MedicationLog[] }) {
  return (
    <PanelShell title="Recent dose log" description="Most recent entries first.">
      {logs.length === 0 ? (
        <EmptyState
          className="m-5"
          icon={<Activity className="size-6" />}
          title="No dose logs"
          description="Logs appear once reminders start firing for this user."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Scheduled</TableHead>
              <TableHead>Medication</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Taken at</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.slice(0, 50).map((log) => (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {formatDateTime(log.scheduledAt ?? log.createdAt)}
                </TableCell>
                <TableCell className="max-w-48 truncate">
                  {log.medicationName ?? log.medicationId ?? "—"}
                </TableCell>
                <TableCell>
                  <StatusBadge status={log.status ?? (log.takenAt ? "taken" : "pending")} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {formatDateTime(log.takenAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </PanelShell>
  );
}

export function AppointmentsPanel({ appointments }: { appointments: Appointment[] }) {
  return (
    <PanelShell title="Appointments" description="Read-only.">
      {appointments.length === 0 ? (
        <EmptyState
          className="m-5"
          icon={<Calendar className="size-6" />}
          title="No appointments"
          description="This user has not scheduled any appointments."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Appointment</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {appointments.map((appointment) => (
              <TableRow key={appointment.id}>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {formatDateTime(appointment.appointmentDateTime)}
                </TableCell>
                <TableCell className="max-w-48 truncate font-medium">
                  {appointment.title ?? "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {[appointment.doctorName, appointment.specialty]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </TableCell>
                <TableCell className="max-w-40 truncate text-sm text-muted-foreground">
                  {appointment.location ?? "—"}
                </TableCell>
                <TableCell>
                  <StatusBadge status={appointment.status ?? "scheduled"} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </PanelShell>
  );
}

export function VitalsPanel({
  vitals,
  plans,
}: {
  vitals: VitalRecord[];
  plans: VitalReminderPlan[];
}) {
  return (
    <div className="space-y-4">
      <PanelShell title="Vitals" description="Most recent readings first. Read-only.">
        {vitals.length === 0 ? (
          <EmptyState
            className="m-5"
            icon={<Heart className="size-6" />}
            title="No vitals recorded"
            description="Readings appear here once the user logs them in the app."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recorded</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reading</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vitals.slice(0, 60).map((vital) => (
                <TableRow key={vital.id}>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatDateTime(vital.recordedAt ?? vital.createdAt)}
                  </TableCell>
                  <TableCell>{titleCase(vital.type)}</TableCell>
                  <TableCell className="tabular font-medium">
                    {vital.secondaryValue
                      ? `${vital.value ?? "—"}/${vital.secondaryValue}`
                      : (vital.value ?? "—")}
                    {vital.unit ? (
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        {vital.unit}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="max-w-56 truncate text-sm text-muted-foreground">
                    {vital.note ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </PanelShell>

      <PanelShell title="Vital reminder plans">
        {plans.length === 0 ? (
          <EmptyState className="m-5" title="No reminder plans" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Times</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell>{titleCase(plan.type)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {titleCase(plan.frequency)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {plan.times?.length ? plan.times.join(", ") : "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={plan.active === false ? "inactive" : "active"} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </PanelShell>
    </div>
  );
}

export function DevicesPanel({ tokens }: { tokens: FcmToken[] }) {
  return (
    <PanelShell
      title="Registered devices"
      description="FCM tokens under this user, used to deliver reminders."
    >
      {tokens.length === 0 ? (
        <EmptyState
          className="m-5"
          icon={<Smartphone className="size-6" />}
          title="No registered devices"
          description="Without a device token this user cannot receive reminder notifications."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Platform</TableHead>
              <TableHead>Device</TableHead>
              <TableHead>App version</TableHead>
              <TableHead>Last seen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tokens.map((token) => (
              <TableRow key={token.id}>
                <TableCell>
                  <Badge variant="secondary">{titleCase(token.platform, "Unknown")}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {token.deviceModel ?? "—"}
                </TableCell>
                <TableCell className="tabular text-sm text-muted-foreground">
                  {token.appVersion ?? "—"}
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {formatDateTime(token.updatedAt ?? token.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </PanelShell>
  );
}
