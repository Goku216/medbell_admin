"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { useCreateAppUser, useUpdateAppUser } from "@/hooks/use-users";
import { errorMessage } from "@/lib/api/callable-error";
import { flagChange, omitUndefined, requiredTextChange, textChange } from "@/lib/api/patch";
import { USER_ROLES } from "@/lib/constants";

import { ErrorState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type EditableUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  disabled: boolean;
  role: "patient" | "caregiver" | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
} & ({ mode: "create"; user?: undefined } | { mode: "edit"; user: EditableUser });

/**
 * Create and edit both go through their own callable, which validates the
 * payload, applies the change to Firebase Auth and the profile together, and
 * writes an audit entry. Nothing here touches Firestore.
 */
export function UserFormDialog({ open, onOpenChange, mode, user }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Radix unmounts this subtree on close, so the form seeds itself from
            props on every open — no effect re-seeding state after a render. */}
        {mode === "edit" ? (
          <UserForm mode="edit" user={user} onDone={() => onOpenChange(false)} />
        ) : (
          <UserForm mode="create" onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

type FormProps = { onDone: () => void } & (
  { mode: "create"; user?: undefined } | { mode: "edit"; user: EditableUser }
);

function UserForm({ mode, user, onDone }: FormProps) {
  const router = useRouter();
  const create = useCreateAppUser();
  const update = useUpdateAppUser();

  const [displayName, setDisplayName] = React.useState(
    mode === "edit" ? (user.displayName ?? "") : "",
  );
  const [email, setEmail] = React.useState(mode === "edit" ? (user.email ?? "") : "");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState<"patient" | "caregiver">(
    mode === "edit" ? (user.role ?? "patient") : "patient",
  );
  const [disabled, setDisabled] = React.useState(
    mode === "edit" ? Boolean(user.disabled) : false,
  );
  const [error, setError] = React.useState<string | null>(null);

  const pending = create.isPending || update.isPending;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    try {
      if (mode === "create") {
        const result = await create.mutateAsync({
          email: email.trim(),
          password,
          role,
          ...omitUndefined({ displayName: displayName.trim() || undefined }),
        });
        toast.success("User created.");
        onDone();
        if (result?.uid) router.push(`/users/${result.uid}`);
      } else {
        // Patch semantics: send only what changed. A name the operator emptied
        // clears deliberately; email is never cleared, only replaced.
        await update.mutateAsync({
          uid: user.uid,
          ...omitUndefined({
            displayName: textChange(user.displayName, displayName),
            email: requiredTextChange(user.email, email),
            role: requiredTextChange(user.role, role) as "patient" | "caregiver" | undefined,
            disabled: flagChange(user.disabled, disabled),
            password: password || undefined,
          }),
        });
        toast.success("User updated.");
        onDone();
      }
    } catch (caught) {
      // The callable's own message, verbatim — it names the exact rule that failed.
      setError(errorMessage(caught));
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{mode === "create" ? "New user" : "Edit user"}</DialogTitle>
        <DialogDescription>
          {mode === "create"
            ? "Creates the Firebase Auth account and its MedBell profile together."
            : "Changes are applied by updateAppUser and recorded in the audit trail."}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="user-name">Name</Label>
          <Input
            id="user-name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Full name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="user-email">Email</Label>
          <Input
            id="user-email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="user-password">
            {mode === "create" ? "Password" : "New password"}
          </Label>
          <Input
            id="user-password"
            type="password"
            autoComplete="new-password"
            required={mode === "create"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={
              mode === "edit" ? "Leave blank to keep the current password" : undefined
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="user-role">Role</Label>
          <Select
            value={role}
            onValueChange={(next) => setRole(next as "patient" | "caregiver")}
          >
            <SelectTrigger id="user-role">
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              {USER_ROLES.map((value) => (
                <SelectItem key={value} value={value}>
                  {value === "patient" ? "Patient" : "Caregiver"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
          <div className="space-y-0.5">
            <Label htmlFor="user-disabled">Account disabled</Label>
            <p className="text-xs text-muted-foreground">
              A disabled account cannot sign in to the app.
            </p>
          </div>
          <Switch id="user-disabled" checked={disabled} onCheckedChange={setDisabled} />
        </div>

        {error ? <ErrorState message={error} /> : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? <LoaderCircle className="animate-spin" /> : null}
            {mode === "create" ? "Create user" : "Save changes"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
