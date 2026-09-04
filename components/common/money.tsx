import { cn } from "@/lib/utils";
import { formatMinor, formatMinorCompact, type Minor } from "@/lib/money";

/**
 * The only place amounts become text. Everything upstream keeps integer paise.
 */
export function Money({
  minor,
  currency = "INR",
  compact = false,
  className,
  emphasis = "default",
}: {
  minor: Minor | null | undefined;
  currency?: string | null;
  compact?: boolean;
  className?: string;
  emphasis?: "default" | "muted" | "positive" | "negative";
}) {
  const resolved = currency ?? "INR";
  const text = compact
    ? formatMinorCompact(minor, { currency: resolved })
    : formatMinor(minor, { currency: resolved });

  return (
    <span
      className={cn(
        "tabular",
        emphasis === "muted" && "text-muted-foreground",
        emphasis === "positive" && "text-success",
        emphasis === "negative" && "text-destructive",
        className,
      )}
      title={compact ? formatMinor(minor, { currency: resolved }) : undefined}
    >
      {text}
    </span>
  );
}
