import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
  }
}

export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Check the submitted fields.", details: error.flatten(), requestId: req.id } });
    return;
  }
  if (error instanceof AppError) {
    res.status(error.status).json({ error: { code: error.code, message: error.message, details: error.details, requestId: req.id } });
    return;
  }
  req.log.error({ err: error }, "unhandled request error");
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong.", requestId: req.id } });
}
