/**
 * "Manage my booking" tokens.
 *
 * The raw token goes into the customer's email link; only its SHA-256 hash is
 * stored. A database leak therefore doesn't leak working cancel links.
 * 32 random bytes = 256 bits of entropy, so tokens can't be guessed.
 */
import { createHash, randomBytes } from "node:crypto";

export function generateManageToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashManageToken(token) };
}

export function hashManageToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Cheap shape check before touching the database. */
export function isPlausibleToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}
