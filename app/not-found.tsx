import Link from "next/link";

import { Button } from "@/components/ui/button";
import { DEFAULT_ADMIN_PATH } from "@/lib/constants";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="text-xl font-semibold tracking-tight">That page does not exist</h1>
      <Button asChild size="sm">
        <Link href={DEFAULT_ADMIN_PATH}>Back to the dashboard</Link>
      </Button>
    </div>
  );
}
