import { Request, Response, NextFunction } from "express";

type Bucket = { count: number; resetAt: number };

/**
 * Fixed-window limiter, held in memory. That is deliberate: it is enough to
 * blunt password guessing against a single instance, and it needs no Redis.
 * It resets on restart and does not coordinate across instances, so scale the
 * API out only alongside a shared store.
 */
export function rateLimit({ windowMs, max }: { windowMs: number; max: number }) {
  const buckets = new Map<string, Bucket>();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = req.ip ?? "unknown";

    // Cheap sweep so the map cannot grow without bound.
    if (buckets.size > 10_000) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }

    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (bucket.count >= max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({ error: `Too many attempts. Try again in ${retryAfter}s.` });
    }
    bucket.count += 1;
    next();
  };
}
