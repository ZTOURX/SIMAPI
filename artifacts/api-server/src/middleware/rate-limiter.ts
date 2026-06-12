import rateLimit from "express-rate-limit";
import type { Request, Response } from "express";

function resolveIp(req: Request): string {
  return req.ip ?? req.socket?.remoteAddress ?? "unknown";
}

export const chatRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const threadId = (req.body as Record<string, unknown>)?.threadId as string | undefined;
    if (threadId) return `chat:${threadId}`;
    return `chat:${resolveIp(req)}`;
  },
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      error: "Rate limit exceeded",
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests. Please slow down.",
      retryAfter: 60,
    });
  },
});

export const globalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      error: "Rate limit exceeded",
      code: "GLOBAL_RATE_LIMIT_EXCEEDED",
      message: "Global rate limit exceeded.",
      retryAfter: 60,
    });
  },
});

export const knowledgeRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      error: "Rate limit exceeded",
      code: "KNOWLEDGE_RATE_LIMIT_EXCEEDED",
      message: "Knowledge ingestion rate limit exceeded.",
      retryAfter: 60,
    });
  },
});
