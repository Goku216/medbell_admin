import { Badge } from "@/components/ui/badge";
import { titleCase } from "@/lib/format";

type Variant = React.ComponentProps<typeof Badge>["variant"];

/**
 * Status vocabularies come from three different systems (our commission ledger,
 * our payouts, and RevenueCat's subscription states), so map by meaning rather
 * than maintaining three near-identical lookup tables.
 */
const RULES: Array<{ match: RegExp; variant: Variant }> = [
  {
    match: /^(paid|active|approved|granted|accepted|completed|succeeded|taken)$/i,
    variant: "success",
  },
  {
    match: /^(pending|processing|review|scheduled|requested|trial|trialing|grace_period)$/i,
    variant: "warning",
  },
  {
    match:
      /^(cancelled|canceled|void|voided|failed|expired|disabled|refunded|billing_issue|missed|revoked|rejected)$/i,
    variant: "destructive",
  },
  { match: /^(inactive|draft|unknown|skipped|none)$/i, variant: "muted" },
];

export function StatusBadge({
  status,
  fallbackVariant = "secondary",
  className,
}: {
  status: string | null | undefined;
  fallbackVariant?: Variant;
  className?: string;
}) {
  if (!status) {
    return (
      <Badge variant="muted" className={className}>
        Unknown
      </Badge>
    );
  }

  const variant =
    RULES.find((rule) => rule.match.test(status.trim()))?.variant ?? fallbackVariant;

  return (
    <Badge variant={variant} className={className}>
      {titleCase(status)}
    </Badge>
  );
}
