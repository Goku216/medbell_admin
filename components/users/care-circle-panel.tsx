"use client";

import Link from "next/link";
import { Users } from "lucide-react";

import type { CareRelationship, ConnectionRequest } from "@/lib/api/types";
import { formatDate, titleCase, truncateId } from "@/lib/format";

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

/**
 * The care circle from this user's point of view: who cares for them, and who
 * they care for. Both directions come from the same collection, so each row is
 * tagged rather than split into two unrelated lists.
 */
export function CareCirclePanel({
  relationships,
  requests,
  uid,
}: {
  relationships: CareRelationship[];
  requests: ConnectionRequest[];
  uid: string;
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Care circle</CardTitle>
          <CardDescription>
            Accepted links between this account and the people in it.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {relationships.length === 0 ? (
            <EmptyState
              className="m-5"
              icon={<Users className="size-6" />}
              title="No care-circle links"
              description="This user is neither caring for anyone nor cared for through MedBell."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Relationship</TableHead>
                  <TableHead>Counterpart</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Linked</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relationships.map((link) => {
                  const isPatient = link.direction === "as-patient";
                  const counterpartId = isPatient ? link.caregiverId : link.patientId;
                  const counterpartName = isPatient
                    ? (link.caregiverName ?? link.caregiverEmail)
                    : (link.patientName ?? link.patientEmail);

                  return (
                    <TableRow key={`${link.id}-${link.direction}`}>
                      <TableCell>
                        <Badge variant={isPatient ? "secondary" : "default"}>
                          {isPatient ? "Cared for by" : "Caregiver for"}
                        </Badge>
                      </TableCell>

                      <TableCell className="max-w-56">
                        {counterpartId && counterpartId !== uid ? (
                          <Link
                            href={`/users/${counterpartId}`}
                            className="block truncate hover:underline"
                          >
                            {counterpartName ?? truncateId(counterpartId)}
                          </Link>
                        ) : (
                          <span className="truncate">{counterpartName ?? "—"}</span>
                        )}
                      </TableCell>

                      <TableCell className="text-sm text-muted-foreground">
                        {link.permissions?.length
                          ? link.permissions.map((item) => titleCase(item)).join(", ")
                          : "—"}
                      </TableCell>

                      <TableCell>
                        <StatusBadge status={link.status ?? "active"} />
                      </TableCell>

                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(link.createdAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connection requests</CardTitle>
          <CardDescription>Invitations sent and received by this account.</CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {requests.length === 0 ? (
            <EmptyState className="m-5" title="No connection requests" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Direction</TableHead>
                  <TableHead>Counterpart</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={`${request.id}-${request.direction}`}>
                    <TableCell>
                      <Badge variant="outline">
                        {request.direction === "sent" ? "Sent" : "Received"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-56 truncate text-sm">
                      {/* Four party fields exist; show the one that identifies
                          the other side of this request. */}
                      {request.direction === "sent"
                        ? (request.targetEmailLower ??
                          truncateId(
                            request.caregiverId === uid
                              ? request.patientId
                              : request.caregiverId,
                          ))
                        : truncateId(request.createdBy)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={request.status ?? "pending"} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDate(request.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
