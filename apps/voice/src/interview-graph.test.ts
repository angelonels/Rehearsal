import { describe, expect, it, vi } from "vitest";
import { createInterviewGraph, InterviewEngine } from "./interview-graph.js";

describe("adaptive interview graph", () => {
  it("probes a weak answer before moving on", async () => {
    const model = {
      json: vi.fn().mockResolvedValue({ score: 30, completeness: "weak", missing: ["specific action"], interesting: [], shouldFollowUp: true, rationale: "Vague" }),
      text: vi.fn().mockResolvedValue("What specific action did you personally take?")
    };
    const engine = new InterviewEngine(createInterviewGraph(model as never));
    const response = await engine.next({
      sessionId: crypto.randomUUID(), type: "behavioral", role: "Engineer", level: "mid",
      durationMinutes: 30, startedAt: Date.now(), history: [], answer: "We handled it."
    });
    expect(response).toContain("specific action");
    expect(model.text).toHaveBeenCalledWith(expect.any(String), expect.stringContaining("Probe this answer"));
  });

  it("closes when the allotted time has elapsed", async () => {
    const model = {
      json: vi.fn().mockResolvedValue({ score: 80, completeness: "strong", missing: [], interesting: [], shouldFollowUp: false, rationale: "Complete" }),
      text: vi.fn().mockResolvedValue("Thank you. Your report will be prepared shortly.")
    };
    const engine = new InterviewEngine(createInterviewGraph(model as never));
    await engine.next({
      sessionId: crypto.randomUUID(), type: "technical", role: "Engineer", level: "senior",
      durationMinutes: 10, startedAt: Date.now() - 11 * 60_000, history: [], answer: "A detailed answer."
    });
    expect(model.text).toHaveBeenCalledWith(expect.any(String), expect.stringContaining("Close the interview naturally"));
  });
});
