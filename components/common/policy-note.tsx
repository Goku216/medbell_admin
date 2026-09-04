import type { ReactNode } from "react";
import { Info, Lock } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Surfaces a rule the backend enforces. These exist so an operator is never
 * surprised by a refusal: if the console explains the rule up front, the
 * callable's error message confirms it rather than introducing it.
 */
export function PolicyNote({
  children,
  variant = "info",
  className,
}: {
  children: ReactNode;
  variant?: "info" | "locked";
  className?: string;
}) {
  const Icon = variant === "locked" ? Lock : Info;

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs",
        variant === "locked"
          ? "border-border bg-muted/50 text-muted-foreground"
          : "border-primary/25 bg-primary/5 text-foreground",
        className,
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 size-3.5 shrink-0",
          variant === "locked" ? "text-muted-foreground" : "text-primary",
        )}
      />
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}
