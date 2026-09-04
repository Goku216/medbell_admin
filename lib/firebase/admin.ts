import "server-only";

import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

const ADMIN_APP_NAME = "medbell-admin-console";

function readServiceAccount() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Vercel stores newlines escaped; restore them before handing the key to cert().
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin credentials are missing. Set FIREBASE_PROJECT_ID, " +
        "FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in the environment.",
    );
  }

  return { projectId, clientEmail, privateKey };
}

function getAdminApp(): App {
  const existing = getApps().find((app) => app.name === ADMIN_APP_NAME);
  if (existing) return existing;

  const serviceAccount = readServiceAccount();

  try {
    return initializeApp(
      { credential: cert(serviceAccount), projectId: serviceAccount.projectId },
      ADMIN_APP_NAME,
    );
  } catch (error) {
    // Two module instances can race during dev HMR; the app may exist by now.
    if (getApps().some((app) => app.name === ADMIN_APP_NAME)) {
      return getApp(ADMIN_APP_NAME);
    }
    throw error;
  }
}

export function adminAuth(): Auth {
  return getAuth(getAdminApp());
}

let firestoreSettingsApplied = false;

export function adminDb(): Firestore {
  const db = getFirestore(getAdminApp());
  if (!firestoreSettingsApplied) {
    firestoreSettingsApplied = true;
    try {
      db.settings({ ignoreUndefinedProperties: true });
    } catch {
      // settings() throws once the client has been used — harmless here.
    }
  }
  return db;
}
