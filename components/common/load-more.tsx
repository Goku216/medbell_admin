"use client";

import { LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LIST_MAX_LIMIT } from "@/lib/constants";

/**
 * Cursor paging. Only listAppUsers has a `pageToken`, so this footer is used
 * on the user directory alone.
 */
export function LoadMore({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  count,
  noun,
}: {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  count: number;
  noun: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2.5">
      <p className="text-xs text-muted-foreground">
        Showing {count} {count === 1 ? noun : `${noun}s`}
        {hasNextPage ? " so far" : ""}
      </p>

      {hasNextPage ? (
        <Button
          variant="outline"
          size="sm"
          onClick={fetchNextPage}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? <LoaderCircle className="animate-spin" /> : null}
          Load more
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Limit paging, for every other list. These callables take a `limit` and return
 * a plain array with no cursor, so "load more" asks for a larger slice — and
 * the backend caps it, which the footer says out loud rather than pretending
 * there is nothing further to see.
 */
export function LimitFooter({
  count,
  noun,
  limit,
  atCap,
  isFetching,
  onRaise,
  hasMore,
}: {
  count: number;
  noun: string;
  limit: number;
  atCap: boolean;
  isFetching: boolean;
  onRaise: () => void;
  /** Pass the server's own flag where one exists (the ledger has `hasMore`). */
  hasMore?: boolean;
}) {
  const likelyMore = hasMore ?? count >= limit;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-3 py-2.5">
      <p className="text-xs text-muted-foreground">
        Showing {count} {count === 1 ? noun : `${noun}s`}
        {likelyMore && atCap
          ? ` — the server returns at most ${LIST_MAX_LIMIT}; narrow the filters to see the rest`
          : likelyMore
            ? " so far"
            : ""}
      </p>

      {likelyMore && !atCap ? (
        <Button variant="outline" size="sm" onClick={onRaise} disabled={isFetching}>
          {isFetching ? <LoaderCircle className="animate-spin" /> : null}
          Load more
        </Button>
      ) : null}
    </div>
  );
}
