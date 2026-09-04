import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type Definition = {
  label: string;
  value: ReactNode;
  hint?: string;
};

/** Label/value pairs used across every detail panel in the console. */
export function DefinitionList({
  items,
  columns = 2,
  className,
}: {
  items: Definition[];
  columns?: 1 | 2 | 3;
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid gap-x-6 gap-y-4",
        columns === 1 && "grid-cols-1",
        columns === 2 && "grid-cols-1 sm:grid-cols-2",
        columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="min-w-0 space-y-1">
          <dt className="text-xs font-medium text-muted-foreground">{item.label}</dt>
          <dd className="text-sm break-words">{item.value ?? "—"}</dd>
          {item.hint ? <p className="text-xs text-muted-foreground">{item.hint}</p> : null}
        </div>
      ))}
    </dl>
  );
}
