/**
 * "Manage my booking" tokens.
 *
 * token = base64url(HMAC-SHA256(secret, "manage:" + bookingId)) → 43 chars,
 * 256 bits, unguessable without the server secret. Only its SHA-256 hash is
 * stored, so a database leak doesn't leak working links. Because the token
 * is derived from the booking id, a retried (idempotent) request can return
 * the same link without the raw token ever being stored.
 */
import { createHash, createHmac } from "node:crypto";

const DEV_SECRET = "dev-only-manage-token-secret-change-me";

function secret(): string {
  const s = process.env.MANAGE_TOKEN_SECRET || process.env.BETTER_AUTH_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") throw new Error("MANAGE_TOKEN_SECRET (or BETTER_AUTH_SECRET) must be set");
  return DEV_SECRET;
}

export function manageTokenFor(bookingId: string): { token: string; hash: string } {
  const token = createHmac("sha256", secret()).update(`manage:${bookingId}`).digest("base64url");
  return { token, hash: hashManageToken(token) };
}

export function hashManageToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Cheap shape check before touching the database. */
export function isPlausibleToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}
