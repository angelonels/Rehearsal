import { describe, expect, it, vi } from "vitest";
import { createInterviewGraph, InterviewEngine, type Turn } from "./interview-graph.js";

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

  it("keeps one copy of each turn across a multi-turn session", async () => {
    const model = {
      json: vi.fn().mockResolvedValue({
        score: 70,
        completeness: "adequate",
        missing: [],
        interesting: [],
        shouldFollowUp: false,
        rationale: "Enough evidence"
      }),
      text: vi.fn()
        .mockResolvedValueOnce("What did you learn from that incident?")
        .mockResolvedValueOnce("How did you apply that lesson later?")
        .mockResolvedValueOnce("What tradeoff would you reconsider now?")
    };
    const engine = new InterviewEngine(createInterviewGraph(model as never));
    const sessionId = crypto.randomUUID();
    const opening = "Tell me about a difficult production incident.";
    const history: Turn[] = [{ role: "interviewer", content: opening }];

    for (const answer of ["I stabilized checkout.", "I added load tests.", "I changed the retry policy."]) {
      const response = await engine.next({
        sessionId,
        type: "technical",
        role: "Engineer",
        level: "senior",
        durationMinutes: 30,
        startedAt: Date.now(),
        history,
        answer
      });
      history.push({ role: "candidate", content: answer }, { role: "interviewer", content: response });
    }

    const finalEvaluationPrompt = model.json.mock.calls.at(-1)?.[1] as string;
    expect(finalEvaluationPrompt.match(/Tell me about a difficult production incident\./g)).toHaveLength(1);
    expect(finalEvaluationPrompt.match(/I stabilized checkout\./g)).toHaveLength(1);
    expect(finalEvaluationPrompt.match(/I added load tests\./g)).toHaveLength(1);
    expect(finalEvaluationPrompt.match(/I changed the retry policy\./g)).toHaveLength(2);
  });
});
