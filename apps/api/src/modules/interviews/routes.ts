import { Router } from "express";
import { createSessionSchema } from "@rehearsal/contracts";
import type { Queue } from "bullmq";
import type { InterviewService } from "./service.js";

export function interviewRoutes(service: InterviewService, reportsQueue: Queue): Router {
  const router = Router();
  router.get("/", async (req, res) => res.json({ data: await service.list(req.userId!) }));
  router.get("/:id", async (req, res) => res.json({ data: await service.get(req.userId!, req.params.id!) }));
  router.post("/", async (req, res) => res.status(201).json({ data: await service.create(req.userId!, createSessionSchema.parse(req.body)) }));
  router.post("/:id/connect", async (req, res) => res.json({ data: await service.connect(req.userId!, req.params.id!) }));
  router.post("/:id/complete", async (req, res) => {
    const session = await service.complete(req.userId!, req.params.id!);
    await reportsQueue.add("generate-report", { sessionId: session.id }, { jobId: session.id, attempts: 3, backoff: { type: "exponential", delay: 2000 } });
    res.status(202).json({ data: session });
  });
  return router;
}
