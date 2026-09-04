"use client";

import { CopyButton } from "@/components/common/copy-button";
import { cn } from "@/lib/utils";

/**
 * A referral code plus its shareable link, both one click from the clipboard.
 *
 * The link is whatever the backend returned on the code (`referralLink`). It is
 * never assembled client-side — the deep-link format is the backend's business
 * and a console guess would silently produce dead links.
 */
export function ReferralLink({
  code,
  referralLink,
  className,
}: {
  code: string;
  referralLink?: string | null;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-0.5", className)}>
      <div className="flex items-center gap-1">
        <code className="font-mono text-sm font-medium">{code}</code>
        <CopyButton value={code} label="Copy code" />
      </div>

      {referralLink ? (
        <div className="flex min-w-0 items-center gap-1">
          <span className="truncate text-xs text-muted-foreground" title={referralLink}>
            {referralLink}
          </span>
          <CopyButton value={referralLink} label="Copy referral link" />
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">No link returned for this code</span>
      )}
    </div>
  );
}
