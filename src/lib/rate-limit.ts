/**
 * Small fixed-window rate limiter.
 *
 * In-memory, so on serverless it limits per running instance – a speed bump
 * against scripted abuse, not a hard guarantee. When traffic grows, swap the
 * store for Upstash Redis / Vercel KV behind the same `limit()` signature.
 */
type Entry = { count: number; resetAt: number };

export type RateLimitResult = { ok: boolean; remaining: number; retryAfterSec: number };

export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const hits = new Map<string, Entry>();
  let lastSweep = 0;

  return function check(key: string, now = Date.now()): RateLimitResult {
    // Opportunistic cleanup so the map can't grow without bound.
    if (now - lastSweep > windowMs) {
      for (const [k, e] of hits) if (e.resetAt <= now) hits.delete(k);
      lastSweep = now;
    }

    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
    }
    entry.count += 1;
    const ok = entry.count <= limit;
    return {
      ok,
      remaining: Math.max(0, limit - entry.count),
      retryAfterSec: ok ? 0 : Math.ceil((entry.resetAt - now) / 1000),
    };
  };
}

const envInt = (name: string, fallback: number) => {
  const n = Number(process.env[name]);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};

/** Booking creation: 10 per 10 minutes per IP (override with RATE_LIMIT_BOOKINGS). */
export const bookingLimiter = createRateLimiter({ limit: envInt("RATE_LIMIT_BOOKINGS", 10), windowMs: 10 * 60_000 });
/** Availability lookups: 120 per minute per IP. */
export const availabilityLimiter = createRateLimiter({ limit: 120, windowMs: 60_000 });
/** Cancellation attempts: 20 per 10 minutes per IP. */
export const cancelLimiter = createRateLimiter({ limit: 20, windowMs: 10 * 60_000 });
