import { FunctionsError } from "firebase/functions";

/**
 * Every callable in this project throws HttpsError with a message written for
 * an operator to read ("Partner has no approved commissions to pay out",
 * "This user already received a discount"). Those messages are the product,
 * so we surface them verbatim and never substitute a generic string.
 */
export class CallableError extends Error {
  // Declared as plain fields rather than constructor parameter properties:
  // those are a TypeScript-only emit feature, and avoiding them keeps this
  // module loadable by anything that strips types without transforming them.
  readonly code: string;
  readonly details?: unknown;

  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = "CallableError";
    this.code = code;
    this.details = details;
  }
}

export function toCallableError(error: unknown, callableName: string): CallableError {
  if (error instanceof CallableError) return error;

  if (error instanceof FunctionsError) {
    return new CallableError(error.message, error.code, error.details);
  }

  // Duck-typing fallback: bundler duplication can defeat instanceof.
  if (typeof error === "object" && error !== null) {
    const candidate = error as { message?: unknown; code?: unknown; details?: unknown };
    if (typeof candidate.message === "string" && typeof candidate.code === "string") {
      return new CallableError(candidate.message, candidate.code, candidate.details);
    }
  }

  if (error instanceof Error) {
    return new CallableError(error.message, "unknown");
  }

  return new CallableError(`${callableName} failed with an unrecognised error.`, "unknown");
}

/** Reads a message off anything thrown, for toasts and inline error slots. */
export function errorMessage(error: unknown, fallback = "Something went wrong."): string {
  if (error instanceof CallableError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return fallback;
}

/** Distinguishes an auth failure so the shell can bounce to /login. */
export function isAuthError(error: unknown): boolean {
  const code = error instanceof CallableError ? error.code : null;
  return code === "functions/unauthenticated" || code === "unauthenticated";
}

/** Strips the SDK's "functions/" prefix so codes can be matched by name. */
export function bareCode(error: unknown): string | null {
  if (!(error instanceof CallableError)) return null;
  return error.code.replace(/^functions\//, "");
}

/**
 * Operator-facing message for a failed mutation.
 *
 * Most codes carry a message written to be read, and those are surfaced
 * verbatim. Three are not:
 *
 *  - `permission-denied` comes from requireAdmin and says nothing actionable,
 *    so it is replaced with the action that fixes it.
 *  - `invalid-argument` on a well-formed form is a panel bug, not operator
 *    error; it gets a neutral message and is logged.
 *  - `internal` after a partial delete needs the recovery step appended, since
 *    retrying is the wrong move.
 */
export function mutationMessage(error: unknown, fallback = "Something went wrong."): string {
  const code = bareCode(error);
  const message = errorMessage(error, fallback);

  switch (code) {
    case "permission-denied":
      return "Your admin access could not be confirmed. Sign out and back in.";

    case "invalid-argument":
      console.error("[callable] invalid-argument — this is a panel bug:", error);
      return "Something went wrong sending the request. This has been logged.";

    case "internal":
      // The half-failure state: the profile is gone but the Auth record is not,
      // so the fix is a console deletion rather than another attempt.
      return message.toLowerCase().includes("profile deleted")
        ? `${message} Remove the account in the Firebase console.`
        : message;

    default:
      return message;
  }
}
