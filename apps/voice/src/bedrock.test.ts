import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { BedrockChat } from "./bedrock.js";

describe("BedrockChat", () => {
  it("repairs and validates malformed structured output", async () => {
    const send = vi.fn()
      .mockResolvedValueOnce({ output: { message: { content: [{ text: "I cannot return JSON." }] } } })
      .mockResolvedValueOnce({ output: { message: { content: [{ text: '{"score":72,"reason":"Concrete evidence"}' }] } } });
    const model = new BedrockChat("model", "us-east-1", undefined, {
      client: { send } as never,
      timeoutMs: 100
    });

    await expect(model.json(
      "Evaluate the answer.",
      "Candidate answer: I reduced latency by 30%.",
      z.object({ score: z.number().min(0).max(100), reason: z.string() })
    )).resolves.toEqual({ score: 72, reason: "Concrete evidence" });
    expect(send).toHaveBeenCalledTimes(2);
  });
});
