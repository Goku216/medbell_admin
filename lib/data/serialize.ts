import "server-only";

import { Timestamp } from "firebase-admin/firestore";

/**
 * Firestore values have to cross the server/client boundary as JSON.
 *
 * Timestamps become **epoch milliseconds**, deliberately matching what the
 * callables emit, so the client has exactly one timestamp representation
 * regardless of which path the data arrived on. References become their path,
 * and anything unknown is dropped rather than smuggled through as an
 * unserialisable object.
 */
export function serializeValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;

  if (value instanceof Timestamp) return value.toMillis();
  if (value instanceof Date) return value.getTime();

  if (Array.isArray(value)) return value.map(serializeValue);

  if (typeof value === "object") {
    const candidate = value as Record<string, unknown> & {
      toDate?: () => Date;
      path?: unknown;
      latitude?: unknown;
      longitude?: unknown;
    };

    // Timestamp-like values from other Firestore client versions.
    if (typeof candidate.toDate === "function") {
      try {
        return candidate.toDate().getTime();
      } catch {
        return null;
      }
    }

    if (typeof candidate.path === "string" && typeof candidate.latitude !== "number") {
      return candidate.path;
    }

    if (typeof candidate.latitude === "number" && typeof candidate.longitude === "number") {
      return { latitude: candidate.latitude, longitude: candidate.longitude };
    }

    if (Buffer.isBuffer(value)) return null;

    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(candidate)) {
      output[key] = serializeValue(entry);
    }
    return output;
  }

  if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  return null;
}

export function serializeDoc<T extends Record<string, unknown>>(
  id: string,
  data: FirebaseFirestore.DocumentData | undefined,
): T {
  const serialized = (serializeValue(data ?? {}) ?? {}) as Record<string, unknown>;
  return { ...serialized, id } as unknown as T;
}
