import NodeCache from "node-cache";
import type { Request, Response, NextFunction } from "express";

const cache = new NodeCache({ stdTTL: 60, checkperiod: 30 });

export function cacheMiddleware(ttl = 60) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.method !== "GET") {
      next();
      return;
    }

    const key = `${req.path}:${JSON.stringify(req.query)}`;
    const cached = cache.get<unknown>(key);

    if (cached !== undefined) {
      res.setHeader("X-Cache", "HIT");
      res.json(cached);
      return;
    }

    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      if (res.statusCode === 200) {
        cache.set(key, body, ttl);
      }
      res.setHeader("X-Cache", "MISS");
      return originalJson(body);
    };

    next();
  };
}

export function invalidateCache(pattern?: string): number {
  if (pattern) {
    const keys = cache.keys().filter((k) => k.includes(pattern));
    cache.del(keys);
    return keys.length;
  }
  const count = cache.keys().length;
  cache.flushAll();
  return count;
}

export { cache };
