import crypto from "node:crypto";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pino from "pino";
import { pinoHttp } from "pino-http";
import type { Database } from "@rehearsal/database";
import type { Queue } from "bullmq";
import { authRoutes } from "./modules/auth/routes.js";
import { AuthService } from "./modules/auth/auth.js";
import { requireAuth } from "./middleware/auth.js";
import { interviewRoutes } from "./modules/interviews/routes.js";
import { InterviewService } from "./modules/interviews/service.js";
import { errorHandler } from "./lib/errors.js";

export type AppDeps = {
  db: Database;
  reportsQueue: Queue;
  config: { webOrigin: string; jwtSecret: string; jwtExpiresIn: string; livekitUrl: string; livekitApiKey: string; livekitApiSecret: string };
};

export function createApp(deps: AppDeps) {
  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(cors({ origin: deps.config.webOrigin, credentials: false }));
  app.use(express.json({ limit: "32kb" }));
  app.use(pinoHttp({ logger: pino(), genReqId: (req: express.Request) => req.headers["x-request-id"]?.toString() ?? crypto.randomUUID() }));
  app.use("/api/auth", rateLimit({ windowMs: 15 * 60_000, limit: 30, standardHeaders: true, legacyHeaders: false }));
  app.get("/health", (_req, res) => res.json({ status: "ok", service: "api" }));
  app.use("/api/auth", authRoutes(new AuthService(deps.db, deps.config.jwtSecret, deps.config.jwtExpiresIn)));
  app.use("/api/interviews", requireAuth(deps.config.jwtSecret), interviewRoutes(new InterviewService(deps.db, {
    url: deps.config.livekitUrl, apiKey: deps.config.livekitApiKey, apiSecret: deps.config.livekitApiSecret
  }), deps.reportsQueue));
  app.use((_req, res) => res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found." } }));
  app.use(errorHandler);
  return app;
}
