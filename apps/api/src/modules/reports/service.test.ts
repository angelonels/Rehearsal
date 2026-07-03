import { describe, expect, it, vi } from "vitest";
import { generateSessionReport } from "./service.js";

describe("generateSessionReport", () => {
  it("returns an honest insufficient-evidence report without calling the model", async () => {
    const model = { generateReport: vi.fn() };

    const report = await generateSessionReport({
      type: "behavioral",
      targetRole: "Engineer",
      transcriptTurns: [{ speaker: "interviewer", content: "Tell me about yourself." }]
    }, model);

    expect(model.generateReport).not.toHaveBeenCalled();
    expect(report.overallScore).toBe(0);
    expect(report.summary).toMatch(/not enough candidate speech/i);
    expect(report.strengths).toEqual([]);
    expect(report.detailedFeedback[0]?.topic).toBe("Insufficient evidence");
  });
});
