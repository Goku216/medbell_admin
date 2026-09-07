import Link from "next/link";

import { LOGIN_PATH } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * The staff entrance.
 *
 * The home page belongs to partners, so the way into the admin console is a
 * small marker in the corner rather than a nav item. Discreet is the point —
 * but it is still a real link with a real accessible name, a visible label on
 * hover or focus, and a proper focus ring, because a bare coloured dot is
 * unusable with a keyboard or a screen reader.
 *
 * It hides nothing: the console is protected by the medbellAdmin claim, not by
 * the address being hard to find.
 */
export function AdminEntrance({ className }: { className?: string }) {
  return (
    <Link
      href={LOGIN_PATH}
      aria-label="Administrator sign in"
      className={cn(
        "group fixed right-4 bottom-4 z-40 flex items-center gap-2 rounded-full px-1.5 py-1.5",
        "transition-colors hover:bg-card/80 hover:shadow-xs focus-visible:bg-card/80",
        "focus-visible:ring-2 focus-visible:ring-success/60 focus-visible:outline-none",
        className,
      )}
    >
      <span className="relative flex size-3">
        {/* A slow halo, so the marker reads as live rather than as a stray
            speck. Switched off under prefers-reduced-motion with the rest. */}
        <span
          aria-hidden
          className="animate-pulse-ring absolute inset-0 rounded-full bg-success/50"
        />
        <span className="relative size-3 rounded-full bg-success shadow-[0_0_8px_var(--color-success)]" />
      </span>

      <span
        className={cn(
          "max-w-0 overflow-hidden text-xs whitespace-nowrap text-muted-foreground opacity-0",
          "transition-all duration-200 group-hover:max-w-40 group-hover:pr-1 group-hover:opacity-100",
          "group-focus-visible:max-w-40 group-focus-visible:pr-1 group-focus-visible:opacity-100",
        )}
      >
        Administrator sign in
      </span>
    </Link>
  );
}
