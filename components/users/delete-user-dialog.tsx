"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { useDeleteAppUser } from "@/hooks/use-users";
import { mutationMessage } from "@/lib/api/callable-error";
import { POLICY_NOTES } from "@/lib/constants";

import { ErrorState } from "@/components/common/states";
import { PolicyNote } from "@/components/common/policy-note";
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

/**
 * Deletion is irreversible for the account, so it asks for the email to be
 * typed out. What it does NOT delete is spelled out up front: the callable
 * deliberately preserves medications, dose logs, vitals and appointments.
 */
export function DeleteUserDialog({
  open,
  onOpenChange,
  uid,
  email,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uid: string;
  email: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Radix unmounts this subtree on close, so the form below starts
            fresh on every open without an effect resetting it. */}
        <DeleteUserForm uid={uid} email={email} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function DeleteUserForm({
  uid,
  email,
  onDone,
}: {
  uid: string;
  email: string | null;
  onDone: () => void;
}) {
  const router = useRouter();
  const remove = useDeleteAppUser();
  const [confirmation, setConfirmation] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const expected = email ?? uid;
  const matches = confirmation.trim().toLowerCase() === expected.toLowerCase();

  async function onConfirm() {
    setError(null);
    try {
      await remove.mutateAsync(uid);
      toast.success("Account deleted. Medications, logs, vitals and appointments were kept.");
      onDone();
      router.push("/users");
    } catch (caught) {
      setError(mutationMessage(caught));
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Delete this account?</DialogTitle>
        <DialogDescription>
          This removes the Firebase Auth account and the profile document. It cannot be undone.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-2">
        <PolicyNote variant="locked">{POLICY_NOTES.deleteUser}</PolicyNote>
        <PolicyNote>
          If you only need to stop this person signing in, <strong>disable</strong> the account
          instead — it takes effect immediately and is completely reversible.
        </PolicyNote>
      </div>

      <div className="space-y-2">
        <Label htmlFor="delete-confirm">
          Type <span className="font-mono text-foreground">{expected}</span> to confirm
        </Label>
        <Input
          id="delete-confirm"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          autoComplete="off"
        />
      </div>

      {error ? <ErrorState message={error} /> : null}

      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={remove.isPending}>
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={() => void onConfirm()}
          disabled={!matches || remove.isPending}
        >
          {remove.isPending ? <LoaderCircle className="animate-spin" /> : null}
          Delete account
        </Button>
      </DialogFooter>
    </>
  );
}
