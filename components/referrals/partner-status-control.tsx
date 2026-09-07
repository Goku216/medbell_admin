"use client";

import * as React from "react";
import { LoaderCircle, Power } from "lucide-react";
import { toast } from "sonner";

import { useUpdatePartner } from "@/hooks/use-referrals";
import { mutationMessage } from "@/lib/api/callable-error";
import { POLICY_NOTES } from "@/lib/constants";
import type { Partner } from "@/lib/api/types";

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

/**
 * Activate or deactivate a partner.
 *
 * Deliberately not a form field: deactivating cascades to every one of the
 * partner's codes, which is too consequential to be a switch someone flips
 * while editing a phone number. The confirmation says so out loud.
 */
export function PartnerStatusControl({ partner }: { partner: Partner }) {
  const [open, setOpen] = React.useState(false);
  const isActive = partner.status === "active";

  return (
    <>
      <Button
        variant={isActive ? "outline" : "default"}
        size="sm"
        onClick={() => setOpen(true)}
      >
        <Power />
        {isActive ? "Deactivate" : "Activate"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <StatusForm partner={partner} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function StatusForm({ partner, onDone }: { partner: Partner; onDone: () => void }) {
  const update = useUpdatePartner();
  const [error, setError] = React.useState<string | null>(null);
  const isActive = partner.status === "active";

  async function onConfirm() {
    setError(null);
    try {
      await update.mutateAsync({
        partnerId: partner.id,
        status: isActive ? "inactive" : "active",
      });
      toast.success(isActive ? "Partner deactivated." : "Partner activated.");
      onDone();
    } catch (caught) {
      setError(mutationMessage(caught));
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {isActive ? `Deactivate ${partner.name}?` : `Activate ${partner.name}?`}
        </DialogTitle>
        <DialogDescription>
          {isActive
            ? POLICY_NOTES.deactivatePartner
            : "The partner can refer again. Reactivating does not reactivate their codes individually — check the codes tab afterwards."}
        </DialogDescription>
      </DialogHeader>

      {error ? <ErrorState message={error} /> : null}

      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={update.isPending}>
          Cancel
        </Button>
        <Button
          variant={isActive ? "destructive" : "default"}
          onClick={() => void onConfirm()}
          disabled={update.isPending}
        >
          {update.isPending ? <LoaderCircle className="animate-spin" /> : null}
          {isActive ? "Deactivate partner" : "Activate partner"}
        </Button>
      </DialogFooter>
    </>
  );
}
