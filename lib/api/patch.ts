/**
 * Building payloads for the update callables.
 *
 * The update callables apply fields with `hasOwnProperty` semantics:
 *
 *   - key omitted        -> the stored value is left untouched
 *   - key present, null  -> the stored value is cleared
 *   - key present, value -> the stored value is replaced
 *
 * The trap is that `undefined` does NOT omit a key. The Firebase callable
 * encoder walks own enumerable keys (`mapValues`) and `encode(undefined)`
 * returns `null` (@firebase/functions), so `{ email: undefined }` reaches the
 * function as `{ email: null }` and CLEARS the field — the opposite of the
 * usual `JSON.stringify` intuition, which drops undefined keys.
 *
 * So a patch must physically omit keys it does not intend to change. The
 * helpers below produce `undefined` for "unchanged" and `omitUndefined` then
 * strips those keys before the payload is handed to the callable.
 */

/** Drops keys whose value is `undefined`, which would otherwise clear a field. */
export function omitUndefined<T extends object>(input: T): Partial<T> {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) output[key] = value;
  }
  return output as Partial<T>;
}

function normaliseText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * A text field's patch value: `undefined` when the operator did not change it,
 * `null` when they emptied a field that had a value, otherwise the new text.
 */
export function textChange(
  initial: string | null | undefined,
  current: string,
): string | null | undefined {
  const before = normaliseText(initial);
  const after = normaliseText(current);
  if (before === after) return undefined;
  return after;
}

/** Same contract as textChange, for a field that must never be cleared. */
export function requiredTextChange(
  initial: string | null | undefined,
  current: string,
): string | undefined {
  const change = textChange(initial, current);
  return change === null ? undefined : change;
}

/** Numeric field patch. An emptied input clears the stored value. */
export function numberChange(
  initial: number | null | undefined,
  current: string,
): number | null | undefined {
  const trimmed = current.trim();
  const after = trimmed === "" ? null : Number(trimmed);
  if (after !== null && !Number.isFinite(after)) return undefined;

  const before = initial ?? null;
  if (before === after) return undefined;
  return after;
}

/** Already-parsed numeric patch, for money converted from major units. */
export function minorChange(
  initial: number | null | undefined,
  current: number | null,
): number | null | undefined {
  const before = initial ?? null;
  if (before === current) return undefined;
  return current;
}

/** Boolean field patch. Booleans are never cleared, only flipped. */
export function flagChange(
  initial: boolean | null | undefined,
  current: boolean,
): boolean | undefined {
  return Boolean(initial) === current ? undefined : current;
}

/**
 * Date field patch, from a `yyyy-MM-dd` input against a stored epoch-millis
 * value. Comparison is on the calendar day, so re-saving an untouched form
 * does not send a spurious change.
 */
export function dateChange(
  initialDayValue: string,
  current: string,
): string | null | undefined {
  const before = initialDayValue || null;
  const after = current || null;
  if (before === after) return undefined;
  return after;
}
