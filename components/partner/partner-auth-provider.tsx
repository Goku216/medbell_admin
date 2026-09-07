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
import { PARTNER_HOME_PATH, PARTNER_LOGIN_PATH } from "@/lib/constants";
import { partnerLoginEmail } from "@/lib/partner/username";

const PARTNER_CLAIM = "medbellPartner";
const PARTNER_ID_CLAIM = "medbellPartnerId";

type PartnerStatus = "loading" | "authenticated" | "unauthenticated";

type PartnerAuthValue = {
  user: User | null;
  partnerId: string | null;
  status: PartnerStatus;
  configError: string | null;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const PartnerAuthContext = React.createContext<PartnerAuthValue | null>(null);

/**
 * Turns a Firebase Auth error into something safe to show.
 *
 * Wrong username, wrong password and no-such-user collapse into one message on
 * purpose: distinguishing them tells an attacker which usernames exist.
 */
function signInMessage(error: unknown): string {
  const code = (error as { code?: string })?.code ?? "";

  if (code === "auth/user-disabled") {
    return "This login has been suspended. Contact MedBell.";
  }
  if (
    code === "auth/invalid-credential" ||
    code === "auth/wrong-password" ||
    code === "auth/user-not-found" ||
    code === "auth/invalid-email"
  ) {
    return "Incorrect username or password.";
  }
  if (code === "auth/too-many-requests") {
    return "Too many attempts. Wait a few minutes and try again.";
  }
  return error instanceof Error ? error.message : "Sign-in failed.";
}

export function PartnerAuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = React.useState<User | null>(null);
  const [partnerId, setPartnerId] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<PartnerStatus>("loading");

  const configError = firebaseConfigError();
  const hasForcedRefresh = React.useRef(false);

  React.useEffect(() => {
    if (configError) return;
    const auth = getFirebaseAuth();

    return onIdTokenChanged(auth, async (nextUser) => {
      if (!nextUser) {
        setUser(null);
        setPartnerId(null);
        setStatus("unauthenticated");
        hasForcedRefresh.current = false;
        return;
      }

      try {
        // Force one refresh per session so a claim granted after the current
        // token was minted is actually present.
        const result = await nextUser.getIdTokenResult(!hasForcedRefresh.current);
        hasForcedRefresh.current = true;

        // Re-checked on every token change, not only at sign-in: an admin who
        // revokes portal access should lose it without the partner having to
        // sign out first.
        if (result.claims[PARTNER_CLAIM] !== true) {
          await firebaseSignOut(auth);
          setUser(null);
          setPartnerId(null);
          setStatus("unauthenticated");
          return;
        }

        setUser(nextUser);
        setPartnerId((result.claims[PARTNER_ID_CLAIM] as string | undefined) ?? null);
        setStatus("authenticated");
      } catch {
        setUser(null);
        setPartnerId(null);
        setStatus("unauthenticated");
      }
    });
  }, [configError]);

  const signIn = React.useCallback(async (username: string, password: string) => {
    const auth = getFirebaseAuth();

    let credential;
    try {
      // Firebase identifies accounts by email, so the username becomes
      // `<username>@<domain>`. That address is not a mailbox.
      credential = await signInWithEmailAndPassword(
        auth,
        partnerLoginEmail(username),
        password,
      );
    } catch (error) {
      throw new Error(signInMessage(error));
    }

    const result = await credential.user.getIdTokenResult(true);
    hasForcedRefresh.current = true;

    if (result.claims[PARTNER_CLAIM] !== true) {
      // Never leave a signed-in session with no access: that produces a portal
      // that looks broken rather than one that refuses.
      await firebaseSignOut(auth);
      throw new Error("This account is not a partner login.");
    }
  }, []);

  const signOut = React.useCallback(async () => {
    hasForcedRefresh.current = false;
    await firebaseSignOut(getFirebaseAuth());
    router.replace(PARTNER_LOGIN_PATH);
  }, [router]);

  const value = React.useMemo<PartnerAuthValue>(
    () => ({ user, partnerId, status, configError, signIn, signOut }),
    [user, partnerId, status, configError, signIn, signOut],
  );

  return <PartnerAuthContext.Provider value={value}>{children}</PartnerAuthContext.Provider>;
}

export { PARTNER_HOME_PATH, PARTNER_LOGIN_PATH };

export function usePartnerAuth(): PartnerAuthValue {
  const context = React.useContext(PartnerAuthContext);
  if (!context) {
    throw new Error("usePartnerAuth must be used inside <PartnerAuthProvider>.");
  }
  return context;
}
