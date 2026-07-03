import { describe, expect, it, vi } from "vitest";
import { BedrockService } from "./bedrock.js";

describe("BedrockService", () => {
  it("repairs an invalid report before returning it", async () => {
    const validReport = {
      overallScore: 74,
      summary: "The candidate gave useful evidence.",
      strengths: ["Explained ownership", "Quantified the result"],
      improvements: ["Clarify tradeoffs", "Structure the opening"],
      competencies: { communication: 72, ownership: 76 },
      detailedFeedback: [
        { topic: "Ownership", feedback: "The answer identified a personal action." },
        { topic: "Impact", feedback: "The result was measurable." }
      ]
    };
    const send = vi.fn()
      .mockResolvedValueOnce({ output: { message: { content: [{ text: "Here is your report." }] } } })
      .mockResolvedValueOnce({ output: { message: { content: [{ text: JSON.stringify(validReport) }] } } });
    const model = new BedrockService("model", "us-east-1", undefined, {
      client: { send } as never,
      timeoutMs: 100
    });

    await expect(model.generateReport("candidate: I reduced latency by 30%.")).resolves.toEqual(validReport);
    expect(send).toHaveBeenCalledTimes(2);
  });
});
