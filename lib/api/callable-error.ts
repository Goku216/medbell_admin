import { FunctionsError } from "firebase/functions";

/**
 * Every callable in this project throws HttpsError with a message written for
 * an operator to read ("Partner has no approved commissions to pay out",
 * "This user already received a discount"). Those messages are the product,
 * so we surface them verbatim and never substitute a generic string.
 */
export class CallableError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "CallableError";
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
