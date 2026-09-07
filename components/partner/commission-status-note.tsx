import { Badge } from "@/components/ui/badge";

/**
 * The three statuses, in the words partners are meant to hear. Kept in one
 * place so the dashboard, the ledger and any help text cannot drift apart.
 */
export const STATUS_COPY: Record<string, { label: string; meaning: string }> = {
  pending: {
    label: "Pending",
    meaning: "The payment went through; we are letting the refund window pass.",
  },
  approved: { label: "Approved", meaning: "Confirmed and safe — this money is yours." },
  paid: { label: "Paid", meaning: "We have sent it to you." },
  reversed: {
    label: "Reversed",
    meaning: "The customer was refunded, so the commission was taken back.",
  },
  cancelled: { label: "Cancelled", meaning: "Written off and not payable." },
};

export function CommissionStatusNote() {
  return (
    <dl className="grid gap-3 sm:grid-cols-3">
      {(["pending", "approved", "paid"] as const).map((status) => (
        <div key={status} className="rounded-lg border border-border px-3 py-2.5">
          <dt>
            <Badge
              variant={
                status === "paid" ? "success" : status === "approved" ? "default" : "warning"
              }
            >
              {STATUS_COPY[status].label}
            </Badge>
          </dt>
          <dd className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            {STATUS_COPY[status].meaning}
          </dd>
        </div>
      ))}
    </dl>
  );
}
