import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger.js";
import { ZodError } from "zod";

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  err: ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation error",
      code: "VALIDATION_ERROR",
      details: err.errors.map((e) => ({ path: e.path.join("."), message: e.message })),
    });
    return;
  }

  const statusCode = err.statusCode ?? 500;
  const code = err.code ?? "INTERNAL_ERROR";
  const message = statusCode < 500 ? err.message : "An internal error occurred";

  if (statusCode >= 500) {
    req.log?.error({ err, code }, "Unhandled server error");
  } else {
    req.log?.warn({ err, code }, "Client error");
  }

  res.status(statusCode).json({ error: message, code });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: "Endpoint not found",
    code: "NOT_FOUND",
    path: req.path,
  });
}

export function createError(message: string, statusCode = 500, code = "INTERNAL_ERROR"): ApiError {
  const err: ApiError = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
}
