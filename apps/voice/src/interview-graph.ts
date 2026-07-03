import { Annotation, END, MemorySaver, START, StateGraph } from "@langchain/langgraph";
import type { InterviewType } from "@rehearsal/contracts";
import { z } from "zod";
import type { BedrockChat } from "./bedrock.js";
import { interviewerSystem } from "./prompts.js";

export type Turn = { role: "candidate" | "interviewer"; content: string };
const evaluationSchema = z.object({
  score: z.number().min(0).max(100),
  completeness: z.enum(["weak", "adequate", "strong"]),
  missing: z.array(z.string()).default([]),
  interesting: z.array(z.string()).default([]),
  shouldFollowUp: z.boolean(),
  rationale: z.string()
});

const InterviewState = Annotation.Root({
  type: Annotation<InterviewType>(),
  role: Annotation<string>(),
  level: Annotation<string>(),
  history: Annotation<Turn[]>({ reducer: (current, next) => current.concat(next), default: () => [] }),
  latestAnswer: Annotation<string>(),
  evaluation: Annotation<z.infer<typeof evaluationSchema>>(),
  difficulty: Annotation<number>({ reducer: (_current, next) => next, default: () => 1 }),
  stage: Annotation<"opening" | "core" | "closing">({ reducer: (_current, next) => next, default: () => "opening" }),
  route: Annotation<"follow_up" | "advance" | "close">(),
  response: Annotation<string>(),
  startedAt: Annotation<number>(),
  durationMinutes: Annotation<number>()
});
type State = typeof InterviewState.State;

export function createInterviewGraph(model: BedrockChat) {
  const evaluate = async (state: State) => {
    const evaluation = evaluationSchema.parse(await model.json(
      "You evaluate only the candidate's latest interview answer. Be evidence-based.",
      `Interview: ${state.type}; role: ${state.role}; level: ${state.level}\nConversation:\n${formatHistory(state.history)}\nLatest answer: ${state.latestAnswer}\nReturn {score, completeness, missing, interesting, shouldFollowUp, rationale}.`
    ));
    return { evaluation };
  };

  const adjustDifficulty = (state: State) => ({
    difficulty: Math.max(1, Math.min(5, state.difficulty + (state.evaluation.score >= 80 ? 1 : state.evaluation.score < 45 ? -1 : 0)))
  });

  const decide = (state: State) => {
    const elapsed = (Date.now() - state.startedAt) / 60_000;
    const candidateTurns = state.history.filter((turn) => turn.role === "candidate").length;
    const route = elapsed >= state.durationMinutes || candidateTurns >= 10
      ? "close" as const
      : state.evaluation.shouldFollowUp
        ? "follow_up" as const
        : "advance" as const;
    return { route, stage: route === "close" ? "closing" as const : "core" as const };
  };

  const generate = async (state: State) => {
    const intent = state.route === "follow_up"
      ? `Probe this answer. Missing evidence: ${state.evaluation.missing.join(", ")}. Interesting threads: ${state.evaluation.interesting.join(", ")}.`
      : state.route === "close"
        ? "Close the interview naturally. Thank the candidate and explain that their report will be prepared. Do not ask another question."
        : `Move to a new area at difficulty ${state.difficulty}/5 while connecting naturally to what was just discussed.`;
    const response = await model.text(interviewerSystem(state.type, state.role, state.level), `${intent}\nFull conversation:\n${formatHistory(state.history)}`);
    return { response, history: [{ role: "interviewer" as const, content: response }] };
  };

  return new StateGraph(InterviewState)
    .addNode("evaluate", evaluate)
    .addNode("adjust_difficulty", adjustDifficulty)
    .addNode("decide", decide)
    .addNode("generate", generate)
    .addEdge(START, "evaluate")
    .addEdge("evaluate", "adjust_difficulty")
    .addEdge("adjust_difficulty", "decide")
    .addEdge("decide", "generate")
    .addEdge("generate", END)
    .compile({ checkpointer: new MemorySaver() });
}

export class InterviewEngine {
  private initialized = false;

  constructor(private graph: ReturnType<typeof createInterviewGraph>) {}

  async opening(input: { sessionId: string; type: InterviewType; role: string; level: string; durationMinutes: number }) {
    const opening = `Hello, I'm Mara. We'll spend about ${input.durationMinutes} minutes on a ${input.type.replace("_", " ")} interview for a ${input.role} role. I'll ask one question at a time and may dig into your answers. To start, could you briefly introduce yourself and tell me what you want your next role to involve?`;
    return opening;
  }

  async next(input: { sessionId: string; type: InterviewType; role: string; level: string; durationMinutes: number; startedAt: number; history: Turn[]; answer: string }) {
    const result = await this.graph.invoke({
      type: input.type, role: input.role, level: input.level, durationMinutes: input.durationMinutes,
      startedAt: input.startedAt,
      history: this.initialized
        ? [{ role: "candidate", content: input.answer }]
        : [...input.history, { role: "candidate", content: input.answer }],
      latestAnswer: input.answer
    }, { configurable: { thread_id: input.sessionId } });
    this.initialized = true;
    return result.response;
  }
}

function formatHistory(history: Turn[]) {
  return history.slice(-20).map((turn) => `${turn.role}: ${turn.content}`).join("\n");
}
