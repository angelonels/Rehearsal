import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/errors.js";
import { verifyToken } from "../modules/auth/auth.js";

export function requireAuth(secret: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const value = req.header("authorization");
    if (!value?.startsWith("Bearer ")) return next(new AppError(401, "UNAUTHORIZED", "Sign in to continue."));
    try {
      req.userId = verifyToken(value.slice(7), secret);
      next();
    } catch {
      next(new AppError(401, "UNAUTHORIZED", "Your session is invalid or expired."));
    }
  };
}
