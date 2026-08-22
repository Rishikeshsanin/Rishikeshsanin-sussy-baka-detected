import "server-only";

interface RateBucket {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Lightweight per-instance fixed-window limiter.
 *
 * This is intentionally dependency-free. On serverless platforms it is an
 * additional abuse guard, not a globally coordinated quota system; production
 * traffic can later swap this module for Redis/KV without changing the route.
 */
export class FixedWindowRateLimiter {
  private readonly buckets = new Map<string, RateBucket>();
  private operations = 0;

  constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number,
  ) {
    if (!Number.isInteger(maxRequests) || maxRequests < 1) {
      throw new Error("maxRequests must be a positive integer");
    }
    if (!Number.isInteger(windowMs) || windowMs < 1_000) {
      throw new Error("windowMs must be at least 1000ms");
    }
  }

  consume(key: string, now = Date.now()): RateLimitResult {
    this.operations += 1;
    if (this.operations % 128 === 0) this.prune(now);

    const safeKey = key.trim() || "unknown";
    const current = this.buckets.get(safeKey);

    if (!current || current.resetAt <= now) {
      this.buckets.set(safeKey, { count: 1, resetAt: now + this.windowMs });
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        retryAfterSeconds: 0,
      };
    }

    if (current.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1_000)),
      };
    }

    current.count += 1;
    return {
      allowed: true,
      remaining: Math.max(0, this.maxRequests - current.count),
      retryAfterSeconds: 0,
    };
  }

  private prune(now: number): void {
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }
}

export function getRequestIdentity(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
    ?.split(",", 1)[0]
    ?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return forwarded || realIp || "unknown";
}
