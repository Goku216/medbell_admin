"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFunctions, type Functions } from "firebase/functions";

import { FUNCTIONS_REGION } from "@/lib/constants";

/**
 * Browser-side Firebase. This client exists for exactly two reasons:
 *   1. Firebase Auth sign-in, which produces the ID token we exchange for the
 *      HttpOnly session cookie the server trusts.
 *   2. httpsCallable, the only write path in this console.
 * It never reads or writes Firestore directly.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Pure check, safe to call during render: reports what is missing rather than
 * throwing, so the sign-in screen can explain a misconfigured deployment
 * instead of failing inside an effect.
 */
export function firebaseConfigError(): string | null {
  const missing = Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length === 0) return null;

  return (
    `Firebase web config is incomplete. Missing: ${missing.join(", ")}. ` +
    "Set the NEXT_PUBLIC_FIREBASE_* environment variables."
  );
}

function assertConfigured() {
  const error = firebaseConfigError();
  if (error) throw new Error(error);
}

export function getFirebaseApp(): FirebaseApp {
  assertConfigured();
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

/** Callables are region-pinned; getFunctions() without a region would 404. */
export function getFirebaseFunctions(): Functions {
  return getFunctions(getFirebaseApp(), FUNCTIONS_REGION);
}
