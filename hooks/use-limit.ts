"use client";

import * as React from "react";

import { LIST_MAX_LIMIT, LIST_PAGE_SIZE } from "@/lib/constants";

/**
 * Paging for the callables that take a `limit` and return a plain array.
 *
 * Only `listAppUsers` has a cursor (`pageToken`); every other list is
 * limit-only, so "load more" means asking for a larger slice. The limit is
 * capped because the backend rejects anything above 200.
 */
export function useLimit(initial: number = LIST_PAGE_SIZE) {
  const [limit, setLimit] = React.useState(initial);

  const raise = React.useCallback(() => {
    setLimit((current) => Math.min(current + LIST_PAGE_SIZE, LIST_MAX_LIMIT));
  }, []);

  const reset = React.useCallback(() => setLimit(initial), [initial]);

  return {
    limit,
    raise,
    reset,
    atCap: limit >= LIST_MAX_LIMIT,
    /** True when the server likely has more than we asked for. */
    isFull: (count: number) => count >= limit,
  };
}
