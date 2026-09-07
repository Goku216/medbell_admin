"use client";

import { CircleAlert } from "lucide-react";

import { errorMessage } from "@/lib/api/callable-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Loading placeholder shaped roughly like the content it replaces. */
export function PortalLoading({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-20 w-full rounded-xl" />
      ))}
    </div>
  );
}

/**
 * Errors here are shown plainly. A partner cannot act on a callable code, so
 * the message stays short and offers the one thing they can do: try again, or
 * contact MedBell.
 */
export function PortalError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-start gap-3 py-6">
        <div className="flex items-start gap-2">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="space-y-1">
            <p className="text-sm font-medium">That did not load</p>
            <p className="text-sm text-muted-foreground">{errorMessage(error)}</p>
          </div>
        </div>
        {onRetry ? (
          <Button size="sm" variant="outline" onClick={onRetry}>
            Try again
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

/**
 * A partner with no codes, customers or earnings should see an explanation,
 * not a wall of zeros presented as results.
 */
export function PortalEmpty({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
        {icon ? <div className="text-muted-foreground">{icon}</div> : null}
        <p className="text-sm font-medium">{title}</p>
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
