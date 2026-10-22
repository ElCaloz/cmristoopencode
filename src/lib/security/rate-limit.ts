type RateLimitBucket = {
  count: number;
  resetAt: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

const MAX_TRACKED_KEYS = 10_000;

const buckets = new Map<string, RateLimitBucket>();

function pruneExpired(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/**
 * Rate limiter in memoria a finestra fissa.
 *
 * È una difesa aggiuntiva per processi Node persistenti: in ambienti
 * serverless ogni istanza ha la propria memoria, quindi non sostituisce un
 * limiter distribuito (es. Redis o il WAF del provider).
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): RateLimitResult {
  if (!Number.isFinite(limit) || limit < 1 || !Number.isFinite(windowMs) || windowMs < 1) {
    throw new Error("Parametri di rate limit non validi.");
  }

  const roundedLimit = Math.floor(limit);
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    if (buckets.size >= MAX_TRACKED_KEYS) {
      pruneExpired(now);
      if (buckets.size >= MAX_TRACKED_KEYS) {
        const oldestKey = buckets.keys().next().value;
        if (oldestKey !== undefined) buckets.delete(oldestKey);
      }
    }

    const bucket: RateLimitBucket = {
      count: 1,
      resetAt: now + Math.floor(windowMs),
    };
    buckets.set(key, bucket);

    return {
      allowed: true,
      limit: roundedLimit,
      remaining: Math.max(0, roundedLimit - 1),
      resetAt: bucket.resetAt,
      retryAfterSeconds: Math.ceil(bucket.resetAt / 1000 - now / 1000),
    };
  }

  if (existing.count >= roundedLimit) {
    return {
      allowed: false,
      limit: roundedLimit,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;

  return {
    allowed: true,
    limit: roundedLimit,
    remaining: Math.max(0, roundedLimit - existing.count),
    resetAt: existing.resetAt,
    retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
  };
}

export function resetRateLimit(key?: string) {
  if (key === undefined) {
    buckets.clear();
    return;
  }
  buckets.delete(key);
}
