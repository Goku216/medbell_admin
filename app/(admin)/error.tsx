"use client";

import { CircleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader className="items-start gap-2">
        <span className="flex size-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
          <CircleAlert className="size-4" />
        </span>
        <div className="space-y-1">
          <CardTitle>This screen could not load</CardTitle>
          <CardDescription>{error.message}</CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {error.digest ? (
          <p className="font-mono text-xs text-muted-foreground">Digest {error.digest}</p>
        ) : null}
        <Button size="sm" onClick={reset}>
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}
