import { Router } from "express";
import { loginSchema, registerSchema } from "@rehearsal/contracts";
import type { AuthService } from "./auth.js";

export function authRoutes(service: AuthService) {
  const router = Router();
  router.post("/register", async (req, res) => {
    res.status(201).json({ data: await service.register(registerSchema.parse(req.body)) });
  });
  router.post("/login", async (req, res) => {
    res.json({ data: await service.login(loginSchema.parse(req.body)) });
  });
  return router;
}
