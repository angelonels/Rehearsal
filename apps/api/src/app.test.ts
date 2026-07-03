import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "./app.js";

describe("API", () => {
  it("reports health without infrastructure", async () => {
    const response = await request(createApp({
      db: {} as never,
      reportsQueue: { add: vi.fn() } as never,
      config: { webOrigin: "http://localhost:5173", jwtSecret: "a".repeat(32), jwtExpiresIn: "7d", livekitUrl: "ws://localhost:7880", livekitApiKey: "key", livekitApiSecret: "secret" }
    })).get("/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok", service: "api" });
  });

  it("rejects unauthenticated interview requests", async () => {
    const response = await request(createApp({
      db: {} as never,
      reportsQueue: {} as never,
      config: { webOrigin: "http://localhost:5173", jwtSecret: "a".repeat(32), jwtExpiresIn: "7d", livekitUrl: "ws://localhost:7880", livekitApiKey: "key", livekitApiSecret: "secret" }
    })).get("/api/interviews");
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });
});
