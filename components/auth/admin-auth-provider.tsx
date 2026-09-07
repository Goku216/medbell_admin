"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";

import { firebaseConfigError, getFirebaseAuth } from "@/lib/firebase/client";
import { ADMIN_CLAIM, LOGIN_PATH } from "@/lib/constants";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AdminAuthValue = {
  user: User | null;
  status: AuthStatus;
  /** Set when the Firebase web config is missing or malformed. */
  configError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AdminAuthContext = React.createContext<AdminAuthValue | null>(null);

/** Trades the current ID token for the HttpOnly cookie the server trusts. */
async function establishServerSession(idToken: string) {
  const response = await fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new Error(
      payload?.error?.message ?? "The server refused to establish an admin session.",
    );
  }
}

async function clearServerSession() {
  await fetch("/api/session", { method: "DELETE" }).catch(() => undefined);
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = React.useState<User | null>(null);
  const [status, setStatus] = React.useState<AuthStatus>("loading");
  const lastSyncedToken = React.useRef<string | null>(null);
  const hadUser = React.useRef(false);
  const hasForcedRefresh = React.useRef(false);

  // Derived from environment, so it is known during render. A missing
  // NEXT_PUBLIC_FIREBASE_* value then surfaces as a readable message on the
  // sign-in screen rather than an unhandled throw that blanks the console.
  const configError = firebaseConfigError();

  React.useEffect(() => {
    if (configError) return;
    const auth = getFirebaseAuth();

    // onIdTokenChanged (not onAuthStateChanged) so the cookie is refreshed
    // when Firebase rotates the ID token, and when a claim change forces a
    // token refresh.
    return onIdTokenChanged(auth, async (nextUser) => {
      if (!nextUser) {
        setUser(null);
        setStatus("unauthenticated");
        lastSyncedToken.current = null;

        // The client session is gone but the cookie may still look valid to
        // the proxy; drop it so we do not bounce between /login and the shell.
        if (hadUser.current) {
          hadUser.current = false;
          await clearServerSession();
          router.replace(LOGIN_PATH);
        }
        return;
      }

      hadUser.current = true;
      setUser(nextUser);
      setStatus("authenticated");

      try {
        // Read the cached token first so the UI is not blocked, then force a
        // refresh once per session. A claim granted after the current token was
        // minted is not in it, and the token only rotates about hourly on its
        // own — without this, a freshly-granted admin sees permission-denied.
        const cached = await nextUser.getIdToken();
        if (cached !== lastSyncedToken.current) {
          await establishServerSession(cached);
          lastSyncedToken.current = cached;
        }

        if (!hasForcedRefresh.current) {
          hasForcedRefresh.current = true;
          const fresh = await nextUser.getIdToken(true);
          if (fresh !== lastSyncedToken.current) {
            await establishServerSession(fresh);
            lastSyncedToken.current = fresh;
          }
        }
      } catch {
        // A refresh that cannot be mirrored to the cookie is not fatal on its
        // own: the next server request will fail its own verification and the
        // shell will redirect. Nothing here is treated as authorisation.
      }
    });
  }, [router, configError]);

  const signIn = React.useCallback(async (email: string, password: string) => {
    const auth = getFirebaseAuth();
    const credential = await signInWithEmailAndPassword(auth, email, password);

    // force-refresh so a claim granted moments ago is present in this token
    const result = await credential.user.getIdTokenResult(true);

    if (result.claims[ADMIN_CLAIM] !== true) {
      await firebaseSignOut(auth);
      throw new Error(
        "This account does not carry the medbellAdmin claim. Ask an existing admin to grant console access.",
      );
    }

    try {
      await establishServerSession(result.token);
      lastSyncedToken.current = result.token;
    } catch (error) {
      await firebaseSignOut(auth);
      throw error;
    }
  }, []);

  const signOut = React.useCallback(async () => {
    hadUser.current = false;
    hasForcedRefresh.current = false;
    await clearServerSession();
    await firebaseSignOut(getFirebaseAuth());
    lastSyncedToken.current = null;
    router.replace(LOGIN_PATH);
    router.refresh();
  }, [router]);

  const value = React.useMemo<AdminAuthValue>(
    () => ({ user, status, configError, signIn, signOut }),
    [user, status, configError, signIn, signOut],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth(): AdminAuthValue {
  const context = React.useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used inside <AdminAuthProvider>.");
  }
  return context;
}
