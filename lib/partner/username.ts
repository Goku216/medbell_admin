/**
 * Partner login usernames.
 *
 * Partners sign in with a username, not an email — the backend turns it into
 * `<username>@<domain>` internally. That address is not a mailbox: no mail is
 * ever sent to it, and there is no password-reset email. An administrator sets
 * a new password when a partner forgets theirs.
 */

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 40;
export const PARTNER_PASSWORD_MIN = 8;

/** Lowercase letters, digits, dot, underscore, hyphen; must start and end alphanumeric. */
const USERNAME = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/;

/** The server lowercases and trims first, so the form may accept `Priya.Sharma`. */
export function normaliseUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function validateUsername(value: string): string | null {
  const username = normaliseUsername(value);

  if (!username) return "Choose a username.";
  if (username.length < USERNAME_MIN) {
    return `Usernames are at least ${USERNAME_MIN} characters.`;
  }
  if (username.length > USERNAME_MAX) {
    return `Usernames are at most ${USERNAME_MAX} characters.`;
  }
  if (!USERNAME.test(username)) {
    return "Use lowercase letters, digits, dots, underscores and hyphens, starting and ending with a letter or digit.";
  }
  return null;
}

/**
 * The password minimum is deliberately stricter than the six characters app
 * users get: this login reads money.
 */
export function validatePartnerPassword(value: string): string | null {
  if (value.length < PARTNER_PASSWORD_MIN) {
    return `Partner passwords are at least ${PARTNER_PASSWORD_MIN} characters.`;
  }
  return null;
}

/** The login domain, shared with the backend's REFERRAL_PARTNER_LOGIN_DOMAIN. */
export function partnerLoginDomain(): string {
  return process.env.NEXT_PUBLIC_PARTNER_LOGIN_DOMAIN?.trim() || "partners.med-bell.com";
}

export function partnerLoginEmail(username: string): string {
  return `${normaliseUsername(username)}@${partnerLoginDomain()}`;
}

/**
 * Generates a password an operator can read aloud once and then forget.
 *
 * Rejection sampling rather than `% length`, which would bias the alphabet
 * toward its first characters. The alphabet drops glyphs that are easy to
 * misread when a password is dictated or copied off a screen.
 */
const ALPHABET = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generatePassword(length = 16): string {
  const max = 256 - (256 % ALPHABET.length);
  const out: string[] = [];
  const buffer = new Uint8Array(1);

  while (out.length < length) {
    crypto.getRandomValues(buffer);
    if (buffer[0] < max) out.push(ALPHABET[buffer[0] % ALPHABET.length]);
  }

  return out.join("");
}
