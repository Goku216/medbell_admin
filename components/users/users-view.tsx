"use client";

import * as React from "react";
import Link from "next/link";
import { Search, UserPlus, X } from "lucide-react";

import { flattenUsers, useAppUsers } from "@/hooks/use-users";
import { errorMessage } from "@/lib/api/callable-error";
import { formatDate, titleCase } from "@/lib/format";

import { UserFormDialog } from "@/components/users/user-form-dialog";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { LoadMore } from "@/components/common/load-more";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
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

export function UsersView() {
  const [draft, setDraft] = React.useState("");
  const [email, setEmail] = React.useState<string | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);

  const query = useAppUsers({ email });
  const users = flattenUsers(query.data?.pages);

  return (
    <>
      <PageHeader
        title="Users"
        description="Every MedBell account. The lookup is an exact email match — Firebase Auth has no substring search, so a partial address returns nothing rather than a guess. Everything else is paging."
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <UserPlus />
            New user
          </Button>
        }
      />

      <Card>
        <CardContent className="px-0 pb-0">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setEmail(draft.trim() || null);
            }}
            className="flex flex-wrap items-center gap-2 px-3 py-3"
          >
            <div className="relative min-w-0 flex-1 sm:max-w-sm">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Jump to exact email address"
                type="email"
                className="pl-8"
                aria-label="Jump to an exact email address"
              />
            </div>

            <Button type="submit" size="sm" variant="secondary">
              Look up
            </Button>

            {email ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setDraft("");
                    setEmail(null);
                  }}
                >
                  <X />
                  Clear
                </Button>
                <Badge variant="outline" className="ml-auto">
                  Exact match: {email}
                </Badge>
              </>
            ) : null}
          </form>

          {query.isError ? (
            <div className="p-3">
              <ErrorState
                message={errorMessage(query.error)}
                onRetry={() => void query.refetch()}
              />
            </div>
          ) : query.isPending ? (
            <TableSkeleton columns={5} />
          ) : users.length === 0 ? (
            <EmptyState
              className="m-3"
              title={email ? "No account with that exact address" : "No users yet"}
              description={
                email
                  ? "Firebase Auth matches the full address only. Check for typos, or clear the lookup to page through everyone."
                  : "Accounts appear here as people sign up in the app."
              }
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Sign-in</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last seen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.uid}>
                      <TableCell className="max-w-64">
                        <Link
                          href={`/users/${user.uid}`}
                          className="block truncate font-medium hover:underline"
                        >
                          {user.displayName || user.email || user.uid}
                        </Link>
                        {user.displayName && user.email ? (
                          <span className="block truncate text-xs text-muted-foreground">
                            {user.email}
                          </span>
                        ) : null}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">
                            {titleCase(user.profile?.role ?? null, "—")}
                          </span>
                          {user.isAdmin ? <Badge variant="default">Admin</Badge> : null}
                        </div>
                      </TableCell>

                      <TableCell>
                        <StatusBadge status={user.disabled ? "disabled" : "active"} />
                      </TableCell>

                      <TableCell className="max-w-40">
                        <div className="flex flex-wrap gap-1">
                          {user.providers.length > 0 ? (
                            user.providers.map((provider) => (
                              <Badge key={provider} variant="outline">
                                {titleCase(provider.replace(".com", ""))}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(user.createdAt)}
                      </TableCell>

                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(user.lastSignInAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <LoadMore
                noun="user"
                count={users.length}
                hasNextPage={Boolean(query.hasNextPage)}
                isFetchingNextPage={query.isFetchingNextPage}
                fetchNextPage={() => void query.fetchNextPage()}
              />
            </>
          )}
        </CardContent>
      </Card>

      <UserFormDialog mode="create" open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
