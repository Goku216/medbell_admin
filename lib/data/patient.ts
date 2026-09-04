import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import { serializeDoc, serializeValue } from "@/lib/data/serialize";
import { summariseAdherence } from "@/lib/data/adherence";
import type {
  Appointment,
  CareRelationship,
  ConnectionRequest,
  FcmToken,
  Medication,
  MedicationLog,
  PatientRecord,
  VitalRecord,
  VitalReminderPlan,
} from "@/lib/api/types";

/**
 * READ-ONLY Firestore access for one patient.
 *
 * Admin access to patient data is read-only by design: this module contains
 * queries and nothing else. Clinical records are edited by the patient in the
 * app, never from the console, and the collections below are `allow write: if
 * false` for clients anyway.
 *
 * Callers must have already passed verifyAdminSession(). The Admin SDK bypasses
 * security rules, so that check is the only thing standing between a request
 * and this data.
 */

const MAX_ROWS = 200;

/**
 * Owner fields are fixed per collection, and deliberately not uniform: the
 * clinical collections predate the referral system, which was written against
 * `userId`. Both are indexed, so each query names its one field.
 *
 *   medications, medicationLogs, appointments   patientId
 *   vitals/{patientId}/records                  path segment
 *   vitalReminderPlans/{patientId}/plans        path segment
 *   careRelationships                           patientId + caregiverId
 *   subscriptions, referral_transactions        userId  (read via callables)
 *   users/{uid}                                 document id
 */
const CLINICAL_OWNER_FIELD = "patientId";

async function queryClinical<T>(
  collection: string,
  uid: string,
  options: { orderBy?: string; direction?: "asc" | "desc"; limit?: number } = {},
): Promise<T[]> {
  const { orderBy, direction = "desc", limit = MAX_ROWS } = options;

  let query: FirebaseFirestore.Query = adminDb()
    .collection(collection)
    .where(CLINICAL_OWNER_FIELD, "==", uid);

  if (orderBy) query = query.orderBy(orderBy, direction);

  const snapshot = await query.limit(limit).get();
  return snapshot.docs.map(
    (doc) => serializeDoc<Record<string, unknown>>(doc.id, doc.data()) as T,
  );
}

async function safely<T>(
  label: string,
  partial: string[],
  read: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await read();
  } catch (error) {
    console.error(`[patient-record] failed to read ${label}:`, error);
    partial.push(label);
    return fallback;
  }
}

/** Everything the user detail page shows from direct Firestore reads. */
export async function getPatientRecord(uid: string): Promise<PatientRecord> {
  const db = adminDb();
  const partial: string[] = [];

  const [
    profile,
    medications,
    medicationLogs,
    appointments,
    vitals,
    vitalReminderPlans,
    careRelationships,
    connectionRequests,
    fcmTokens,
  ] = await Promise.all([
    safely<Record<string, unknown> | null>(
      "profile",
      partial,
      async () => {
        const snapshot = await db.collection("users").doc(uid).get();
        if (!snapshot.exists) return null;
        return (serializeValue(snapshot.data()) ?? {}) as Record<string, unknown>;
      },
      null,
    ),

    safely<Medication[]>(
      "medications",
      partial,
      () => queryClinical<Medication>("medications", uid),
      [],
    ),

    safely<MedicationLog[]>(
      "medicationLogs",
      partial,
      () =>
        queryClinical<MedicationLog>("medicationLogs", uid, {
          orderBy: "scheduledAt",
          limit: MAX_ROWS,
        }),
      [],
    ),

    safely<Appointment[]>(
      "appointments",
      partial,
      () =>
        queryClinical<Appointment>("appointments", uid, {
          orderBy: "appointmentDateTime",
          limit: MAX_ROWS,
        }),
      [],
    ),

    safely<VitalRecord[]>(
      "vitals",
      partial,
      async () => {
        const snapshot = await db
          .collection("vitals")
          .doc(uid)
          .collection("records")
          .orderBy("recordedAt", "desc")
          .limit(MAX_ROWS)
          .get();
        return snapshot.docs.map((doc) => serializeDoc<VitalRecord>(doc.id, doc.data()));
      },
      [],
    ),

    safely<VitalReminderPlan[]>(
      "vitalReminderPlans",
      partial,
      async () => {
        const snapshot = await db
          .collection("vitalReminderPlans")
          .doc(uid)
          .collection("plans")
          .limit(MAX_ROWS)
          .get();
        return snapshot.docs.map((doc) => serializeDoc<VitalReminderPlan>(doc.id, doc.data()));
      },
      [],
    ),

    safely<CareRelationship[]>(
      "careRelationships",
      partial,
      () => readCareRelationships(uid),
      [],
    ),

    safely<ConnectionRequest[]>(
      "connectionRequests",
      partial,
      () => readConnectionRequests(uid),
      [],
    ),

    safely<FcmToken[]>(
      "fcmTokens",
      partial,
      async () => {
        const snapshot = await db
          .collection("users")
          .doc(uid)
          .collection("fcmTokens")
          .limit(50)
          .get();
        return snapshot.docs.map((doc) => serializeDoc<FcmToken>(doc.id, doc.data()));
      },
      [],
    ),
  ]);

  return {
    uid,
    profile,
    medications,
    medicationLogs,
    adherence: summariseAdherence(medicationLogs),
    appointments,
    vitals,
    vitalReminderPlans,
    careRelationships,
    connectionRequests,
    fcmTokens,
    partial,
  };
}

/**
 * The care circle is symmetric: the same user is the patient in one link and
 * the caregiver in another, so both sides are queried and each row is tagged
 * with which side this user sits on.
 *
 * Note for callers that already know both parties: a link's document id is
 * `${patientId}_${caregiverId}`, so an existence check is a single `get()`
 * rather than a query.
 */
async function readCareRelationships(uid: string): Promise<CareRelationship[]> {
  const db = adminDb();

  const sides: Array<{ field: string; direction: CareRelationship["direction"] }> = [
    { field: "patientId", direction: "as-patient" },
    { field: "caregiverId", direction: "as-caregiver" },
  ];

  const results = await Promise.all(
    sides.map(async ({ field, direction }) => {
      const snapshot = await db
        .collection("careRelationships")
        .where(field, "==", uid)
        .limit(MAX_ROWS)
        .get();

      return snapshot.docs.map((doc) => ({
        ...serializeDoc<CareRelationship>(doc.id, doc.data()),
        direction,
      }));
    }),
  );

  return results.flat();
}

/**
 * Connection requests are directional. The collection carries four party
 * fields — `createdBy`, `patientId`, `caregiverId` and `targetEmailLower` —
 * and any of them may identify a party, so "sent" is what this user created
 * and "received" is a request naming them on either side that they did not
 * create.
 */
async function readConnectionRequests(uid: string): Promise<ConnectionRequest[]> {
  const db = adminDb();

  const [created, asPatient, asCaregiver] = await Promise.all(
    ["createdBy", "patientId", "caregiverId"].map(async (field) => {
      const snapshot = await db
        .collection("connectionRequests")
        .where(field, "==", uid)
        .limit(MAX_ROWS)
        .get();
      return snapshot.docs;
    }),
  );

  // The same document can match more than one field; de-duplicate by id and
  // let "created by this user" win when deciding the direction.
  const byId = new Map<string, ConnectionRequest>();

  for (const doc of [...asPatient, ...asCaregiver]) {
    byId.set(doc.id, {
      ...serializeDoc<ConnectionRequest>(doc.id, doc.data()),
      direction: "received",
    });
  }

  for (const doc of created) {
    byId.set(doc.id, {
      ...serializeDoc<ConnectionRequest>(doc.id, doc.data()),
      direction: "sent",
    });
  }

  return [...byId.values()];
}
