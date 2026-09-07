"use client";

import * as React from "react";
import { CircleAlert, KeyRound, LoaderCircle, RefreshCw, Trash, UserPlus } from "lucide-react";
import { toast } from "sonner";

import {
  useCreatePartnerLogin,
  useDeletePartnerLogin,
  usePartnerLogin,
  useUpdatePartnerLogin,
} from "@/hooks/use-referrals";
import { mutationMessage } from "@/lib/api/callable-error";
import { formatDateTime } from "@/lib/format";
import {
  generatePassword,
  normaliseUsername,
  partnerLoginEmail,
  validatePartnerPassword,
  validateUsername,
} from "@/lib/partner/username";
import type { Partner } from "@/lib/api/types";

import { CopyButton } from "@/components/common/copy-button";
import { DefinitionList } from "@/components/common/definition-list";
import { PolicyNote } from "@/components/common/policy-note";
import { StatusBadge } from "@/components/common/status-badge";
import { EmptyState, ErrorState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

/**
 * Portal login for one partner.
 *
 * A login is optional and separate from the partner record: creating, changing
 * or deleting it never touches their codes, customers or earnings. Passwords
 * are never stored anywhere the console can read, so the only moment a password
 * is visible is immediately after an operator sets one.
 */
export function PartnerLoginPanel({ partner }: { partner: Partner }) {
  const query = usePartnerLogin(partner.id);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [passwordOpen, setPasswordOpen] = React.useState(false);
  const [usernameOpen, setUsernameOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const login = query.data?.login ?? null;
  const orphaned = query.data?.orphaned === true;

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>Portal login</CardTitle>
            <CardDescription>
              Lets this partner sign in to the partner portal and see their own earnings.
              Optional, and independent of their codes and commissions.
            </CardDescription>
          </div>

          {login ? (
            <Button variant="outline" size="sm" onClick={() => setPasswordOpen(true)}>
              <KeyRound />
              Set password
            </Button>
          ) : null}
        </CardHeader>

        <CardContent className="space-y-4">
          {query.isPending ? (
            <Skeleton className="h-32 w-full rounded-lg" />
          ) : query.isError ? (
            <ErrorState
              message={mutationMessage(query.error)}
              onRetry={() => void query.refetch()}
            />
          ) : orphaned ? (
            <>
              <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2.5">
                <CircleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
                <p className="text-xs leading-relaxed">
                  This partner points at a sign-in account that no longer exists. Nothing can
                  sign in, and no data is at risk — create a login to restore access.
                </p>
              </div>
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <UserPlus />
                Create login
              </Button>
            </>
          ) : login ? (
            <>
              <DefinitionList
                columns={2}
                items={[
                  {
                    label: "Username",
                    value: (
                      <span className="flex items-center gap-1">
                        <code className="font-mono text-sm">{login.username}</code>
                        <CopyButton value={login.username} label="Copy username" />
                      </span>
                    ),
                  },
                  {
                    label: "Access",
                    value: <StatusBadge status={login.disabled ? "disabled" : "active"} />,
                  },
                  { label: "Created", value: formatDateTime(login.createdAt) },
                  {
                    label: "Last signed in",
                    value: login.lastSignInAt ? (
                      formatDateTime(login.lastSignInAt)
                    ) : (
                      <Badge variant="muted">Never signed in</Badge>
                    ),
                  },
                  {
                    label: "Internal sign-in address",
                    value: (
                      <span className="font-mono text-xs text-muted-foreground">
                        {login.loginEmail}
                      </span>
                    ),
                    hint: "Not a mailbox. Nothing is ever sent to it.",
                  },
                ]}
              />

              <SuspendToggle partnerId={partner.id} disabled={login.disabled} />

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setUsernameOpen(true)}>
                  Change username
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                  <Trash />
                  Delete login
                </Button>
              </div>
            </>
          ) : (
            <EmptyState
              icon={<KeyRound className="size-6" />}
              title="No portal login"
              description="This partner cannot sign in to the portal yet."
              action={
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <UserPlus />
                  Create login
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>

      <CreateLoginDialog open={createOpen} onOpenChange={setCreateOpen} partner={partner} />
      <SetPasswordDialog
        open={passwordOpen}
        onOpenChange={setPasswordOpen}
        partnerId={partner.id}
        username={login?.username ?? ""}
      />
      <ChangeUsernameDialog
        open={usernameOpen}
        onOpenChange={setUsernameOpen}
        partnerId={partner.id}
        current={login?.username ?? ""}
      />
      <DeleteLoginDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        partnerId={partner.id}
        partnerName={partner.name}
      />
    </>
  );
}

/** Suspending is reversible and immediate — the right control for "stop access". */
function SuspendToggle({ partnerId, disabled }: { partnerId: string; disabled: boolean }) {
  const update = useUpdatePartnerLogin();

  async function onToggle(next: boolean) {
    try {
      await update.mutateAsync({ partnerId, disabled: next });
      toast.success(next ? "Portal access suspended." : "Portal access restored.");
    } catch (caught) {
      toast.error(mutationMessage(caught));
    }
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
      <div className="space-y-0.5">
        <Label htmlFor="partner-login-suspend">Suspend portal access</Label>
        <p className="text-xs text-muted-foreground">
          Blocks sign-in immediately and is fully reversible. Prefer this over deleting.
        </p>
      </div>
      <Switch
        id="partner-login-suspend"
        checked={disabled}
        onCheckedChange={(next) => void onToggle(next)}
        disabled={update.isPending}
      />
    </div>
  );
}

/**
 * Shown once, immediately after a password is set.
 *
 * Nothing stores it, so this is the only chance to hand it over. Administrators
 * reset passwords; they never recover them.
 */
function PasswordHandover({ password, username }: { password: string; username?: string }) {
  return (
    <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-3">
      <p className="text-xs font-medium">Give this to the partner now</p>

      {username ? (
        <div className="flex items-center justify-between gap-2">
          <code className="font-mono text-sm">{username}</code>
          <CopyButton value={username} label="Copy username" />
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <code className="font-mono text-sm break-all">{password}</code>
        <CopyButton value={password} label="Copy password" />
      </div>

      <p className="text-xs text-muted-foreground">
        Nothing stores this password, so it cannot be shown again. If it is lost, set a new one
        — there is no self-service reset for partners.
      </p>
    </div>
  );
}

/** Password field with a generator, since operators should not invent these. */
function PasswordField({
  id,
  value,
  onChange,
  label = "Password",
}: {
  id: string;
  value: string;
  onChange: (next: string) => void;
  label?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange(generatePassword())}
        >
          <RefreshCw />
          Generate
        </Button>
      </div>
      {/* Deliberately type="text": this is a password being *issued*, not
          entered, and the operator has to read it back to the partner. */}
      <Input
        id={id}
        type="text"
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="font-mono"
        placeholder="At least 8 characters"
      />
    </div>
  );
}

function CreateLoginDialog({
  open,
  onOpenChange,
  partner,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partner: Partner;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <CreateLoginForm partner={partner} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function CreateLoginForm({ partner, onClose }: { partner: Partner; onClose: () => void }) {
  const create = useCreatePartnerLogin();

  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState(() => generatePassword());
  const [displayName, setDisplayName] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [issued, setIssued] = React.useState<{ username: string; password: string } | null>(
    null,
  );

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const usernameError = validateUsername(username);
    if (usernameError) return setError(usernameError);

    const passwordError = validatePartnerPassword(password);
    if (passwordError) return setError(passwordError);

    try {
      const result = await create.mutateAsync({
        partnerId: partner.id,
        username: normaliseUsername(username),
        password,
        ...(displayName.trim() ? { displayName: displayName.trim() } : {}),
      });

      // Hold the dialog open on the handover screen: this is the only moment
      // the password can be read, and closing straight away would lose it.
      setIssued({ username: result.username, password });
      toast.success("Portal login created.");
    } catch (caught) {
      setError(mutationMessage(caught));
    }
  }

  if (issued) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Login created</DialogTitle>
          <DialogDescription>
            {partner.name} can now sign in to the partner portal.
          </DialogDescription>
        </DialogHeader>

        <PasswordHandover username={issued.username} password={issued.password} />

        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </>
    );
  }

  const preview = username.trim() ? partnerLoginEmail(username) : null;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create portal login</DialogTitle>
        <DialogDescription>
          One login per partner. To replace it later, delete this one and create another.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="login-username">Username</Label>
          <Input
            id="login-username"
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="priya.sharma"
            className="font-mono"
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">
            {preview ? (
              <>
                Signs in as <span className="font-mono">{preview}</span> — an internal address,
                not a mailbox.
              </>
            ) : (
              "Lowercase letters, digits, dots, underscores and hyphens."
            )}
          </p>
        </div>

        <PasswordField id="login-password" value={password} onChange={setPassword} />

        <div className="space-y-2">
          <Label htmlFor="login-display">Display name</Label>
          <Input
            id="login-display"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder={partner.name}
          />
        </div>

        <PolicyNote variant="locked">
          Partners have no self-service password reset — there is no mailbox to send one to. If
          they forget it, an administrator sets a new one here.
        </PolicyNote>

        {error ? <ErrorState message={error} /> : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={create.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? <LoaderCircle className="animate-spin" /> : null}
            Create login
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

function SetPasswordDialog({
  open,
  onOpenChange,
  partnerId,
  username,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerId: string;
  username: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <SetPasswordForm
          partnerId={partnerId}
          username={username}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function SetPasswordForm({
  partnerId,
  username,
  onClose,
}: {
  partnerId: string;
  username: string;
  onClose: () => void;
}) {
  const update = useUpdatePartnerLogin();
  const [password, setPassword] = React.useState(() => generatePassword());
  const [error, setError] = React.useState<string | null>(null);
  const [issued, setIssued] = React.useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const passwordError = validatePartnerPassword(password);
    if (passwordError) return setError(passwordError);

    try {
      await update.mutateAsync({ partnerId, password });
      setIssued(password);
      toast.success("Password set. It takes effect immediately.");
    } catch (caught) {
      setError(mutationMessage(caught));
    }
  }

  if (issued) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>New password set</DialogTitle>
          <DialogDescription>The old password stopped working immediately.</DialogDescription>
        </DialogHeader>
        <PasswordHandover username={username} password={issued} />
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Set a new password</DialogTitle>
        <DialogDescription>
          You do not need the old one. Administrators reset passwords; they never recover them.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={onSubmit} className="space-y-4">
        <PasswordField
          id="reset-password"
          value={password}
          onChange={setPassword}
          label="New password"
        />
        {error ? <ErrorState message={error} /> : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={update.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={update.isPending}>
            {update.isPending ? <LoaderCircle className="animate-spin" /> : null}
            Set password
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

function ChangeUsernameDialog({
  open,
  onOpenChange,
  partnerId,
  current,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerId: string;
  current: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <ChangeUsernameForm
          partnerId={partnerId}
          current={current}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function ChangeUsernameForm({
  partnerId,
  current,
  onClose,
}: {
  partnerId: string;
  current: string;
  onClose: () => void;
}) {
  const update = useUpdatePartnerLogin();
  const [username, setUsername] = React.useState(current);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const usernameError = validateUsername(username);
    if (usernameError) return setError(usernameError);

    if (normaliseUsername(username) === current) {
      setError("That is already the username.");
      return;
    }

    try {
      const result = await update.mutateAsync({
        partnerId,
        username: normaliseUsername(username),
      });
      toast.success(`Username changed to ${result.username}. The old one no longer works.`);
      onClose();
    } catch (caught) {
      setError(mutationMessage(caught));
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Change username</DialogTitle>
        <DialogDescription>
          The partner signs in with the new username straight away, and the old one stops
          working. Their password is unchanged.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="change-username">Username</Label>
          <Input
            id="change-username"
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="font-mono"
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">
            Signs in as{" "}
            <span className="font-mono">
              {username.trim() ? partnerLoginEmail(username) : "—"}
            </span>
          </p>
        </div>

        {error ? <ErrorState message={error} /> : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={update.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={update.isPending}>
            {update.isPending ? <LoaderCircle className="animate-spin" /> : null}
            Change username
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

function DeleteLoginDialog({
  open,
  onOpenChange,
  partnerId,
  partnerName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerId: string;
  partnerName: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DeleteLoginForm
          partnerId={partnerId}
          partnerName={partnerName}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function DeleteLoginForm({
  partnerId,
  partnerName,
  onClose,
}: {
  partnerId: string;
  partnerName: string;
  onClose: () => void;
}) {
  const remove = useDeletePartnerLogin();
  const [error, setError] = React.useState<string | null>(null);

  async function onConfirm() {
    setError(null);
    try {
      await remove.mutateAsync({ partnerId });
      toast.success("Portal login deleted. The partner's earnings are untouched.");
      onClose();
    } catch (caught) {
      setError(mutationMessage(caught));
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Delete this portal login?</DialogTitle>
        <DialogDescription>
          {partnerName} will no longer be able to sign in to the portal.
        </DialogDescription>
      </DialogHeader>

      {/* "Delete login" reads like "delete partner" to a tired operator, so be
          explicit about how little this removes. */}
      <PolicyNote variant="locked">
        This removes the sign-in only. {partnerName}&rsquo;s partner record, referral codes,
        referred customers and every commission they have earned are untouched, and their codes
        keep working.
      </PolicyNote>

      <PolicyNote>
        If you only want to stop them signing in for now, suspend the login instead — that is
        immediate and reversible.
      </PolicyNote>

      {error ? <ErrorState message={error} /> : null}

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={remove.isPending}>
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={() => void onConfirm()}
          disabled={remove.isPending}
        >
          {remove.isPending ? <LoaderCircle className="animate-spin" /> : null}
          Delete login
        </Button>
      </DialogFooter>
    </>
  );
}
